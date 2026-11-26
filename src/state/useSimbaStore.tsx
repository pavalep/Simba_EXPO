import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {KindIconName} from '../components/ui';
import {
  autoDeleteOptions,
  eqPresets,
  type CatalogueItem,
  type CuratedMixRecord,
  type DownloadRecord,
  type LinkedFolderRecord,
  type SavedBookmarkRecord,
} from '../data/dummy';
import {
  GUEST_PROFILE_ID,
  GUEST_PROFILE_META,
  loadProfileRegistry,
  loadProfileSnapshot,
  makeUserProfileId,
  saveProfileRegistry,
  saveProfileSnapshot,
  type PersistedProfileSnapshot,
  type ProfilePreferences,
  type UserProfileMeta,
} from '../infrastructure/persistence/profileStorage';
import {signInSilently} from '../services/authService';
import {
  canBookmarkItem,
  registerLiveItem,
  registerLiveItems,
} from '../infrastructure/player';

function isDisallowedBookmark(bm: SavedBookmarkRecord): boolean {
  if (
    bm.item?.kind === 'live-tv' ||
    bm.item?.kind === 'radio' ||
    bm.itemId.startsWith('iptv-') ||
    bm.itemId.startsWith('rad-')
  ) {
    return true;
  }
  return false;
}

function isCorruptedPlaceholderItem(item: CatalogueItem): boolean {
  return (
    item.title === 'Media Title' &&
    item.provider === 'Simba' &&
    !item.streamUrl &&
    !item.externalId
  );
}

function hydrateRegistryFromSnapshot(snap: PersistedProfileSnapshot): void {
  const items: CatalogueItem[] = [];
  for (const h of snap.history) {
    if (!isCorruptedPlaceholderItem(h)) {
      items.push(h);
    }
  }
  for (const bm of snap.bookmarks) {
    if (bm.item) {
      items.push(bm.item);
    }
  }
  for (const pl of snap.playlistsList) {
    if (Array.isArray(pl.items)) {
      items.push(...pl.items);
    }
  }
  for (const pod of snap.podcastsList) {
    if (pod.item) {
      items.push(pod.item);
    }
  }
  if (Array.isArray(snap.favoriteStations)) {
    items.push(...snap.favoriteStations);
  }
  if (items.length > 0) {
    registerLiveItems(items);
  }
}

export type {ProfilePreferences, UserProfileMeta};

export interface FollowedPodcastRecord {
  id: string;
  itemId?: string;
  title: string;
  author: string;
  episodes: number;
  category: string;
  pinned: boolean;
  icon: KindIconName;
  artworkUrl?: string;
  item?: CatalogueItem;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  count: number;
  kindLabel: string;
  lane: 'audio' | 'video';
  itemIds: string[];
  items?: CatalogueItem[];
  pinned: boolean;
  icon: KindIconName;
}

export type AddToPlaylistResult =
  | {ok: true; playlistName: string}
  | {
      ok: false;
      reason: 'lane-mismatch' | 'duplicate' | 'not-found';
      message: string;
    };

export interface SimbaState {
  // Auth & Multi-Profile State
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  activeProfile: UserProfileMeta;
  savedProfiles: UserProfileMeta[];
  signInAsProfile: (
    name: string,
    email: string,
    googleId?: string,
    photo?: string | null,
  ) => void;
  switchProfile: (profileId: string) => void;
  signOut: () => void;
  preferences: ProfilePreferences;
  updatePreferences: (patch: Partial<ProfilePreferences>) => void;
  selectedTopics: string[];
  toggleTopic: (id: string) => void;

  // Active Player & Unified Mini-Player Dock (06.1–06.7)
  nowPlaying: CatalogueItem | null;
  isPlaying: boolean;
  positionSeconds: number;
  isPipActive: boolean;
  dockVisible: boolean;
  activeLiveChannelId: string;
  setActiveLiveChannelId: (id: string) => void;
  playItem: (item: CatalogueItem) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setIsPipActive: (v: boolean) => void;
  setDockVisible: (v: boolean) => void;

  // Queue & History with Undo (06.7)
  queue: CatalogueItem[];
  history: CatalogueItem[];
  undoMessage: string | null;
  addToQueue: (item: CatalogueItem) => void;
  playNextInQueue: (item: CatalogueItem) => void;
  removeFromQueue: (id: string) => void;
  moveQueueItem: (index: number, direction: 'up' | 'down') => void;
  shuffleQueue: () => void;
  clearQueue: () => void;
  undoQueueAction: () => void;
  dismissUndo: () => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;

  // Search Frecency History (03.3–03.5)
  recentSearches: string[];
  commitSearchQuery: (term: string) => void;
  deleteRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;

  // Personal Library: Bookmarks, Playlists, Mixes, Subscriptions, Favorites (02.x, 04.5, 04.6, 07.x)
  bookmarks: SavedBookmarkRecord[];
  toggleBookmarkItem: (item: CatalogueItem, note?: string) => void;
  updateBookmarkSnapshot: (item: CatalogueItem) => void;
  removeBookmark: (id: string) => void;
  clearBookmarks: () => void;

  playlistsList: PlaylistRecord[];
  togglePinPlaylist: (id: string) => void;
  createPlaylist: (
    name: string,
    kindLabel?: 'AUDIO' | 'VIDEO',
    initialItem?: CatalogueItem,
  ) => void;
  addItemToPlaylist: (
    playlistId: string,
    item: CatalogueItem,
  ) => AddToPlaylistResult;

  mixes: CuratedMixRecord[];
  pinnedMixIds: string[];
  togglePinMix: (id: string) => void;

  podcastsList: FollowedPodcastRecord[];
  toggleFollowPodcast: (
    titleOrItem: string | CatalogueItem,
    artworkUrl?: string,
  ) => void;
  updateSubscriptionSnapshot: (item: CatalogueItem) => void;
  togglePinPodcast: (id: string) => void;

  favoriteRadioIds: string[];
  toggleFavoriteRadio: (idOrItem: string | CatalogueItem) => void;
  favoriteTvIds: string[];
  toggleFavoriteTv: (idOrItem: string | CatalogueItem) => void;
  favoriteStations: CatalogueItem[];
  pinnedStationIds: string[];
  togglePinStation: (id: string) => void;

  // Equalizer (06.2)
  eqPreset: string;
  eqGains: number[];
  selectEqPreset: (preset: string) => void;
  adjustEqBand: (index: number, delta: number) => void;

  // Downloads & Linked Folders (07.4, 07.5)
  downloads: DownloadRecord[];
  removeDownload: (id: string) => void;
  autoDeletePolicy: (typeof autoDeleteOptions)[number];
  setAutoDeletePolicy: (policy: (typeof autoDeleteOptions)[number]) => void;
  linkedFolders: LinkedFolderRecord[];
  addLinkedFolder: (name: string, path: string) => void;
  removeLinkedFolder: (id: string) => void;
  rescanLinkedFolders: () => void;
}

const SimbaStoreContext = createContext<SimbaState | null>(null);

export function SimbaStoreProvider({children}: {children: React.ReactNode}) {
  const initialRegistry = useMemo(() => loadProfileRegistry(), []);
  const initialSnapshot = useMemo(
    () => loadProfileSnapshot(initialRegistry.activeProfileId, eqPresets.Flat),
    [initialRegistry.activeProfileId],
  );

  const [savedProfiles, setSavedProfiles] = useState<UserProfileMeta[]>(
    initialRegistry.profiles,
  );
  const [activeProfileId, setActiveProfileId] = useState<string>(
    initialRegistry.activeProfileId,
  );

  const activeProfile = useMemo<UserProfileMeta>(
    () =>
      savedProfiles.find(p => p.id === activeProfileId) ?? GUEST_PROFILE_META,
    [savedProfiles, activeProfileId],
  );
  const signedIn = !activeProfile.isGuest;

  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    initialSnapshot.selectedTopics,
  );
  const [preferences, setPreferences] = useState<ProfilePreferences>(
    initialSnapshot.preferences,
  );

  // Player & Dock — session-scoped, starts clean with no fake playback
  const [nowPlaying, setNowPlaying] = useState<CatalogueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [isPipActive, setIsPipActive] = useState(false);
  const [dockVisible, setDockVisible] = useState(false);
  const [activeLiveChannelId, setActiveLiveChannelId] = useState('');

  // Queue & History — history persisted per profile
  const [queue, setQueue] = useState<CatalogueItem[]>([]);
  const [prevQueueSnapshot, setPrevQueueSnapshot] = useState<CatalogueItem[] | null>(
    null,
  );
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<CatalogueItem[]>(() =>
    initialSnapshot.history.filter(h => !isCorruptedPlaceholderItem(h)),
  );

  // Hydrate the in-memory liveItemRegistry from persisted history, bookmarks & playlists on boot
  useEffect(() => {
    hydrateRegistryFromSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  // Search recent — persisted per profile
  const [recentSearches, setRecentSearches] = useState<string[]>(
    initialSnapshot.recentSearches,
  );

  // Library collections — persisted per profile
  const [bookmarks, setBookmarks] = useState<SavedBookmarkRecord[]>(() =>
    initialSnapshot.bookmarks.filter(b => !isDisallowedBookmark(b)),
  );
  const [playlistsList, setPlaylistsList] = useState<PlaylistRecord[]>(
    initialSnapshot.playlistsList,
  );
  const [mixes] = useState<CuratedMixRecord[]>([]);
  const [pinnedMixIds, setPinnedMixIds] = useState<string[]>(
    initialSnapshot.pinnedMixIds,
  );
  const [podcastsList, setPodcastsList] = useState<FollowedPodcastRecord[]>(
    initialSnapshot.podcastsList,
  );
  const [favoriteRadioIds, setFavoriteRadioIds] = useState<string[]>(
    initialSnapshot.favoriteRadioIds,
  );
  const [favoriteTvIds, setFavoriteTvIds] = useState<string[]>(
    initialSnapshot.favoriteTvIds,
  );
  const [favoriteStations, setFavoriteStations] = useState<CatalogueItem[]>(
    initialSnapshot.favoriteStations ?? [],
  );
  const [pinnedStationIds, setPinnedStationIds] = useState<string[]>(
    initialSnapshot.pinnedStationIds ?? [],
  );

  // Equalizer — persisted per profile
  const [eqPreset, setEqPreset] = useState<string>(initialSnapshot.eqPreset);
  const [eqGains, setEqGains] = useState<number[]>(initialSnapshot.eqGains);

  // Downloads & Folders — persisted per profile
  const [downloads, setDownloads] = useState<DownloadRecord[]>(
    initialSnapshot.downloads,
  );
  const [autoDeletePolicy, setAutoDeletePolicy] = useState<
    (typeof autoDeleteOptions)[number]
  >(
    (autoDeleteOptions.includes(
      initialSnapshot.autoDeletePolicy as (typeof autoDeleteOptions)[number],
    )
      ? initialSnapshot.autoDeletePolicy
      : 'After 30 days') as (typeof autoDeleteOptions)[number],
  );
  const [linkedFolders, setLinkedFolders] = useState<LinkedFolderRecord[]>(
    initialSnapshot.linkedFolders,
  );

  const buildCurrentSnapshot = useCallback(
    (): PersistedProfileSnapshot => ({
      selectedTopics,
      history,
      recentSearches,
      bookmarks,
      playlistsList,
      pinnedMixIds,
      podcastsList,
      favoriteRadioIds,
      favoriteTvIds,
      favoriteStations,
      pinnedStationIds,
      eqPreset,
      eqGains,
      downloads,
      autoDeletePolicy,
      linkedFolders,
      preferences,
    }),
    [
      selectedTopics,
      history,
      recentSearches,
      bookmarks,
      playlistsList,
      pinnedMixIds,
      podcastsList,
      favoriteRadioIds,
      favoriteTvIds,
      favoriteStations,
      pinnedStationIds,
      eqPreset,
      eqGains,
      downloads,
      autoDeletePolicy,
      linkedFolders,
      preferences,
    ],
  );

  const applySnapshot = useCallback((snap: PersistedProfileSnapshot) => {
    hydrateRegistryFromSnapshot(snap);
    setSelectedTopics(snap.selectedTopics);
    setHistory(snap.history.filter(h => !isCorruptedPlaceholderItem(h)));
    setRecentSearches(snap.recentSearches);
    setBookmarks(snap.bookmarks.filter(b => !isDisallowedBookmark(b)));
    setPlaylistsList(snap.playlistsList);
    setPinnedMixIds(snap.pinnedMixIds);
    setPodcastsList(snap.podcastsList);
    setFavoriteRadioIds(snap.favoriteRadioIds);
    setFavoriteTvIds(snap.favoriteTvIds);
    setFavoriteStations(snap.favoriteStations ?? []);
    setPinnedStationIds(snap.pinnedStationIds ?? []);
    setEqPreset(snap.eqPreset);
    setEqGains(snap.eqGains);
    setDownloads(snap.downloads);
    setAutoDeletePolicy(
      (autoDeleteOptions.includes(
        snap.autoDeletePolicy as (typeof autoDeleteOptions)[number],
      )
        ? snap.autoDeletePolicy
        : 'After 30 days') as (typeof autoDeleteOptions)[number],
    );
    setLinkedFolders(snap.linkedFolders);
    setPreferences(snap.preferences);
  }, []);

  // Auto-persist active profile synchronously on changes so bookmarks,
  // playback history, playlists, and subscriptions are never lost on quick reload.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    saveProfileSnapshot(activeProfileId, buildCurrentSnapshot());
  }, [activeProfileId, buildCurrentSnapshot]);

  const switchProfile = useCallback(
    (targetProfileId: string) => {
      if (targetProfileId === activeProfileId) {
        return;
      }
      // Flush current profile before switching
      saveProfileSnapshot(activeProfileId, buildCurrentSnapshot());
      const nextSnap = loadProfileSnapshot(targetProfileId, eqPresets.Flat);
      applySnapshot(nextSnap);
      setActiveProfileId(targetProfileId);
      saveProfileRegistry({
        activeProfileId: targetProfileId,
        profiles: savedProfiles,
      });
    },
    [activeProfileId, buildCurrentSnapshot, applySnapshot, savedProfiles],
  );

  const signInAsProfile = useCallback(
    (
      name: string,
      email: string,
      googleId?: string,
      photo?: string | null,
    ) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName =
        name.trim() ||
        (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Member');
      const profileId = googleId
        ? `google_${googleId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : makeUserProfileId(cleanEmail || cleanName);

      const nextMeta: UserProfileMeta = {
        id: profileId,
        name: cleanName,
        email: cleanEmail || undefined,
        photo: photo ?? null,
        isGuest: false,
      };

      const nextProfiles = savedProfiles.some(p => p.id === profileId)
        ? savedProfiles.map(p => (p.id === profileId ? nextMeta : p))
        : [...savedProfiles, nextMeta];

      // Already on this profile (e.g. silent sign-in restore on boot):
      // ONLY refresh profile metadata — never overwrite or reload the active snapshot.
      if (profileId === activeProfileId) {
        setSavedProfiles(nextProfiles);
        saveProfileRegistry({
          activeProfileId: profileId,
          profiles: nextProfiles,
        });
        return;
      }

      // Flush current profile before switching to a different profile
      saveProfileSnapshot(activeProfileId, buildCurrentSnapshot());
      const nextSnap = loadProfileSnapshot(profileId, eqPresets.Flat);
      applySnapshot(nextSnap);
      setSavedProfiles(nextProfiles);
      setActiveProfileId(profileId);
      saveProfileRegistry({
        activeProfileId: profileId,
        profiles: nextProfiles,
      });
    },
    [activeProfileId, buildCurrentSnapshot, applySnapshot, savedProfiles],
  );

  const signOut = useCallback(() => {
    switchProfile(GUEST_PROFILE_ID);
  }, [switchProfile]);

  // Silent Google Sign-In restore on app start (non-blocking, offline-safe)
  const silentCheckedRef = useRef(false);
  useEffect(() => {
    if (silentCheckedRef.current) {
      return;
    }
    silentCheckedRef.current = true;
    void signInSilently().then(result => {
      if (result.status === 'restored') {
        signInAsProfile(
          result.user.name,
          result.user.email,
          result.user.id,
          result.user.photo,
        );
      } else if (result.status === 'expired') {
        switchProfile(GUEST_PROFILE_ID);
      }
    });
  }, [signInAsProfile, switchProfile]);

  const setSignedIn = useCallback(
    (value: boolean) => {
      if (!value) {
        signOut();
      } else {
        const existingUser = savedProfiles.find(p => !p.isGuest);
        if (existingUser) {
          switchProfile(existingUser.id);
        } else {
          signInAsProfile('Member', 'member@simba.app');
        }
      }
    },
    [savedProfiles, signInAsProfile, signOut, switchProfile],
  );

  const updatePreferences = useCallback((patch: Partial<ProfilePreferences>) => {
    setPreferences(prev => ({...prev, ...patch}));
  }, []);

  const toggleTopic = useCallback((id: string) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const playItem = useCallback((item: CatalogueItem) => {
    registerLiveItem(item);
    setNowPlaying(item);
    setPositionSeconds(item.elapsedSeconds ?? 0);
    setIsPlaying(true);
    setDockVisible(true);
    if (!isCorruptedPlaceholderItem(item)) {
      setHistory(prev => [
        item,
        ...prev.filter(x => x.id !== item.id && !isCorruptedPlaceholderItem(x)),
      ]);
    }
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    setPositionSeconds(Math.max(0, Math.floor(seconds)));
  }, []);

  const addToQueue = useCallback((item: CatalogueItem) => {
    setQueue(prev => {
      setPrevQueueSnapshot(prev);
      if (prev.some(x => x.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
    setUndoMessage(`Added "${item.title}" to queue`);
  }, []);

  const playNextInQueue = useCallback((item: CatalogueItem) => {
    setQueue(prev => {
      setPrevQueueSnapshot(prev);
      const without = prev.filter(x => x.id !== item.id);
      return [without[0] ?? item, item, ...without.slice(1)];
    });
    setUndoMessage(`Playing "${item.title}" next`);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      setPrevQueueSnapshot(prev);
      const target = prev.find(x => x.id === id);
      if (target) {
        setUndoMessage(`Removed "${target.title}" from queue`);
      }
      return prev.filter(x => x.id !== id);
    });
  }, []);

  const moveQueueItem = useCallback((index: number, direction: 'up' | 'down') => {
    setQueue(prev => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue(prev => {
      setPrevQueueSnapshot(prev);
      return [...prev].reverse();
    });
    setUndoMessage('Queue order shuffled');
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(prev => {
      setPrevQueueSnapshot(prev);
      return [];
    });
    setUndoMessage('Cleared active playback queue');
  }, []);

  const undoQueueAction = useCallback(() => {
    if (prevQueueSnapshot) {
      setQueue(prevQueueSnapshot);
      setPrevQueueSnapshot(null);
    }
    setUndoMessage(null);
  }, [prevQueueSnapshot]);

  const dismissUndo = useCallback(() => {
    setUndoMessage(null);
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(x => x.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Search Frecency with 90s prefix upgrade rule
  const commitSearchQuery = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) {
      return;
    }
    setRecentSearches(prev => {
      const lower = cleaned.toLowerCase();
      // Prefix upgrade: if previous top search is a prefix of cleaned (or vice versa), replace it
      const filtered = prev.filter(existing => {
        const exLower = existing.toLowerCase();
        if (exLower === lower) {
          return false;
        }
        if (lower.startsWith(exLower) && exLower.length >= 3) {
          return false;
        }
        return true;
      });
      return [cleaned, ...filtered].slice(0, 8);
    });
  }, []);

  const deleteRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => prev.filter(x => x !== term));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const toggleBookmarkItem = useCallback((item: CatalogueItem, note?: string) => {
    // Domain rule: only finite/timestamped media (movies, music, audiobooks,
    // archive items, podcast episodes) can be bookmarked — not Live TV, Radio, or podcast shows.
    if (!canBookmarkItem(item)) {
      return;
    }
    registerLiveItem(item);
    setBookmarks(prev => {
      const existing = prev.find(b => b.itemId === item.id);
      if (existing) {
        return prev.filter(b => b.itemId !== item.id);
      }
      const next: SavedBookmarkRecord = {
        id: 'bm-' + Date.now(),
        itemId: item.id,
        label: `14:20 · ${item.title}`,
        note: note ?? item.subtitle ?? 'Saved moment from player',
        at: item.title,
        positionLabel: '14:20',
        durationLabel: '48:10',
        sourceLabel: item.provider.toUpperCase().slice(0, 8),
        icon: 'bookmark-outline',
        item,
      };
      return [next, ...prev];
    });
  }, []);

  const updateBookmarkSnapshot = useCallback((item: CatalogueItem) => {
    registerLiveItem(item);
    setBookmarks(prev => {
      let changed = false;
      const next = prev.map(b => {
        if (b.itemId !== item.id) {
          return b;
        }
        if (b.item?.artworkUrl === item.artworkUrl && b.item?.synopsis === item.synopsis) {
          return b;
        }
        changed = true;
        return {
          ...b,
          item: {
            ...(b.item ?? item),
            ...item,
          },
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  const togglePinPlaylist = useCallback((id: string) => {
    setPlaylistsList(prev =>
      prev.map(pl => (pl.id === id ? {...pl, pinned: !pl.pinned} : pl)),
    );
  }, []);

  const createPlaylist = useCallback(
    (
      name: string,
      kindLabel: 'AUDIO' | 'VIDEO' = 'AUDIO',
      initialItem?: CatalogueItem,
    ) => {
      const clean = name.trim();
      if (!clean) {
        return;
      }
      const lane: 'audio' | 'video' = kindLabel === 'VIDEO' ? 'video' : 'audio';
      const initialIds =
        initialItem && initialItem.lane === lane ? [initialItem.id] : [];
      const initialItems =
        initialItem && initialItem.lane === lane ? [initialItem] : [];
      if (initialItem) {
        registerLiveItem(initialItem);
      }
      setPlaylistsList(prev => [
        {
          id: 'pl-' + Date.now(),
          name: clean,
          count: initialIds.length,
          lane,
          itemIds: initialIds,
          items: initialItems,
          pinned: false,
          kindLabel,
          icon: lane === 'video' ? 'movie-roll' : 'playlist-music',
        },
        ...prev,
      ]);
    },
    [],
  );

  const addItemToPlaylist = useCallback(
    (playlistId: string, item: CatalogueItem): AddToPlaylistResult => {
      const target = playlistsList.find(p => p.id === playlistId);
      if (!target) {
        return {
          ok: false,
          reason: 'not-found',
          message: 'Playlist not found.',
        };
      }
      if (target.lane !== item.lane) {
        const itemLabel = item.lane === 'video' ? 'video' : 'audio item';
        const plLabel = target.lane === 'video' ? 'Video' : 'Audio';
        return {
          ok: false,
          reason: 'lane-mismatch',
          message: `Can't add a ${itemLabel} to an ${plLabel} playlist. Pick or create a ${item.lane === 'video' ? 'Video' : 'Audio'} playlist instead.`,
        };
      }
      if (target.itemIds.includes(item.id)) {
        return {
          ok: false,
          reason: 'duplicate',
          message: `Already in "${target.name}".`,
        };
      }
      registerLiveItem(item);
      setPlaylistsList(prev =>
        prev.map(p =>
          p.id === playlistId
            ? {
                ...p,
                itemIds: [...p.itemIds, item.id],
                items: [...(p.items ?? []), item],
                count: p.itemIds.length + 1,
              }
            : p,
        ),
      );
      return {ok: true, playlistName: target.name};
    },
    [playlistsList],
  );

  const togglePinMix = useCallback((id: string) => {
    setPinnedMixIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const toggleFollowPodcast = useCallback(
    (titleOrItem: string | CatalogueItem, artworkUrl?: string) => {
      const isObj = typeof titleOrItem !== 'string';
      const matchId = isObj ? titleOrItem.id : titleOrItem;
      const matchTitle = isObj ? titleOrItem.title : titleOrItem;
      if (isObj) {
        registerLiveItem(titleOrItem);
      }
      setPodcastsList(prev => {
        const exists = prev.some(
          p =>
            p.id === matchId ||
            p.itemId === matchId ||
            p.title === matchTitle,
        );
        if (exists) {
          return prev.filter(
            p =>
              p.id !== matchId &&
              p.itemId !== matchId &&
              p.title !== matchTitle,
          );
        }
        return [
          {
            id: isObj ? `fp-${titleOrItem.id}` : 'fp-' + Date.now(),
            itemId: isObj ? titleOrItem.id : undefined,
            title: matchTitle,
            author: isObj ? titleOrItem.subtitle || 'Podcast' : 'Podcast',
            episodes: 0,
            category: isObj ? titleOrItem.genre || 'Podcast' : 'Podcast',
            pinned: false,
            icon: 'podcast',
            artworkUrl: isObj ? titleOrItem.artworkUrl ?? artworkUrl : artworkUrl,
            item: isObj ? titleOrItem : undefined,
          },
          ...prev,
        ];
      });
    },
    [],
  );

  const updateSubscriptionSnapshot = useCallback((item: CatalogueItem) => {
    registerLiveItem(item);
    setPodcastsList(prev => {
      let changed = false;
      const next = prev.map(p => {
        const matches =
          p.id === item.id ||
          p.itemId === item.id ||
          p.title === item.title;
        if (!matches) {
          return p;
        }
        if (
          p.artworkUrl === item.artworkUrl &&
          p.item?.externalId === item.externalId &&
          p.item?.synopsis === item.synopsis
        ) {
          return p;
        }
        changed = true;
        return {
          ...p,
          itemId: item.id,
          author: item.subtitle || p.author,
          artworkUrl: item.artworkUrl ?? p.artworkUrl,
          item: {
            ...(p.item ?? item),
            ...item,
          },
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const togglePinPodcast = useCallback((id: string) => {
    setPodcastsList(prev =>
      prev.map(p => (p.id === id ? {...p, pinned: !p.pinned} : p)),
    );
  }, []);

  const toggleFavoriteRadio = useCallback(
    (idOrItem: string | CatalogueItem) => {
      const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
      const isObj = typeof idOrItem !== 'string';
      if (isObj) {
        registerLiveItem(idOrItem);
      }
      setFavoriteRadioIds(prev => {
        const exists = prev.includes(id);
        if (exists) {
          setFavoriteStations(s => s.filter(x => x.id !== id));
          setPinnedStationIds(p => p.filter(x => x !== id));
          return prev.filter(x => x !== id);
        }
        if (isObj) {
          setFavoriteStations(s => [idOrItem, ...s.filter(x => x.id !== id)]);
        }
        return [...prev, id];
      });
    },
    [],
  );

  const toggleFavoriteTv = useCallback(
    (idOrItem: string | CatalogueItem) => {
      const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
      const isObj = typeof idOrItem !== 'string';
      if (isObj) {
        registerLiveItem(idOrItem);
      }
      setFavoriteTvIds(prev => {
        const exists = prev.includes(id);
        if (exists) {
          setFavoriteStations(s => s.filter(x => x.id !== id));
          setPinnedStationIds(p => p.filter(x => x !== id));
          return prev.filter(x => x !== id);
        }
        if (isObj) {
          setFavoriteStations(s => [idOrItem, ...s.filter(x => x.id !== id)]);
        }
        return [...prev, id];
      });
    },
    [],
  );

  const togglePinStation = useCallback((id: string) => {
    setPinnedStationIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev],
    );
  }, []);

  const selectEqPreset = useCallback((preset: string) => {
    setEqPreset(preset);
    if (eqPresets[preset]) {
      setEqGains(eqPresets[preset]);
    }
  }, []);

  const adjustEqBand = useCallback((index: number, delta: number) => {
    setEqGains(prev =>
      prev.map((g, i) =>
        i === index ? Math.max(-6, Math.min(6, Number((g + delta).toFixed(1)))) : g,
      ),
    );
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, []);

  const addLinkedFolder = useCallback((name: string, path: string) => {
    setLinkedFolders(prev => [
      {
        id: 'fld-' + Date.now(),
        name: name.trim() || 'New Media Folder',
        path: path.trim() || '/storage/emulated/0/Media',
        trackCount: 38,
        videoCount: 6,
        lastScanned: 'Scanned just now',
      },
      ...prev,
    ]);
  }, []);

  const removeLinkedFolder = useCallback((id: string) => {
    setLinkedFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  const rescanLinkedFolders = useCallback(() => {
    setLinkedFolders(prev =>
      prev.map(f => ({...f, lastScanned: 'Scanned just now'})),
    );
  }, []);

  const value = useMemo<SimbaState>(
    () => ({
      signedIn,
      setSignedIn,
      activeProfile,
      savedProfiles,
      signInAsProfile,
      switchProfile,
      signOut,
      preferences,
      updatePreferences,
      selectedTopics,
      toggleTopic,
      nowPlaying,
      isPlaying,
      positionSeconds,
      isPipActive,
      dockVisible,
      activeLiveChannelId,
      setActiveLiveChannelId,
      playItem,
      togglePlay,
      seekTo,
      setIsPipActive,
      setDockVisible,
      queue,
      history,
      undoMessage,
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      moveQueueItem,
      shuffleQueue,
      clearQueue,
      undoQueueAction,
      dismissUndo,
      removeHistoryItem,
      clearHistory,
      recentSearches,
      commitSearchQuery,
      deleteRecentSearch,
      clearRecentSearches,
      bookmarks,
      toggleBookmarkItem,
      updateBookmarkSnapshot,
      removeBookmark,
      clearBookmarks,
      playlistsList,
      togglePinPlaylist,
      createPlaylist,
      addItemToPlaylist,
      mixes,
      pinnedMixIds,
      togglePinMix,
      podcastsList,
      toggleFollowPodcast,
      updateSubscriptionSnapshot,
      togglePinPodcast,
      favoriteRadioIds,
      toggleFavoriteRadio,
      favoriteTvIds,
      toggleFavoriteTv,
      favoriteStations,
      pinnedStationIds,
      togglePinStation,
      eqPreset,
      eqGains,
      selectEqPreset,
      adjustEqBand,
      downloads,
      removeDownload,
      autoDeletePolicy,
      setAutoDeletePolicy,
      linkedFolders,
      addLinkedFolder,
      removeLinkedFolder,
      rescanLinkedFolders,
    }),
    [
      signedIn,
      setSignedIn,
      activeProfile,
      savedProfiles,
      signInAsProfile,
      switchProfile,
      signOut,
      preferences,
      updatePreferences,
      selectedTopics,
      toggleTopic,
      nowPlaying,
      isPlaying,
      positionSeconds,
      isPipActive,
      dockVisible,
      activeLiveChannelId,
      playItem,
      togglePlay,
      seekTo,
      queue,
      history,
      undoMessage,
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      moveQueueItem,
      shuffleQueue,
      clearQueue,
      undoQueueAction,
      dismissUndo,
      removeHistoryItem,
      clearHistory,
      recentSearches,
      commitSearchQuery,
      deleteRecentSearch,
      clearRecentSearches,
      bookmarks,
      toggleBookmarkItem,
      updateBookmarkSnapshot,
      removeBookmark,
      clearBookmarks,
      playlistsList,
      togglePinPlaylist,
      createPlaylist,
      addItemToPlaylist,
      mixes,
      pinnedMixIds,
      togglePinMix,
      podcastsList,
      toggleFollowPodcast,
      updateSubscriptionSnapshot,
      togglePinPodcast,
      favoriteRadioIds,
      toggleFavoriteRadio,
      favoriteTvIds,
      toggleFavoriteTv,
      favoriteStations,
      pinnedStationIds,
      togglePinStation,
      eqPreset,
      eqGains,
      selectEqPreset,
      adjustEqBand,
      downloads,
      removeDownload,
      autoDeletePolicy,
      linkedFolders,
      addLinkedFolder,
      removeLinkedFolder,
      rescanLinkedFolders,
    ],
  );

  return (
    <SimbaStoreContext.Provider value={value}>
      {children}
    </SimbaStoreContext.Provider>
  );
}

export function useSimbaStore(): SimbaState {
  const ctx = useContext(SimbaStoreContext);
  if (!ctx) {
    throw new Error('useSimbaStore must be used inside SimbaStoreProvider');
  }
  return ctx;
}
