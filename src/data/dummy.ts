// ─── Dummy catalogue data for the UI-first Simba_EXPO build ─────────────────
//
// Every record here is TYPED AGAINST SIMBA's own copied contracts
// (src/types/media.ts, src/types/playlist.ts) and matches Penpot page
// `SIMBA_V24_RC` (Swimlanes 01–07) + CodecM 1:1 in SIMBA's Lion Gold & Brown identity.

import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import type {Playlist} from '../types/playlist';
import type {FilterGroup, KindIconName} from '../components/ui';

export interface CatalogueItem {
  id: string;
  title: string;
  /** The creator / channel / author line. */
  subtitle?: string;
  /** The metadata line under the title (duration, year, rating). */
  meta?: string;
  kind: MediaKind;
  /** Maps to one of the 8 catalogue lane ids: movies | shows | podcasts | music | radio | livetv | audiobooks | archive */
  catalogueLaneId?: string;
  lane: MediaLane;
  source: MediaSource;
  provider: string;
  /** SECONDS - the app's unit, everywhere. */
  durationSeconds?: number;
  /** Elapsed seconds for Jump Back In / resume cards. */
  elapsedSeconds?: number;
  /** Formatted "14:20 / 48:10" elapsed/total duration label (02.1 Jump Back In). */
  elapsedTotalLabel?: string;
  /** 0..1 progress fraction. */
  progress?: number;
  /** Match percentage badge ("97% Match", zero AI jargon). */
  affinityPercent?: number;
  year?: string;
  rating?: number;
  genre?: string;
  country?: string;
  language?: string;
  synopsis?: string;
  enrichmentBadge?: string;
  isFeaturedShowcase?: boolean;
  /** Real remote artwork URL when loaded from live APIs. */
  artworkUrl?: string;
  /** Direct playable stream URL (or resolved on play for IA movies / podcasts). */
  streamUrl?: string;
  /** Provider-native identifier (e.g. IA identifier, PodcastIndex feedId, TVMaze showId). */
  externalId?: string;
  /** Optional HTTP headers required by the stream (e.g. IPTV Referer / User-Agent). */
  httpHeaders?: Record<string, string>;
  /** Stand-in icon for the artwork when artworkUrl is absent or fails to load. */
  icon: KindIconName;
}

const defaultLane = (kind: MediaKind): MediaLane =>
  kind === 'movie' ||
  kind === 'video' ||
  kind === 'live-tv' ||
  kind === 'archive-video'
    ? 'video'
    : 'audio';

function item(
  id: string,
  title: string,
  kind: MediaKind,
  icon: KindIconName,
  extra: Partial<CatalogueItem> = {},
): CatalogueItem {
  return {
    id,
    title,
    kind,
    lane: extra.lane ?? defaultLane(kind),
    source: extra.source ?? 'api',
    provider: extra.provider ?? 'Internet Archive',
    icon,
    ...extra,
  };
}

// ─── Home (Swimlane 02.1–02.6) ──────────────────────────────────────────────

export const greeting = {
  userName: 'Paval',
  partOfDay: 'evening',
  /** Live Open-Meteo style summary (02.1). */
  weather: '24°C · Partly cloudy · Bengaluru',
};

export const quickCategories: {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  kind: MediaKind;
  icon: KindIconName;
}[] = [
  {id: 'movies', label: 'Movies', subtitle: 'Classic Cinema', badge: 'HD', kind: 'movie', icon: 'movie-open-outline'},
  {id: 'shows', label: 'Shows', subtitle: 'Series & TV', badge: 'TV', kind: 'video', icon: 'television-classic'},
  {id: 'podcasts', label: 'Podcasts', subtitle: 'Talks & Ideas', badge: 'NEW', kind: 'podcast', icon: 'podcast'},
  {id: 'music', label: 'Music', subtitle: 'Indie & Jazz', badge: 'HQ', kind: 'music', icon: 'music-clef-treble'},
  {id: 'radio', label: 'Radio', subtitle: 'Global Airwaves', badge: 'LIVE', kind: 'radio', icon: 'radio-tower'},
  {id: 'audiobooks', label: 'Audiobooks', subtitle: 'Unabridged Books', badge: 'VOICE', kind: 'audiobook', icon: 'book-open-page-variant-outline'},
  {id: 'livetv', label: 'Live TV', subtitle: 'IPTV Broadcasts', badge: '24/7', kind: 'live-tv', icon: 'access-point'},
  {id: 'archive', label: 'Archive', subtitle: 'Public Vault', badge: 'VAULT', kind: 'archive-audio', icon: 'archive-outline'},
];

export const jumpBackIn: CatalogueItem[] = [
  item('jb-1', 'Charade (1963) — 4K Restoration', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Stanley Donen · Cary Grant & Audrey Hepburn',
    meta: '14:20 / 48:10 · Resume playback',
    elapsedSeconds: 860,
    durationSeconds: 2890,
    elapsedTotalLabel: '14:20 / 48:10',
    progress: 0.3,
    rating: 4.9,
    year: '1963',
    genre: 'Thriller',
    provider: 'Internet Archive',
  }),
  item('jb-2', 'Midnight Kyoto Lo-Fi Sessions', 'music', 'music-clef-treble', {
    catalogueLaneId: 'music',
    subtitle: 'Kitsune Analog Collective',
    meta: '18:10 / 42:10 · Resume playback',
    elapsedSeconds: 1090,
    durationSeconds: 2530,
    elapsedTotalLabel: '18:10 / 42:10',
    progress: 0.43,
    rating: 4.9,
    year: '2024',
    genre: 'Chill',
    provider: 'Jamendo',
  }),
  item('jb-3', 'The Long Answer — Signal & Noise', 'podcast', 'podcast', {
    catalogueLaneId: 'podcasts',
    subtitle: 'Rhea Menon · Episode 12',
    meta: '31:05 / 51:00 · Resume playback',
    elapsedSeconds: 1865,
    durationSeconds: 3060,
    elapsedTotalLabel: '31:05 / 51:00',
    progress: 0.61,
    rating: 4.8,
    year: '2026',
    genre: 'Technology',
    provider: 'PodcastIndex',
  }),
  item('jb-4', 'Radio Swiss Jazz Live', 'radio', 'radio-tower', {
    catalogueLaneId: 'radio',
    subtitle: 'Basel · 24/7 Lossless Broadcast',
    meta: 'LIVE · 128 kbps',
    elapsedTotalLabel: 'LIVE',
    progress: 1,
    rating: 4.8,
    genre: 'Jazz',
    provider: 'Radio Browser',
  }),
];

export const pinnedPlaylists: {
  id: string;
  name: string;
  count: number;
  pinned: boolean;
  kindLabel: string;
  icon: KindIconName;
}[] = [
  {id: 'pl-1', name: 'Late Night Synth', count: 18, pinned: true, kindLabel: 'AUDIO', icon: 'playlist-music'},
  {id: 'pl-2', name: 'Road Trip, No Talking', count: 42, pinned: true, kindLabel: 'AUDIO', icon: 'playlist-music'},
  {id: 'pl-3', name: 'Golden Age Noir Vault', count: 11, pinned: false, kindLabel: 'VIDEO', icon: 'movie-roll'},
  {id: 'pl-4', name: 'Kitchen Radio & Soul', count: 27, pinned: false, kindLabel: 'AUDIO', icon: 'radio'},
];

export interface SavedBookmarkRecord {
  id: string;
  itemId: string;
  label: string;
  note: string;
  at: string;
  positionLabel: string;
  durationLabel: string;
  sourceLabel: string;
  icon: KindIconName;
}

export const savedBookmarks: SavedBookmarkRecord[] = [
  {
    id: 'bm-1',
    itemId: 'bf-1',
    label: '22:15 · Charade (1963)',
    note: 'Seine River Dialogue — camera never cuts away',
    at: 'Charade (1963)',
    positionLabel: '22:15',
    durationLabel: '1:53:20',
    sourceLabel: 'ARCHIVE',
    icon: 'bookmark-outline',
  },
  {
    id: 'bm-2',
    itemId: 'ct-5',
    label: '41:02 · The Long Answer',
    note: 'On paying attention in deep systems engineering',
    at: 'Signal & Noise',
    positionLabel: '41:02',
    durationLabel: '51:00',
    sourceLabel: 'PODCAST',
    icon: 'bookmark-outline',
  },
  {
    id: 'bm-3',
    itemId: 'ct-7',
    label: '1:14:08 · The Adventures of Sherlock Holmes',
    note: 'A Scandal in Bohemia — Baker Street deduction',
    at: 'Sir Arthur Conan Doyle',
    positionLabel: '1:14:08',
    durationLabel: '10:24:00',
    sourceLabel: 'LIBRIVOX',
    icon: 'bookmark-outline',
  },
];

export const followedPodcasts: {
  id: string;
  title: string;
  author: string;
  episodes: number;
  category: string;
  pinned?: boolean;
  icon: KindIconName;
}[] = [
  {id: 'fp-1', title: 'Signal & Noise', author: 'Rhea Menon', episodes: 128, category: 'Technology', pinned: true, icon: 'podcast'},
  {id: 'fp-2', title: 'Founders & Systems', author: 'Arjun & Maya', episodes: 94, category: 'Business', pinned: true, icon: 'podcast'},
  {id: 'fp-3', title: 'Slow Kitchen', author: 'Dev Anand', episodes: 64, category: 'Culture', pinned: false, icon: 'podcast'},
  {id: 'fp-4', title: 'Field Notes', author: 'Aisha Rahman', episodes: 41, category: 'Science', pinned: false, icon: 'podcast'},
];

export interface CuratedMixRecord {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  editorialReason: string;
  count: number;
  pinned: boolean;
  trackIds: string[];
  icon: KindIconName;
}

export const curatedMixes: CuratedMixRecord[] = [
  {
    id: 'mx-1',
    title: 'Afternoon Cadence',
    subtitle: 'Steady rhythms and cinema explorations tailored for deep focus.',
    eyebrow: 'FOCUS',
    editorialReason: 'Midnight Kyoto Lo-Fi, Blue Note Session & Radio Swiss Jazz',
    count: 6,
    pinned: true,
    trackIds: ['rc-1', 'bf-2', 'ct-4', 'ct-6'],
    icon: 'headphones',
  },
  {
    id: 'mx-2',
    title: 'Golden Age Cinema',
    subtitle: 'Preserved classics and timeless storytelling from the public archive.',
    eyebrow: 'CLASSIC FILM',
    editorialReason: 'Charade (1963), The Third Man & His Girl Friday',
    count: 5,
    pinned: true,
    trackIds: ['bf-1', 'ct-2', 'ct-1', 'ct-10'],
    icon: 'movie-open-outline',
  },
  {
    id: 'mx-3',
    title: 'Evening Conversations',
    subtitle: 'Thoughtful long-form discussions, stories, and global broadcasts.',
    eyebrow: 'DEEP DIVES',
    editorialReason: 'Signal & Noise, Field Notes & Sherlock Holmes',
    count: 6,
    pinned: false,
    trackIds: ['bf-3', 'ct-5', 'ct-7', 'ct-11'],
    icon: 'podcast',
  },
  {
    id: 'mx-4',
    title: 'Fresh Horizons',
    subtitle: 'New independent releases and worldwide live radio stations.',
    eyebrow: 'DISCOVERY',
    editorialReason: 'Acoustic Dawn in Lisbon, FIP Paris & Coastal FM',
    count: 6,
    pinned: false,
    trackIds: ['ct-4', 'ct-12', 'ct-6', 'jb-4'],
    icon: 'radio-tower',
  },
];

export const dailyMixSynthesis = {
  eyebrow: 'DAILY MIX',
  title: 'Afternoon Cadence',
  narrative:
    'Steady rhythms, thoughtful stories, and cinema explorations tailored to your listening taste.',
  matchLabel: 'For You',
  trackCount: '6 titles',
};

export const curatedTopics: {id: string; label: string; icon: KindIconName}[] = [
  {id: 'tech', label: 'Technology & Stories', icon: 'podcast'},
  {id: 'music', label: 'Indie Music', icon: 'music-clef-treble'},
  {id: 'cinema', label: 'Classic Cinema', icon: 'movie-open-outline'},
  {id: 'radio', label: 'World Radio', icon: 'radio-tower'},
  {id: 'books', label: 'Literature & Audiobooks', icon: 'book-open-page-variant-outline'},
  {id: 'science', label: 'Science & Culture', icon: 'compass-outline'},
];

export const recommended: CatalogueItem[] = [
  item('rc-1', 'Midnight Kyoto Lo-Fi', 'music', 'music-clef-treble', {
    catalogueLaneId: 'music',
    subtitle: 'Kitsune Collective',
    meta: 'Music · 42:10',
    affinityPercent: 96,
    rating: 4.9,
    year: '2024',
    genre: 'Chill',
    durationSeconds: 2530,
    provider: 'Jamendo',
    synopsis: 'Warm analog tape loops, rain textures, and late-night instrumental piano recorded in Kyoto.',
  }),
  item('rc-2', 'Pale Rider (Restored)', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Criterion Public Vault',
    meta: 'Movie · 1:55:00',
    affinityPercent: 94,
    rating: 4.7,
    year: '1970',
    genre: 'Drama',
    durationSeconds: 6900,
    provider: 'Internet Archive',
    synopsis: 'High-plains atmospheric drama shot on 35mm anamorphic film with restored orchestral score.',
  }),
  item('rc-3', 'The Long Answer', 'podcast', 'podcast', {
    catalogueLaneId: 'podcasts',
    subtitle: 'Signal & Noise · Rhea Menon',
    meta: 'Podcast · 51 min',
    affinityPercent: 92,
    rating: 4.8,
    year: '2026',
    genre: 'Technology',
    durationSeconds: 3060,
    provider: 'PodcastIndex',
    synopsis: 'Weekly long-form interviews with systems builders, acoustics engineers, and film archivist teams.',
  }),
];

export const bestForYou: CatalogueItem[] = [
  item('bf-1', 'Charade (1963)', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Stanley Donen · Cary Grant & Audrey Hepburn',
    meta: 'CINEMA · ★ 4.9 · 1:53:20',
    affinityPercent: 98,
    rating: 4.9,
    year: '1963',
    genre: 'Thriller',
    durationSeconds: 6800,
    isFeaturedShowcase: true,
    provider: 'Internet Archive',
    synopsis:
      'Classic cinema mystery thriller set in Paris with suspense, romance, rooftop chases, and timeless wit.',
  }),
  item('bf-2', 'Blue Note Session — Vol. 3', 'music', 'music-clef-treble', {
    catalogueLaneId: 'music',
    subtitle: 'Miles & Quartet Archive',
    meta: 'MUSIC · ★ 4.8 · 42:00',
    affinityPercent: 95,
    rating: 4.8,
    year: '1959',
    genre: 'Jazz',
    durationSeconds: 2520,
    enrichmentBadge: 'Verified Artist Release · 1959 Studio Recording',
    provider: 'Jamendo',
    synopsis: 'Late-night modal jazz quartet session featuring muted trumpet, upright bass, and brush drums.',
  }),
  item('bf-3', 'The Long Answer — On Paying Attention', 'podcast', 'podcast', {
    catalogueLaneId: 'podcasts',
    subtitle: 'Signal & Noise · Rhea Menon',
    meta: 'PODCAST · ★ 4.9 · 51:00',
    affinityPercent: 94,
    rating: 4.9,
    year: '2026',
    genre: 'Technology',
    durationSeconds: 3060,
    provider: 'PodcastIndex',
    synopsis: 'Why low-latency local tools and deliberate craft matter more than noisy cloud feeds.',
  }),
];

export const homeFilterGroups: FilterGroup[] = [
  {
    id: 'category',
    title: 'Content Scope',
    multiSelect: false,
    options: [
      {key: 'all', label: 'All Content'},
      {key: 'movie', label: 'Movies & Cinema'},
      {key: 'video', label: 'TV Shows'},
      {key: 'podcast', label: 'Podcasts'},
      {key: 'music', label: 'Music'},
      {key: 'radio', label: 'Live Radio'},
      {key: 'audiobook', label: 'Audiobooks'},
    ],
  },
  {
    id: 'sort',
    title: 'Sort Order',
    multiSelect: false,
    options: [
      {key: 'recommended', label: 'Recommended for You'},
      {key: 'rating', label: 'Highest Rated'},
      {key: 'az', label: 'Title A–Z'},
    ],
  },
];

// ─── Catalogue lanes (Swimlane 04.1–04.8) ───────────────────────────────────

export interface CatalogueLane {
  id: string;
  label: string;
  subtitle: string;
  searchPlaceholder: string;
  kind: MediaKind;
  icon: KindIconName;
  /** Penpot 04.1/04.2/04.6/04.8 use 2-col grid; 04.3/04.4/04.5/04.7 use editorial list rows. */
  layout: 'grid' | 'list';
  hasFavorites?: boolean;
  favoritesTitle?: string;
  /** Quick filter chips shown in the active strip. */
  filters: string[];
  /** Multi-group FilterSheet definition for this catalogue. */
  filterGroups: FilterGroup[];
}

export const catalogueLanes: CatalogueLane[] = [
  {
    id: 'movies',
    label: 'Movies',
    subtitle: 'Public Domain Cinema & Restored Feature Films',
    searchPlaceholder: 'Search classic movies, directors, actors...',
    kind: 'movie',
    icon: 'movie-open-outline',
    layout: 'grid',
    filters: ['Popular', 'Recent', 'Classic', 'Thriller', 'Sci-Fi', 'Comedy'],
    filterGroups: [
      {
        id: 'genre',
        title: 'Film Genre',
        multiSelect: true,
        options: [
          {key: 'All', label: 'All Genres'},
          {key: 'Classic', label: 'Classic Cinema'},
          {key: 'Thriller', label: 'Mystery & Thriller'},
          {key: 'Sci-Fi', label: 'Sci-Fi & Fantasy'},
          {key: 'Comedy', label: 'Screwball Comedy'},
          {key: 'Drama', label: 'Period Drama'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Movies',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Most Popular'},
          {key: 'Rating', label: 'Highest Rated'},
          {key: 'Year', label: 'Release Year'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
  {
    id: 'shows',
    label: 'Shows',
    subtitle: 'Television Series, Anthologies & Documentaries',
    searchPlaceholder: 'Search TV shows, seasons, genres...',
    kind: 'video',
    icon: 'television-classic',
    layout: 'grid',
    filters: ['Popular', 'Recent', 'Continuing', 'Ended', 'Mystery', 'Sci-Fi'],
    filterGroups: [
      {
        id: 'status',
        title: 'Broadcast Status',
        multiSelect: false,
        options: [
          {key: 'All', label: 'All Shows'},
          {key: 'Continuing', label: 'Continuing Series'},
          {key: 'Ended', label: 'Complete Anthologies'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Shows',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Top Rated'},
          {key: 'Recent', label: 'Recently Updated'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
  {
    id: 'podcasts',
    label: 'Podcasts',
    subtitle: 'Independent Shows, Interviews & Deep Dives',
    searchPlaceholder: 'Search podcasts, hosts, topics...',
    kind: 'podcast',
    icon: 'podcast',
    layout: 'list',
    filters: ['Popular', 'New', 'Following', 'Technology', 'Science', 'Culture'],
    filterGroups: [
      {
        id: 'topic',
        title: 'Podcast Topic',
        multiSelect: true,
        options: [
          {key: 'All', label: 'All Topics'},
          {key: 'Technology', label: 'Technology & Systems'},
          {key: 'Science', label: 'Science & Nature'},
          {key: 'Culture', label: 'Food & Culture'},
          {key: 'History', label: 'History & Books'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Podcasts',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Trending Now'},
          {key: 'New', label: 'Newest Episodes'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    subtitle: 'Independent Releases, Jazz Sessions & Lo-Fi Tapes',
    searchPlaceholder: 'Search tracks, artists, albums...',
    kind: 'music',
    icon: 'music-clef-treble',
    layout: 'list',
    filters: ['Popular', 'New', 'Chill', 'Folk', 'Jazz', 'Classical'],
    filterGroups: [
      {
        id: 'genre',
        title: 'Music Genre',
        multiSelect: true,
        options: [
          {key: 'All', label: 'All Genres'},
          {key: 'Jazz', label: 'Late Night Jazz'},
          {key: 'Chill', label: 'Lo-Fi & Ambient'},
          {key: 'Folk', label: 'Indie Folk & Acoustic'},
          {key: 'Classical', label: 'Classical & Strings'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Tracks',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Most Played'},
          {key: 'Rating', label: 'Top Rated'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
  {
    id: 'radio',
    label: 'Radio',
    subtitle: 'Live Global FM & Lossless Internet Stations',
    searchPlaceholder: 'Search stations, cities, genres...',
    kind: 'radio',
    icon: 'radio-tower',
    layout: 'list',
    hasFavorites: true,
    favoritesTitle: 'Favorite Stations',
    filters: ['Popular', 'By country', 'By language', 'Jazz', 'News', 'Eclectic'],
    filterGroups: [
      {
        id: 'tag',
        title: 'Station Tag & Region',
        multiSelect: false,
        options: [
          {key: 'All', label: 'All Airwaves'},
          {key: 'Jazz', label: 'Jazz & Blue Note'},
          {key: 'Eclectic', label: 'Eclectic & World'},
          {key: 'News', label: 'World News'},
          {key: 'Classical', label: 'Classical Symphony'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Stations',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Highest Bitrate'},
          {key: 'AZ', label: 'Station A–Z'},
        ],
      },
    ],
  },
  {
    id: 'livetv',
    label: 'Live TV',
    subtitle: 'Public IPTV Channels, Newsrooms & Cultural Streams',
    searchPlaceholder: 'Search live channels, categories, countries...',
    kind: 'live-tv',
    icon: 'access-point',
    layout: 'grid',
    hasFavorites: true,
    favoritesTitle: 'Favorite Channels',
    filters: ['Popular', 'News', 'Sports', 'Music', 'Movies', 'Science'],
    filterGroups: [
      {
        id: 'category',
        title: 'Channel Category',
        multiSelect: false,
        options: [
          {key: 'All', label: 'All Channels'},
          {key: 'News', label: '24/7 World News'},
          {key: 'Science', label: 'Science & Space'},
          {key: 'Movies', label: 'Classic Cinema TV'},
          {key: 'Music', label: 'Concert Channels'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Channels',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Featured Streams'},
          {key: 'AZ', label: 'Channel A–Z'},
        ],
      },
    ],
  },
  {
    id: 'audiobooks',
    label: 'Audiobooks',
    subtitle: 'Unabridged Public-Domain Literature & Philosophy',
    searchPlaceholder: 'Search books, authors, narrators...',
    kind: 'audiobook',
    icon: 'book-open-page-variant-outline',
    layout: 'list',
    filters: ['Popular', 'Fiction', 'Non-fiction', 'Classics', 'Mystery', 'Philosophy'],
    filterGroups: [
      {
        id: 'subject',
        title: 'Book Subject',
        multiSelect: true,
        options: [
          {key: 'All', label: 'All Subjects'},
          {key: 'Mystery', label: 'Mystery & Detective'},
          {key: 'Philosophy', label: 'Stoicism & Philosophy'},
          {key: 'Fiction', label: 'Classic Literature'},
          {key: 'Non-fiction', label: 'History & Biography'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Books',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Most Listened'},
          {key: 'Rating', label: 'Highest Rated'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    subtitle: 'Internet Archive Historical Audio, Concerts & Early Cinema',
    searchPlaceholder: 'Search archival recordings, concerts, reels...',
    kind: 'archive-audio',
    icon: 'archive-outline',
    layout: 'grid',
    filters: ['Popular', 'Audio', 'Video', 'Old films', 'Classical'],
    filterGroups: [
      {
        id: 'mediaType',
        title: 'Archive Media Type',
        multiSelect: false,
        options: [
          {key: 'All', label: 'All Vault Items'},
          {key: 'Audio', label: 'Concert & Radio Audio'},
          {key: 'Video', label: 'Early Cinema Reels'},
        ],
      },
      {
        id: 'sort',
        title: 'Sort Vault',
        multiSelect: false,
        options: [
          {key: 'Popular', label: 'Most Archived Plays'},
          {key: 'Year', label: 'Historical Year'},
          {key: 'AZ', label: 'Title A–Z'},
        ],
      },
    ],
  },
];

export const catalogueItems: CatalogueItem[] = [
  ...bestForYou,
  ...recommended,
  item('ct-1', 'His Girl Friday (1940)', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Howard Hawks · Cary Grant & Rosalind Russell',
    meta: '1940 · ★ 4.8 · 1:31:45',
    year: '1940',
    rating: 4.8,
    affinityPercent: 95,
    durationSeconds: 5505,
    genre: 'Comedy',
    provider: 'Internet Archive',
    synopsis: 'Rapid-fire newsroom comedy and classic Hollywood investigative journalism drama.',
  }),
  item('ct-2', 'The Third Man (1949)', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Carol Reed · Orson Welles',
    meta: '1949 · ★ 4.9 · 1:44:00',
    year: '1949',
    rating: 4.9,
    affinityPercent: 97,
    durationSeconds: 6240,
    genre: 'Thriller',
    provider: 'Internet Archive',
    synopsis: 'Shadowy post-war Vienna noir masterpiece scored entirely on the solo concert zither.',
  }),
  item('ct-13', 'Metropolis (Restored 1927)', 'movie', 'movie-open-outline', {
    catalogueLaneId: 'movies',
    subtitle: 'Fritz Lang · Gottfried Huppertz Score',
    meta: '1927 · ★ 4.9 · 2:28:00',
    year: '1927',
    rating: 4.9,
    affinityPercent: 93,
    durationSeconds: 8880,
    genre: 'Sci-Fi',
    provider: 'Internet Archive',
    synopsis: 'Visionary Art Deco silent sci-fi epic with the complete restored 1927 orchestral recording.',
  }),
  item('ct-3', 'Beyond the Event Horizon', 'video', 'television-classic', {
    catalogueLaneId: 'shows',
    subtitle: 'Observatory Science Series · Season 1',
    meta: '2024 · ★ 4.8 · 52 min',
    year: '2024',
    rating: 4.8,
    affinityPercent: 94,
    durationSeconds: 3120,
    genre: 'Sci-Fi',
    provider: 'TVMaze',
    synopsis: 'Astrophysics documentary series exploring black holes, event horizons, and deep-space arrays.',
  }),
  item('ct-14', 'Sherlock — The Blind Banker', 'video', 'television-classic', {
    catalogueLaneId: 'shows',
    subtitle: 'Mystery Anthology · S01E02',
    meta: '2014 · ★ 4.7 · 1:28:00',
    year: '2014',
    rating: 4.7,
    affinityPercent: 91,
    durationSeconds: 5280,
    genre: 'Mystery',
    provider: 'TVMaze',
    synopsis: 'Encrypted ciphers across London museums lead to an underground smuggling syndicate.',
  }),
  item('ct-4', 'Acoustic Dawn in Lisbon', 'music', 'music-clef-treble', {
    catalogueLaneId: 'music',
    subtitle: 'Mateo & Strings',
    meta: '2025 · ★ 4.7 · 36 min',
    year: '2025',
    rating: 4.7,
    affinityPercent: 90,
    durationSeconds: 2160,
    genre: 'Folk',
    enrichmentBadge: 'Verified Artist Release · Studio Recording',
    provider: 'Jamendo',
    synopsis: 'Warm nylon-string guitar instrumentals and chamber cello recorded live in Lisbon.',
  }),
  item('ct-5', 'Field Notes — Acoustic Ecology', 'podcast', 'podcast', {
    catalogueLaneId: 'podcasts',
    subtitle: 'Aisha Rahman · 41 Episodes',
    meta: 'Weekly · ★ 4.8 · 45 min',
    year: '2026',
    rating: 4.8,
    affinityPercent: 93,
    durationSeconds: 2700,
    genre: 'Science',
    provider: 'PodcastIndex',
    synopsis: 'Binaural field recordings and conversations with marine biologists and soundscape archivists.',
  }),
  item('ct-15', 'Slow Kitchen — Fermentation & Fire', 'podcast', 'podcast', {
    catalogueLaneId: 'podcasts',
    subtitle: 'Dev Anand · 64 Episodes',
    meta: 'Biweekly · ★ 4.7 · 38 min',
    year: '2025',
    rating: 4.7,
    affinityPercent: 89,
    durationSeconds: 2280,
    genre: 'Culture',
    provider: 'PodcastIndex',
    synopsis: 'Stories behind regional heirloom grains, wood-fired bakeries, and traditional kitchens.',
  }),
  item('ct-6', 'Coastal FM 91.4 Kochi', 'radio', 'radio-tower', {
    catalogueLaneId: 'radio',
    subtitle: 'Kochi · Lossless 128 kbps AAC',
    meta: 'LIVE · Eclectic & Monsoon Jazz',
    rating: 4.8,
    affinityPercent: 95,
    genre: 'Eclectic',
    country: 'India',
    language: 'English',
    provider: 'Radio Browser',
    synopsis: '24/7 independent coastal broadcast blending jazz, acoustic folk, and late-night vinyl.',
  }),
  item('ct-12', 'FIP Paris Eclectic Radio', 'radio', 'radio-tower', {
    catalogueLaneId: 'radio',
    subtitle: 'Radio France · Paris Hi-Fi Stream',
    meta: 'LIVE · Commercial-Free Curated Music',
    rating: 4.9,
    affinityPercent: 97,
    genre: 'Jazz',
    country: 'France',
    language: 'French',
    provider: 'Radio Browser',
    synopsis: 'Legendary hand-curated Paris broadcast seamlessly mixing jazz, film scores, soul, and world grooves.',
  }),
  item('ct-7', 'The Adventures of Sherlock Holmes', 'audiobook', 'book-open-page-variant-outline', {
    catalogueLaneId: 'audiobooks',
    subtitle: 'Sir Arthur Conan Doyle · Read by David Clarke',
    meta: '10h 24m · ★ 4.9 · Unabridged',
    year: '1892',
    rating: 4.9,
    affinityPercent: 96,
    durationSeconds: 37440,
    genre: 'Mystery',
    provider: 'LibriVox',
    synopsis: 'Twelve iconic detective stories from 221B Baker Street in an unabridged dramatic reading.',
  }),
  item('ct-11', 'Meditations of Marcus Aurelius', 'audiobook', 'book-open-page-variant-outline', {
    catalogueLaneId: 'audiobooks',
    subtitle: 'Translated by George Long · Unabridged',
    meta: '5h 18m · ★ 4.9 · Philosophy',
    year: '180',
    rating: 4.9,
    affinityPercent: 95,
    durationSeconds: 19080,
    genre: 'Philosophy',
    provider: 'LibriVox',
    synopsis: 'Timeless private notes on stoic resilience, clarity of mind, and ethical leadership.',
  }),
  item('ct-8', 'Newsroom Global 24/7 HD', 'live-tv', 'access-point', {
    catalogueLaneId: 'livetv',
    subtitle: 'International Public Broadcast · 1080p',
    meta: 'LIVE NOW · World News & Analysis',
    rating: 4.7,
    affinityPercent: 91,
    genre: 'News',
    provider: 'IPTV-org',
    synopsis: 'Live international headlines, science desk briefings, and cultural documentaries.',
  }),
  item('ct-16', 'Observatory Space TV Live', 'live-tv', 'access-point', {
    catalogueLaneId: 'livetv',
    subtitle: 'Orbital & Telescope Feeds · 1080p60',
    meta: 'LIVE NOW · Science & Astronomy',
    rating: 4.9,
    affinityPercent: 96,
    genre: 'Science',
    provider: 'IPTV-org',
    synopsis: 'Continuous high-definition earth observation, solar dynamics, and deep-space mission coverage.',
  }),
  item('ct-17', 'Criterion Public Cinema Channel', 'live-tv', 'access-point', {
    catalogueLaneId: 'livetv',
    subtitle: '24/7 Restored Film Stream · 1080p',
    meta: 'LIVE NOW · Classic Movies',
    rating: 4.8,
    affinityPercent: 94,
    genre: 'Movies',
    provider: 'IPTV-org',
    synopsis: 'Back-to-back restored noir, silent comedy, and golden-age theatrical double features.',
  }),
  item('ct-9', 'Nights in Vienna — 1948 Philharmonic Concert', 'archive-audio', 'archive-outline', {
    catalogueLaneId: 'archive',
    subtitle: 'Musikverein Historical Tape Transfer',
    meta: '1948 · ★ 4.8 · 52 min',
    year: '1948',
    rating: 4.8,
    affinityPercent: 92,
    durationSeconds: 3120,
    genre: 'Classical',
    provider: 'Internet Archive',
    synopsis: 'High-resolution transfer of the 1948 Vienna concert broadcast from original magnetic reels.',
  }),
  item('ct-10', 'A Trip to the Moon (1902 Hand-Tinted)', 'archive-video', 'archive-outline', {
    catalogueLaneId: 'archive',
    subtitle: 'Georges Méliès · Star Film Paris',
    meta: '1902 · ★ 4.9 · 14 min',
    year: '1902',
    rating: 4.9,
    affinityPercent: 94,
    durationSeconds: 840,
    genre: 'Sci-Fi',
    provider: 'Internet Archive',
    synopsis: 'Frame-by-frame restoration of the hand-stenciled 1902 early cinema fantasy landmark.',
  }),
];

// ─── 3-State Universal Search (Swimlane 03.3–03.6) ──────────────────────────

export type SearchScope =
  | 'all'
  | 'audio'
  | 'video'
  | 'movie'
  | 'podcast'
  | 'music'
  | 'radio'
  | 'audiobook'
  | 'local';

export const searchScopes: {id: SearchScope; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'movie', label: 'Movies'},
  {id: 'podcast', label: 'Podcasts'},
  {id: 'music', label: 'Music'},
  {id: 'radio', label: 'Radio'},
  {id: 'audiobook', label: 'Audiobooks'},
  {id: 'local', label: 'On Device'},
];

export const searchSuggestions: string[] = [
  'Charade (1963)',
  'Blue Note Session',
  'Signal & Noise',
  'Midnight Kyoto Lo-Fi',
  'Sherlock Holmes Stories',
  'Radio Swiss Jazz',
];

export interface HybridSuggestionRecord {
  term: string;
  category: string;
  tier: 'Recent' | 'Match' | 'Related' | 'For You';
}

export const curatedSuggestionPool: HybridSuggestionRecord[] = [
  {term: 'Charade (1963)', category: 'Movies', tier: 'Recent'},
  {term: 'Charlie Chaplin Classics', category: 'Movies', tier: 'Match'},
  {term: 'Charade Mystery Vault', category: 'Archive', tier: 'Match'},
  {term: 'Classic Cinema', category: 'Movies', tier: 'For You'},
  {term: 'Film Noir Mystery', category: 'Movies', tier: 'Related'},
  {term: 'Alfred Hitchcock Thrillers', category: 'Movies', tier: 'Related'},
  {term: 'Sherlock Holmes Stories', category: 'Audiobooks', tier: 'Related'},
  {term: 'Lo-Fi Chill Beats', category: 'Music', tier: 'For You'},
  {term: 'Late Night Jazz Quartet', category: 'Music', tier: 'For You'},
  {term: 'Technology & Systems Podcasts', category: 'Podcasts', tier: 'For You'},
  {term: 'Jazz FM Live Radio', category: 'Radio', tier: 'For You'},
  {term: 'Stoic Philosophy & Meditations', category: 'Audiobooks', tier: 'For You'},
];

export const relatedSearchChips: Record<string, string[]> = {
  default: [
    'Film Noir Mystery',
    'Alfred Hitchcock',
    'Classic Cinema',
    'Sherlock Holmes',
    'Late Night Jazz',
  ],
  charade: [
    'Film Noir Mystery',
    'Alfred Hitchcock',
    'Classic Cinema',
    'His Girl Friday',
    'The Third Man',
  ],
  jazz: [
    'Blue Note Session',
    'Radio Swiss Jazz',
    'FIP Paris Radio',
    'Midnight Kyoto Lo-Fi',
  ],
};

export const searchResults: CatalogueItem[] = catalogueItems;

// ─── Live IPTV Channels & Player Extras (Swimlane 06.1–06.7) ────────────────

export interface LiveTvChannelRecord {
  id: string;
  name: string;
  category: string;
  quality: string;
  nowPlaying: string;
  isLive: boolean;
}

export const liveTvChannels: LiveTvChannelRecord[] = [
  {id: 'ch-1', name: 'Newsroom Global 24/7', category: 'World News', quality: '1080p HD', nowPlaying: 'Evening International Desk', isLive: true},
  {id: 'ch-2', name: 'Observatory Space TV', category: 'Science', quality: '1080p60', nowPlaying: 'Live Orbital Earth Array', isLive: true},
  {id: 'ch-3', name: 'Criterion Public Cinema', category: 'Classic Movies', quality: '1080p HD', nowPlaying: 'Charade (1963) — Restored Print', isLive: true},
  {id: 'ch-4', name: 'Musikverein Concert Hall', category: 'Classical Music', quality: 'Lossless AAC', nowPlaying: 'Vienna Chamber Strings Live', isLive: true},
];

export const eqBands: {freq: string; defaultDb: number}[] = [
  {freq: '31', defaultDb: 1.5},
  {freq: '62', defaultDb: 2.5},
  {freq: '125', defaultDb: 1.0},
  {freq: '250', defaultDb: 0.0},
  {freq: '500', defaultDb: -0.5},
  {freq: '1K', defaultDb: 1.0},
  {freq: '2K', defaultDb: 2.0},
  {freq: '4K', defaultDb: 3.0},
  {freq: '8K', defaultDb: 2.5},
  {freq: '16K', defaultDb: 1.5},
];

export const eqPresets: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Jazz: [2, 2.5, 1.5, 0.5, -1, -0.5, 1.5, 2.5, 3, 2],
  Rock: [4, 3, 1.5, -1, -1.5, 0, 2, 3.5, 4, 3.5],
  Pop: [-1, 1.5, 3, 3.5, 2, 0, -1, 1.5, 2.5, 2],
  Classical: [3, 2.5, 1.5, 0, 0, 0, 1, 2, 3, 3.5],
  Warm: [2.5, 3, 2, 1, 0, -0.5, -1, 0, 1, 1],
};

// ─── Profile, Saved, Library, Folders & Legal (Swimlane 07.1–07.7) ──────────

export const profile = {
  guest: {
    name: 'Guest Listener',
    subtitle:
      'Sign in to sync your bookmarks, subscriptions, playlists, and playback across devices.',
    counters: {lists: 0, downloads: 0, hours: 0},
  },
  signedIn: {
    name: 'Paval E P',
    email: 'paval.ep@gmail.com',
    subtitle: 'Connected via Google Sign-In · Synced across 2 devices',
    counters: {lists: 12, downloads: 148, hours: 186},
    since: 'Member since March 2024',
  },
};

export const profileCounters: {
  id: string;
  count: string;
  l1: string;
  l2?: string;
  route: string;
  icon: KindIconName;
}[] = [
  {id: 'cnt-podcasts', count: '12', l1: 'Subscribed', l2: 'Podcasts', route: '/library?tab=podcasts', icon: 'podcast'},
  {id: 'cnt-bookmarks', count: '22', l1: 'Saved', l2: 'Bookmarks', route: '/saved?tab=bookmarks', icon: 'bookmark-multiple-outline'},
  {id: 'cnt-history', count: '48', l1: 'Playback', l2: 'History', route: '/saved?tab=history', icon: 'history'},
  {id: 'cnt-playlists', count: '5', l1: 'Pinned', l2: 'Playlists', route: '/library?tab=playlists', icon: 'playlist-music'},
  {id: 'cnt-folders', count: '3', l1: 'Local Files', l2: '& Folders', route: '/folders', icon: 'folder-music-outline'},
  {id: 'cnt-downloads', count: '6', l1: 'Downloads', l2: 'Offline', route: '/library?tab=downloads', icon: 'download-circle-outline'},
];

export const lifetimeStats = [
  {value: '1,204', label: 'Plays'},
  {value: '186h 24m', label: 'Playback Time'},
  {value: '836', label: 'Tracks'},
  {value: '368', label: 'Videos'},
  {value: '92', label: 'Days Active'},
  {value: '14', label: 'Day Streak'},
];

export const mostPlayed = 'Most Played · Charade (1963) — 12 plays';

export const audioSettings = [
  {label: 'Audio Stream Quality', value: 'High Quality (320 kbps)'},
  {label: 'Video Quality', value: 'Auto HD (1080p)'},
  {label: 'Balanced Volume', value: 'On'},
  {label: 'Clear Voice Boost', value: 'On'},
  {label: 'Trim Silences', value: 'Off'},
];

export const profileSections = [
  {
    id: 'streaming',
    title: 'Streaming & Playback',
    rows: [
      'Audio Stream Quality · High Quality (320 kbps)',
      'Video Quality · Auto HD (1080p)',
      'Stream Over Wi-Fi Only · Enabled',
      'Saved Media Cache · 14.2 MB',
    ],
  },
  {
    id: 'catalogs',
    title: 'Media Sources',
    rows: [
      'Internet Archive · Public domain movies & classic cinema',
      'PodcastIndex · Global podcast directory',
      'TVMaze · Television shows & series guide',
      'Jamendo Music · Independent artists & albums',
      'Radio Browser · Live radio stations worldwide',
      'LibriVox · Public domain spoken audiobooks',
    ],
  },
];

export interface LocalFileRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationLabel: string;
  formatBadge: string;
  sizeLabel: string;
  folderName: string;
  lane: MediaLane;
}

export const localLibraryFiles: LocalFileRecord[] = [
  {
    id: 'loc-1',
    title: 'Charade (1963) — Full Movie',
    artist: 'Stanley Donen',
    album: 'Classic Cinema',
    durationLabel: '1:53:20',
    formatBadge: 'Video · HD',
    sizeLabel: '1.2 GB',
    folderName: 'Movies',
    lane: 'video',
  },
  {
    id: 'loc-2',
    title: 'Blue Note Session — Vol. 3',
    artist: 'Miles & Quartet Archive',
    album: 'Blue Note Sessions',
    durationLabel: '42:00',
    formatBadge: 'Music · High Quality',
    sizeLabel: '120 MB',
    folderName: 'Music',
    lane: 'audio',
  },
  {
    id: 'loc-3',
    title: 'Midnight Kyoto Rain — Tape 04',
    artist: 'Kitsune Analog Collective',
    album: 'Midnight Kyoto',
    durationLabel: '06:42',
    formatBadge: 'Music · Audio',
    sizeLabel: '16 MB',
    folderName: 'Music',
    lane: 'audio',
  },
  {
    id: 'loc-4',
    title: 'Signal & Noise — Episode 12',
    artist: 'Rhea Menon',
    album: 'Signal & Noise',
    durationLabel: '51:00',
    formatBadge: 'Podcast · Audio',
    sizeLabel: '48 MB',
    folderName: 'Podcasts',
    lane: 'audio',
  },
];

export interface DownloadRecord {
  id: string;
  itemId: string;
  title: string;
  subtitle: string;
  sizeLabel: string;
  status: 'Completed' | 'Downloading · 64%';
  lane: MediaLane;
}

export const downloadsList: DownloadRecord[] = [
  {id: 'dl-1', itemId: 'bf-1', title: 'Charade (1963)', subtitle: 'Movie · 1:53:20', sizeLabel: '840 MB', status: 'Completed', lane: 'video'},
  {id: 'dl-2', itemId: 'bf-2', title: 'Blue Note Session — Vol. 3', subtitle: 'Music · 42:00', sizeLabel: '98 MB', status: 'Completed', lane: 'audio'},
  {id: 'dl-3', itemId: 'bf-3', title: 'The Long Answer — Ep. 12', subtitle: 'Podcast · 51:00', sizeLabel: '64 MB', status: 'Completed', lane: 'audio'},
  {id: 'dl-4', itemId: 'ct-7', title: 'The Adventures of Sherlock Holmes', subtitle: 'Audiobook · Chapters 1–4', sizeLabel: '185 MB', status: 'Downloading · 64%', lane: 'audio'},
];

export const autoDeleteOptions = ['Never', 'After 7 days', 'After 30 days', 'When watched'] as const;

export interface LinkedFolderRecord {
  id: string;
  name: string;
  path: string;
  trackCount: number;
  videoCount: number;
  lastScanned: string;
}

export const initialLinkedFolders: LinkedFolderRecord[] = [
  {
    id: 'fld-1',
    name: 'My Music Folder',
    path: 'Phone Storage · Music',
    trackCount: 142,
    videoCount: 0,
    lastScanned: 'Updated 10m ago',
  },
  {
    id: 'fld-2',
    name: 'Downloaded Movies',
    path: 'Phone Storage · Movies',
    trackCount: 0,
    videoCount: 28,
    lastScanned: 'Updated 2h ago',
  },
  {
    id: 'fld-3',
    name: 'Saved Podcasts & Audiobooks',
    path: 'Phone Storage · Podcasts',
    trackCount: 54,
    videoCount: 0,
    lastScanned: 'Updated yesterday',
  },
];

export interface LegalPageInfo {
  slug: string;
  title: string;
  subtitle: string;
  icon: KindIconName;
  sections: {heading: string; body: string}[];
}

export const legalPages: Record<string, LegalPageInfo> = {
  about: {
    slug: 'about',
    title: 'About Simba',
    subtitle: 'Simba v1.1.0 · Cinema, Music & Podcasts',
    icon: 'information-outline',
    sections: [
      {
        heading: 'All Your Media in One Place',
        body: 'Simba brings together your personal music and video files with classic movies, independent music, podcasts, live radio, television shows, and audiobooks in one calm, easy-to-use app.',
      },
      {
        heading: 'Private & Personal',
        body: 'Your listening history, saved bookmarks, playlists, and recommendations stay private on your device.',
      },
    ],
  },
  stats: {
    slug: 'stats',
    title: 'Listening & Viewing Activity',
    subtitle: 'Your personal playback summary',
    icon: 'chart-box-outline',
    sections: [
      {
        heading: 'Overall Activity',
        body: '1,204 total plays · 186h 24m total time · 836 songs & episodes · 368 movies & videos · 14-day listening streak.',
      },
      {
        heading: 'Favorite Categories',
        body: '1. Classic Cinema (42%) · 2. Jazz & Chill Music (31%) · 3. Podcasts & Talks (19%) · 4. Audiobooks (8%).',
      },
    ],
  },
  help: {
    slug: 'help',
    title: 'Help & Tips',
    subtitle: 'Easy shortcuts for video, audio & device folders',
    icon: 'help-circle-outline',
    sections: [
      {
        heading: 'Video Player Shortcuts',
        body: 'Double-tap the left or right side of the video to jump back or forward 10 seconds. Tap the Picture-in-Picture icon to keep watching in a floating window while browsing.',
      },
      {
        heading: 'Adding Files From Your Phone',
        body: 'Open Profile → Device Folders → Add Folder to include music, audiobooks, or movies saved on your phone.',
      },
    ],
  },
  credits: {
    slug: 'credits',
    title: 'Media Sources & Credits',
    subtitle: 'Public libraries & independent creators',
    icon: 'heart-outline',
    sections: [
      {
        heading: 'Connected Libraries',
        body: 'Classic movies and recordings from Internet Archive, podcasts via PodcastIndex, music from Jamendo, audiobooks from LibriVox, live stations from Radio Browser, and show schedules from TVMaze.',
      },
    ],
  },
  changelog: {
    slug: 'changelog',
    title: 'What’s New',
    subtitle: 'Recent improvements & features',
    icon: 'history',
    sections: [
      {
        heading: 'Version 1.1 — Curated Mixes & Live TV',
        body: 'Added handpicked daily mixes, instant search suggestions, live waveform audio scrubber, Live TV channel switcher, and simplified 3-tab navigation.',
      },
      {
        heading: 'Version 1.0 — Cinema, Music & Podcasts',
        body: 'Unified audio and video mini-player, Picture-in-Picture support, offline downloads, and personal playlists.',
      },
    ],
  },
  licenses: {
    slug: 'licenses',
    title: 'Open-Source Acknowledgments',
    subtitle: 'Community software & creative commons attributions',
    icon: 'scale-balance',
    sections: [
      {
        heading: 'Community Software',
        body: 'Built with open-source mobile and media technologies. All public-domain films, books, and Creative Commons tracks belong to their respective creators and archives.',
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Your library and activity stay on your device',
    icon: 'shield-lock-outline',
    sections: [
      {
        heading: 'Private by Default',
        body: 'Your playback history, saved bookmarks, playlists, and device folders are stored locally on your phone. Sign-in is completely optional and only used if you choose to sync your library.',
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Use',
    subtitle: 'Public domain & independent streaming guidelines',
    icon: 'file-document-outline',
    sections: [
      {
        heading: 'Content Guidelines',
        body: 'All streaming catalogs in Simba come from public-domain archives, open podcast directories, or Creative Commons artist releases for personal enjoyment.',
      },
    ],
  },
};

// ─── Detail extras & Playlists (Swimlane 05.1–05.5) ─────────────────────────

export interface ChapterRow {
  code: string;
  title: string;
  meta: string;
  affinityPercent?: number;
  progress?: number;
}

export interface NoteRow {
  id: string;
  at: string;
  body: string;
}

export interface ReviewRow {
  id: string;
  author: string;
  rating: number;
  body: string;
}

export interface DetailExtras {
  chapters: ChapterRow[];
  notes: NoteRow[];
  reviews: ReviewRow[];
}

export const detailExtras: Record<string, DetailExtras> = {
  'bf-1': {
    chapters: [
      {code: '01', title: 'Opening Credits & Train Escape', meta: '0:00 · 6 min', affinityPercent: 98, progress: 1},
      {code: '02', title: 'Paris Hotel & The Three Strangers', meta: '12:40 · 14 min', affinityPercent: 96, progress: 0.45},
      {code: '03', title: 'Seine River Boat Dialogue', meta: '22:15 · 11 min', affinityPercent: 99, progress: 0},
      {code: '04', title: 'Stamp Auction & Palais-Royal Chase', meta: '1:04:02 · 18 min', affinityPercent: 95, progress: 0},
      {code: '05', title: 'Colonnade Standoff & Finale', meta: '1:38:10 · 15 min', affinityPercent: 97, progress: 0},
    ],
    notes: [
      {id: 'n1', at: '22:15', body: 'Seine River Dialogue — the two-shot framing and lighting on the riverboat are perfection.'},
      {id: 'n2', at: '1:04:02', body: 'The rare stamp reveal changes every earlier scene on rewatch.'},
    ],
    reviews: [
      {id: 'r1', author: 'Aparna', rating: 5, body: 'The best Hitchcock movie Hitchcock never directed. Restored print looks crisp.'},
      {id: 'r2', author: 'Joseph', rating: 5, body: 'Henry Mancini score and Paris locations make this endlessly rewatchable.'},
    ],
  },
  'bf-2': {
    chapters: [
      {code: 'A1', title: 'So What — Modal Opening (Take 2)', meta: '09:22 · Lossless', affinityPercent: 97, progress: 0.8},
      {code: 'A2', title: 'Freddie Freeloader', meta: '09:46 · Lossless', affinityPercent: 95, progress: 0.3},
      {code: 'A3', title: 'Blue in Green', meta: '05:37 · Lossless', affinityPercent: 98, progress: 0},
      {code: 'B1', title: 'All Blues', meta: '11:33 · Lossless', affinityPercent: 96, progress: 0},
      {code: 'B2', title: 'Flamenco Sketches', meta: '09:26 · Lossless', affinityPercent: 94, progress: 0},
    ],
    notes: [
      {id: 'n3', at: '02:14', body: 'Bill Evans piano voicing entrance after the bass intro.'},
    ],
    reviews: [
      {id: 'r4', author: 'Kiran', rating: 5, body: 'Essential late-night listening. The mono pressing transfer has incredible room presence.'},
    ],
  },
  'bf-3': {
    chapters: [
      {code: 'E12', title: 'On Paying Attention in Systems Craft', meta: '2026-11-18 · 51 min', affinityPercent: 98, progress: 0.61},
      {code: 'E11', title: 'The Long Answer: Local-First Engines', meta: '2026-11-11 · 48 min', affinityPercent: 95, progress: 1},
      {code: 'E10', title: 'Acoustics of Small Rooms', meta: '2026-11-04 · 44 min', affinityPercent: 92, progress: 0},
      {code: 'E09', title: 'Restoring 35mm Nitrate Prints', meta: '2026-10-28 · 56 min', affinityPercent: 94, progress: 0},
    ],
    notes: [
      {id: 'n4', at: '41:02', body: 'Great conversation on building calm, distraction-free creative tools.'},
    ],
    reviews: [
      {id: 'r5', author: 'Vikram', rating: 5, body: 'Zero fluff, deeply technical, and wonderfully paced.'},
    ],
  },
  'ct-3': {
    chapters: [
      {code: 'S01×01', title: 'Event Horizon & Photon Rings', meta: '2024-03-12 · 52 min', affinityPercent: 96, progress: 0.5},
      {code: 'S01×02', title: 'Black Holes in Real Time', meta: '2024-03-19 · 48 min', affinityPercent: 93, progress: 0},
      {code: 'S01×03', title: 'The Long Baseline Array', meta: '2024-03-26 · 51 min', affinityPercent: 91, progress: 0},
    ],
    notes: [],
    reviews: [
      {id: 'r3', author: 'Meera', rating: 5, body: 'The observatory interferometry footage is breathtaking.'},
    ],
  },
  'ct-7': {
    chapters: [
      {code: 'CH 01', title: 'A Scandal in Bohemia', meta: '48:12 · Unabridged', affinityPercent: 97, progress: 0.75},
      {code: 'CH 02', title: 'The Red-Headed League', meta: '51:40 · Unabridged', affinityPercent: 95, progress: 0},
      {code: 'CH 03', title: 'A Case of Identity', meta: '39:18 · Unabridged', affinityPercent: 92, progress: 0},
      {code: 'CH 04', title: 'The Boscombe Valley Mystery', meta: '54:05 · Unabridged', affinityPercent: 94, progress: 0},
    ],
    notes: [
      {id: 'n5', at: '14:08', body: '"You see, but you do not observe. The distinction is clear."'},
    ],
    reviews: [
      {id: 'r6', author: 'Nikhil', rating: 5, body: 'David Clarke narration is the gold standard on LibriVox.'},
    ],
  },
};

export const playlists: Playlist[] = [
  {
    id: 'pl-1',
    name: 'Late Night Synth & Lo-Fi',
    info: 'For the small hours and deep coding sessions',
    kind: 'AUDIO_ONLY',
    pinned: true,
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
    items: [
      {
        id: 'pli-1',
        fileUri: 'file:///music/blue-note-vol3.m4a',
        title: 'Blue Note Session — Vol. 3',
        duration: 2520,
        durationUnit: 'seconds',
        addedAt: '2026-04-02T10:00:00.000Z',
        source: 'local',
        type: 'music',
        mediaType: 'audio',
      },
      {
        id: 'pli-2',
        fileUri: 'https://simba.app/audio/midnight-kyoto.mp3',
        title: 'Midnight Kyoto Lo-Fi',
        duration: 2530,
        durationUnit: 'seconds',
        addedAt: '2026-04-03T10:00:00.000Z',
        source: 'api',
        type: 'music',
        mediaType: 'audio',
      },
    ],
  },
  {
    id: 'pl-2',
    name: 'Road Trip, No Talking',
    info: 'Continuous acoustic, jazz & world airwaves',
    kind: 'AUDIO_ONLY',
    pinned: true,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    items: [
      {
        id: 'pli-3',
        fileUri: 'https://simba.app/audio/lisbon-dawn.mp3',
        title: 'Acoustic Dawn in Lisbon',
        duration: 2160,
        durationUnit: 'seconds',
        addedAt: '2026-05-10T10:00:00.000Z',
        source: 'api',
        type: 'music',
        mediaType: 'audio',
      },
    ],
  },
  {
    id: 'pl-3',
    name: 'Golden Age Noir Vault',
    info: 'Restored 35mm mystery thrillers',
    kind: 'VIDEO_ONLY',
    pinned: false,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-11-21T10:00:00.000Z',
    items: [
      {
        id: 'pli-4',
        fileUri: 'https://archive.org/download/Charade1963/Charade1963.mp4',
        title: 'Charade (1963)',
        duration: 6800,
        durationUnit: 'seconds',
        addedAt: '2026-06-15T10:00:00.000Z',
        source: 'api',
        type: 'movie',
        mediaType: 'video',
      },
    ],
  },
];
