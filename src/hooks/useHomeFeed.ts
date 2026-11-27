import {useMemo} from 'react';
import {useApiQuery} from './useApiQuery';
import {
  audiusApi,
  internetArchiveApi,
  jamendoApi,
  podcastIndexApi,
  radioBrowserApi,
  weatherApi,
} from '../infrastructure/api';
import {
  mapArchiveMovieToItem,
  mapAudiusTrackToItem,
  mapJamendoTrackToItem,
  mapPodcastToItem,
  mapRadioStationToItem,
} from '../infrastructure/api/mappers';
import type {CatalogueItem, CuratedMixRecord} from '../types/catalogue';
import {resolveDeviceWeatherCity} from '../utils/timezoneToCity';

/**
 * Parallel live data hook for Home & Explore.
 * Fetches live Open-Meteo weather (using real device timezone/locale city) +
 * Internet Archive movies + PodcastIndex trending + Jamendo/Audius music +
 * Radio Browser stations via TanStack Query.
 */
export function useHomeFeed() {
  const weatherCity = useMemo(() => resolveDeviceWeatherCity(), []);

  const weatherQuery = useApiQuery({
    queryKey: ['weather', 'city', weatherCity ?? 'unknown'],
    enabled: Boolean(weatherCity),
    queryFn: ({signal}) =>
      weatherCity
        ? weatherApi.fetchWeatherByCity(weatherCity, signal)
        : Promise.resolve(null),
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const moviesQuery = useApiQuery<CatalogueItem[]>({
    queryKey: ['home', 'movies'],
    queryFn: async ({signal}) => {
      const res = await internetArchiveApi.searchInternetArchiveVideos(
        'collection:feature_films',
        {page: 1, limit: 10, sort: 'downloads desc'},
        signal,
      );
      return res.items.map(mapArchiveMovieToItem);
    },
    staleTime: 5 * 60_000,
  });

  const podcastsQuery = useApiQuery<CatalogueItem[]>({
    queryKey: ['home', 'podcasts'],
    queryFn: async ({signal}) => {
      const pods = await podcastIndexApi.getTrendingPodcasts(10, undefined, signal);
      return pods.map(mapPodcastToItem);
    },
    staleTime: 5 * 60_000,
  });

  const musicQuery = useApiQuery<CatalogueItem[]>({
    queryKey: ['home', 'music'],
    queryFn: async ({signal}) => {
      const [jamendo, audius] = await Promise.all([
        jamendoApi.getPopularJamendoTracks(8, 1, signal).catch(() => []),
        audiusApi.getTrendingAudiusTracks(6, signal).catch(() => []),
      ]);
      return [
        ...jamendo.map(mapJamendoTrackToItem),
        ...audius.map(mapAudiusTrackToItem),
      ];
    },
    staleTime: 5 * 60_000,
  });

  const radioQuery = useApiQuery<CatalogueItem[]>({
    queryKey: ['home', 'radio'],
    queryFn: async ({signal}) => {
      const stations = await radioBrowserApi.getTopStations(
        {page: 1, limit: 10},
        signal,
      );
      return stations.map(mapRadioStationToItem);
    },
    staleTime: 5 * 60_000,
  });

  const weatherSummary = useMemo(() => {
    const snap = weatherQuery.data;
    if (!snap) {
      return null;
    }
    return `${Math.round(snap.temperatureC)}°C · ${snap.description} · ${snap.cityName}`;
  }, [weatherQuery.data]);

  const isLoading =
    moviesQuery.isLoading &&
    podcastsQuery.isLoading &&
    musicQuery.isLoading &&
    radioQuery.isLoading;

  const refetchAll = async () => {
    await Promise.all([
      weatherQuery.refetch(),
      moviesQuery.refetch(),
      podcastsQuery.refetch(),
      musicQuery.refetch(),
      radioQuery.refetch(),
    ]);
  };

  const curatedMixes: CuratedMixRecord[] = useMemo(() => {
    const list: CuratedMixRecord[] = [];
    const movies = moviesQuery.data ?? [];
    const podcasts = podcastsQuery.data ?? [];
    const music = musicQuery.data ?? [];
    const radio = radioQuery.data ?? [];

    if (music.length > 0) {
      list.push({
        id: 'mix-live-music',
        title: 'Fresh Indie & Beats',
        subtitle: 'Fresh independent tracks & curated beats',
        eyebrow: 'MUSIC MIX',
        editorialReason: 'Fresh independent releases streaming now',
        count: music.length,
        pinned: false,
        trackIds: music.map(m => m.id),
        icon: 'music-clef-treble',
      });
    }
    if (movies.length > 0) {
      list.push({
        id: 'mix-live-cinema',
        title: 'Classic Cinema Vault',
        subtitle: 'Restored public-domain films & timeless cinema',
        eyebrow: 'CINEMA MIX',
        editorialReason: 'Timeless classics ready to stream',
        count: movies.length,
        pinned: false,
        trackIds: movies.map(m => m.id),
        icon: 'movie-open-outline',
      });
    }
    if (podcasts.length > 0) {
      list.push({
        id: 'mix-live-podcasts',
        title: 'Trending Conversations',
        subtitle: 'Top shows, stories & interviews',
        eyebrow: 'PODCAST MIX',
        editorialReason: 'Popular episodes and shows right now',
        count: podcasts.length,
        pinned: false,
        trackIds: podcasts.map(p => p.id),
        icon: 'podcast',
      });
    }
    if (radio.length > 0) {
      list.push({
        id: 'mix-live-radio',
        title: 'Global Radio Waves',
        subtitle: 'Live FM & internet stations streaming worldwide',
        eyebrow: 'RADIO MIX',
        editorialReason: 'Live stations broadcasting around the world',
        count: radio.length,
        pinned: false,
        trackIds: radio.map(r => r.id),
        icon: 'radio-tower',
      });
    }
    return list;
  }, [moviesQuery.data, podcastsQuery.data, musicQuery.data, radioQuery.data]);

  return {
    weatherSummary,
    movies: moviesQuery.data ?? [],
    podcasts: podcastsQuery.data ?? [],
    music: musicQuery.data ?? [],
    radio: radioQuery.data ?? [],
    curatedMixes,
    isLoading,
    refetchAll,
  };
}
