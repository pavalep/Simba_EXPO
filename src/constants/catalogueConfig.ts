import type {MediaKind} from '../types/media';
import type {
  CatalogueLane,
  HybridSuggestionRecord,
  LegalPageInfo,
  SearchScope,
} from '../types/catalogue';
import type {KindIconName} from '../components/ui';

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

export const curatedTopics: {id: string; label: string; icon: KindIconName}[] = [
  {id: 'tech', label: 'Technology & Stories', icon: 'podcast'},
  {id: 'music', label: 'Indie Music', icon: 'music-clef-treble'},
  {id: 'cinema', label: 'Classic Cinema', icon: 'movie-open-outline'},
  {id: 'radio', label: 'World Radio', icon: 'radio-tower'},
  {id: 'books', label: 'Literature & Audiobooks', icon: 'book-open-page-variant-outline'},
  {id: 'science', label: 'Science & Culture', icon: 'compass-outline'},
];

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

export const searchScopes: {id: SearchScope; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'movie', label: 'Movies'},
  {id: 'podcast', label: 'Podcasts'},
  {id: 'music', label: 'Music'},
  {id: 'radio', label: 'Radio'},
  {id: 'audiobook', label: 'Audiobooks'},
  {id: 'local', label: 'On Device'},
];

export const curatedSuggestionPool: HybridSuggestionRecord[] = [
  {term: 'Classic Cinema', category: 'Movies', tier: 'For You'},
  {term: 'Film Noir Mystery', category: 'Movies', tier: 'Related'},
  {term: 'Alfred Hitchcock', category: 'Movies', tier: 'Related'},
  {term: 'Charlie Chaplin', category: 'Movies', tier: 'Match'},
  {term: 'Sherlock Holmes', category: 'Audiobooks', tier: 'Related'},
  {term: 'Lo-Fi Chill Beats', category: 'Music', tier: 'For You'},
  {term: 'Jazz Quartet', category: 'Music', tier: 'For You'},
  {term: 'Technology Podcasts', category: 'Podcasts', tier: 'For You'},
  {term: 'Jazz Live Radio', category: 'Radio', tier: 'For You'},
  {term: 'Stoic Philosophy', category: 'Audiobooks', tier: 'For You'},
];

export const relatedSearchChips: Record<string, string[]> = {
  default: [
    'Film Noir',
    'Classic Cinema',
    'Sherlock Holmes',
    'Late Night Jazz',
    'Science Podcasts',
  ],
  jazz: [
    'Jazz Radio',
    'Lo-Fi Beats',
    'Acoustic Guitar',
    'Classical Piano',
  ],
};

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

export const autoDeleteOptions = [
  'Never',
  'After 7 days',
  'After 30 days',
  'When watched',
] as const;

export const legalPages: Record<string, LegalPageInfo> = {
  about: {
    slug: 'about',
    title: 'About Simba',
    subtitle: 'Simba · Cinema, Music & Podcasts',
    icon: 'information-outline',
    sections: [
      {
        heading: 'All Your Media in One Place',
        body: 'Simba brings together your personal music and video files with classic movies, independent music, podcasts, live radio, television guides, and audiobooks in one calm, easy-to-use app.',
      },
      {
        heading: 'Private & Personal',
        body: 'Your listening history, favorites, timestamp bookmarks, and playlists stay private on your device.',
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
        heading: 'On-Device Activity',
        body: 'All counts shown above are calculated directly from your real playback history, favorites, bookmarks, playlists, and followed podcasts stored on this device.',
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
        heading: 'Saving Favorites & Timestamp Bookmarks',
        body: 'Tap the heart icon on any title, station, or channel to save it in Favorites. Tap the bookmark icon inside the audio or video player to freeze an exact timestamp moment.',
      },
      {
        heading: 'Adding Files From Your Phone',
        body: 'Open Profile → Folders to include music, audiobooks, or movies saved on your phone.',
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
        body: 'Classic movies and recordings from Internet Archive, podcasts via PodcastIndex, music from Jamendo and Audius, audiobooks from LibriVox, live stations from Radio Browser, live channels from IPTV-org, and show guides from TVMaze.',
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
        heading: 'Unified Favorites & Player Bookmarks',
        body: 'Added universal Favorites with dynamic type filters, player-only immutable timestamp bookmarks, live-updating Jump Back In progress, and streamlined Profile collections.',
      },
      {
        heading: 'Cinema, Music, Podcasts & Live Broadcasts',
        body: 'Unified audio and video mini-player, Picture-in-Picture support, live weather greeting, and personal playlists.',
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
        body: 'Built with open-source mobile and media technologies including libmpv and FFmpeg. All public-domain films, books, and Creative Commons tracks belong to their respective creators and archives.',
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
        body: 'Your playback history, favorites, bookmarks, playlists, and device folders are stored locally on your phone. Sign-in is optional and keeps your profiles cleanly separated.',
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
