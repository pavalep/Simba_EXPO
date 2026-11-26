import {Directory, File, Paths} from 'expo-file-system';
import type {
  CatalogueItem,
  DownloadRecord,
  LinkedFolderRecord,
  SavedBookmarkRecord,
} from '../../data/dummy';
import type {
  FollowedPodcastRecord,
  PlaylistRecord,
} from '../../state/useSimbaStore';

export const GUEST_PROFILE_ID = 'guest';

export interface UserProfileMeta {
  id: string;
  name: string;
  email?: string;
  photo?: string | null;
  isGuest: boolean;
}

export interface ProfilePreferences {
  audioQualityIdx: number;
  videoQualityIdx: number;
  wifiOnly: boolean;
}

export interface PersistedProfileSnapshot {
  selectedTopics: string[];
  history: CatalogueItem[];
  recentSearches: string[];
  bookmarks: SavedBookmarkRecord[];
  playlistsList: PlaylistRecord[];
  pinnedMixIds: string[];
  podcastsList: FollowedPodcastRecord[];
  favoriteRadioIds: string[];
  favoriteTvIds: string[];
  eqPreset: string;
  eqGains: number[];
  downloads: DownloadRecord[];
  autoDeletePolicy: string;
  linkedFolders: LinkedFolderRecord[];
  preferences: ProfilePreferences;
}

interface ProfileRegistry {
  activeProfileId: string;
  profiles: UserProfileMeta[];
}

export const GUEST_PROFILE_META: UserProfileMeta = {
  id: GUEST_PROFILE_ID,
  name: 'Guest',
  isGuest: true,
};

export function createEmptyProfileSnapshot(
  defaultEqGains: number[],
): PersistedProfileSnapshot {
  return {
    selectedTopics: ['tech', 'music', 'cinema'],
    history: [],
    recentSearches: [],
    bookmarks: [],
    playlistsList: [],
    pinnedMixIds: [],
    podcastsList: [],
    favoriteRadioIds: [],
    favoriteTvIds: [],
    eqPreset: 'Flat',
    eqGains: defaultEqGains,
    downloads: [],
    autoDeletePolicy: 'After 30 days',
    linkedFolders: [],
    preferences: {
      audioQualityIdx: 0,
      videoQualityIdx: 0,
      wifiOnly: true,
    },
  };
}

function getProfilesDir(): Directory {
  const dir = new Directory(Paths.document, 'simba_profiles');
  if (!dir.exists) {
    dir.create({intermediates: true, idempotent: true});
  }
  return dir;
}

function sanitizeProfileFileName(profileId: string): string {
  return `profile_${profileId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
}

function getRegistryFile(): File {
  return new File(getProfilesDir(), 'registry.json');
}

function getProfileDataFile(profileId: string): File {
  return new File(getProfilesDir(), sanitizeProfileFileName(profileId));
}

export function loadProfileRegistry(): ProfileRegistry {
  try {
    const file = getRegistryFile();
    if (!file.exists) {
      return {
        activeProfileId: GUEST_PROFILE_ID,
        profiles: [GUEST_PROFILE_META],
      };
    }
    const raw = file.textSync();
    const parsed = JSON.parse(raw) as Partial<ProfileRegistry>;
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const hasGuest = profiles.some(p => p.id === GUEST_PROFILE_ID);
    const normalizedProfiles = hasGuest
      ? profiles
      : [GUEST_PROFILE_META, ...profiles];
    const activeId =
      typeof parsed.activeProfileId === 'string' &&
      normalizedProfiles.some(p => p.id === parsed.activeProfileId)
        ? parsed.activeProfileId
        : GUEST_PROFILE_ID;
    return {
      activeProfileId: activeId,
      profiles: normalizedProfiles,
    };
  } catch {
    return {
      activeProfileId: GUEST_PROFILE_ID,
      profiles: [GUEST_PROFILE_META],
    };
  }
}

export function saveProfileRegistry(registry: ProfileRegistry): void {
  try {
    const file = getRegistryFile();
    file.write(JSON.stringify(registry));
  } catch {
    // Non-fatal: keep in-memory state working even if storage is unavailable
  }
}

export function loadProfileSnapshot(
  profileId: string,
  defaultEqGains: number[],
): PersistedProfileSnapshot {
  const fallback = createEmptyProfileSnapshot(defaultEqGains);
  try {
    const file = getProfileDataFile(profileId);
    if (!file.exists) {
      return fallback;
    }
    const raw = file.textSync();
    const parsed = JSON.parse(raw) as Partial<PersistedProfileSnapshot>;
    return {
      ...fallback,
      ...parsed,
      preferences: {
        ...fallback.preferences,
        ...(parsed.preferences ?? {}),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveProfileSnapshot(
  profileId: string,
  snapshot: PersistedProfileSnapshot,
): void {
  try {
    const file = getProfileDataFile(profileId);
    file.write(JSON.stringify(snapshot));
  } catch {
    // Non-fatal
  }
}

export function makeUserProfileId(email: string): string {
  const clean = email.trim().toLowerCase();
  return `user_${clean.replace(/[^a-z0-9]/g, '_')}`;
}
