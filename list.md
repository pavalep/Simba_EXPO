# Simba_EXPO — Full Screen Audit, Loading Consistency & QA Report

**Date:** 2026-11-26  
**Target Build:** `com.simba.player` (Expo SDK 58 + `expo-router` + React Native 0.88.1 + `@simba-dev/react-native-media-player`)  
**Verification Method:** Static TypeScript check (`npx tsc --noEmit` = 0 errors) + Live Android Emulator (`emulator-5554`) end-to-end navigation & visual inspection via Argent MCP.

---

## 1. Executive Summary

Every primary and secondary screen in `Simba_EXPO` was audited for:
1. **Unified shimmer/skeleton loading states** — eliminated jarring mixed states where static/local sections appeared alongside loading skeletons.
2. **Sticky top header controls** — verified across all 13 screens; fixed `MediaDetailScreen` so its top bar (`Back`, `Bookmark`/`More`) floats cleanly over the full-bleed hero artwork and stays permanently pinned while scrolling.
3. **Domain & data integrity** — enforced the **Podcast Show = Follow Only / Podcast Episode & Playable Media = Bookmarkable** rule across the entire app, fixed profile persistence across restarts/reloads, fixed missing bookmark & detail hero artwork, and fixed keyboard-tap handling in Search.
4. **Playback reliability & smoothness** — fixed podcast episode playback and upgraded audio/video/mini-player seekbars to smooth 10 Hz interpolation with full horizontal finger-drag scrubbing.

---

## 2. Page-by-Page Verification Matrix

| # | Screen / Route | Sticky Header | Loading / Shimmer State | Data / Content Verified | Status |
|---|---|---|---|---|---|
| 1 | **Home** (`/(tabs)/index`) | Sticky frosted header (`Simba`, live weather, Search icon — Filter removed) | Unified `HomeFeedShimmer` now skeletons personal sections (`Jump Back In`, `Your Subscriptions`, `Saved Bookmarks`, `Pinned Playlists`) **together** with live feed rails while loading | Live weather, Subscriptions, Bookmarks (with artwork thumbnails), Handpicked Mixes (4), Picked For Today, Silver Screen Classics, Stories & Voices, Sound & Airwaves | **Verified** |
| 2 | **Explore** (`/(tabs)/explore`) | Sticky frosted header + Sort filter button | Unified `ShowcaseShimmer` covers `Browse all <Category>`, 230dp Showcase card, Handpicked Mixes row, `Worth a listen & watch` header, and 4 list rows | All 8 live tabs (`All`, `Movies`, `Shows`, `Podcasts`, `Music`, `Radio`, `Live TV`, `Audiobooks`, `Archive`) load real API data; Podcast showcase shows **Follow Podcast** (not Bookmark) | **Verified** |
| 3 | **Catalogue Browse** (`/catalogue/[lane]`) | Sticky frosted header + FilterSheet button | `CatalogueGridShimmer` (2-col) / `CatalogueListShimmer` (rows) + automatic infinite-scroll pagination shimmer | Dedicated per category (no common lane switcher), all genres moved inside `FilterSheet`, borderless 2-col grid cards, automatic infinite pagination, Podcast overflow shows **Follow / Unfollow** | **Verified** |
| 4 | **Media Detail** (`/media/[id]`) | **Fixed:** Permanently pinned `position: 'absolute'` top overlay (`Back`, `Bookmark` for playable items, `More`) transitioning to frosted bar at `>140dp` scroll | **Added:** `ShimmerBox` synopsis skeleton + `CatalogueListShimmer` for Episodes & Tracks while loading | Multi-source lookup (`liveItemRegistry` → `history` → `playlists` → `bookmarks` + legacy ID reconstruction) + automatic cover/synopsis hydration via PodcastIndex/Archive APIs; hides show-level Bookmark on Podcast feeds (keeps `+ Subscribe` & episode-level Bookmark) | **Verified** |
| 5 | **Audio Player** (`/player/audio`) | Fixed full-screen player top bar | `BufferingRing` during stream resolution/buffering | Podcast, Music, Audiobook & Live Radio playback via `libmpv`; **10 Hz smooth interpolated `useSmoothPlaybackPosition`** + draggable `PlayerSeekBar` + fixed `Sleep: Off` pill clipping | **Verified** |
| 6 | **Video Player** (`/player/video`) | Fixed full-screen video overlay chrome (`PIP_CHROME_NATIVE_ID`) | Debounced `BufferingRing` overlay | VOD Movies/Shows/Archive + Live TV mode; smooth 10 Hz `useSmoothPlaybackPosition` + draggable `PlayerSeekBar` + PiP & fullscreen | **Verified** |
| 7 | **Mini-Player Dock** (`MiniPlayerDock`) | Persistent floating dock above tab bar | Smooth live progress bar | Uses `useSmoothPlaybackPosition` for smooth progress progression | **Verified** |
| 8 | **Search** (`/search`) | Sticky frosted header + FilterSheet | `CatalogueListShimmer` during live queries | **Fixed:** `keyboardShouldPersistTaps="handled"` in `Screen.tsx` so tapping suggestions works on first tap; Podcast rows show **Follow / Unfollow** instead of Bookmark | **Verified** |
| 9 | **Handpicked Mixes** (`/curated-mixes`) | Sticky frosted header (`Back`, `Refresh`) | **Added:** Full-page shimmer (`ShimmerBox` chips + mix cards + `CatalogueListShimmer`) while loading | 6 topic chips, Daily Mix, 4 curated mixes with Pin toggle, Picked For Today tracks | **Verified** |
| 10 | **Profile & Library** (`/(tabs)/profile`) | Sticky frosted header | Instant persisted profile load | Google-only native auth (`com.simba.player`), Google photo avatar, Switch Account, per-profile isolated persistence, clean consumer copy | **Verified** |
| 11 | **Your Library** (`/library`) | Sticky frosted header | Instant persisted store hydration | **Fixed:** Podcast rows now render `<MediaArtwork />` and hide `"0 episodes"` when count is 0; clean empty states with CTAs for Podcasts, Playlists, Folders, Downloads | **Verified** |
| 12 | **Keepsakes / Saved** (`/saved`) | Sticky frosted header + Clear All | Instant persisted store hydration | **Fixed:** Saved Bookmarks rows now render `<MediaArtwork />` thumbnails and resolve persisted/legacy items reliably; Playback History tab verified | **Verified** |
| 13 | **Device Folders** (`/folders`) | Sticky frosted header | Instant local state | 5 one-tap standard phone folders (`Music`, `Downloads`, `Movies`, `Audiobooks`, `Podcasts`) + custom folder sheet | **Verified** |
| 14 | **Playback Queue** (`/player/queue`) | Sticky frosted header | Instant session queue | Reorder, shuffle, clear with Undo banner | **Verified** |
| 15 | **About / Legal / Stats** (`/legal/[slug]`) | Sticky frosted header + version badge | Instant local stats & legal copy | 8 switcher pages (`About`, `Stats`, `Help`, `Credits`, `Changelog`, `Licenses`, `Privacy`, `Terms`) backed by live user stats | **Verified** |

---

## 3. Key Fixes Applied in This Pass

1. **Unified Shimmer & Loading Consistency**
   - `src/components/ui/Shimmer.tsx`: Expanded `HomeFeedShimmer` with optional skeletons for `Jump Back In`, `Your Subscriptions`, `Saved Bookmarks`, and `Pinned Playlists`; expanded `ShowcaseShimmer` to cover the full Explore body.
   - `src/components/screens/HomeScreen.tsx`: Wrapped the entire scroll body in `{homeFeed.isLoading ? <HomeFeedShimmer ... /> : (...)}` so personal sections and live rails transition together.
   - `src/components/screens/ExploreScreen.tsx`: Wrapped the entire tab body (below tabs) in `{!showcaseItem ? <ShowcaseShimmer /> : (...)}`.
   - `src/components/screens/CuratedMixesScreen.tsx`: Added full-page shimmer while `homeFeed.isLoading`.
   - `src/components/screens/MediaDetailScreen.tsx`: Added synopsis & episode-list shimmer while hydrating metadata/episodes.
2. **Profile Persistence Reliability**
   - `src/state/useSimbaStore.tsx`: Fixed `signInAsProfile` overwriting/reloading the active snapshot on silent startup restore when `profileId === activeProfileId`; switched snapshot writes to synchronous persistence on state changes so bookmarks, history, subscriptions, and playlists survive reloads and restarts.
   - `src/infrastructure/persistence/profileStorage.ts`: Ensured file creation with `overwrite: true` and added error logging instead of silent catches.
   - Persisted full `CatalogueItem` snapshots on `SavedBookmarkRecord` and `PlaylistRecord`, hydrated `liveItemRegistry` on boot/profile-switch, purged corrupted `"Media Title"` placeholders, and added legacy bookmark provider-ID reconstruction + automatic artwork/synopsis hydration.
3. **Sticky Header Controls Across All Pages**
   - `src/components/screens/MediaDetailScreen.tsx`: Pinned header controls (`position: 'absolute'`, `zIndex: 30`) over the full-bleed hero artwork, smoothly transitioning to a frosted bar on scroll (`>140dp`).
4. **Podcast Follow vs. Playable Item Bookmark Domain Rule**
   - `src/infrastructure/player/index.ts`: Added `isPodcastShow()` and `canBookmarkItem()`.
   - Enforced across `useSimbaStore.tsx`, `MediaDetailScreen.tsx`, `ExploreScreen.tsx`, `SearchScreen.tsx`, and `CatalogueBrowseScreen.tsx` (podcast shows = Follow/Subscribe only; individual podcast episodes & playable media = Bookmarkable).
5. **UX & Playback Polish**
   - `src/components/ui/Screen.tsx`: Added `keyboardShouldPersistTaps="handled"` so Search suggestion taps work immediately while the keyboard is open.
   - `src/components/screens/LibraryScreen.tsx`: Added `<MediaArtwork />` to followed podcast rows and suppressed `"0 episodes"`.
   - `src/components/ui/PlayerSeekBar.tsx` + `src/infrastructure/player/index.ts`: Smooth 10 Hz `useSmoothPlaybackPosition` clock + full tap/drag scrubbing + `Sleep: Off` pill fix.
   - `src/components/screens/HomeScreen.tsx`: Removed filter button and `FilterSheet` from Home header.
