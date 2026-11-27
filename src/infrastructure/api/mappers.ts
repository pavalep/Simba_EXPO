// ─── Typed API Response -> Domain CatalogueItem Mappers ─────────────────────
// Pure conversion layer turning each provider's typed wire response into
// SIMBA's unified `CatalogueItem` + stream URL resolver for libmpv playback.

import type {
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  IPTVChannelResult,
  JamendoTrackResult,
  PodcastEpisodeResult,
  PodcastResult,
  RadioStationResult,
  TVMazeShow,
} from '../../types/api';
import type {CatalogueItem} from '../../types/catalogue';
import {
  getArchiveTracks,
  getInternetArchiveVideoDetails,
} from './internetArchive/adapter';
import {getEpisodes} from './podcastIndex/adapter';

function stripHtml(text?: string | null): string {
  if (!text) {
    return '';
  }
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Internet Archive search listings return a directory URL like
 * `https://archive.org/download/<identifier>/` which is an HTML index page,
 * not a playable media file. We must resolve the actual `.mp4`/`.mp3` file
 * via `getInternetArchiveVideoDetails` / `getArchiveTracks`.
 */
export function isArchiveDirectoryUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  return /^https?:\/\/archive\.org\/download\/[^/]+\/?$/i.test(url.trim());
}

export function mapArchiveMovieToItem(
  v: InternetArchiveVideoResult,
): CatalogueItem {
  const mins = v.duration > 0 ? `${Math.round(v.duration / 60)} min` : null;
  return {
    id: `ia-movie-${v.identifier}`,
    externalId: v.identifier,
    title: v.title,
    subtitle: v.creator || 'Classic Cinema',
    meta: [v.year, mins].filter(Boolean).join(' · ') || 'Public Domain',
    kind: 'movie',
    catalogueLaneId: 'movies',
    lane: 'video',
    source: 'api',
    provider: 'Internet Archive',
    year: v.year || undefined,
    durationSeconds: v.duration || undefined,
    rating: v.avgRating > 0 ? Number(v.avgRating.toFixed(1)) : 4.7,
    genre: 'Classic Cinema',
    synopsis: stripHtml(v.description) || undefined,
    artworkUrl: v.imageUrl || undefined,
    streamUrl:
      v.streamingUrl && !isArchiveDirectoryUrl(v.streamingUrl)
        ? v.streamingUrl
        : undefined,
    icon: 'movie-open-outline',
  };
}

export function mapArchiveAudioToItem(
  a: InternetArchiveItemResult,
): CatalogueItem {
  const isVideo = a.mediaType === 'video';
  return {
    id: `ia-arc-${a.identifier}`,
    externalId: a.identifier,
    title: a.title,
    subtitle: a.creator || 'Classic Archive',
    meta: [a.year, a.runtime].filter(Boolean).join(' · ') || 'Archive',
    kind: isVideo ? 'archive-video' : 'archive-audio',
    catalogueLaneId: 'archive',
    lane: isVideo ? 'video' : 'audio',
    source: 'api',
    provider: 'Internet Archive',
    year: a.year || undefined,
    rating: a.avgRating > 0 ? Number(a.avgRating.toFixed(1)) : 4.7,
    genre: isVideo ? 'Video' : 'Audio',
    synopsis: stripHtml(a.description) || undefined,
    artworkUrl: a.imageUrl || undefined,
    streamUrl:
      a.streamingUrl && !isArchiveDirectoryUrl(a.streamingUrl)
        ? a.streamingUrl
        : undefined,
    icon: 'archive-outline',
  };
}

export function mapTVMazeShowToItem(show: TVMazeShow): CatalogueItem {
  return {
    id: `tvmaze-${show.id}`,
    externalId: String(show.id),
    title: show.name,
    subtitle: show.network?.name || show.genres?.[0] || 'TV Series',
    meta: [
      show.premiered?.slice(0, 4),
      show.rating?.average ? `★ ${(show.rating.average / 2).toFixed(1)}` : null,
      show.status,
    ]
      .filter(Boolean)
      .join(' · '),
    kind: 'video',
    catalogueLaneId: 'shows',
    lane: 'video',
    source: 'api',
    provider: 'TVMaze',
    year: show.premiered?.slice(0, 4),
    rating: show.rating?.average ? Number((show.rating.average / 2).toFixed(1)) : 4.5,
    genre: show.genres?.[0] || 'Series',
    synopsis: stripHtml(show.summary) || undefined,
    artworkUrl: show.image?.medium || show.image?.original || undefined,
    icon: 'television-classic',
  };
}

export function mapPodcastToItem(pod: PodcastResult): CatalogueItem {
  const firstCat = pod.categories
    ? Object.values(pod.categories)[0]
    : undefined;
  return {
    id: `pod-${pod.id}`,
    externalId: String(pod.id),
    title: pod.title,
    subtitle: pod.author || 'Podcast',
    meta:
      pod.episodeCount && pod.episodeCount > 0
        ? `${pod.episodeCount} episodes`
        : firstCat || 'Podcast',
    kind: 'podcast',
    catalogueLaneId: 'podcasts',
    lane: 'audio',
    source: 'api',
    provider: 'PodcastIndex',
    rating: 4.8,
    genre: firstCat || 'Podcast',
    synopsis: stripHtml(pod.description) || undefined,
    artworkUrl: pod.image || undefined,
    icon: 'podcast',
  };
}

export function mapPodcastEpisodeToItem(
  ep: PodcastEpisodeResult,
  podcastTitle?: string,
  fallbackArtwork?: string,
): CatalogueItem {
  return {
    id: `podep-${ep.id}`,
    externalId: String(ep.id),
    title: ep.title,
    subtitle: podcastTitle || 'Podcast Episode',
    meta: ep.duration ? `${Math.round(ep.duration / 60)} min` : 'Episode',
    kind: 'podcast',
    catalogueLaneId: 'podcasts',
    lane: 'audio',
    source: 'api',
    provider: 'PodcastIndex',
    durationSeconds: ep.duration || undefined,
    synopsis: stripHtml(ep.description) || undefined,
    artworkUrl: ep.image || fallbackArtwork || undefined,
    streamUrl: ep.enclosureUrl || undefined,
    icon: 'podcast',
  };
}

export function mapJamendoTrackToItem(t: JamendoTrackResult): CatalogueItem {
  return {
    id: `jam-${t.id}`,
    externalId: String(t.id),
    title: t.name,
    subtitle: t.artistName,
    meta: [t.albumName, t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : null]
      .filter(Boolean)
      .join(' · '),
    kind: 'music',
    catalogueLaneId: 'music',
    lane: 'audio',
    source: 'api',
    provider: 'Jamendo',
    durationSeconds: t.duration || undefined,
    rating: 4.7,
    genre: 'Indie Music',
    artworkUrl: t.imageUrl || undefined,
    streamUrl: t.audioUrl || undefined,
    icon: 'music-clef-treble',
  };
}

export function mapAudiusTrackToItem(t: AudiusTrackResult): CatalogueItem {
  return {
    id: `aud-${t.id}`,
    externalId: t.id,
    title: t.title,
    subtitle: t.artistName,
    meta: [t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : null, 'Independent']
      .filter(Boolean)
      .join(' · '),
    kind: 'music',
    catalogueLaneId: 'music',
    lane: 'audio',
    source: 'api',
    provider: 'Audius',
    durationSeconds: t.duration || undefined,
    rating: 4.8,
    genre: 'Music',
    synopsis: stripHtml(t.description) || undefined,
    artworkUrl: t.artworkUrl || undefined,
    streamUrl: t.streamUrl || undefined,
    icon: 'music-clef-treble',
  };
}

export function mapRadioStationToItem(s: RadioStationResult): CatalogueItem {
  return {
    id: `rad-${s.id}`,
    externalId: s.id,
    title: s.name,
    subtitle: [s.country, s.bitrate ? `${s.bitrate} kbps` : null]
      .filter(Boolean)
      .join(' · '),
    meta: s.tags?.split(',').slice(0, 2).join(' · ') || 'Live Radio',
    kind: 'radio',
    catalogueLaneId: 'radio',
    lane: 'audio',
    source: 'api',
    provider: 'Radio Browser',
    rating: 4.7,
    genre: s.tags?.split(',')[0]?.trim() || 'Radio',
    country: s.country || undefined,
    language: s.language || undefined,
    artworkUrl: s.image || undefined,
    streamUrl: s.url || undefined,
    icon: 'radio-tower',
  };
}

export function mapIPTVChannelToItem(ch: IPTVChannelResult): CatalogueItem {
  return {
    id: `iptv-${ch.id}`,
    externalId: ch.id,
    title: ch.name,
    subtitle: [ch.country, ch.category].filter(Boolean).join(' · ') || 'Live TV',
    meta: 'LIVE NOW',
    kind: 'live-tv',
    catalogueLaneId: 'livetv',
    lane: 'video',
    source: 'api',
    provider: 'IPTV-org',
    rating: 4.6,
    genre: ch.category || 'Live TV',
    country: ch.country || undefined,
    artworkUrl: ch.image || undefined,
    streamUrl: ch.url || undefined,
    httpHeaders: ch.headers,
    icon: 'access-point',
  };
}

export function mapAudiobookToItem(b: AudiobookResult): CatalogueItem {
  const hrs = b.totalTime > 0 ? `${Math.max(1, Math.round(b.totalTime / 3600))} hr` : null;
  return {
    id: `lbv-${b.id}`,
    externalId: String(b.id),
    title: b.title,
    subtitle: b.author || 'Classic Audiobook',
    meta: [hrs, b.language].filter(Boolean).join(' · ') || 'Audiobook',
    kind: 'audiobook',
    catalogueLaneId: 'audiobooks',
    lane: 'audio',
    source: 'api',
    provider: 'LibriVox',
    durationSeconds: b.totalTime || undefined,
    rating: 4.8,
    genre: 'Audiobook',
    language: b.language || undefined,
    synopsis: stripHtml(b.description) || undefined,
    streamUrl: b.urlZipFile || undefined,
    icon: 'book-open-page-variant-outline',
  };
}

async function withRetryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise<void>(r => setTimeout(() => r(), 600));
    return await fn();
  }
}

/**
 * Resolves a direct playable stream URL for items whose listing API does not
 * return a direct media file URL (e.g. Internet Archive movies/audio require
 * a metadata lookup, Podcast Index feeds resolve their latest episode).
 */
export async function resolvePlayableStreamUrl(
  item: CatalogueItem,
): Promise<{url: string; headers?: Record<string, string>} | null> {
  if (
    item.streamUrl &&
    item.streamUrl.startsWith('http') &&
    !isArchiveDirectoryUrl(item.streamUrl)
  ) {
    return {url: item.streamUrl, headers: item.httpHeaders};
  }

  // Internet Archive Video / Movie
  if (
    item.provider === 'Internet Archive' &&
    item.lane === 'video' &&
    item.externalId
  ) {
    const details = await withRetryOnce(() =>
      getInternetArchiveVideoDetails(item.externalId!),
    );
    if (details?.streamingUrl && !isArchiveDirectoryUrl(details.streamingUrl)) {
      return {url: details.streamingUrl};
    }
  }

  // Internet Archive Audio
  if (
    item.provider === 'Internet Archive' &&
    item.lane === 'audio' &&
    item.externalId
  ) {
    const tracks = await withRetryOnce(() => getArchiveTracks(item.externalId!));
    if (tracks[0]?.url) {
      return {url: tracks[0].url};
    }
  }

  // Podcast Index feed -> play latest episode
  if (item.provider === 'PodcastIndex' && item.externalId) {
    const feedId = Number(item.externalId);
    if (Number.isFinite(feedId) && feedId > 0) {
      const eps = await withRetryOnce(() => getEpisodes(feedId, 5));
      const firstPlayable = eps.find(e => e.enclosureUrl?.startsWith('http'));
      if (firstPlayable?.enclosureUrl) {
        return {url: firstPlayable.enclosureUrl};
      }
    }
  }

  return null;
}
