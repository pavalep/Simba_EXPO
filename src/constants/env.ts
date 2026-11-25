/**
 * Runtime environment variables loaded via Expo's built-in `.env` support
 * (`EXPO_PUBLIC_*`). Keep real keys in `.env` (gitignored) and document
 * required variables in `.env.example`.
 */
export const ENV = {
  PODCAST_INDEX_API_KEY: process.env.EXPO_PUBLIC_PODCAST_INDEX_API_KEY ?? '',
  PODCAST_INDEX_API_SECRET:
    process.env.EXPO_PUBLIC_PODCAST_INDEX_API_SECRET ?? '',
  JAMENDO_CLIENT_ID: process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID ?? '',
  AUDIUS_API_KEY: process.env.EXPO_PUBLIC_AUDIUS_API_KEY ?? '',
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

export default ENV;
