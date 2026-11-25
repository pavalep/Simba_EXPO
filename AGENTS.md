# SIMBA (Expo) — project rules

This is the **new** SIMBA app: Expo **SDK 58** + **expo-router**. It is the
successor to `MOBILE_APP_REACT_NATIVE` (V1) and its `srcV2` tree.

## What this app is right now

A **UI-first build**: every screen is complete and interactive, but it runs on
**dummy data** (`src/data/dummy.ts`) with **no network** and **no native
player module**. The real data layer and the real libmpv bridge are wired in
later — the shapes do not change, because the dummy fixtures are typed against
SIMBA's own copied contracts in `src/types/`.

## Non-negotiables

1. **SIMBA's palette is Lion Gold**, never CodecM's green. The tokens live in
   `src/theme/tokens.ts` and every colour in the app comes from them.
   **A gold surface carries near-black ink, never white** (white on gold is
   2.9:1; near-black is 6.7:1).
2. **No literal hex colour and no inline `fontSize`** outside the token
   sheet. Use `useTheme()` → `colors` / `spacing` / `radius`, and
   `AppText` with a `variant`.
3. **Real icons only** — `@expo/vector-icons` (MaterialCommunityIcons).
   A text glyph (`▶`, `★`) is never a control.
4. **No invented affordances.** Every control and section must exist in a
   shipping screen: SIMBA's own V1 app, CodecM, or the Penpot V24 canvas
   (`MOBILE_APP_REACT_NATIVE/designs/penpot-v24/`). If you cannot point to
   one, leave it out.
5. **No AI jargon in user-facing copy** ("AI", "smart", "intelligent",
   "powered by").
6. **The domain types are copied, never re-invented.** `src/types/` is
   SIMBA's own `src/types/{media,playback,playlist,api}.ts` verbatim.

## Structure

```
src/app/                    expo-router routes (only files here are screens)
  _layout.tsx               root: fonts + ThemeProvider + SimbaDummyProvider + Stack
  (tabs)/                   persistent 3-tab shell (Home / Explore / Profile) + MiniPlayerDock
  splash.tsx                01.1 Lion Gold brand moment (#B8922E on #0A0A0C)
  onboarding.tsx            01.2 taste calibration (no standalone login route exists)
  search.tsx                03.3–03.6 3-State Universal Search (Zero-State / Typing / Results)
  curated-mixes.tsx         03.7 Personalised Sessions & Daily Mix Studio
  catalogue/[lane].tsx      04.1–04.8 All 8 dedicated catalogue browse pages + FilterSheets
  media/[id].tsx            05.1–05.5 310dp Hero + Scroll-Blur Header + 4-Tab Detail + Sheets
  player/audio.tsx          06.1–06.2 38-bar waveform audio player + More & 10-band Equalizer
  player/video.tsx          06.3–06.5 D9 VOD & Live IPTV player + Channel Switcher + More sheet
  player/queue.tsx          06.7 Playback Queue (Now Playing, Reorder, Shuffle/Clear, Undo, History)
  saved.tsx                 07.2 Segmented Saved Bookmarks & Playback History
  library.tsx               07.3–07.4 My Podcasts, All Playlists, Local Files & Offline Downloads
  folders.tsx               07.5 Folder Linking Wizard (3 steps) & Active Linked Folders ("Remove")
  legal/[slug].tsx          07.6 About, Lifetime Stats, Help, Credits, Changelog, Licenses, Privacy, Terms
src/components/ui/          shared kit (AppText, Screen, SectionHeader, Surface, Chip, Badge, Button,
                            ProgressBar, IconButton, MediaTile, Rail, Sheet, FilterSheet, FilterIconButton)
src/components/player/      MiniPlayerDock (persistent cutout dock + PiP window preview, 01.3 & 06.6)
src/components/screens/     one file per screen covering all 54 Penpot V24 boards
src/state/                  useSimbaDummyStore.tsx (interactive session state across all screens)
src/theme/                  tokens + ThemeProvider (SIMBA Lion Gold & Deep Lion Brown)
src/data/dummy.ts           typed fixtures satisfying SIMBA's copied domain contracts
src/types/                  SIMBA's copied domain contracts
```

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code against an
Expo / EAS / React Native API:

1. Read the major version of `expo` in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` and follow its
   links. Never answer from memory.

## Commands

```bash
npx expo install <package>   # ALWAYS instead of npm add - resolves SDK-compatible versions
npx expo start               # dev server
npx expo lint                # lint
npx tsc --noEmit             # typecheck
npx expo-doctor              # diagnose dependency and config issues
```

**Run `npx tsc --noEmit` before declaring any task done.**

## Navigation

- **expo-router** for all navigation. Routes live in `src/app/`; keep
  non-route code outside it. Import `router`, `Link`, `useRouter`,
  `useLocalSearchParams` from `expo-router`.
- From **SDK 56**, `@react-navigation/*` must NOT be imported in app code.

## Native builds

- `ios/` and `android/` are **generated** (Continuous Native Generation).
  Never edit them by hand - configure native behaviour in `app.json` and
  config plugins.
- **Never run `npx expo prebuild` without `--no-clean`.**
- Expo Go only includes its bundled native modules. After adding a library with
  native code (for example `@simba-dev/react-native-media-player`, which has
  **no config plugin** yet), the app needs a development build:
  `npx expo run:android` or `eas build --profile development`.
