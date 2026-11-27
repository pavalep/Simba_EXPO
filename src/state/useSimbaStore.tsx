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
import {autoDeleteOptions, eqPresets} from '../constants/catalogueConfig';
import {MEDIA_KIND_LABELS} from '../types/media';
import type {
  CatalogueItem,
  CuratedMixRecord,
  DownloadRecord,
  FavoriteRecord,
  LinkedFolderRecord,
  SavedBookmarkRecord,
} from '../types/catalogue';
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
import {scanDirectoryUri} from '../services/localMediaService';
import {
  canBookmarkItem,
  canFavoriteItem,
  formatTimestampLabel,
  registerLiveItem,
  registerLiveItems,
} from '../infrastructure/player';

function isLiveStreamKind(kind: CatalogueItem['kind'] | undefined): boolean {
  return kind === 'live-tv' || kind === 'radio';
}

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

function normalizeHistoryItem(item: CatalogueItem): CatalogueItem {
  if (isLiveStreamKind(item.kind)) {
    return {
      ...item,
      elapsedSeconds: undefined,
      elapsedTotalLabel: undefined,
      progress: undefined,
      completed: undefined,
    };
  }
  return item;
}

function migrateFavoritesFromSnapshot(
  snap: PersistedProfileSnapshot,
): FavoriteRecord[] {
  const byId = new Map<string, FavoriteRecord>();
  const pinnedSet = new Set(snap.pinnedStationIds ?? []);

  if (Array.isArray(snap.favorites)) {
    for (const fav of snap.favorites) {
      if (fav?.itemId && fav.item && canFavoriteItem(fav.item)) {
        byId.set(fav.itemId, fav);
      }
    }
  }

  // Fold in legacy favoriteStations / favoriteRadioIds / favoriteTvIds
  const stationSnapById = new Map<string, CatalogueItem>();
  if (Array.isArray(snap.favoriteStations)) {
    for (const st of snap.favoriteStations) {
      stationSnapById.set(st.id, st);
    }
  }
  const legacyIds = [
    ...(snap.favoriteRadioIds ?? []),
    ...(snap.favoriteTvIds ?? []),
  ];
  for (const id of legacyIds) {
    if (byId.has(id)) {
      continue;
    }
    const isTv =
      (snap.favoriteTvIds ?? []).includes(id) || id.startsWith('iptv-');
    const item: CatalogueItem =
      stationSnapById.get(id) ?? {
        id,
        title: isTv ? 'Saved Channel' : 'Saved Station',
        subtitle: isTv ? 'Live TV' : 'Radio',
        kind: isTv ? 'live-tv' : 'radio',
        lane: isTv ? 'video' : 'audio',
        source: 'api',
        provider: isTv ? 'IPTV-org' : 'RadioBrowser',
        icon: isTv ? 'access-point' : 'radio-tower',
        catalogueLaneId: isTv ? 'livetv' : 'radio',
      };
    byId.set(id, {
      itemId: id,
      item,
      addedAt: Date.now(),
      pinned: pinnedSet.has(id),
    });
  }

  return Array.from(byId.values());
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
  if (Array.isArray(snap.favorites)) {
    for (const fav of snap.favorites) {
      if (fav?.item) {
        items.push(fav.item);
      }
    }
  }
  if (Array.isArray(snap.favoriteStations)) {
    items.push(...snap.favoriteStations);
  }
  if (Array.isArray(snap.linkedFolders)) {
    for (const fld of snap.linkedFolders) {
      if (Array.isArray(fld.files)) {
        items.push(...fld.files);
      }
    }
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
  updateHistoryProgress: (
    itemId: string,
    elapsedSeconds: number,
    durationSeconds?: number,
  ) => void;

  // Search Frecency History (03.3–03.5)
  recentSearches: string[];
  commitSearchQuery: (term: string) => void;
  deleteRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;

  // Personal Library: Favorites, Timestamp Bookmarks, Playlists, Mixes, Subscriptions
  favorites: FavoriteRecord[];
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (item: CatalogueItem) => void;
  togglePinFavorite: (itemId: string) => void;
  updateFavoriteSnapshot: (item: CatalogueItem) => void;

  bookmarks: SavedBookmarkRecord[];
  addBookmark: (
    item: CatalogueItem,
    positionSeconds: number,
    durationSeconds?: number,
    note?: string,
  ) => SavedBookmarkRecord | null;
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
  localFiles: CatalogueItem[];
  addLinkedFolder: (
    name: string,
    path: string,
    extra?: {
      uri?: string;
      files?: CatalogueItem[];
      trackCount?: number;
      videoCount?: number;
    },
  ) => void;
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
    initialSnapshot.history
      .filter(h => !isCorruptedPlaceholderItem(h))
      .map(normalizeHistoryItem),
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
  const [favorites, setFavorites] = useState<FavoriteRecord[]>(() =>
    migrateFavoritesFromSnapshot(initialSnapshot),
  );
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

  // Derived compatibility views over unified `favorites` for Radio/Live TV callers
  const favoriteRadioIds = useMemo(
    () =>
      favorites
        .filter(f => f.item.kind === 'radio')
        .map(f => f.itemId),
    [favorites],
  );
  const favoriteTvIds = useMemo(
    () =>
      favorites
        .filter(f => f.item.kind === 'live-tv')
        .map(f => f.itemId),
    [favorites],
  );
  const favoriteStations = useMemo(
    () =>
      favorites
        .filter(f => f.item.kind === 'radio' || f.item.kind === 'live-tv')
        .map(f => f.item),
    [favorites],
  );
  const pinnedStationIds = useMemo(
    () =>
      favorites
        .filter(
          f =>
            f.pinned &&
            (f.item.kind === 'radio' || f.item.kind === 'live-tv'),
        )
        .map(f => f.itemId),
    [favorites],
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
      favorites,
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
      favorites,
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
    setHistory(
      snap.history
        .filter(h => !isCorruptedPlaceholderItem(h))
        .map(normalizeHistoryItem),
    );
    setRecentSearches(snap.recentSearches);
    setFavorites(migrateFavoritesFromSnapshot(snap));
    setBookmarks(snap.bookmarks.filter(b => !isDisallowedBookmark(b)));
    setPlaylistsList(snap.playlistsList);
    setPinnedMixIds(snap.pinnedMixIds);
    setPodcastsList(snap.podcastsList);
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
    setPositionSeconds(isLiveStreamKind(item.kind) ? 0 : item.elapsedSeconds ?? 0);
    setIsPlaying(true);
    setDockVisible(true);
    if (!isCorruptedPlaceholderItem(item)) {
      setHistory(prev => {
        const existing = prev.find(x => x.id === item.id);
        const merged: CatalogueItem = normalizeHistoryItem({
          ...(existing ?? item),
          ...item,
          elapsedSeconds: isLiveStreamKind(item.kind)
            ? undefined
            : item.elapsedSeconds ?? existing?.elapsedSeconds,
          elapsedTotalLabel: isLiveStreamKind(item.kind)
            ? undefined
            : item.elapsedTotalLabel ?? existing?.elapsedTotalLabel,
          progress: isLiveStreamKind(item.kind)
            ? undefined
            : item.progress ?? existing?.progress,
          completed: isLiveStreamKind(item.kind)
            ? undefined
            : existing?.completed,
          lastPlayedAt: Date.now(),
        });
        return [
          merged,
          ...prev.filter(
            x => x.id !== item.id && !isCorruptedPlaceholderItem(x),
          ),
        ].slice(0, 60);
      });
    }
  }, []);

  const updateHistoryProgress = useCallback(
    (itemId: string, elapsedSecs: number, durationSecs?: number) => {
      const safeElapsed = Math.max(0, Math.floor(elapsedSecs));
      const safeDuration =
        durationSecs != null && durationSecs > 0
          ? Math.floor(durationSecs)
          : undefined;
      setHistory(prev => {
        const idx = prev.findIndex(x => x.id === itemId);
        if (idx === -1) {
          return prev;
        }
        const existing = prev[idx];
        if (isLiveStreamKind(existing.kind)) {
          return prev;
        }
        const effectiveDuration = safeDuration ?? existing.durationSeconds;
        const progress =
          effectiveDuration && effectiveDuration > 0
            ? Math.min(1, Math.max(0, safeElapsed / effectiveDuration))
            : existing.progress ?? 0;
        const completed =
          Boolean(effectiveDuration && effectiveDuration > 30) &&
          (progress >= 0.95 || (effectiveDuration ?? 0) - safeElapsed < 15);
        const elapsedTotalLabel =
          effectiveDuration && effectiveDuration > 0
            ? `${formatTimestampLabel(safeElapsed)} / ${formatTimestampLabel(effectiveDuration)}`
            : formatTimestampLabel(safeElapsed);

        if (
          Math.abs((existing.elapsedSeconds ?? 0) - safeElapsed) < 1 &&
          existing.durationSeconds === effectiveDuration &&
          existing.completed === completed
        ) {
          return prev;
        }

        const updated: CatalogueItem = {
          ...existing,
          elapsedSeconds: safeElapsed,
          durationSeconds: effectiveDuration,
          progress,
          completed,
          elapsedTotalLabel,
          lastPlayedAt: Date.now(),
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    },
    [],
  );

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

  const isFavorite = useCallback(
    (itemId: string) => favorites.some(f => f.itemId === itemId),
    [favorites],
  );

  const toggleFavorite = useCallback((item: CatalogueItem) => {
    if (!canFavoriteItem(item)) {
      return;
    }
    registerLiveItem(item);
    setFavorites(prev => {
      const exists = prev.some(f => f.itemId === item.id);
      if (exists) {
        return prev.filter(f => f.itemId !== item.id);
      }
      const next: FavoriteRecord = {
        itemId: item.id,
        item,
        addedAt: Date.now(),
        pinned: false,
      };
      return [next, ...prev];
    });
  }, []);

  const togglePinFavorite = useCallback((itemId: string) => {
    setFavorites(prev =>
      prev.map(f => (f.itemId === itemId ? {...f, pinned: !f.pinned} : f)),
    );
  }, []);

  const updateFavoriteSnapshot = useCallback((item: CatalogueItem) => {
    registerLiveItem(item);
    setFavorites(prev => {
      let changed = false;
      const next = prev.map(f => {
        if (f.itemId !== item.id) {
          return f;
        }
        if (
          f.item.artworkUrl === item.artworkUrl &&
          f.item.synopsis === item.synopsis
        ) {
          return f;
        }
        changed = true;
        return {
          ...f,
          item: {
            ...f.item,
            ...item,
          },
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const addBookmark = useCallback(
    (
      item: CatalogueItem,
      posSeconds: number,
      durSeconds?: number,
      note?: string,
    ): SavedBookmarkRecord | null => {
      // Domain rule: Timestamp bookmarks are created ONLY inside players for
      // finite, seekable media — never for Live TV, Radio, podcast shows, or guides.
      if (!canBookmarkItem(item)) {
        return null;
      }
      registerLiveItem(item);
      const frozenPos = Math.max(0, Math.floor(posSeconds));
      const frozenDur = Math.max(
        0,
        Math.floor(durSeconds ?? item.durationSeconds ?? 0),
      );
      const posLabel = formatTimestampLabel(frozenPos);
      const durLabel = frozenDur > 0 ? formatTimestampLabel(frozenDur) : '';
      const next: SavedBookmarkRecord = {
        id: 'bm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        itemId: item.id,
        label: `${posLabel} · ${item.title}`,
        note: note?.trim() || item.subtitle || 'Saved moment',
        at: item.title,
        positionSeconds: frozenPos,
        durationSeconds: frozenDur > 0 ? frozenDur : undefined,
        createdAt: Date.now(),
        positionLabel: posLabel,
        durationLabel: durLabel,
        sourceLabel: MEDIA_KIND_LABELS[item.kind] ?? 'Media',
        icon: 'bookmark-outline',
        item,
      };
      setBookmarks(prev => [next, ...prev]);
      return next;
    },
    [],
  );

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
      if (typeof idOrItem === 'string') {
        setFavorites(prev => prev.filter(f => f.itemId !== idOrItem));
        return;
      }
      toggleFavorite(idOrItem);
    },
    [toggleFavorite],
  );

  const toggleFavoriteTv = useCallback(
    (idOrItem: string | CatalogueItem) => {
      if (typeof idOrItem === 'string') {
        setFavorites(prev => prev.filter(f => f.itemId !== idOrItem));
        return;
      }
      toggleFavorite(idOrItem);
    },
    [toggleFavorite],
  );

  const togglePinStation = useCallback(
    (id: string) => {
      togglePinFavorite(id);
    },
    [togglePinFavorite],
  );

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

  const localFiles = useMemo<CatalogueItem[]>(() => {
    const seen = new Set<string>();
    const out: CatalogueItem[] = [];
    for (const fld of linkedFolders) {
      if (!Array.isArray(fld.files)) {
        continue;
      }
      for (const file of fld.files) {
        if (!seen.has(file.id)) {
          seen.add(file.id);
          out.push(file);
        }
      }
    }
    return out;
  }, [linkedFolders]);

  const addLinkedFolder = useCallback(
    (
      name: string,
      path: string,
      extra?: {
        uri?: string;
        files?: CatalogueItem[];
        trackCount?: number;
        videoCount?: number;
      },
    ) => {
      const files = extra?.files ?? [];
      if (files.length > 0) {
        registerLiveItems(files);
      }
      const cleanName = name.trim() || 'Phone Folder';
      const cleanPath = path.trim() || `Phone Storage / ${cleanName}`;
      setLinkedFolders(prev => {
        const filtered = extra?.uri
          ? prev.filter(f => f.uri !== extra.uri)
          : prev.filter(f => f.path !== cleanPath);
        return [
          {
            id: 'fld-' + Date.now(),
            name: cleanName,
            path: cleanPath,
            uri: extra?.uri,
            trackCount: extra?.trackCount ?? files.filter(f => f.lane === 'audio').length,
            videoCount: extra?.videoCount ?? files.filter(f => f.lane === 'video').length,
            lastScanned: 'Scanned just now',
            files,
          },
          ...filtered,
        ];
      });
    },
    [],
  );

  const removeLinkedFolder = useCallback((id: string) => {
    setLinkedFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  const rescanLinkedFolders = useCallback(() => {
    setLinkedFolders(prev =>
      prev.map(f => {
        if (!f.uri) {
          return {...f, lastScanned: 'Checked just now'};
        }
        try {
          const scanned = scanDirectoryUri(f.uri, f.name);
          if (scanned.files.length > 0) {
            registerLiveItems(scanned.files);
          }
          return {
            ...f,
            trackCount: scanned.trackCount,
            videoCount: scanned.videoCount,
            files: scanned.files,
            lastScanned: 'Scanned just now',
          };
        } catch {
          return {...f, lastScanned: 'Unavailable'};
        }
      }),
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
      updateHistoryProgress,
      recentSearches,
      commitSearchQuery,
      deleteRecentSearch,
      clearRecentSearches,
      favorites,
      isFavorite,
      toggleFavorite,
      togglePinFavorite,
      updateFavoriteSnapshot,
      bookmarks,
      addBookmark,
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
      localFiles,
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
      updateHistoryProgress,
      recentSearches,
      commitSearchQuery,
      deleteRecentSearch,
      clearRecentSearches,
      favorites,
      isFavorite,
      toggleFavorite,
      togglePinFavorite,
      updateFavoriteSnapshot,
      bookmarks,
      addBookmark,
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
      localFiles,
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
