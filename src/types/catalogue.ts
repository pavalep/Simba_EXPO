import type {MediaKind, MediaLane, MediaSource} from './media';
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
  /** Formatted "14:20 / 48:10" elapsed/total duration label. */
  elapsedTotalLabel?: string;
  /** 0..1 progress fraction. */
  progress?: number;
  /** True once playback reached >= 95% (next tap restarts from 0:00). */
  completed?: boolean;
  /** Epoch ms when the item was last played. */
  lastPlayedAt?: number;
  /** Match percentage badge when available. */
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

export interface SavedBookmarkRecord {
  id: string;
  itemId: string;
  label: string;
  note: string;
  at: string;
  /** Exact frozen playback timestamp in seconds (never mutated by future playback). */
  positionSeconds?: number;
  /** Total media duration in seconds when bookmarked. */
  durationSeconds?: number;
  /** Epoch ms when this bookmark was created. */
  createdAt?: number;
  positionLabel: string;
  durationLabel: string;
  sourceLabel: string;
  icon: KindIconName;
  /** Full persisted item snapshot so bookmarks always open & play after app restarts. */
  item?: CatalogueItem;
}

export interface FavoriteRecord {
  itemId: string;
  item: CatalogueItem;
  addedAt: number;
  pinned: boolean;
}

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

export interface CatalogueLane {
  id: string;
  label: string;
  subtitle: string;
  searchPlaceholder: string;
  kind: MediaKind;
  icon: KindIconName;
  layout: 'grid' | 'list';
  hasFavorites?: boolean;
  favoritesTitle?: string;
  filters: string[];
  filterGroups: FilterGroup[];
}

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

export interface HybridSuggestionRecord {
  term: string;
  category: string;
  tier: 'Recent' | 'Match' | 'Related' | 'For You';
}

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

export interface DownloadRecord {
  id: string;
  itemId: string;
  title: string;
  subtitle: string;
  sizeLabel: string;
  status: 'Completed' | 'Downloading · 64%';
  lane: MediaLane;
}

export interface LinkedFolderRecord {
  id: string;
  name: string;
  path: string;
  /** Real Android SAF (`content://`) or `file://` directory URI for rescanning. */
  uri?: string;
  trackCount: number;
  videoCount: number;
  lastScanned: string;
  /** Playable local audio & video items scanned from this folder. */
  files?: CatalogueItem[];
}

export interface LegalPageInfo {
  slug: string;
  title: string;
  subtitle: string;
  icon: KindIconName;
  sections: {heading: string; body: string}[];
}

export interface ChapterRow {
  code: string;
  title: string;
  meta: string;
  affinityPercent?: number;
  progress?: number;
}
