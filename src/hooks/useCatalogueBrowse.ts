import {useMemo} from 'react';
import {useInfiniteApiQuery} from './useApiQuery';
import {
  audiusApi,
  internetArchiveApi,
  iptvApi,
  jamendoApi,
  librivoxApi,
  podcastIndexApi,
  radioBrowserApi,
  tvmazeApi,
} from '../infrastructure/api';
import {
  mapArchiveAudioToItem,
  mapArchiveMovieToItem,
  mapAudiobookToItem,
  mapAudiusTrackToItem,
  mapIPTVChannelToItem,
  mapJamendoTrackToItem,
  mapPodcastToItem,
  mapRadioStationToItem,
  mapTVMazeShowToItem,
} from '../infrastructure/api/mappers';
import type {CatalogueItem} from '../data/dummy';

export interface CatalogueBrowseInput {
  laneId: string;
  searchQuery?: string;
  selectedChip?: string;
  sortKey?: string;
}

export interface CataloguePage {
  items: CatalogueItem[];
  page: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const MOVIE_CHIP_QUERIES: Record<string, string> = {
  Popular: 'mediatype:movies AND collection:(feature_films OR classic_tv)',
  Thriller: 'subject:"thriller" OR subject:"film noir"',
  Drama: 'subject:"drama"',
  Comedy: 'subject:"comedy"',
  'Sci-Fi': 'subject:"sci-fi" OR subject:"science fiction"',
  Classic: 'subject:"classic films" OR collection:feature_films',
  Action: 'subject:"action" OR subject:"adventure"',
};

const MOVIE_SORT_MAP: Record<string, string> = {
  Popular: 'downloads desc',
  Rating: 'avg_rating desc',
  Year: 'year desc',
  AZ: 'titleSorter asc',
};

async function fetchCataloguePage(
  input: CatalogueBrowseInput,
  page: number,
  signal?: AbortSignal,
): Promise<CataloguePage> {
  const {laneId, searchQuery = '', selectedChip = 'Popular', sortKey = 'Popular'} = input;
  const q = searchQuery.trim();

  switch (laneId) {
    case 'movies': {
      const query = q.length > 0
        ? q
        : MOVIE_CHIP_QUERIES[selectedChip] ?? MOVIE_CHIP_QUERIES.Popular;
      const sort = MOVIE_SORT_MAP[sortKey] ?? 'downloads desc';
      const res = await internetArchiveApi.searchInternetArchiveVideos(
        query,
        {page, limit: PAGE_SIZE, sort},
        signal,
      );
      return {
        items: res.items.map(mapArchiveMovieToItem),
        page,
        hasMore: page * PAGE_SIZE < res.numFound,
      };
    }

    case 'shows': {
      if (q.length > 0) {
        const shows = await tvmazeApi.searchShows(q, signal);
        return {
          items: shows.map(mapTVMazeShowToItem),
          page,
          hasMore: false,
        };
      }
      // TVMaze pages are 0-indexed and return ~250 shows per page
      const rawShows = await tvmazeApi.getShowsPage(Math.max(0, page - 1), signal);
      let filtered = rawShows;
      if (selectedChip !== 'Popular' && selectedChip !== 'All') {
        const chipLower = selectedChip.toLowerCase();
        const matches = rawShows.filter(s =>
          s.genres?.some(g => g.toLowerCase().includes(chipLower)),
        );
        if (matches.length > 0) {
          filtered = matches;
        }
      }
      if (sortKey === 'Rating') {
        filtered = [...filtered].sort(
          (a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0),
        );
      } else if (sortKey === 'AZ') {
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      }
      return {
        items: filtered.slice(0, PAGE_SIZE).map(mapTVMazeShowToItem),
        page,
        hasMore: rawShows.length >= 20,
      };
    }

    case 'podcasts': {
      const max = page * PAGE_SIZE;
      if (q.length > 0) {
        const pods = await podcastIndexApi.searchPodcasts(q, max, signal);
        const start = (page - 1) * PAGE_SIZE;
        return {
          items: pods.slice(start, max).map(mapPodcastToItem),
          page,
          hasMore: pods.length >= max,
        };
      }
      const category =
        selectedChip !== 'Popular' && selectedChip !== 'All'
          ? selectedChip
          : undefined;
      const pods = await podcastIndexApi.getTrendingPodcasts(
        max,
        category,
        signal,
      );
      const start = (page - 1) * PAGE_SIZE;
      return {
        items: pods.slice(start, max).map(mapPodcastToItem),
        page,
        hasMore: pods.length >= max && page < 5,
      };
    }

    case 'music': {
      // Combine Jamendo (paginated) + Audius trending/search on page 1
      if (q.length > 0) {
        const [jamendo, audius] = await Promise.all([
          jamendoApi
            .searchJamendoTracks(q, {page, limit: PAGE_SIZE}, signal)
            .catch(() => []),
          page === 1
            ? audiusApi
                .searchAudiusTracks(q, {limit: 10}, signal)
                .catch(() => [])
            : Promise.resolve([]),
        ]);
        const items = [
          ...jamendo.map(mapJamendoTrackToItem),
          ...audius.map(mapAudiusTrackToItem),
        ];
        return {
          items,
          page,
          hasMore: jamendo.length >= PAGE_SIZE,
        };
      }
      if (selectedChip !== 'Popular' && selectedChip !== 'All') {
        const tracks = await jamendoApi.getJamendoTracksByGenre(
          selectedChip.toLowerCase(),
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: tracks.map(mapJamendoTrackToItem),
          page,
          hasMore: tracks.length >= PAGE_SIZE,
        };
      }
      const [jamendo, audius] = await Promise.all([
        jamendoApi
          .getPopularJamendoTracks(PAGE_SIZE, page, signal)
          .catch(() => []),
        page === 1
          ? audiusApi.getTrendingAudiusTracks(10, signal).catch(() => [])
          : Promise.resolve([]),
      ]);
      return {
        items: [
          ...jamendo.map(mapJamendoTrackToItem),
          ...audius.map(mapAudiusTrackToItem),
        ],
        page,
        hasMore: jamendo.length >= PAGE_SIZE,
      };
    }

    case 'radio': {
      if (q.length > 0) {
        const stations = await radioBrowserApi.searchStations(
          q,
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: stations.map(mapRadioStationToItem),
          page,
          hasMore: stations.length >= PAGE_SIZE,
        };
      }
      if (selectedChip !== 'Popular' && selectedChip !== 'All') {
        const stations = await radioBrowserApi.getStationsByGenre(
          selectedChip.toLowerCase(),
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: stations.map(mapRadioStationToItem),
          page,
          hasMore: stations.length >= PAGE_SIZE,
        };
      }
      const stations = await radioBrowserApi.getTopStations(
        {page, limit: PAGE_SIZE},
        signal,
      );
      return {
        items: stations.map(mapRadioStationToItem),
        page,
        hasMore: stations.length >= PAGE_SIZE,
      };
    }

    case 'livetv': {
      const catalogue = await iptvApi.getIPTVCatalogue(signal);
      let list = catalogue.channels;
      if (q.length > 0) {
        const ql = q.toLowerCase();
        list = list.filter(
          c =>
            c.name.toLowerCase().includes(ql) ||
            c.country?.toLowerCase().includes(ql) ||
            c.category?.toLowerCase().includes(ql),
        );
      } else if (selectedChip !== 'Popular' && selectedChip !== 'All') {
        const cl = selectedChip.toLowerCase();
        const filtered = list.filter(
          c =>
            c.category?.toLowerCase().includes(cl) ||
            c.categoryId?.toLowerCase().includes(cl),
        );
        if (filtered.length > 0) {
          list = filtered;
        }
      }
      if (sortKey === 'AZ') {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      }
      const start = (page - 1) * PAGE_SIZE;
      const slice = list.slice(start, start + PAGE_SIZE);
      return {
        items: slice.map(mapIPTVChannelToItem),
        page,
        hasMore: start + PAGE_SIZE < list.length,
      };
    }

    case 'audiobooks': {
      if (q.length > 0) {
        const books = await librivoxApi.searchAudiobooks(
          q,
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: books.map(mapAudiobookToItem),
          page,
          hasMore: books.length >= PAGE_SIZE,
        };
      }
      if (selectedChip !== 'Popular' && selectedChip !== 'All') {
        const books = await librivoxApi.searchByGenre(
          selectedChip,
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: books.map(mapAudiobookToItem),
          page,
          hasMore: books.length >= PAGE_SIZE,
        };
      }
      const books = await librivoxApi.getRecentAudiobooks(
        {page, limit: PAGE_SIZE},
        signal,
      );
      return {
        items: books.map(mapAudiobookToItem),
        page,
        hasMore: books.length >= PAGE_SIZE,
      };
    }

    case 'archive':
    default: {
      const query = q.length > 0
        ? q
        : selectedChip === 'Classical'
        ? 'subject:"classical"'
        : selectedChip === 'Old films'
        ? 'collection:silent_films'
        : 'collection:opensource_audio OR collection:etree';
      if (selectedChip === 'Video' || selectedChip === 'Old films') {
        const res = await internetArchiveApi.searchInternetArchiveVideos(
          query,
          {page, limit: PAGE_SIZE},
          signal,
        );
        return {
          items: res.items.map(mapArchiveMovieToItem),
          page,
          hasMore: page * PAGE_SIZE < res.numFound,
        };
      }
      const res = await internetArchiveApi.searchInternetArchiveAudio(
        query,
        {page, limit: PAGE_SIZE},
        signal,
      );
      return {
        items: res.items.map(mapArchiveAudioToItem),
        page,
        hasMore: page * PAGE_SIZE < res.numFound,
      };
    }
  }
}

/**
 * Paginated, filterable, searchable infinite-query hook for all 8 catalogues.
 * Separates first-load `error` from `pageError` so errors are never announced twice.
 */
export function useCatalogueBrowse(input: CatalogueBrowseInput) {
  const query = useInfiniteApiQuery<CataloguePage>({
    queryKey: [
      'catalogue',
      input.laneId,
      input.searchQuery ?? '',
      input.selectedChip ?? 'Popular',
      input.sortKey ?? 'Popular',
    ],
    initialPageParam: 1,
    queryFn: ({pageParam, signal}) =>
      fetchCataloguePage(input, Number(pageParam ?? 1), signal),
    getNextPageParam: lastPage =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const items = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<string>();
    const out: CatalogueItem[] = [];
    for (const p of pages) {
      for (const item of p.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
    }
    return out;
  }, [query.data]);

  const firstLoadError =
    query.isError && items.length === 0 ? query.error : null;
  const pageError =
    query.isFetchNextPageError ? query.error : null;

  return {
    items,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    error: firstLoadError,
    pageError,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
