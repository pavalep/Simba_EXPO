import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useCatalogueBrowse} from '../../hooks/useCatalogueBrowse';
import {
  canBookmarkItem,
  isMetadataOnlyGuide,
  isPodcastShow,
  registerLiveItem,
  registerLiveItems,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Button,
  CatalogueGridShimmer,
  CatalogueListShimmer,
  FilterIconButton,
  FilterSheet,
  IconButton,
  MediaArtwork,
  Screen,
  Sheet,
  Surface,
  type FilterGroup,
} from '../ui';
import {catalogueLanes} from '../../constants/catalogueConfig';
import type {CatalogueItem, CatalogueLane} from '../../types/catalogue';
import {MEDIA_KIND_LABELS} from '../../types/media';

export interface CatalogueBrowseScreenProps {
  laneId?: string;
}

/**
 * UNIFIED 8-CATALOGUE BROWSE SCREEN (Penpot Swimlane 04: 04.1–04.8 + CodecM Browse Pages).
 *
 * Covers:
 *   • 04.1 Movies (2-col poster grid + FilterSheet)
 *   • 04.2 Shows (2-col poster grid + FilterSheet)
 *   • 04.3 Podcasts (editorial list + FilterSheet)
 *   • 04.4 Music (editorial list + FilterSheet)
 *   • 04.5 Radio (editorial list + Favorites toggle + FilterSheet)
 *   • 04.6 Live TV (2-col broadcast grid + Favorites toggle + FilterSheet)
 *   • 04.7 Audiobooks (unabridged list + FilterSheet)
 *   • 04.8 Archive (2-col vault grid + FilterSheet)
 */
export function CatalogueBrowseScreen({
  laneId = 'movies',
}: CatalogueBrowseScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    addToQueue,
    playNextInQueue,
    isFavorite: isStoreFavorite,
    toggleFavorite: toggleStoreFavorite,
    podcastsList,
    toggleFollowPodcast,
    favoriteRadioIds,
    toggleFavoriteRadio,
    favoriteTvIds,
    toggleFavoriteTv,
    favoriteStations,
    playlistsList,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();

  const lane: CatalogueLane = useMemo(
    () => catalogueLanes.find(l => l.id === laneId) ?? catalogueLanes[0],
    [laneId],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string>(lane.filters[0] ?? 'Popular');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  const [actionItem, setActionItem] = useState<CatalogueItem | null>(null);
  const [playlistTargetItem, setPlaylistTargetItem] =
    useState<CatalogueItem | null>(null);

  // Reset per-lane filters whenever the user enters a different dedicated catalogue
  useEffect(() => {
    setSearchQuery('');
    setSearchFocused(false);
    setSelectedChip(lane.filters[0] ?? 'Popular');
    setOnlyFavorites(false);
    setGroupSelections({});
  }, [lane.id, lane.filters]);

  // Ensure all lane genre chips live inside the FilterSheet (never cluttering the top bar)
  const filterGroups = useMemo<FilterGroup[]>(() => {
    const existingHasGenre = lane.filterGroups.some(g =>
      ['genre', 'category', 'browse', 'topic', 'tag', 'status'].includes(g.id),
    );
    if (existingHasGenre || lane.filters.length === 0) {
      return lane.filterGroups;
    }
    const genreGroup: FilterGroup = {
      id: 'browse',
      title: 'Genre & Mood',
      multiSelect: false,
      options: lane.filters.map(f => ({key: f, label: f})),
    };
    return [genreGroup, ...lane.filterGroups];
  }, [lane.filterGroups, lane.filters]);

  const sortKey = useMemo(() => {
    const sortSelection = groupSelections.sort?.[0];
    if (sortSelection === 'Title A–Z' || sortSelection === 'A-Z') {
      return 'AZ';
    }
    if (sortSelection === 'Highest Rated' || sortSelection === 'Rating') {
      return 'Rating';
    }
    if (sortSelection === 'Newest' || sortSelection === 'Recent') {
      return 'Recent';
    }
    return 'Popular';
  }, [groupSelections]);

  const liveBrowse = useCatalogueBrowse({
    laneId: lane.id,
    searchQuery,
    selectedChip,
    sortKey,
  });

  useEffect(() => {
    if (liveBrowse.items.length > 0) {
      registerLiveItems(liveBrowse.items);
    }
  }, [liveBrowse.items]);

  const activeFilterCount = useMemo(() => {
    let count = selectedChip !== (lane.filters[0] ?? 'Popular') ? 1 : 0;
    if (onlyFavorites) {
      count += 1;
    }
    for (const vals of Object.values(groupSelections)) {
      if (vals.length > 0 && vals[0] !== 'All' && vals[0] !== 'Popular') {
        count += 1;
      }
    }
    return count;
  }, [selectedChip, onlyFavorites, groupSelections, lane.filters]);

  const items = useMemo(() => {
    if (!onlyFavorites) {
      return liveBrowse.items;
    }
    const targetIds = lane.id === 'radio' ? favoriteRadioIds : favoriteTvIds;
    const targetKind = lane.id === 'radio' ? 'radio' : 'live-tv';
    const byId = new Map<string, CatalogueItem>();
    for (const st of favoriteStations) {
      if (st.kind === targetKind) {
        byId.set(st.id, st);
      }
    }
    for (const item of liveBrowse.items) {
      if (targetIds.includes(item.id)) {
        byId.set(item.id, item);
      }
    }
    return targetIds
      .map(id => byId.get(id))
      .filter((x): x is CatalogueItem => Boolean(x));
  }, [
    liveBrowse.items,
    lane.id,
    onlyFavorites,
    favoriteRadioIds,
    favoriteTvIds,
    favoriteStations,
  ]);

  const isFavorite = (id: string) =>
    lane.id === 'radio'
      ? favoriteRadioIds.includes(id)
      : favoriteTvIds.includes(id);

  const toggleFavorite = (item: CatalogueItem) => {
    if (lane.id === 'radio') {
      toggleFavoriteRadio(item);
    } else if (lane.id === 'livetv') {
      toggleFavoriteTv(item);
    }
  };

  const stickyHeader = (
    <View
      style={[
        styles.appBar,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 2,
          paddingBottom: spacing.sm,
        },
      ]}>
      <IconButton
        name="arrow-left"
        onPress={() => router.back()}
        accessibilityLabel="Back"
      />
      <View style={styles.titleCol}>
        <AppText variant="h2">{lane.label}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {lane.subtitle}
        </AppText>
      </View>
      <View style={styles.headerRight}>
        {lane.hasFavorites ? (
          <Pressable
            onPress={() => setOnlyFavorites(f => !f)}
            accessibilityRole="button"
            accessibilityState={{selected: onlyFavorites}}
            style={[
              styles.favHeaderPill,
              {
                backgroundColor: onlyFavorites
                  ? colors.brand.primary
                  : colors.brand.primaryContainer,
                borderRadius: radius.pill,
              },
            ]}>
            <SimbaIcon
              name={onlyFavorites ? 'heart' : 'heart-outline'}
              size={16}
              color={
                onlyFavorites
                  ? colors.brand.onPrimary
                  : colors.brand.onPrimaryContainer
              }
            />
            <AppText
              variant="labelSmall"
              style={{
                color: onlyFavorites
                  ? colors.brand.onPrimary
                  : colors.brand.onPrimaryContainer,
              }}>
              {lane.favoritesTitle ?? 'Favorites'}
            </AppText>
          </Pressable>
        ) : null}
        <FilterIconButton
          activeCount={activeFilterCount}
          onPress={() => setFilterVisible(true)}
        />
      </View>
    </View>
  );

  const handleLoadMore = () => {
    if (
      liveBrowse.hasNextPage &&
      !liveBrowse.isFetchingNextPage &&
      !liveBrowse.isLoading &&
      !liveBrowse.pageError
    ) {
      void liveBrowse.fetchNextPage();
    }
  };

  return (
    <Screen scroll header={stickyHeader} onEndReached={handleLoadMore}>
      <View
        style={[
          styles.container,
          {paddingTop: spacing.xs, paddingBottom: spacing.lg},
        ]}>

        {/* Full-width Soft Tonal Search Field (same grammar as Explore & Search) */}
        <View style={{paddingHorizontal: spacing.lg}}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.background.surfaceSubtle,
                borderRadius: radius.pill,
                borderColor: searchFocused
                  ? colors.brand.primary
                  : 'transparent',
              },
            ]}>
            <SimbaIcon
              name="magnify"
              size={19}
              color={colors.text.secondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={lane.searchPlaceholder}
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="search"
              style={[styles.searchInput, {color: colors.text.primary}]}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}>
                <SimbaIcon
                  name="close"
                  size={18}
                  color={colors.text.secondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 5. Shimmer Loading, Error State, Empty State, or Grid/List Content */}
        {liveBrowse.isLoading && items.length === 0 ? (
          lane.layout === 'grid' ? (
            <CatalogueGridShimmer count={6} compact={lane.id === 'livetv'} />
          ) : (
            <CatalogueListShimmer count={6} />
          )
        ) : liveBrowse.error && items.length === 0 ? (
          <View style={{paddingHorizontal: spacing.lg}}>
            <Surface tone="subtle" radius="lg" style={styles.emptyBox}>
              <SimbaIcon
                name="alert-circle-outline"
                size={36}
                color={colors.accent.gold}
              />
              <AppText variant="title">
                {`Couldn't load ${lane.label.toLowerCase()}`}
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                {liveBrowse.error instanceof Error
                  ? liveBrowse.error.message
                  : 'Please check your connection and try again.'}
              </AppText>
              <Button
                label="Try Again"
                variant="secondary"
                onPress={() => void liveBrowse.refetch()}
              />
            </Surface>
          </View>
        ) : items.length === 0 ? (
          <View style={{paddingHorizontal: spacing.lg}}>
            <Surface tone="subtle" radius="lg" style={styles.emptyBox}>
              <SimbaIcon
                name={lane.icon}
                size={36}
                color={colors.accent.gold}
              />
              <AppText variant="title">
                {`No ${lane.label.toLowerCase()} match your active filter`}
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                Try resetting filters or clearing your search.
              </AppText>
              <Button
                label="Reset Filters"
                variant="secondary"
                onPress={() => {
                  setSelectedChip(lane.filters[0] ?? 'Popular');
                  setGroupSelections({});
                  setSearchQuery('');
                  setOnlyFavorites(false);
                }}
              />
            </Surface>
          </View>
        ) : lane.layout === 'grid' ? (
          /* Borderless 2-Column Poster / Broadcast Grid */
          <View style={[styles.gridWrap, {paddingHorizontal: spacing.lg}]}>
            {items.map(item => (
              <Pressable
                key={item.id}
                onPress={() => {
                  registerLiveItem(item);
                  router.push({pathname: '/media/[id]', params: {id: item.id}});
                }}
                accessibilityRole="button"
                style={({pressed}) => [
                  styles.gridCell,
                  {opacity: pressed ? 0.78 : 1},
                ]}>
                <View
                  style={[
                    styles.gridPoster,
                    {
                      backgroundColor: colors.accent.goldWash,
                      height: lane.id === 'livetv' ? 112 : 186,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                    },
                  ]}>
                  <MediaArtwork
                    uri={item.artworkUrl}
                    icon={item.icon}
                    iconSize={36}
                    borderRadius={radius.md}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.posterTopLeft}>
                    <Badge
                      label={item.genre ?? item.year ?? MEDIA_KIND_LABELS[item.kind]}
                      tone="onMedia"
                    />
                  </View>
                  {lane.hasFavorites ? (
                    <Pressable
                      onPress={e => {
                        e.stopPropagation();
                        toggleFavorite(item);
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isFavorite(item.id)
                          ? `Remove ${item.title} from favorites`
                          : `Add ${item.title} to favorites`
                      }
                      style={[
                        styles.posterTopRight,
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.background.onMediaPill,
                        },
                      ]}>
                      <SimbaIcon
                        name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
                        size={17}
                        color={
                          isFavorite(item.id)
                            ? colors.semantic.error
                            : colors.text.bright
                        }
                      />
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.gridCardBody}>
                  <AppText variant="label" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {item.subtitle || MEDIA_KIND_LABELS[item.kind]}
                  </AppText>
                  <View style={styles.gridFooterRow}>
                    <AppText variant="caption" tone="gold">
                      {item.rating
                        ? `★ ${item.rating.toFixed(1)}`
                        : item.year ?? 'LIVE'}
                    </AppText>
                    <View style={styles.cardActions}>
                      {!isMetadataOnlyGuide(item) ? (
                        <Pressable
                          onPress={() => {
                            void playCatalogueItem(item);
                            router.push(
                              item.lane === 'video'
                                ? '/player/video'
                                : '/player/audio',
                            );
                          }}
                          accessibilityRole="button"
                          style={styles.miniIconTap}>
                          <SimbaIcon
                            name="play-circle"
                            size={20}
                            color={colors.accent.gold}
                          />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => setActionItem(item)}
                        accessibilityRole="button"
                        style={styles.miniIconTap}>
                        <SimbaIcon
                          name="dots-vertical"
                          size={18}
                          color={colors.text.tertiary}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          /* Editorial List Rows (04.3 Podcasts, 04.4 Music, 04.5 Radio, 04.7 Audiobooks) */
          <View style={[styles.listWrap, {paddingHorizontal: spacing.lg, gap: 0}]}>
            {items.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  registerLiveItem(item);
                  router.push({pathname: '/media/[id]', params: {id: item.id}});
                }}
                accessibilityRole="button"
                style={({pressed}) => [
                  styles.listRowCard,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth:
                      idx === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.listArt,
                    {
                      backgroundColor: colors.accent.goldWash,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                    },
                  ]}>
                  <MediaArtwork
                    uri={item.artworkUrl}
                    icon={item.icon}
                    iconSize={24}
                    borderRadius={radius.md}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                  <View style={styles.listCopy}>
                    <View style={styles.listBadgeRow}>
                      <Badge
                        label={item.genre ?? MEDIA_KIND_LABELS[item.kind]}
                        tone="gold"
                      />
                      {item.rating ? (
                        <AppText variant="caption" tone="gold">
                          {`★ ${item.rating.toFixed(1)}`}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="title" numberOfLines={1}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {item.subtitle}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {item.meta}
                    </AppText>
                  </View>

                  <View style={styles.listActionsCol}>
                    {lane.hasFavorites ? (
                      <IconButton
                        name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
                        size={18}
                        onPress={() => toggleFavorite(item)}
                        accessibilityLabel="Toggle favorite"
                      />
                    ) : null}
                    <IconButton
                      name="play-circle-outline"
                      size={24}
                      onPress={() => {
                        void playCatalogueItem(item);
                        router.push(
                          item.lane === 'video'
                            ? '/player/video'
                            : '/player/audio',
                        );
                      }}
                      accessibilityLabel={`Play ${item.title}`}
                    />
                    <IconButton
                      name="dots-vertical"
                      size={18}
                      onPress={() => setActionItem(item)}
                      accessibilityLabel={`Actions for ${item.title}`}
                    />
                  </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 6. Automatic Infinite-Scroll Pagination Footer: Shimmer / Retry / Caught-Up */}
        {liveBrowse.isFetchingNextPage ? (
          <View style={{paddingVertical: spacing.md}}>
            {lane.layout === 'grid' ? (
              <CatalogueGridShimmer count={2} compact={lane.id === 'livetv'} />
            ) : (
              <CatalogueListShimmer count={2} />
            )}
          </View>
        ) : liveBrowse.pageError ? (
          <View style={{paddingHorizontal: spacing.lg, paddingVertical: spacing.md}}>
            <Button
              label="Retry loading more"
              variant="secondary"
              onPress={() => void liveBrowse.fetchNextPage()}
            />
          </View>
        ) : !liveBrowse.hasNextPage && items.length > 0 ? (
          <View style={[styles.footerRuleWrap, {paddingHorizontal: spacing.lg}]}>
            <View
              style={[styles.footerRule, {backgroundColor: colors.border.default}]}
            />
            <AppText variant="caption" tone="tertiary">
              {`You're all caught up · ${items.length} ${lane.label.toLowerCase()} titles`}
            </AppText>
            <View
              style={[styles.footerRule, {backgroundColor: colors.border.default}]}
            />
          </View>
        ) : null}
      </View>

      {/* Multi-Group Catalogue FilterSheet (genres + sort all live here) */}
      <FilterSheet
        visible={filterVisible}
        title={`Filter ${lane.label}`}
        subtitle={`Choose genres and sort order for ${lane.label.toLowerCase()}`}
        groups={filterGroups}
        initialValues={
          Object.keys(groupSelections).length > 0
            ? groupSelections
            : Object.fromEntries(
                filterGroups.map(g => [
                  g.id,
                  [g.options[0]?.key ?? 'All'],
                ]),
              )
        }
        onApply={selected => {
          setGroupSelections(selected);
          const firstGroupKey = filterGroups[0]?.id;
          const chosen = firstGroupKey ? selected[firstGroupKey]?.[0] : undefined;
          if (chosen) {
            setSelectedChip(chosen === 'All' ? (lane.filters[0] ?? 'Popular') : chosen);
          }
        }}
        onReset={() => {
          setGroupSelections({});
          setSelectedChip(lane.filters[0] ?? 'Popular');
        }}
        onClose={() => setFilterVisible(false)}
      />

      {/* MediaActionsSheet (Penpot 05.2) */}
      <Sheet
        visible={actionItem !== null}
        onClose={() => setActionItem(null)}
        title={actionItem?.title}
        subtitle={
          actionItem?.subtitle ||
          (actionItem ? MEDIA_KIND_LABELS[actionItem.kind] : undefined)
        }>
        {actionItem ? (
          <View style={styles.sheetMenu}>
            {!isMetadataOnlyGuide(actionItem) ? (
              <>
                <ActionSheetRow
                  icon="play-circle-outline"
                  label="Play Now"
                  onPress={() => {
                    const target = actionItem;
                    setActionItem(null);
                    void playCatalogueItem(target);
                    router.push(
                      target.lane === 'video' ? '/player/video' : '/player/audio',
                    );
                  }}
                />
                <ActionSheetRow
                  icon="playlist-play"
                  label="Play Next in Queue"
                  onPress={() => {
                    playNextInQueue(actionItem);
                    setActionItem(null);
                  }}
                />
                <ActionSheetRow
                  icon="playlist-plus"
                  label="Add to Playback Queue"
                  onPress={() => {
                    addToQueue(actionItem);
                    setActionItem(null);
                  }}
                />
                <ActionSheetRow
                  icon="playlist-music-outline"
                  label="Add to Playlist..."
                  onPress={() => {
                    const target = actionItem;
                    setActionItem(null);
                    setPlaylistTargetItem(target);
                  }}
                />
              </>
            ) : (
              <>
                <ActionSheetRow
                  icon="television-classic"
                  label="Open Episode Guide"
                  onPress={() => {
                    const target = actionItem;
                    setActionItem(null);
                    registerLiveItem(target);
                    router.push({
                      pathname: '/media/[id]',
                      params: {id: target.id},
                    });
                  }}
                />
                <ActionSheetRow
                  icon="folder-outline"
                  label="Connect Local Folder to Play"
                  onPress={() => {
                    setActionItem(null);
                    router.push('/folders');
                  }}
                />
              </>
            )}
            {lane.hasFavorites ? (
              <ActionSheetRow
                icon={isFavorite(actionItem.id) ? 'heart' : 'heart-outline'}
                label={
                  isFavorite(actionItem.id)
                    ? lane.id === 'livetv'
                      ? 'Remove from Favorite Channels'
                      : 'Remove from Favorite Stations'
                    : lane.id === 'livetv'
                      ? 'Add to Favorite Channels'
                      : 'Add to Favorite Stations'
                }
                onPress={() => {
                  toggleFavorite(actionItem);
                  setActionItem(null);
                }}
              />
            ) : null}
            {isPodcastShow(actionItem) ? (
              <ActionSheetRow
                icon={
                  podcastsList.some(p => p.title === actionItem.title)
                    ? 'check-circle'
                    : 'podcast'
                }
                label={
                  podcastsList.some(p => p.title === actionItem.title)
                    ? 'Unfollow Podcast'
                    : 'Follow Podcast'
                }
                onPress={() => {
                  toggleFollowPodcast(actionItem);
                  setActionItem(null);
                }}
              />
            ) : !lane.hasFavorites ? (
              <ActionSheetRow
                icon={isStoreFavorite(actionItem.id) ? 'heart' : 'heart-outline'}
                label={
                  isStoreFavorite(actionItem.id)
                    ? 'Remove from Favorites'
                    : 'Add to Favorites'
                }
                onPress={() => {
                  toggleStoreFavorite(actionItem);
                  setActionItem(null);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* PlaylistSheet (Penpot 05.2) */}
      <Sheet
        visible={playlistTargetItem !== null}
        onClose={() => setPlaylistTargetItem(null)}
        title="Add to Playlist"
        subtitle={playlistTargetItem?.title}>
        <View style={styles.sheetMenu}>
          {playlistsList.map(pl => (
            <ActionSheetRow
              key={pl.id}
              icon={pl.icon}
              label={`${pl.name} (${pl.count} tracks)`}
              onPress={() => setPlaylistTargetItem(null)}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function ActionSheetRow({
  icon,
  label,
  onPress,
}: {
  icon: import('../ui/SimbaIcon').SimbaIconName;
  label: string;
  onPress: () => void;
}) {
  const {colors} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.actionRow,
        {borderBottomColor: colors.border.subtle},
      ]}>
      <SimbaIcon name={icon} size={20} color={colors.accent.gold} />
      <AppText variant="body" style={styles.actionRowLabel}>
        {label}
      </AppText>
      <SimbaIcon
        name="chevron-right"
        size={18}
        color={colors.text.tertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {gap: 14},
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {flex: 1, gap: 2},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favHeaderPill: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  searchBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    width: '48%',
  },
  gridPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  posterTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardBody: {
    paddingTop: 7,
    gap: 2,
  },
  gridFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniIconTap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {gap: 12},
  listRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  listArt: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: {flex: 1, gap: 3},
  listBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerRuleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  footerRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  sheetMenu: {gap: 4},
  actionRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRowLabel: {flex: 1},
});
