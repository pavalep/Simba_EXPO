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

export type {ProfilePreferences, UserProfileMeta};

export interface FollowedPodcastRecord {
  id: string;
  title: string;
  author: string;
  episodes: number;
  category: string;
  pinned: boolean;
  icon: KindIconName;
  artworkUrl?: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  count: number;
  kindLabel: string;
  lane: 'audio' | 'video';
  itemIds: string[];
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
  toggleFollowPodcast: (titleOrId: string, artworkUrl?: string) => void;
  togglePinPodcast: (id: string) => void;

  favoriteRadioIds: string[];
  toggleFavoriteRadio: (id: string) => void;
  favoriteTvIds: string[];
  toggleFavoriteTv: (id: string) => void;

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
  const [history, setHistory] = useState<CatalogueItem[]>(initialSnapshot.history);

  // Search recent — persisted per profile
  const [recentSearches, setRecentSearches] = useState<string[]>(
    initialSnapshot.recentSearches,
  );

  // Library collections — persisted per profile
  const [bookmarks, setBookmarks] = useState<SavedBookmarkRecord[]>(
    initialSnapshot.bookmarks,
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
      eqPreset,
      eqGains,
      downloads,
      autoDeletePolicy,
      linkedFolders,
      preferences,
    ],
  );

  const applySnapshot = useCallback((snap: PersistedProfileSnapshot) => {
    setSelectedTopics(snap.selectedTopics);
    setHistory(snap.history);
    setRecentSearches(snap.recentSearches);
    setBookmarks(snap.bookmarks);
    setPlaylistsList(snap.playlistsList);
    setPinnedMixIds(snap.pinnedMixIds);
    setPodcastsList(snap.podcastsList);
    setFavoriteRadioIds(snap.favoriteRadioIds);
    setFavoriteTvIds(snap.favoriteTvIds);
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

  // Auto-persist active profile on changes (debounced 250ms)
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveProfileSnapshot(activeProfileId, buildCurrentSnapshot());
    }, 250);
    return () => clearTimeout(timer);
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

      // Flush current profile before switching
      saveProfileSnapshot(activeProfileId, buildCurrentSnapshot());

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
    setNowPlaying(item);
    setPositionSeconds(item.elapsedSeconds ?? 0);
    setIsPlaying(true);
    setDockVisible(true);
    setHistory(prev => [item, ...prev.filter(x => x.id !== item.id)]);
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
      };
      return [next, ...prev];
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
      setPlaylistsList(prev => [
        {
          id: 'pl-' + Date.now(),
          name: clean,
          count: initialIds.length,
          lane,
          itemIds: initialIds,
          pinned: true,
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
      setPlaylistsList(prev =>
        prev.map(p =>
          p.id === playlistId
            ? {
                ...p,
                itemIds: [...p.itemIds, item.id],
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
    (titleOrId: string, artworkUrl?: string) => {
      setPodcastsList(prev => {
        const exists = prev.some(
          p => p.id === titleOrId || p.title === titleOrId,
        );
        if (exists) {
          return prev.filter(p => p.id !== titleOrId && p.title !== titleOrId);
        }
        return [
          {
            id: 'fp-' + Date.now(),
            title: titleOrId,
            author: 'Podcast',
            episodes: 0,
            category: 'Podcast',
            pinned: true,
            icon: 'podcast',
            artworkUrl,
          },
          ...prev,
        ];
      });
    },
    [],
  );

  const togglePinPodcast = useCallback((id: string) => {
    setPodcastsList(prev =>
      prev.map(p => (p.id === id ? {...p, pinned: !p.pinned} : p)),
    );
  }, []);

  const toggleFavoriteRadio = useCallback((id: string) => {
    setFavoriteRadioIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const toggleFavoriteTv = useCallback((id: string) => {
    setFavoriteTvIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
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
      togglePinPodcast,
      favoriteRadioIds,
      toggleFavoriteRadio,
      favoriteTvIds,
      toggleFavoriteTv,
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
      togglePinPodcast,
      favoriteRadioIds,
      toggleFavoriteRadio,
      favoriteTvIds,
      toggleFavoriteTv,
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
