import {Platform} from 'react-native';
import {ENV} from '../constants/env';

export interface GoogleAuthUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
}

export type AuthErrorKind =
  | 'cancelled'
  | 'play_services'
  | 'session_expired'
  | 'offline'
  | 'unconfigured'
  | 'unknown';

export interface AuthErrorInfo {
  kind: AuthErrorKind;
  message: string;
}

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(info: AuthErrorInfo) {
    super(info.message);
    this.name = 'AuthError';
    this.kind = info.kind;
  }
}

function getGoogleSigninModule(): any {
  return require('@react-native-google-signin/google-signin');
}

function getGoogleSignin(): any {
  return getGoogleSigninModule().GoogleSignin;
}

function getGoogleStatusCodes(): Record<string, unknown> {
  return getGoogleSigninModule().statusCodes ?? {};
}

function extractGoogleProfile(
  payload: unknown,
): {id?: string; name?: string; email?: string; photo?: string | null} {
  if (payload === null || typeof payload !== 'object') {
    return {};
  }
  const obj = payload as {user?: unknown};
  if (obj.user && typeof obj.user === 'object') {
    return obj.user as {
      id?: string;
      name?: string;
      email?: string;
      photo?: string | null;
    };
  }
  return payload as {
    id?: string;
    name?: string;
    email?: string;
    photo?: string | null;
  };
}

function toAuthUser(payload: unknown): GoogleAuthUser {
  const u = extractGoogleProfile(payload);
  return {
    id: u.id ?? '',
    name: u.name ?? 'Member',
    email: u.email ?? '',
    photo: u.photo ?? null,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new AuthError({
              kind: 'unknown',
              message: 'Sign-in timed out. Please try again.',
            }),
          );
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function classifyAuthError(
  error: unknown,
  codes: Record<string, unknown> = {},
): AuthErrorInfo {
  if (error instanceof AuthError) {
    return {kind: error.kind, message: error.message};
  }
  const raw = error as {code?: string | number} | null;
  const code = raw?.code;
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (code !== undefined && code !== null) {
    if (code === codes.SIGN_IN_CANCELLED) {
      return {kind: 'cancelled', message: 'Sign-in was cancelled.'};
    }
    if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        kind: 'play_services',
        message: 'Google Play Services are not available on this device.',
      };
    }
    if (code === codes.SIGN_IN_REQUIRED) {
      return {
        kind: 'session_expired',
        message: 'Please sign in again.',
      };
    }
  }

  const lowered = message.toLowerCase();
  if (/cancelled|canceled/.test(lowered)) {
    return {kind: 'cancelled', message: 'Sign-in was cancelled.'};
  }
  if (/play services/.test(lowered)) {
    return {
      kind: 'play_services',
      message: 'Google Play Services are not available on this device.',
    };
  }
  if (/network|internet|offline|connection|timed?\s*out|no_network/.test(lowered)) {
    return {
      kind: 'offline',
      message: 'Check your internet connection and try again.',
    };
  }
  if (/developer_error|10:|not configured|rn_google_signin|native module/.test(lowered)) {
    return {
      kind: 'unconfigured',
      message: 'Google Sign-In needs a fresh app build to complete setup.',
    };
  }
  return {
    kind: 'unknown',
    message: 'Could not sign in right now. Please try again.',
  };
}

let configured = false;

export function configureGoogleSignin(): void {
  if (configured) {
    return;
  }
  const GoogleSignin = getGoogleSignin();
  const options: Record<string, unknown> = {offlineAccess: false};
  if (Platform.OS === 'android' && ENV.GOOGLE_WEB_CLIENT_ID) {
    options.webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
  }
  if (Platform.OS === 'ios' && ENV.GOOGLE_WEB_CLIENT_ID) {
    options.iosClientId = ENV.GOOGLE_WEB_CLIENT_ID;
  }
  GoogleSignin.configure(options);
  configured = true;
}

type GoogleSignInResponse =
  | {type: 'success'; data: unknown}
  | {type: 'cancelled'};

export async function signInWithGoogle(): Promise<GoogleAuthUser> {
  try {
    configureGoogleSignin();
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    const response = await withTimeout<GoogleSignInResponse>(
      GoogleSignin.signIn(),
      30000,
    );
    if (response.type !== 'success') {
      throw new AuthError({
        kind: 'cancelled',
        message: 'Sign-in was cancelled.',
      });
    }
    return toAuthUser(response.data);
  } catch (error: unknown) {
    const info = classifyAuthError(error, getGoogleStatusCodes());
    throw new AuthError(info);
  }
}

export type SilentRestoreResult =
  | {status: 'restored'; user: GoogleAuthUser}
  | {status: 'no_session'}
  | {status: 'expired'}
  | {status: 'unavailable'};

export async function signInSilently(): Promise<SilentRestoreResult> {
  try {
    configureGoogleSignin();
    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin.hasPreviousSignIn()) {
      return {status: 'no_session'};
    }
    const response = await GoogleSignin.signInSilently();
    if (response.type !== 'success') {
      return {status: 'no_session'};
    }
    return {status: 'restored', user: toAuthUser(response.data)};
  } catch (error: unknown) {
    const info = classifyAuthError(error, getGoogleStatusCodes());
    if (info.kind === 'session_expired' || info.kind === 'cancelled') {
      return {status: 'expired'};
    }
    return {status: 'unavailable'};
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.signOut();
  } catch {
    // Ignore native sign-out errors; local profile switches back to Guest
  }
}

/**
 * Fully unlinks the connected Google account from Simba Player by revoking
 * the OAuth grant BEFORE signing out (Google Play Services requires active
 * session state for revokeAccess()).
 */
export async function disconnectGoogleAccount(): Promise<void> {
  const GoogleSignin = getGoogleSignin();
  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // Best-effort revoke; proceed with signOut even if offline or already revoked
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore native sign-out errors
  }
}
