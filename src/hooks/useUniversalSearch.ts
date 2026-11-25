import {useMemo} from 'react';
import {useApiQueries} from './useApiQuery';
import {
  audiusApi,
  internetArchiveApi,
  jamendoApi,
  librivoxApi,
  podcastIndexApi,
  radioBrowserApi,
  tvmazeApi,
} from '../infrastructure/api';
import {
  mapArchiveMovieToItem,
  mapAudiobookToItem,
  mapAudiusTrackToItem,
  mapJamendoTrackToItem,
  mapPodcastToItem,
  mapRadioStationToItem,
  mapTVMazeShowToItem,
} from '../infrastructure/api/mappers';
import type {CatalogueItem, SearchScope} from '../data/dummy';

export interface UniversalSearchInput {
  query: string;
  scope: SearchScope;
  sortKey?: string;
  enabled: boolean;
}

/**
 * Aggregated multi-provider search across Movies, Podcasts, Music (Jamendo +
 * Audius), Radio, Shows, and Audiobooks with per-source error isolation.
 */
export function useUniversalSearch({
  query,
  scope,
  sortKey = 'relevance',
  enabled,
}: UniversalSearchInput) {
  const clean = query.trim();
  const active = enabled && clean.length >= 2;

  const wantMovies = active && (scope === 'all' || scope === 'movie' || scope === 'video');
  const wantPodcasts = active && (scope === 'all' || scope === 'podcast' || scope === 'audio');
  const wantMusic = active && (scope === 'all' || scope === 'music' || scope === 'audio');
  const wantRadio = active && (scope === 'all' || scope === 'radio' || scope === 'audio');
  const wantAudiobooks = active && (scope === 'all' || scope === 'audiobook' || scope === 'audio');
  const wantShows = active && (scope === 'all' || scope === 'video');

  const results = useApiQueries({
    queries: [
      {
        queryKey: ['search', 'movies', clean],
        enabled: wantMovies,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const res = await internetArchiveApi.searchInternetArchiveVideos(
            clean,
            {page: 1, limit: 8},
            signal,
          );
          return res.items.map(mapArchiveMovieToItem);
        },
      },
      {
        queryKey: ['search', 'podcasts', clean],
        enabled: wantPodcasts,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const pods = await podcastIndexApi.searchPodcasts(clean, 8, signal);
          return pods.map(mapPodcastToItem);
        },
      },
      {
        queryKey: ['search', 'music', clean],
        enabled: wantMusic,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const [jamendo, audius] = await Promise.all([
            jamendoApi.searchJamendoTracks(clean, {page: 1, limit: 6}, signal).catch(() => []),
            audiusApi.searchAudiusTracks(clean, {limit: 6}, signal).catch(() => []),
          ]);
          return [
            ...jamendo.map(mapJamendoTrackToItem),
            ...audius.map(mapAudiusTrackToItem),
          ];
        },
      },
      {
        queryKey: ['search', 'radio', clean],
        enabled: wantRadio,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const stations = await radioBrowserApi.searchStations(
            clean,
            {page: 1, limit: 6},
            signal,
          );
          return stations.map(mapRadioStationToItem);
        },
      },
      {
        queryKey: ['search', 'audiobooks', clean],
        enabled: wantAudiobooks,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const books = await librivoxApi.searchAudiobooks(
            clean,
            {page: 1, limit: 6},
            signal,
          );
          return books.map(mapAudiobookToItem);
        },
      },
      {
        queryKey: ['search', 'shows', clean],
        enabled: wantShows,
        queryFn: async ({signal}: {signal: AbortSignal}) => {
          const shows = await tvmazeApi.searchShows(clean, signal);
          return shows.slice(0, 6).map(mapTVMazeShowToItem);
        },
      },
    ],
  });

  const items = useMemo(() => {
    const merged: CatalogueItem[] = [];
    const seen = new Set<string>();
    for (const q of results) {
      const data = (q.data as CatalogueItem[] | undefined) ?? [];
      for (const item of data) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
    if (sortKey === 'rating') {
      return [...merged].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (sortKey === 'az') {
      return [...merged].sort((a, b) => a.title.localeCompare(b.title));
    }
    return merged;
  }, [results, sortKey]);

  const isLoading = results.some(r => r.isLoading || r.isFetching);

  return {
    items,
    isLoading,
  };
}
