# Simba UX Architecture: Saving, Favorites, Bookmarks & Playback History Grammar

> **Purpose:** Establish a single, crystal-clear, zero-confusion UX grammar for how users **save**, **favorite**, **subscribe**, **bookmark moments**, **build playlists**, and **resume playback** across all media types in `Simba_EXPO`.
>
> **Status:** Design & Architecture Proposal (no code modified yet).  
> **Scope:** Deep audit of current `Simba_EXPO` codebase + industry research (Spotify, Audible, Pocket Casts, Plex, Jellyfin, Apple Music/TV, YouTube, VLC).

---

## 1. Executive Summary — Direct Answers to Your Questions

| Your Question | Recommended Answer | Why (User Mental Model) |
| :--- | :--- | :--- |
| **1. Should Bookmarks move to Profile and ONLY be created inside the Audio / Video player?** | **YES.** Bookmarks should live in **Profile → Bookmarks** (not auto-shown on Home) and be created **exclusively inside the Audio Player & Video Player**. | A bookmark is a **micro-moment** (`14:20` in a movie or audiobook). You cannot meaningfully mark a timestamp from a catalogue card or detail screen when nothing is playing. Keeping Bookmark creation strictly inside the player makes its purpose instantly obvious. |
| **2. Once bookmarked, does the bookmark's timestamp increase as you keep playing?** | **NO — NEVER.** A bookmark's timestamp is **frozen (immutable)**. | A bookmark is like a physical sticky note on page 142 of a book. If you jump to `14:20` and keep watching to `35:00`, the sticky note stays at `14:20` while your **Resume Position (Jump Back In)** moves to `35:00`. A single movie or audiobook can also hold **multiple bookmarks** (`14:20`, `41:05`, `1:12:30`). |
| **3. Should Movies, Music, Audiobooks, Archive, Radio & Live TV use Favorites (`♥`)?** | **YES.** Every standalone title/station/channel gets a **universal Heart (`♥`) = Favorite** action. | Today, Heart means "Favorite" on Radio/Live TV, while Bookmark means "Save" on Movies/Music/Audiobooks (yet Profile & Home still draw a Heart icon for Bookmarks!). Separating **Heart = Love this title** from **Bookmark = Mark this timestamp** eliminates 100% of the confusion. |
| **4. Should Favorites be one unified Profile screen or separate rows per media type?** | **One unified `Favorites` hub in Profile with filter chips** (`All`, `Movies`, `Music`, `Audiobooks`, `Radio`, `Live TV`, `Archive`, `Shows`), plus **Pin to Home**. | Splitting into 7+ separate Profile rows (`Favorite Movies`, `Favorite Music`, `Favorite Audiobooks`, `Favorite Stations`, `Favorite Channels`, etc.) bloats Profile to 13+ rows. A single **Favorites** hub with instant filter chips (Spotify / Apple / modern Plex pattern) keeps Profile to a clean **6 rows** while still letting users slice by type in 1 tap. *(Full comparison of all 3 layout options in Section 5.)* |
| **5. Should Recent (`Jump Back In`) always stay on Home, and does its time increase as you play?** | **YES to both.** `Jump Back In` stays permanently at the top of Home, and its timestamp **continuously updates** as you play. | `Jump Back In` answers *"Where did I leave off?"* with zero manual effort. Finite media updates live (`14:20 / 48:10` + progress bar) and auto-resumes. Live Radio & Live TV also appear for 1-tap retuning, but show a **LIVE** badge with **no progress bar or fake timestamp**. |

---

## 2. Deep Audit: Why the Current `Simba_EXPO` UX Feels Confusing

Inspecting the current codebase reveals **5 exact architectural contradictions** that explain why users get confused today:

### 2.1 Icon & Verb Collision (`♥` vs. `🔖`)
* `ProfileScreen.tsx` (line 354) and `HomeScreen.tsx` (line 457) display a **red Heart (`heart` / `heart-outline`)** for **"Saved Bookmarks"**.
* `MediaDetailScreen.tsx` (line 494) displays a **Heart** for **Live TV & Radio Favorites**, and a **Bookmark ribbon** (line 514) for **Movies, Music, Audiobooks & Archive**.
* Result: Users tap a **Bookmark ribbon** on a movie, and then see it under a **Heart icon** on Home & Profile — while tapping a **Heart** on Live TV sends it somewhere completely different (`Favorite Channels`).

### 2.2 Bookmarks Are Currently Fake-Timestamped Single Toggles
* In `useSimbaStore.tsx` (lines 674–700), `toggleBookmarkItem()` **hardcodes** `positionLabel: '14:20'` and `durationLabel: '48:10'` regardless of what is playing (or even if nothing is playing!).
* It checks `prev.find(b => b.itemId === item.id)` and **removes** the bookmark on a second tap — meaning you can only ever have 1 bookmark per item, making it behave like a Favorite toggle wearing a fake timestamp costume.
* In `SavedScreen.tsx` (lines 138–150), tapping a bookmark does **not** seek to the bookmarked timestamp — it just calls `playCatalogueItem(target)` from `0:00`.

### 2.3 Asymmetry Inside the Players
* `AudioPlayerScreen.tsx` (line 252) shows a Bookmark button even during **Live Radio** (where `canBookmarkItem` returns `false`, so tapping it silently does nothing!).
* `VideoPlayerScreen.tsx` (lines 710–750) has **no Bookmark button and no Favorite button at all** — so you cannot bookmark a scene in a movie while watching it!

### 2.4 Missing "Favorite" for Non-Live Media
* `useSimbaStore.tsx` only has `favoriteRadioIds` and `favoriteTvIds`.
* Movies, Music, Audiobooks, Archive items, TV Shows, and Local files have **no Favorite state**, forcing users to misuse Bookmarks as a "save this movie/song" button.

### 2.5 `Jump Back In` Never Tracks Real Playback Progress
* `useSimbaStore.tsx` (lines 541–553) only writes to `history` when `playItem(item)` is first called. It **never** persists `mpvProgress.positionMs` as playback advances.
* `HomeScreen.tsx` (line 382) falls back to `progress={item.progress ?? 0.15}` — which draws a **fake 15% gold bar** on every item, including Live Radio and Live TV!

---

## 3. Industry Research: How Best-in-Class Media Apps Solve This

Every major media app that users intuitively understand enforces a strict separation between **four mental models**:

| Mental Model | User Question | Automation | Scope | Real-World Benchmarks |
| :--- | :--- | :--- | :--- | :--- |
| **Continue / Recent** | *"Where did I leave off?"* | **Automatic** (system-tracked) | 1 live cursor per item (overwritten as you play) | **Spotify** (*Jump back in*), **Plex / Jellyfin** (*Continue Watching*), **Audible** (*Continue Listening*), **Netflix** |
| **Favorites (`♥`)** | *"What do I love & want to find again?"* | **Manual** (1-tap toggle) | **Macro** — the entire title, track, station, or channel | **Spotify** (*Liked Songs*), **Apple Music** (*Favorite*), **Jellyfin / Plex** (*Favorites*), **Radio/IPTV apps** |
| **Subscriptions (`+`)** | *"Keep me updated on this ongoing show."* | **Manual** (Follow toggle) | **Container** — an episodic feed that publishes new items | **Apple Podcasts** (*Follow*), **Pocket Casts** (*Subscribe*), **Spotify** (*Follow Show*) |
| **Bookmarks (`🔖`)** | *"Save this exact moment to revisit."* | **Manual** (inside player only) | **Micro** — an immutable `mm:ss` timestamp (+ optional note), **many per item** | **Audible** (*Clips & Notes*), **Pocket Casts** (*Bookmarks* in player + Profile tab), **Snipd** |
| **Playlists (`≡+`)** | *"Group these in my own order."* | **Manual** (curated list) | **Custom collection** — user-named ordered lists | **Spotify**, **YouTube**, **Plexamp**, **VLC** |

### Key UX Takeaways from Industry Research
1. **Never conflate Macro (Favorites) with Micro (Bookmarks).** When an app uses one icon or one screen for both, users constantly ask *"Will this save the movie or save my timestamp?"*
2. **Never conflate Automated Continuity (Resume Position) with Intentional Capture (Bookmarks).**
   * **Resume Position** is invisible, temporary, live-updating, and 1-per-item.
   * **Timestamp Bookmark** is intentional, permanent, frozen at the moment you tapped, and many-per-item.
3. **The "Welcome Back" Context Buffer (Audible & Pocket Casts best practice):** When auto-resuming spoken word (Audiobooks, Podcasts) or Movies after a pause/exit, rewind **3 seconds** (`Math.max(0, elapsedSeconds - 3)`) so the user doesn't drop mid-sentence.
4. **Mobile Library Consolidation (Spotify / Apple pattern):** On mobile, having a **single unified Favorites hub with horizontal type filter chips** outperforms 7 separate menu rows in Profile because users never hunt through a long settings-like list, yet can still filter to *just Movies* or *just Live TV* in 1 tap.

---

## 4. The Simba 5-Verb UX Grammar (Proposed Standard)

To make Simba effortless for any user to understand on day 1, adopt **5 mutually exclusive verbs**. Every verb has **one icon**, **one meaning**, and **one home**:

```text
┌───────────────────┬───────────────┬─────────────────────────────┬─────────────────────────────────────────┐
│ Verb              │ Icon          │ Meaning to User             │ Where It Can Be Triggered               │
├───────────────────┼───────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ 1. Favorite       │ ♥ (Heart)     │ "I love this whole item."   │ Detail page, Cards, Audio/Video Player  │
│ 2. Subscribe      │ ◉ / + Follow  │ "Follow this podcast show." │ Podcast Detail page, Podcast cards      │
│ 3. Bookmark       │ 🔖 (Ribbon)   │ "Mark this exact timestamp."│ Audio Player & Video Player ONLY        │
│ 4. Playlist       │ ≡+ (List)     │ "Add to my custom list."    │ Detail page, ⋮ Menus, Players           │
│ 5. Jump Back In   │ ↺ (History)   │ "Pick up where I left off." │ 100% Automatic (never manual)           │
└───────────────────┴───────────────┴─────────────────────────────┴─────────────────────────────────────────┘
```

### Rule 1: Favorite (`♥`) — Macro, Whole-Item Curation
* **Icon:** `heart-outline` (inactive) → `heart` filled in gold/red (active). **Never** use a heart icon for Bookmarks.
* **Applies to:** Movies, Music, Audiobooks, Archive Audio/Video, Radio Stations, Live TV Channels, TV Shows (Guide), Podcast Episodes, and Local Audio/Video files.
* **Does NOT apply to:** Podcast Shows (they use **Subscribe** instead, so a user never wonders whether to "Heart" or "Subscribe" to a podcast!).
* **Behavior:** Simple on/off toggle. Saves the full item metadata snapshot. **Zero timestamps involved.**
* **Pin to Home:** Any Favorite can be **Pinned** from Profile → Favorites to appear on Home (defaults to `pinned: false`).

### Rule 2: Subscribe (`+ Subscribe`) — Ongoing Podcast Shows Only
* **Icon:** `rss` / `podcast` + pill button `+ Subscribe` / `Subscribed`.
* **Applies to:** Podcast Shows (`kind === 'podcast'` feed).
* **Behavior:** Lives in **Profile → Subscribed Podcasts**. Defaults to `pinned: false`; pinning a show surfaces it in Home's **Your Subscriptions** rail.
* **Inside a Podcast Show:** Individual episodes are playable audio items, so while listening to an episode in the Audio Player you can **Bookmark a moment (`🔖`)** or **Favorite (`♥`)** that standout episode.

### Rule 3: Bookmark (`🔖`) — Micro, Immutable Timestamp Markers (Player-Only)
* **Icon:** `bookmark-outline` / `bookmark-plus` (in player) and `bookmark` (in Profile & Detail). **Never** use a heart icon.
* **Where you can create one:** **ONLY inside `AudioPlayerScreen` and `VideoPlayerScreen`** while media is loaded.
  * **Removed** from `MediaDetailScreen` top bar, catalogue cards, and `⋮` browse menus (where `♥ Favorite` replaces it!).
* **Applies to:** Finite, seekable media only — **Movies, Audiobooks, Podcast Episodes, Archive Audio/Video, Music (especially long mixes/sets), Local Audio/Video**.
* **Hidden on:** **Live TV** and **Live Radio** (live broadcasts have no seekable timeline).
* **Timestamp Semantics (CRITICAL):**
  * Captures the **real** current playback position (`mpvProgress.positionMs`) and total duration (`mpvProgress.durationMs`) at the exact moment you tap `🔖`.
  * **Frozen forever:** Playing from a bookmark at `14:20` seeks the player to `14:20`, and as playback continues to `28:00`, the bookmark **remains at `14:20`**.
  * **Multiple per item:** Tapping `🔖` at `14:20` and again at `41:05` creates **two** bookmarks on the same movie/audiobook (with a quick toast: *"Bookmarked at 14:20 · Add note"* so it's 1-tap effortless while driving or watching, with optional note editing).
  * **Tapping a bookmark** in **Profile → Bookmarks** (or in the item's `MediaDetail → Bookmarks` tab) launches the player and **seeks directly to `positionSeconds`**.
* **Home Visibility:** Lives in **Profile → Bookmarks** (NOT auto-cluttering Home). Optionally supports a per-bookmark or section **Pin to Home** if the user ever wants quick access, defaulting to **unpinned**.

### Rule 4: Playlist (`≡+`) — Custom Ordered Lists
* **Icon:** `playlist-music` / `playlist-plus`.
* **Applies to:** Playable finite media (Audio lane playlists vs. Video lane playlists). Excluded on Live TV, Live Radio, Podcast Shows (feeds), and TVMaze metadata-only guides.
* **Home Visibility:** Lives in **Profile → Playlists**, appears on Home only when **Pinned** (`pinned: false` by default).

### Rule 5: Jump Back In & Playback History (`↺`) — Automatic Continuity
* **Home Visibility:** **ALWAYS naturally on Home** (top rail, right below the header) once the user has played at least 1 item.
* **Live Position Updating:**
  * While playing finite media, the store updates the item's `elapsedSeconds`, `durationSeconds`, `progress`, and `elapsedTotalLabel` **every 5 seconds** (throttled in memory, persisted to disk on pause, seek, background, minimize, or close).
  * **Smart Completion Rule (`≥ 95%` or `< 15s` remaining):** Marks the item as finished (`progress: 1`, `completed: true`). Tapping it again replays cleanly from `0:00` instead of opening at the end credits!
  * **Short Music Track Rule (`duration < 6 min`):** Still appears in `Jump Back In` and `Playback History`, but tapping it starts from `0:00` (nobody wants a 3-minute song to resume at `2:41`). Long music sets/mixes (`≥ 10 min`), Movies, Audiobooks, Podcast Episodes, and Archive recordings resume from `Math.max(0, elapsedSeconds - 3)`.
  * **Live Radio & Live TV Rule:** Appears in `Jump Back In` & `Playback History` for 1-tap retuning, but displays a **`LIVE`** badge with **NO progress bar and NO elapsed/total timestamp**.
* **Difference between Home's `Jump Back In` and Profile's `Playback History`:**
  * **Home → `Jump Back In`:** Horizontal rail of your **8 most recent** items, optimized for 1-tap instant resume.
  * **Profile → `Playback History`:** Full chronological log (up to e.g. 50–100 items) with search/filter, individual remove (`×`), and `Clear All`.

---

## 5. Profile Information Architecture: Unified Favorites vs. Separate Rows

This is the biggest layout decision for **Profile → Your Collection**. Below is an honest comparison of the 3 options:

### Option A: Unified `Favorites` Hub with Media-Type Filter Chips *(Recommended)*

**Profile → Your Collection (6 clean, balanced rows):**
```text
Your Collection
├── ♥  Favorites                14 saved          >   (Opens Favorites screen with filter chips!)
├── ◉  Subscribed Podcasts       3 shows          >   (Dedicated screen, Pin to Home)
├── 🔖 Bookmarks                 5 moments        >   (Dedicated screen, exact timestamps + seek)
├── ≡  Playlists                 2 playlists      >   (Dedicated screen, Audio/Video, Pin to Home)
├── ↺  Playback History         12 played         >   (Dedicated screen, full log + resume progress)
└── 📁 On This Phone             1 folder         >   (Local linked folders)
```
*(Plus `Handpicked Mixes` either under Explore or as a lightweight row if desired.)*

**Inside the `Favorites` Screen:**
```text
← Favorites                                    14 saved
  [ All (14) ] [ Movies (3) ] [ Music (4) ] [ Audiobooks (2) ] [ Radio (2) ] [ Live TV (2) ] [ Shows (1) ]
  ─────────────────────────────────────────────────────
  🎬  Nosferatu (1922)                 [Pin]  [♥]
      Movie · Classic Cinema
  📻  Radio Armisa                     [Pin]  [♥]
      Radio · Italy
  📺  ADN TV+                          [Pin]  [♥]
      Live TV · France
  🎵  Midnight Echoes                  [Pin]  [♥]
      Music · Jamendo
```
* **Only chips with `count > 0` (or `All` + active types) need to show**, so the chip bar stays clean and never shows empty clutter.
* Every favorite row has a **Pin** button (`pin` / `pin-outline`) and an **Unfavorite** button (`♥`).
* **Pros:**
  * Profile stays super clean (**6 rows**, zero scrolling fatigue).
  * Scales effortlessly to all 9+ media types + Local files without adding new Profile rows ever again.
  * Matches how **Spotify**, **Apple**, and **YouTube** organize personal libraries on mobile.
  * Still lets users view *only* Favorite Movies or *only* Favorite Live TV in 1 tap.
* **Cons:**
  * Takes 1 extra tap (open Favorites → tap `Live TV` chip) compared to having a dedicated `Favorite Channels` row directly on Profile.

---

### Option B: Separate Profile Rows per Media Type

```text
Your Collection
├── ◉  Subscribed Podcasts
├── 🎬 Favorite Movies
├── 🎵 Favorite Music
├── 📖 Favorite Audiobooks
├── 📻 Favorite Stations (Radio)
├── 📺 Favorite Channels (Live TV)
├── 🏛 Favorite Archive
├── 📺 Favorite Shows
├── 🔖 Bookmarks
├── ≡  Playlists
├── ↺  Playback History
└── 📁 On This Phone
```
* **Pros:** Zero chips needed inside each screen; 1 tap from Profile to a specific type.
* **Cons:** **12+ rows** in Profile before you even reach *Playback & Preferences*. Feels like a file manager instead of a luxury editorial media app, and most rows will sit at `0 saved`.

---

### Option C: Hybrid — `Favorites` (On-Demand) + `Live Favorites` (Radio & TV)
* Keep `Favorites` (with chips: `All`, `Movies`, `Music`, `Audiobooks`, `Archive`, `Shows`) separate from `Live Stations & Channels` (with chips: `All`, `Radio`, `Live TV`).
* **Pros:** Separates "On-demand library" from "Live broadcast tuner" while keeping Profile to **7 rows**.
* **Cons:** Still makes the user pause for half a second: *"Is Radio under Favorites or Live?"*

### Verdict: **Option A (Unified `Favorites` Hub with Dynamic Type Filter Chips)**
Option A gives the **cleanest mental model in the entire app**:
> *"Anything I tap `♥` on goes into **Favorites**. Inside Favorites, I can filter by Movies, Music, Audiobooks, Radio, Live TV, Archive, or Shows — and pin anything I want onto Home."*

---

## 6. Home Screen Architecture (Natural vs. Pinned)

With this grammar, **Home** becomes remarkably calm, personal, and predictable:

| Order | Home Section | Appears When… | Behavior |
| :---: | :--- | :--- | :--- |
| **1** | **Jump Back In** | **Natural** (whenever `history.length > 0`) | Top 8 recently played items. Live-updating elapsed/total time & progress bar for finite media; `LIVE` badge (no progress bar) for Radio/Live TV. Tap = instant resume. |
| **2** | **Pinned Favorites** *(or grouped rails if user pins multiple types: Pinned Channels / Stations / Favorites)* | **Opt-in** (only items the user explicitly pinned in Profile → Favorites) | 1-tap access to favorite movies, songs, radio stations, or live TV channels. Tap = opens Detail page (or tunes Live Radio/TV). |
| **3** | **Your Subscriptions** | **Opt-in** (only Podcasts pinned in Profile → Subscribed Podcasts) | Square podcast avatars. Tap = opens Podcast Detail. |
| **4** | **Pinned Playlists** | **Opt-in** (only Playlists pinned in Profile → Playlists) | Horizontal playlist cards. Tap = opens Playlist Detail. |
| **5+** | **Discovery Rails** (*Handpicked Mixes, Picked For Today, Classic Cinema, Trending Podcasts, Sound & Airwaves, Best For You*) | **Natural** (live editorial feed) | Curated discovery across all 9 public libraries. |

> **Notice what is NO LONGER cluttering Home by default:**
> * **Bookmarks** are no longer forced onto Home (they live cleanly in **Profile → Bookmarks** and inside each item's **Detail → Bookmarks** tab).
> * **Unpinned Favorites, Unpinned Podcasts, and Unpinned Playlists** stay neatly in Profile until pinned.

---

## 7. Complete Media-Type Capability Matrix (Zero Edge-Case Gaps)

Every single `MediaKind` from `Simba_EXPO/src/types/media.ts` accounted for:

| Media Type (`MediaKind`) | Favorite (`♥`) | Subscribe (`+`) | Player Bookmark (`🔖`) | Add to Playlist (`≡+`) | Jump Back In (`↺`) Behavior |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Movie** (`movie`) | ✅ Yes | ❌ No | ✅ Yes (Video Player) | ✅ Video Playlist | Live progress + auto-resume (`-3s`) |
| **Music** (`music`) | ✅ Yes | ❌ No | ✅ Yes (Audio Player) | ✅ Audio Playlist | Shown in Recent; replays from `0:00` if `< 6 min`, resumes if `≥ 10 min` |
| **Podcast Show** (`podcast` feed) | ❌ No *(use Subscribe)* | ✅ Yes | ❌ No *(not a playable file)* | ❌ No | N/A *(individual episodes appear instead)* |
| **Podcast Episode** (`podep-*`) | ✅ Yes | ❌ No *(show-level)* | ✅ Yes (Audio Player) | ✅ Audio Playlist | Live progress + auto-resume (`-3s`) |
| **Audiobook** (`audiobook`) | ✅ Yes | ❌ No | ✅ Yes (Audio Player) | ✅ Audio Playlist | Live progress + auto-resume (`-3s`) |
| **Radio Station** (`radio`) | ✅ Yes | ❌ No | ❌ No *(live stream)* | ❌ No | Shown with **`LIVE`** badge, **no progress bar**, 1-tap retune |
| **Live TV Channel** (`live-tv`) | ✅ Yes | ❌ No | ❌ No *(live stream)* | ❌ No | Shown with **`LIVE`** badge, **no progress bar**, 1-tap retune |
| **Archive Audio** (`archive-audio`) | ✅ Yes | ❌ No | ✅ Yes (Audio Player) | ✅ Audio Playlist | Live progress + auto-resume (`-3s`) |
| **Archive Video** (`archive-video`) | ✅ Yes | ❌ No | ✅ Yes (Video Player) | ✅ Video Playlist | Live progress + auto-resume (`-3s`) |
| **TV Show Guide** (`TVMaze`, no stream) | ✅ Yes *(Watchlist / Track show)* | ❌ No | ❌ No *(no stream)* | ❌ No | Never enters Playback History unless matched to a local file |
| **Local Audio / Video** (`source: 'local'`) | ✅ Yes | ❌ No | ✅ Yes (Audio/Video Player) | ✅ Matching Lane | Live progress + auto-resume (`-3s`) |

---

## 8. Surface-by-Surface Action Audit (Where Each Button Lives)

| Screen / Surface | Top Bar / Quick Action | Primary Buttons / Menu (`⋮`) |
| :--- | :--- | :--- |
| **Catalogue Cards** (Explore, Browse, Search) | Optional subtle `♥` on Radio & Live TV cards (already works well!) | `⋮` sheet: Play, Add to Queue, Favorite (`♥`) or Subscribe (`+` for Podcasts), Add to Playlist. **NO Bookmark option.** |
| **Media Detail Screen** | Back · **`♥` Favorite** *(hidden on Podcast Shows)* · `⋮` More. **NO Bookmark icon here.** | Podcast Shows get **`+ Subscribe`** pill in hero. Playable items get `Play Now`, `Add to Queue`, `+ Playlist`. Existing player bookmarks for this item appear in the **Bookmarks / Notes** tab so you can jump straight to saved scenes/quotes. |
| **Audio Player Screen** | Minimise · Context Label · **`♥` Favorite** · **`🔖` Bookmark Moment** *(hidden on Live Radio)* · Queue · `⋮` More · Close | Tapping `🔖` captures **exact `displayPositionMs` / `durationMs`** and shows a toast: *"Bookmarked at 14:20"* (with optional *"Add note"* tap). Tapping `🔖` again at `28:45` adds a **second** bookmark rather than deleting the first! |
| **Video Player Screen** | Minimise · Title · **`♥` Favorite** · **`🔖` Bookmark Moment** *(hidden on Live TV)* · `⋮` More · Close | Same exact behavior as Audio Player: 1-tap captures live `displayPositionMs` / `durationMs` + HUD confirmation *"Bookmarked at 42:18"*. |
| **Profile → Favorites** | Dedicated screen with dynamic filter chips (`All`, `Movies`, `Music`, `Audiobooks`, `Radio`, `Live TV`, `Archive`, `Shows`) | Each row: Artwork, Kind badge, Title/Subtitle, **Pin to Home (`📌`)**, **Remove (`♥`)**. |
| **Profile → Bookmarks** | Dedicated screen (optional filter by `All` / `Audio` / `Video`, or grouped by title) | Each row: Artwork, **Frozen Timestamp Pill (`14:20 / 48:10`)**, Title, optional Note, **Delete (`🗑`)**. Tap = opens player & **seeks directly to `14:20`**. |
| **Profile → Playback History** | Dedicated screen (`Clear All` in top right) | Each row: Artwork, Kind badge, **Live Resume Badge (`28:05 / 48:10` or `LIVE`)**, Title/Subtitle, **Remove (`×`)**. Tap = resumes playback at saved position. |

---

## 9. Concrete Data Model Changes (Ready When You Approve)

When we move to implementation, the state changes in `useSimbaStore.tsx` & `profileStorage.ts` are clean and backward-compatible:

```ts
// 1. Unified Favorites (replaces fragmented favoriteRadioIds / favoriteTvIds / favoriteStations)
export interface FavoriteRecord {
  itemId: string;
  item: CatalogueItem;          // Full snapshot so offline/cold-boot always renders artwork & metadata
  addedAt: number;              // Epoch ms for "Recently Favorited" sorting
  pinned: boolean;              // Defaults to false — only pinned favorites appear on Home
}

// 2. True Immutable Timestamp Bookmarks (replaces fake-timestamp toggle)
export interface TimestampBookmarkRecord {
  id: string;                   // Unique per marker (allows MULTIPLE bookmarks per itemId)
  itemId: string;
  positionSeconds: number;      // FROZEN at creation time — NEVER mutated by future playback
  durationSeconds: number;      // Real duration from libmpv at creation time
  note?: string;                // Optional user note (e.g. "Great quote about cinema")
  createdAt: number;
  item: CatalogueItem;          // Full snapshot
}

// 3. Live-Updating Playback History (extends CatalogueItem in history[])
export interface HistoryEntry extends CatalogueItem {
  lastPlayedAt: number;         // Epoch ms
  elapsedSeconds: number;       // Auto-updated every ~5s + on pause/seek/close (0 for live streams)
  durationSeconds?: number;     // Real duration from libmpv (undefined for live streams)
  progress: number;             // 0..1 (undefined for live streams — never fake 0.15!)
  completed?: boolean;          // True when progress >= 0.95 (next tap restarts at 0:00)
}
```

### Safe Migration Path for Existing User Profiles
* Existing `favoriteRadioIds`, `favoriteTvIds`, and `favoriteStations` automatically migrate into `favorites: FavoriteRecord[]` preserving `pinnedStationIds` → `pinned: true`.
* Existing legacy `bookmarks` that have the fake hardcoded `'14:20'` / `'48:10'` can either be cleanly converted into `favorites` (since the user originally tapped them from detail pages to save the title!) or kept in `bookmarks` with a clean migration note.

---

## 10. Final Locked UX Decisions (Optimized for Maximum User Easiness)

| Decision | Locked Choice | Why It Is Easiest for Users |
| :--- | :--- | :--- |
| **1. Profile Favorites Layout** | **Option A — Unified `Favorites` hub with dynamic filter chips** | One rule to remember: *"Tap `♥` anywhere → find it in **Favorites**."* Profile stays at a clean **6 rows** instead of 12+, and only chips with saved items appear (`[All]`, `[Movies]`, `[Radio]`, `[Live TV]`, etc.). |
| **2. Pinned Favorites on Home** | **One single `Pinned Favorites` rail** | Pinning 1 Movie + 1 Radio station + 1 Live TV channel creates **1 neat shelf** (each card labeled with its subtle kind badge) instead of exploding Home into 3–4 sparse 1-item rows. |
| **3. Bookmarks Visibility** | **Strictly in `Profile → Bookmarks` + inside each item's `Detail → Bookmarks` tab** *(no Home rail, no Pin-to-Home)* | Keeps Home calm and focused on active playback (`Jump Back In`) and macro shortcuts. Micro-moments stay neatly organized where users intentionally look for them: globally in Profile and contextually inside the title's Detail page. |

### Final 1-Sentence Mental Model for Any User
> **Play** something → it's automatically in **Jump Back In** (with live resume).  
> **Heart (`♥`)** something → it's in **Favorites** (pin to Home if you want it up front).  
> **Subscribe (`+`)** to a podcast → it's in **Subscribed Podcasts**.  
> **Bookmark (`🔖`)** inside a player → freezes that exact timestamp in **Bookmarks**.  
> **Playlist (`≡+`)** → builds your custom list in **Playlists**.
