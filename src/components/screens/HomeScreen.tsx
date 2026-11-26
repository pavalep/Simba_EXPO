import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {NativeModules, Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useHomeFeed} from '../../hooks/useHomeFeed';
import {
  getLiveItemById,
  reconstructItemFromBookmark,
  reconstructItemFromSubscription,
  registerLiveItem,
  registerLiveItems,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Button,
  Chip,
  HomeFeedShimmer,
  MediaArtwork,
  ProgressBar,
  Rail,
  Screen,
  SectionHeader,
  Sheet,
  SimbaLogo,
  Surface,
} from '../ui';
import {
  quickCategories,
  type CatalogueItem,
  type CuratedMixRecord,
} from '../../data/dummy';
import {MEDIA_KIND_LABELS} from '../../types/media';

function formatDurationShort(seconds?: number): string {
  if (!seconds || seconds <= 0) {
    return 'LIVE';
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins} min`;
}

/**
 * Home Screen (matching CodecM `home_page.dart` 1:1 in SIMBA Lion Gold & Brown).
 *
 * - Clean top bar: Logo + Simba wordmark + live weather underneath, Search & Filter on right
 * - Sleek 38dp horizontal Category Quick Rail with leading icons
 * - Distinct, human-friendly sections with 18dp leading icons:
 *   1. Jump Back In (with 16:9 frame & 14:20 / 48:10 elapsed/total timestamp)
 *   2. Your Subscriptions (60x60 podcast avatars)
 *   3. Saved Bookmarks (216dp horizontal bookmark cards with heart icon)
 *   4. Pinned Playlists (208dp horizontal playlist cards)
 *   5. Curated For You (238x146 handpicked mix cards + detail & all-mixes sheets)
 *   6. Recommended For You (112x112 square cards, "Based on your taste")
 *   7. Classic Cinema & Films (220x152 landscape poster cards)
 *   8. Trending Shows & Podcasts (136dp cards)
 *   9. Music & Live Broadcasts (132dp cards)
 *   10. Best for you (58x58 media row tiles + circular play CTA)
 */
export function HomeScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    dockVisible,
    history,
    pinnedMixIds,
    togglePinMix,
    bookmarks,
    playlistsList,
    podcastsList,
    favoriteRadioIds,
    favoriteTvIds,
    favoriteStations,
    pinnedStationIds,
  } = useSimbaStore();
  const pinnedPlaylists = useMemo(
    () => playlistsList.filter(p => p.pinned),
    [playlistsList],
  );
  const pinnedPodcasts = useMemo(
    () => podcastsList.filter(p => p.pinned),
    [podcastsList],
  );
  const {playCatalogueItem} = useSimbaPlayback();
  const homeFeed = useHomeFeed();

  useEffect(() => {
    const allLive = [
      ...homeFeed.movies,
      ...homeFeed.podcasts,
      ...homeFeed.music,
      ...homeFeed.radio,
    ];
    if (allLive.length > 0) {
      registerLiveItems(allLive);
    }
  }, [homeFeed.movies, homeFeed.podcasts, homeFeed.music, homeFeed.radio]);

  const [selectedMix, setSelectedMix] = useState<CuratedMixRecord | null>(null);
  const [allMixesVisible, setAllMixesVisible] = useState(false);

  const sortedMixes = useMemo(
    () =>
      homeFeed.curatedMixes
        .map(m => ({...m, pinned: pinnedMixIds.includes(m.id)}))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [homeFeed.curatedMixes, pinnedMixIds],
  );

  const classicCinemaItems = homeFeed.movies;
  const trendingPodcastsAndShows = homeFeed.podcasts;

  const musicAndRadioItems = useMemo(
    () => [...homeFeed.music.slice(0, 6), ...homeFeed.radio.slice(0, 6)],
    [homeFeed.music, homeFeed.radio],
  );

  const resolvedFavoriteStations = useMemo(() => {
    const byId = new Map<string, CatalogueItem>();
    for (const st of favoriteStations) {
      byId.set(st.id, st);
    }
    const allIds = [...favoriteRadioIds, ...favoriteTvIds];
    const result: CatalogueItem[] = [];
    const seen = new Set<string>();
    for (const id of allIds) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      const found =
        byId.get(id) ??
        homeFeed.radio.find(r => r.id === id) ??
        getLiveItemById(id) ??
        history.find(h => h.id === id);
      if (found) {
        result.push(found);
      } else {
        const isTv = favoriteTvIds.includes(id) || id.startsWith('iptv-');
        result.push({
          id,
          title: isTv ? 'Saved Channel' : 'Saved Station',
          subtitle: isTv ? 'Live TV' : 'Radio',
          kind: isTv ? 'live-tv' : 'radio',
          lane: isTv ? 'video' : 'audio',
          source: 'api',
          provider: isTv ? 'IPTV-org' : 'RadioBrowser',
          icon: isTv ? 'access-point' : 'radio-tower',
          catalogueLaneId: isTv ? 'livetv' : 'radio',
        });
      }
    }
    return result;
  }, [favoriteStations, favoriteRadioIds, favoriteTvIds, homeFeed.radio, history]);

  const resolvedFavoriteRadio = useMemo(
    () =>
      resolvedFavoriteStations.filter(
        st => st.kind !== 'live-tv' && pinnedStationIds.includes(st.id),
      ),
    [resolvedFavoriteStations, pinnedStationIds],
  );
  const resolvedFavoriteChannels = useMemo(
    () =>
      resolvedFavoriteStations.filter(
        st => st.kind === 'live-tv' && pinnedStationIds.includes(st.id),
      ),
    [resolvedFavoriteStations, pinnedStationIds],
  );

  const recommendedItems = useMemo(
    () => [
      ...homeFeed.podcasts.slice(0, 2),
      ...homeFeed.music.slice(0, 2),
      ...homeFeed.movies.slice(0, 2),
    ],
    [homeFeed.movies, homeFeed.music, homeFeed.podcasts],
  );

  const filteredBestForYou = useMemo(() => {
    const livePool = [
      ...homeFeed.movies.slice(0, 4),
      ...homeFeed.podcasts.slice(0, 4),
      ...homeFeed.music.slice(0, 4),
      ...homeFeed.radio.slice(0, 4),
    ];
    const seen = new Set<string>();
    return livePool.filter(i => {
      if (seen.has(i.id)) {
        return false;
      }
      seen.add(i.id);
      return true;
    });
  }, [
    homeFeed.movies,
    homeFeed.podcasts,
    homeFeed.music,
    homeFeed.radio,
  ]);

  const openDetail = (idOrItem: string | CatalogueItem) => {
    if (typeof idOrItem === 'string') {
      router.push({pathname: '/media/[id]', params: {id: idOrItem}});
    } else {
      registerLiveItem(idOrItem);
      router.push({pathname: '/media/[id]', params: {id: idOrItem.id}});
    }
  };
  const openCatalogue = (laneId: string) =>
    router.push({pathname: '/catalogue/[lane]', params: {lane: laneId}});

  const handlePlayItem = (item: CatalogueItem) => {
    void playCatalogueItem(item);
    router.push(item.lane === 'video' ? '/player/video' : '/player/audio');
  };

  const handlePlayMix = (mix: CuratedMixRecord) => {
    const firstId = mix.trackIds[0];
    const target = firstId ? getLiveItemById(firstId) : undefined;
    if (target) {
      handlePlayItem(target);
    }
  };

  const stickyHeader = (
    <View
      style={[
        styles.headerRow,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 2,
          paddingBottom: spacing.sm,
        },
      ]}>
      <View style={styles.brandLockup}>
        <SimbaLogo size={42} variant="auto" />
        <View style={styles.brandCopy}>
          <AppText variant="wordmark" style={{lineHeight: 34, marginBottom: -4}}>
            Simba
          </AppText>
          <View style={styles.weatherRow}>
            <SimbaIcon
              name="weather-partly-cloudy"
              size={13}
              color={colors.accent.gold}
            />
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {homeFeed.weatherSummary ?? 'Loading local weather…'}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="Search"
          hitSlop={6}
          style={({pressed}) => [
            styles.headerActionBtn,
            {
              backgroundColor: pressed
                ? colors.background.surfaceSubtle
                : 'transparent',
              borderRadius: radius.full,
              borderWidth: 0,
            },
          ]}>
          <SimbaIcon
            name="magnify"
            size={21}
            color={colors.text.primary}
          />
        </Pressable>
      </View>
    </View>
  );

  const nativeSplashDismissedRef = useRef(false);
  const handleHomePainted = useCallback(() => {
    if (nativeSplashDismissedRef.current) {
      return;
    }
    nativeSplashDismissedRef.current = true;
    // Wait two GPU frames after HomeScreen's own content has laid out so
    // MainActivity crossfades directly onto painted pixels (0ms white flash).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        NativeModules.SimbaSplash?.hide();
      });
    });
  }, []);

  return (
    <Screen scroll inTabs bottomInset={dockVisible ? 80 : 12} header={stickyHeader}>
      <View
        onLayout={handleHomePainted}
        style={[styles.root, {paddingTop: spacing.xs}]}>

        {homeFeed.isLoading ? (
          <HomeFeedShimmer
            hasHistory={history.length > 0}
            hasSubscriptions={pinnedPodcasts.length > 0}
            hasBookmarks={bookmarks.length > 0}
            hasPlaylists={pinnedPlaylists.length > 0}
          />
        ) : (
          <>
        {/* 3. Jump Back In — only shown once the user has real playback history */}
        {history.length > 0 ? (
          <>
            <SectionHeader
              icon="history"
              title="Jump Back In"
              action={`History (${history.length})`}
              onAction={() => router.push('/saved?tab=history')}
            />
            <Rail gap={12} padding={spacing.lg}>
              {history.slice(0, 8).map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => handlePlayItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Resume ${item.title}`}
                  style={({pressed}) => [
                    styles.jumpWrap,
                    {opacity: pressed ? 0.78 : 1},
                  ]}>
                  <View
                    style={[
                      styles.jumpFrame,
                      {
                        backgroundColor: colors.brand.primaryDark,
                        borderRadius: radius.md,
                        overflow: 'hidden',
                      },
                    ]}>
                    <MediaArtwork
                      uri={item.artworkUrl}
                      icon={item.icon}
                      iconSize={30}
                      iconColor={colors.brand.primaryLight}
                      borderRadius={radius.md}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.jumpBadgeTopLeft}>
                      <Badge
                        label={item.lane === 'video' ? 'VIDEO' : 'AUDIO'}
                        tone="onMedia"
                      />
                    </View>
                    {item.elapsedTotalLabel ? (
                      <View style={styles.jumpTimestampBottomLeft}>
                        <Badge label={item.elapsedTotalLabel} tone="onMedia" />
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.jumpPlayCircle,
                        {
                          backgroundColor: colors.brand.primary,
                          borderRadius: radius.full,
                        },
                      ]}>
                      <SimbaIcon
                        name="play"
                        size={16}
                        color={colors.brand.onPrimary}
                      />
                    </View>
                    <View style={styles.jumpProgressBar}>
                      <ProgressBar
                        progress={item.progress ?? 0.15}
                        height={3.5}
                        trackColor={colors.background.onMediaPill}
                        fillColor={colors.accent.gold}
                      />
                    </View>
                  </View>
                  <View style={styles.jumpCopy}>
                    <AppText variant="label" numberOfLines={1}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {item.subtitle}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}

        {/* 4. Pinned Podcasts — ONLY shown when the user pins followed podcasts */}
        {pinnedPodcasts.length > 0 ? (
          <>
            <SectionHeader
              icon="rss"
              title="Your Subscriptions"
              action={`All (${podcastsList.length})`}
              onAction={() => router.push('/library?tab=podcasts')}
            />
            <Rail gap={12} padding={spacing.lg}>
              {pinnedPodcasts.map(pod => (
                <Pressable
                  key={pod.id}
                  onPress={() => {
                    const target = reconstructItemFromSubscription(pod);
                    openDetail(target);
                  }}
                  accessibilityRole="button"
                  style={styles.subPodcastCol}>
                  <View
                    style={[
                      styles.subPodcastArt,
                      {
                        backgroundColor: colors.brand.primaryContainer,
                        borderRadius: radius.sm + 2,
                        borderColor: colors.border.default,
                        overflow: 'hidden',
                      },
                    ]}>
                    <MediaArtwork
                      uri={pod.artworkUrl}
                      icon={pod.icon}
                      iconSize={24}
                      iconColor={colors.brand.onPrimaryContainer}
                      borderRadius={radius.sm + 2}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <AppText
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.subPodcastTitle}>
                    {pod.title}
                  </AppText>
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}

        {/* 5. Saved Bookmarks — only shown when the user has saved real bookmarks */}
        {bookmarks.length > 0 ? (
          <>
            <SectionHeader
              icon="heart"
              iconTone="love"
              title="Saved Bookmarks"
              action={`All (${bookmarks.length})`}
              onAction={() => router.push('/saved?tab=bookmarks')}
            />
            <Rail gap={10} padding={spacing.lg}>
              {bookmarks.map(bm => {
                const resolvedBm =
                  bm.item ??
                  getLiveItemById(bm.itemId) ??
                  history.find(h => h.id === bm.itemId);
                const bmArtwork = resolvedBm?.artworkUrl;
                return (
                <Pressable
                  key={bm.id}
                  onPress={() => {
                    const target =
                      resolvedBm ?? reconstructItemFromBookmark(bm);
                    openDetail(target);
                  }}
                  accessibilityRole="button"
                  style={styles.bookmarkWrap}>
                  <Surface tone="subtle" radius="md" style={styles.bookmarkCard}>
                    <View
                      style={[
                        styles.bookmarkArt,
                        {
                          backgroundColor: colors.brand.primaryContainer,
                          borderRadius: radius.xs + 2,
                          overflow: 'hidden',
                        },
                      ]}>
                      <MediaArtwork
                        uri={bmArtwork}
                        icon="heart"
                        iconSize={20}
                        iconColor={colors.semantic.error}
                        borderRadius={radius.xs + 2}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={styles.bookmarkCopy}>
                      <AppText variant="label" numberOfLines={1}>
                        {bm.at}
                      </AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {bm.note}
                      </AppText>
                      <View style={styles.bookmarkBottomRow}>
                        <SimbaIcon
                          name="clock-outline"
                          size={12}
                          color={colors.accent.gold}
                        />
                        <AppText variant="labelSmall" tone="gold">
                          {bm.positionLabel}
                        </AppText>
                      </View>
                    </View>
                  </Surface>
                </Pressable>
                );
              })}
            </Rail>
          </>
        ) : null}

        {/* 5b. Favorite Stations (Radio) — square avatar rail matching Your Subscriptions */}
        {resolvedFavoriteRadio.length > 0 ? (
          <>
            <SectionHeader
              icon="radio-tower"
              title="Favorite Stations"
              action={`All (${favoriteRadioIds.length})`}
              onAction={() => router.push('/library?tab=stations')}
            />
            <Rail gap={12} padding={spacing.lg}>
              {resolvedFavoriteRadio.map(st => (
                <Pressable
                  key={st.id}
                  onPress={() => openDetail(st)}
                  accessibilityRole="button"
                  style={styles.subPodcastCol}>
                  <View
                    style={[
                      styles.subPodcastArt,
                      {
                        backgroundColor: colors.accent.goldWash,
                        borderRadius: radius.sm + 2,
                        borderColor: colors.border.default,
                        overflow: 'hidden',
                      },
                    ]}>
                    <MediaArtwork
                      uri={st.artworkUrl}
                      icon={st.icon}
                      iconSize={24}
                      iconColor={colors.accent.gold}
                      borderRadius={radius.sm + 2}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <AppText
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.subPodcastTitle}>
                    {st.title}
                  </AppText>
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}

        {/* 5b-2. Favorite Channels (Live TV) — square avatar rail matching Your Subscriptions */}
        {resolvedFavoriteChannels.length > 0 ? (
          <>
            <SectionHeader
              icon="access-point"
              title="Favorite Channels"
              action={`All (${favoriteTvIds.length})`}
              onAction={() => router.push('/library?tab=channels')}
            />
            <Rail gap={12} padding={spacing.lg}>
              {resolvedFavoriteChannels.map(ch => (
                <Pressable
                  key={ch.id}
                  onPress={() => openDetail(ch)}
                  accessibilityRole="button"
                  style={styles.subPodcastCol}>
                  <View
                    style={[
                      styles.subPodcastArt,
                      {
                        backgroundColor: colors.accent.goldWash,
                        borderRadius: radius.sm + 2,
                        borderColor: colors.border.default,
                        overflow: 'hidden',
                      },
                    ]}>
                    <MediaArtwork
                      uri={ch.artworkUrl}
                      icon={ch.icon}
                      iconSize={24}
                      iconColor={colors.accent.gold}
                      borderRadius={radius.sm + 2}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <AppText
                    variant="labelSmall"
                    numberOfLines={1}
                    style={styles.subPodcastTitle}>
                    {ch.title}
                  </AppText>
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}

        {/* 6. Pinned Playlists — ONLY shown for playlists explicitly pinned by the user */}
        {pinnedPlaylists.length > 0 ? (
          <>
            <SectionHeader
              icon="playlist-music"
              title="Pinned Playlists"
              action={`All (${playlistsList.length})`}
              onAction={() => router.push('/library?tab=playlists')}
            />
            <Rail gap={10} padding={spacing.lg}>
              {pinnedPlaylists.map(pl => (
                <Pressable
                  key={pl.id}
                  onPress={() => router.push('/library?tab=playlists')}
                  accessibilityRole="button"
                  style={styles.playlistWrap}>
                  <Surface tone="subtle" radius="md" style={styles.playlistCard}>
                    <View
                      style={[
                        styles.playlistArt,
                        {
                          backgroundColor: colors.accent.goldWash,
                          borderRadius: radius.xs + 2,
                        },
                      ]}>
                      <SimbaIcon
                        name="playlist-music"
                        size={22}
                        color={colors.accent.gold}
                      />
                    </View>
                    <View style={styles.playlistCopy}>
                      <AppText variant="label" numberOfLines={1}>
                        {pl.name}
                      </AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {`${pl.count} ${pl.count === 1 ? 'item' : 'items'} • Pinned`}
                      </AppText>
                    </View>
                  </Surface>
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}

        {/* 7. Curated For You — 238x146 Handpicked Mix Cards (CodecM _buildCuratedForYouSection) */}
        <SectionHeader
          icon="creation"
          title="Handpicked Mixes"
          action={`All (${sortedMixes.length})`}
          onAction={() => setAllMixesVisible(true)}
        />
        <Rail gap={12} padding={spacing.lg}>
          {sortedMixes.map(mix => (
            <Pressable
              key={mix.id}
              onPress={() => setSelectedMix(mix)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${mix.title} mix`}
              style={styles.mixWrap}>
              <Surface tone="subtle" radius="md" style={styles.mixCard}>
                <View style={styles.mixTopRow}>
                  <Badge label={mix.eyebrow} tone="gold" />
                  <AppText variant="caption" tone="tertiary">
                    {`${mix.count} titles`}
                  </AppText>
                </View>

                <View style={styles.mixMid}>
                  <AppText variant="title" numberOfLines={1}>
                    {mix.title}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {mix.subtitle}
                  </AppText>
                </View>

                <View style={styles.mixBottomRow}>
                  <View style={styles.handpickedTag}>
                    <SimbaIcon
                      name="creation"
                      size={13}
                      color={colors.accent.gold}
                    />
                    <AppText variant="caption" tone="tertiary">
                      Handpicked mix
                    </AppText>
                  </View>

                  <Pressable
                    onPress={() => handlePlayMix(mix)}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${mix.title}`}
                    style={[
                      styles.mixPlayCircle,
                      {
                        backgroundColor: colors.brand.primary,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <SimbaIcon
                      name="play"
                      size={18}
                      color={colors.brand.onPrimary}
                    />
                  </Pressable>
                </View>
              </Surface>
            </Pressable>
          ))}
        </Rail>

        {/* 8. Recommended For You — 112x112 Square Cards ("Based on your taste") */}
        <SectionHeader
          icon="heart-outline"
          title="Picked For Today"
        />
        <Rail gap={12} padding={spacing.lg}>
          {recommendedItems.map(item => (
            <Pressable
              key={item.id}
              onPress={() => openDetail(item.id)}
              accessibilityRole="button"
              style={styles.recSquareWrap}>
              <View
                style={[
                  styles.recSquareArt,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.sm + 2,
                    borderColor: colors.border.default,
                    overflow: 'hidden',
                  },
                ]}>
                <MediaArtwork
                  uri={item.artworkUrl}
                  icon={item.icon}
                  iconSize={28}
                  iconColor={colors.brand.onPrimaryContainer}
                  borderRadius={radius.sm + 2}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.recTopLeftBadge}>
                  <Badge
                    label={MEDIA_KIND_LABELS[item.kind].toUpperCase()}
                    tone="onMedia"
                  />
                </View>
              </View>
              <AppText
                variant="label"
                numberOfLines={1}
                style={styles.recTitle}>
                {item.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {item.subtitle}
              </AppText>
            </Pressable>
          ))}
        </Rail>

        {/* 9. Classic Cinema & Films — 220x152 Landscape Cards (CodecM _buildFeaturedCinemaSection) */}
        <SectionHeader
          title="Silver Screen Classics"
          action="View all"
          onAction={() => openCatalogue('movies')}
        />
        <Rail gap={12} padding={spacing.lg}>
          {classicCinemaItems.map(movie => (
            <Pressable
              key={movie.id}
              onPress={() => openDetail(movie.id)}
              accessibilityRole="button"
              style={styles.cinemaWrap}>
              <View
                style={[
                  styles.cinemaCard,
                  {
                    backgroundColor: colors.brand.primaryDark,
                    borderRadius: radius.sm + 2,
                    borderColor: colors.border.default,
                    overflow: 'hidden',
                  },
                ]}>
                <MediaArtwork
                  uri={movie.artworkUrl}
                  icon={movie.icon}
                  iconSize={38}
                  iconColor={colors.brand.primaryLight}
                  borderRadius={radius.sm + 2}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {backgroundColor: colors.background.scrim},
                  ]}
                />
                <Pressable
                  onPress={() => handlePlayItem(movie)}
                  accessibilityRole="button"
                  style={[
                    styles.cinemaTopRightPlay,
                    {
                      backgroundColor: colors.background.onMediaPill,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="play"
                    size={16}
                    color={colors.text.bright}
                  />
                </Pressable>
                <View style={styles.cinemaBottomOverlay}>
                  <Badge label="PUBLIC DOMAIN" tone="gold" />
                  <AppText variant="label" tone="bright" numberOfLines={1}>
                    {movie.title}
                  </AppText>
                  <View style={styles.cinemaMetaRow}>
                    <SimbaIcon
                      name="star"
                      size={13}
                      color={colors.accent.amber}
                    />
                    <AppText variant="labelSmall" tone="bright">
                      {(movie.rating ?? 4.8).toFixed(1)}
                    </AppText>
                    <AppText variant="caption" tone="mutedOnMedia">
                      {formatDurationShort(movie.durationSeconds)}
                    </AppText>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </Rail>

        {/* 10. Trending Shows & Podcasts — 136dp Cards (CodecM _buildTrendingPodcastsSection) */}
        <SectionHeader
          title="Stories & Voices"
          action="View all"
          onAction={() => openCatalogue('podcasts')}
        />
        <Rail gap={12} padding={spacing.lg}>
          {trendingPodcastsAndShows.map(pod => (
            <Pressable
              key={pod.id}
              onPress={() => openDetail(pod.id)}
              accessibilityRole="button"
              style={({pressed}) => [
                styles.podcastCardWrap,
                {opacity: pressed ? 0.78 : 1},
              ]}>
              <View
                style={[
                  styles.podcastCardArt,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.md,
                    overflow: 'hidden',
                  },
                ]}>
                <MediaArtwork
                  uri={pod.artworkUrl}
                  icon={pod.icon}
                  iconSize={32}
                  iconColor={colors.brand.onPrimaryContainer}
                  borderRadius={radius.md}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={styles.podcastCardBody}>
                <AppText variant="label" numberOfLines={1}>
                  {pod.title}
                </AppText>
                <View style={styles.podcastCardMeta}>
                  <SimbaIcon
                    name="star"
                    size={12}
                    color={colors.accent.amber}
                  />
                  <AppText variant="labelSmall">
                    {(pod.rating ?? 4.8).toFixed(1)}
                  </AppText>
                  <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                    {formatDurationShort(pod.durationSeconds)}
                  </AppText>
                </View>
              </View>
            </Pressable>
          ))}
        </Rail>

        {/* 11. Sound & Airwaves — Borderless Editorial Tiles */}
        <SectionHeader
          title="Sound & Airwaves"
          action="View all"
          onAction={() => openCatalogue('music')}
        />
        <Rail gap={12} padding={spacing.lg}>
          {musicAndRadioItems.map(item => (
            <Pressable
              key={item.id}
              onPress={() => openDetail(item)}
              accessibilityRole="button"
              style={({pressed}) => [
                styles.musicRadioWrap,
                {opacity: pressed ? 0.78 : 1},
              ]}>
              <View
                style={[
                  styles.musicRadioArt,
                  {
                    backgroundColor: colors.accent.goldWash,
                    borderRadius: radius.md,
                    overflow: 'hidden',
                  },
                ]}>
                <MediaArtwork
                  uri={item.artworkUrl}
                  icon={item.icon}
                  iconSize={26}
                  iconColor={colors.accent.gold}
                  borderRadius={radius.md}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={styles.musicRadioBody}>
                <AppText variant="label" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {item.subtitle}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Rail>

        {/* 12. Best for you — 58x58 Media Tiles + Circular Play CTA (CodecM _buildBestForYouSection) */}
        <SectionHeader
          title="Keep Wandering"
          action="View all"
          onAction={() => router.push('/search')}
        />
        <View style={[styles.bestList, {paddingHorizontal: spacing.lg}]}>
          {filteredBestForYou.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => openDetail(item.id)}
              accessibilityRole="button"
              style={({pressed}) => [
                styles.bestTile,
                {
                  borderBottomWidth:
                    idx === filteredBestForYou.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <View
                style={[
                  styles.bestTileArt,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.xs + 3,
                    overflow: 'hidden',
                  },
                ]}>
                <MediaArtwork
                  uri={item.artworkUrl}
                  icon={item.icon}
                  iconSize={24}
                  iconColor={colors.brand.onPrimaryContainer}
                  borderRadius={radius.xs + 3}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={styles.bestTileCopy}>
                <AppText variant="title" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {`${item.subtitle || MEDIA_KIND_LABELS[item.kind]} • ${MEDIA_KIND_LABELS[item.kind]}`}
                </AppText>
                <View style={styles.bestTileMetaRow}>
                  <SimbaIcon
                    name="star"
                    size={13}
                    color={colors.accent.amber}
                  />
                  <AppText variant="labelSmall">
                    {(item.rating ?? 4.8).toFixed(1)}
                  </AppText>
                  <AppText variant="caption" tone="tertiary">
                    {formatDurationShort(item.durationSeconds)}
                  </AppText>
                </View>
              </View>
              <Pressable
                onPress={() => handlePlayItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title}`}
                style={[
                  styles.bestTilePlayBtn,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.full,
                  },
                ]}>
                <SimbaIcon
                  name="play"
                  size={19}
                  color={colors.brand.onPrimaryContainer}
                />
              </Pressable>
            </Pressable>
          ))}

          <View style={styles.feedFooter}>
            <AppText variant="caption" tone="tertiary">
              {"You're all caught up with your feed."}
            </AppText>
          </View>
        </View>
          </>
        )}

        {/* CuratedMixDetailSheet (CodecM _showCuratedMixSheet) */}
        <Sheet
          visible={selectedMix !== null}
          onClose={() => setSelectedMix(null)}
          title={selectedMix?.title ?? 'Handpicked Mix'}
          subtitle={selectedMix?.subtitle}>
          {selectedMix ? (
            <View style={styles.sheetBody}>
              <View style={styles.sheetTopBadgeRow}>
                <Badge label={selectedMix.eyebrow} tone="gold" />
                <View style={styles.handpickedTag}>
                  <SimbaIcon
                    name="creation"
                    size={13}
                    color={colors.accent.gold}
                  />
                  <AppText variant="caption" tone="secondary">
                    {`${selectedMix.trackIds.length} titles • Handpicked mix`}
                  </AppText>
                </View>
              </View>

              <View style={styles.sheetTracks}>
                {selectedMix.trackIds.map(tid => {
                  const track = getLiveItemById(tid);
                  if (!track) {
                    return null;
                  }
                  return (
                    <Pressable
                      key={track.id}
                      onPress={() => {
                        setSelectedMix(null);
                        handlePlayItem(track);
                      }}
                      accessibilityRole="button">
                      <Surface
                        tone="card"
                        radius="md"
                        style={styles.sheetTrackCard}>
                        <View
                          style={[
                            styles.sheetTrackArt,
                            {
                              backgroundColor: colors.brand.primaryContainer,
                              borderRadius: radius.xs + 3,
                            },
                          ]}>
                          <SimbaIcon
                            name={track.icon}
                            size={22}
                            color={colors.brand.onPrimaryContainer}
                          />
                        </View>
                        <View style={styles.sheetTrackCopy}>
                          <AppText variant="title" numberOfLines={1}>
                            {track.title}
                          </AppText>
                          <AppText
                            variant="caption"
                            tone="secondary"
                            numberOfLines={1}>
                            {`${track.subtitle || MEDIA_KIND_LABELS[track.kind]} • ${MEDIA_KIND_LABELS[track.kind]}`}
                          </AppText>
                          <View style={styles.bestTileMetaRow}>
                            <SimbaIcon
                              name="star"
                              size={12}
                              color={colors.accent.amber}
                            />
                            <AppText variant="labelSmall">
                              {(track.rating ?? 4.8).toFixed(1)}
                            </AppText>
                            <AppText variant="caption" tone="tertiary">
                              {formatDurationShort(track.durationSeconds)}
                            </AppText>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.bestTilePlayBtn,
                            {
                              backgroundColor: colors.brand.primaryContainer,
                              borderRadius: radius.full,
                            },
                          ]}>
                          <SimbaIcon
                            name="play"
                            size={18}
                            color={colors.brand.onPrimaryContainer}
                          />
                        </View>
                      </Surface>
                    </Pressable>
                  );
                })}
              </View>

              <Button
                label={`Play Mix (${selectedMix.trackIds.length} Titles)`}
                fullWidth
                onPress={() => {
                  const mix = selectedMix;
                  setSelectedMix(null);
                  handlePlayMix(mix);
                }}
              />
            </View>
          ) : null}
        </Sheet>

        {/* Sheet 3: All Curated Mixes Sheet (CodecM _showAllCuratedMixesSheet) */}
        <Sheet
          visible={allMixesVisible}
          onClose={() => setAllMixesVisible(false)}
          title="Handpicked Mixes"
          subtitle={`${sortedMixes.length} handpicked mixes`}>
          <View style={styles.sheetBody}>
            {sortedMixes.map(mix => (
              <Pressable
                key={mix.id}
                onPress={() => {
                  setAllMixesVisible(false);
                  setSelectedMix(mix);
                }}
                accessibilityRole="button">
                <Surface tone="card" radius="md" style={styles.manageMixRow}>
                  <View style={styles.manageMixCopy}>
                    <View style={styles.manageMixTopRow}>
                      <Badge label={mix.eyebrow} tone="gold" />
                      <AppText variant="caption" tone="tertiary">
                        {`${mix.count} titles`}
                      </AppText>
                    </View>
                    <AppText variant="title">{mix.title}</AppText>
                    <AppText
                      variant="caption"
                      tone="secondary"
                      numberOfLines={2}>
                      {mix.subtitle}
                    </AppText>
                  </View>
                  <View style={styles.manageMixActions}>
                    <Pressable
                      onPress={() => togglePinMix(mix.id)}
                      accessibilityRole="button"
                      style={[
                        styles.pinTogglePill,
                        {
                          backgroundColor: mix.pinned
                              ? colors.brand.primaryContainer
                              : colors.background.surfaceSubtle,
                          borderRadius: radius.pill,
                        },
                      ]}>
                      <SimbaIcon
                        name={mix.pinned ? 'pin' : 'pin-outline'}
                        size={14}
                        color={colors.brand.onPrimaryContainer}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setAllMixesVisible(false);
                        handlePlayMix(mix);
                      }}
                      accessibilityRole="button"
                      style={[
                        styles.mixPlayCircle,
                        {
                          backgroundColor: colors.brand.primary,
                          borderRadius: radius.full,
                        },
                      ]}>
                      <SimbaIcon
                        name="play"
                        size={18}
                        color={colors.brand.onPrimary}
                      />
                    </Pressable>
                  </View>
                </Surface>
              </Pressable>
            ))}
            <Button
              label="Personalize Mixes"
              variant="secondary"
              fullWidth
              onPress={() => {
                setAllMixesVisible(false);
                router.push('/curated-mixes');
              }}
            />
          </View>
        </Sheet>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lionBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {flex: 1, gap: 1},
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpWrap: {width: 214},
  jumpFrame: {
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpProgressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  jumpBadgeTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  jumpTimestampBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 8,
  },
  jumpPlayCircle: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpCopy: {
    paddingTop: 7,
    gap: 2,
  },
  subPodcastCol: {
    width: 68,
    alignItems: 'center',
    gap: 5,
  },
  subPodcastArt: {
    width: 60,
    height: 60,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPodcastTitle: {
    textAlign: 'center',
  },
  bookmarkWrap: {width: 220},
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 10,
  },
  bookmarkArt: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkCopy: {
    flex: 1,
    gap: 2,
  },
  bookmarkBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  spacer: {flex: 1},
  playlistWrap: {width: 206},
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 10,
  },
  playlistArt: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistCopy: {
    flex: 1,
    gap: 2,
  },
  mixWrap: {width: 238},
  mixCard: {
    height: 146,
    padding: 14,
    justifyContent: 'space-between',
  },
  mixTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mixMid: {
    gap: 3,
  },
  mixBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handpickedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mixPlayCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recSquareWrap: {
    width: 116,
  },
  recSquareArt: {
    width: 116,
    height: 116,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTopLeftBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
  },
  recTitle: {
    marginTop: 6,
  },
  cinemaWrap: {width: 220},
  cinemaCard: {
    width: 220,
    height: 152,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    justifyContent: 'flex-end',
  },
  cinemaCenterIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  cinemaTopRightPlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cinemaBottomOverlay: {
    gap: 4,
  },
  cinemaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  podcastCardWrap: {width: 136},
  podcastCard: {overflow: 'hidden'},
  podcastCardArt: {
    width: 136,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastCardBody: {
    paddingTop: 7,
    gap: 2,
  },
  podcastCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  musicRadioWrap: {width: 132},
  musicRadioCard: {overflow: 'hidden'},
  musicRadioArt: {
    width: 132,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicRadioBody: {
    paddingTop: 7,
    gap: 2,
  },
  bestList: {
    gap: 0,
  },
  bestTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  bestTileArt: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestTileCopy: {
    flex: 1,
    gap: 3,
  },
  bestTileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  bestTilePlayBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedFooter: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sheetBody: {gap: 12, paddingTop: 4},
  sheetTopBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTracks: {gap: 8},
  sheetTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  sheetTrackArt: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTrackCopy: {flex: 1, gap: 2},
  manageMixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  manageMixCopy: {flex: 1, gap: 4},
  manageMixTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageMixActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinTogglePill: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
