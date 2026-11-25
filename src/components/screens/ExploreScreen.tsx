import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useHomeFeed} from '../../hooks/useHomeFeed';
import {
  registerLiveItems,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Chip,
  FilterIconButton,
  FilterSheet,
  MediaArtwork,
  Rail,
  Screen,
  SectionHeader,
  ShowcaseShimmer,
  Surface,
  UnderlineTabs,
  type FilterGroup,
} from '../ui';
import {
  catalogueLanes,
  curatedSuggestionPool,
  type CatalogueItem,
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
 * Explore Screen (matching CodecM `discover_page.dart` 1:1 in SIMBA Lion Gold & Brown).
 *
 * - Clean Top Bar: "Explore Media" + "Discover cinema, podcasts, music, and broadcasts." + FilterIconButton
 * - Unified 44dp Search Bar (12dp radius, 1px border) + Inline Autocomplete Panel with `↖` query-fill
 * - Horizontal Category Scope Chips (10dp radius, 1px border)
 * - 230dp Featured Showcase Card ("✓ Recommended" pill top-left, heart/follow top-right, title, creator, rating + duration + kind badge bottom)
 * - Handpicked Mixes entry banner -> `/curated-mixes`
 * - "Best experiences for you" section + 62x62 media row tiles with circular play buttons
 */
export function ExploreScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    dockVisible,
    recentSearches,
    commitSearchQuery,
    bookmarks,
    toggleBookmarkItem,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();
  const homeFeed = useHomeFeed();

  const livePool = useMemo(
    () => [
      ...homeFeed.movies,
      ...homeFeed.podcasts,
      ...homeFeed.music,
      ...homeFeed.radio,
    ],
    [homeFeed.movies, homeFeed.podcasts, homeFeed.music, homeFeed.radio],
  );

  useEffect(() => {
    if (livePool.length > 0) {
      registerLiveItems(livePool);
    }
  }, [livePool]);

  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({
    scope: ['all'],
    sort: ['popular'],
  });

  const activeLane = useMemo(
    () => catalogueLanes.find(l => l.id === selectedScope) ?? null,
    [selectedScope],
  );

  const showcaseItem: CatalogueItem | null = useMemo(() => {
    if (livePool.length === 0) {
      return null;
    }
    if (selectedScope === 'all') {
      return livePool[0] ?? null;
    }
    return livePool.find(i => i.catalogueLaneId === selectedScope) ?? livePool[0] ?? null;
  }, [selectedScope, livePool]);

  const isShowcaseBookmarked = useMemo(
    () => (showcaseItem ? bookmarks.some(b => b.itemId === showcaseItem.id) : false),
    [bookmarks, showcaseItem],
  );

  const inlineSuggestions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const recentRows =
      q.length === 0
        ? recentSearches.slice(0, 3).map(term => ({
            term,
            category: 'Recent',
            isHistory: true,
          }))
        : recentSearches
            .filter(r => r.toLowerCase().includes(q))
            .slice(0, 2)
            .map(term => ({
              term,
              category: 'Recent',
              isHistory: true,
            }));

    const poolRows = curatedSuggestionPool
      .filter(s => q.length === 0 || s.term.toLowerCase().includes(q))
      .filter(
        s => !recentRows.some(r => r.term.toLowerCase() === s.term.toLowerCase()),
      )
      .slice(0, 5)
      .map(s => ({
        term: s.term,
        category: s.category,
        isHistory: false,
      }));

    return [...recentRows, ...poolRows].slice(0, 6);
  }, [searchText, recentSearches]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = showcaseItem
      ? livePool.filter(i => i.id !== showcaseItem.id)
      : [...livePool];
    if (selectedScope !== 'all') {
      list = list.filter(i => i.catalogueLaneId === selectedScope);
    }
    if (q.length > 0) {
      list = list.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          (i.subtitle ?? '').toLowerCase().includes(q) ||
          (i.genre ?? '').toLowerCase().includes(q),
      );
    }
    const sortKey = filterValues.sort?.[0] ?? 'popular';
    if (sortKey === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortKey === 'az') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [selectedScope, searchText, filterValues.sort, showcaseItem, livePool]);

  const exploreFilterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'sort',
        title: 'Sort By',
        multiSelect: false,
        options: [
          {key: 'popular', label: 'Recommended'},
          {key: 'rating', label: 'Highest Rated'},
          {key: 'az', label: 'Title A–Z'},
        ],
      },
    ],
    [],
  );

  const activeFilterCount =
    (filterValues.sort?.[0] ?? 'popular') !== 'popular' ? 1 : 0;

  const handleCommitInlineSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) {
      return;
    }
    commitSearchQuery(clean);
    setSearchText(clean);
    setSearchFocused(false);
  };

  const handleFillQuery = (term: string) => {
    setSearchText(`${term} `);
    setSearchFocused(true);
  };

  const handlePlayItem = (item: CatalogueItem) => {
    void playCatalogueItem(item);
    router.push(item.lane === 'video' ? '/player/video' : '/player/audio');
  };

  const stickyHeader = (
    <View
      style={[
        styles.headerRow,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        },
      ]}>
      <View style={styles.headerCopy}>
        <AppText variant="h1">Explore</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          Cinema, sound &amp; stories to wander
        </AppText>
      </View>
      <FilterIconButton
        activeCount={activeFilterCount}
        onPress={() => setFilterVisible(true)}
      />
    </View>
  );

  return (
    <Screen scroll inTabs bottomInset={dockVisible ? 80 : 12} header={stickyHeader}>
      <View style={[styles.root, {paddingTop: spacing.sm}]}>

        {/* 2. Soft Tonal Search Field (no harsh outline box) */}
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
              value={searchText}
              onChangeText={text => {
                setSearchText(text);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onSubmitEditing={() => handleCommitInlineSearch(searchText)}
              placeholder="Search podcasts, movies, music, radio..."
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="search"
              style={[styles.searchInput, {color: colors.text.primary}]}
            />
            {searchText.length > 0 || searchFocused ? (
              <Pressable
                onPress={() => {
                  setSearchText('');
                  setSearchFocused(false);
                }}
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

        {/* 3. Editorial Underline Category Tabs (zero pill boxes) */}
        <View style={styles.chipsSection}>
          <UnderlineTabs
            scrollable
            paddingHorizontal={spacing.lg}
            activeKey={selectedScope}
            onChange={setSelectedScope}
            options={[
              {key: 'all', label: 'All'},
              ...catalogueLanes.map(lane => ({key: lane.id, label: lane.label})),
            ]}
          />
        </View>

        {/* Inline Autocomplete Suggestion Dropdown (CodecM _buildInlineSuggestionPanel) */}
        {searchFocused && inlineSuggestions.length > 0 ? (
          <View
            style={[
              styles.dropdownWrap,
              {paddingHorizontal: spacing.lg},
            ]}>
            <Surface tone="card" radius="md" style={styles.dropdownCard}>
              {inlineSuggestions.map((item, idx, arr) => (
                <View
                  key={`${item.isHistory ? 'h' : 's'}-${item.term}`}
                  style={[
                    styles.dropdownRow,
                    {
                      borderBottomWidth:
                        idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => handleCommitInlineSearch(item.term)}
                    accessibilityRole="button"
                    style={styles.dropdownLeft}>
                    <SimbaIcon
                      name={item.isHistory ? 'history' : 'magnify'}
                      size={17}
                      color={
                        item.isHistory
                          ? colors.text.secondary
                          : colors.accent.gold
                      }
                    />
                    <AppText
                      variant="body"
                      numberOfLines={1}
                      style={styles.dropdownTerm}>
                      {item.term}
                    </AppText>
                    <View
                      style={[
                        styles.dropdownCatPill,
                        {
                          backgroundColor: colors.background.surfaceSubtle,
                          borderRadius: radius.xs,
                        },
                      ]}>
                      <AppText variant="labelSmall" tone="tertiary">
                        {item.category}
                      </AppText>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleFillQuery(item.term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Fill search bar with ${item.term}`}
                    style={styles.queryFillBtn}>
                    <SimbaIcon
                      name="arrow-top-left"
                      size={17}
                      color={colors.text.tertiary}
                    />
                  </Pressable>
                </View>
              ))}
            </Surface>
          </View>
        ) : null}

        {/* Dedicated Catalogue Shortcut when a scope chip is selected */}
        {activeLane ? (
          <View
            style={[
              styles.sectionPad,
              {paddingHorizontal: spacing.lg},
            ]}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/catalogue/[lane]',
                  params: {lane: activeLane.id},
                })
              }
              accessibilityRole="button"
              style={({pressed}) => [
                styles.openCatalogueBar,
                {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                  paddingHorizontal: 2,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <View style={styles.openCatalogueLeft}>
                <SimbaIcon
                  name={activeLane.icon}
                  size={17}
                  color={colors.accent.gold}
                />
                <AppText variant="label" tone="gold">
                  {`Browse all ${activeLane.label}`}
                </AppText>
              </View>
              <SimbaIcon
                name="chevron-right"
                size={18}
                color={colors.accent.gold}
              />
            </Pressable>
          </View>
        ) : null}

        {/* 4. 230dp Featured Showcase Card (CodecM _buildShowcaseCard) */}
        {!showcaseItem ? (
          <ShowcaseShimmer />
        ) : (
        <View
          style={[
            styles.showcaseWrap,
            {paddingHorizontal: spacing.lg},
          ]}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/media/[id]',
                params: {id: showcaseItem.id},
              })
            }
            accessibilityRole="button"
            style={[
              styles.showcaseCard,
              {
                backgroundColor: colors.brand.primaryDark,
                borderRadius: radius.md,
                borderColor: colors.border.default,
                overflow: 'hidden',
              },
            ]}>
            {showcaseItem.artworkUrl ? (
              <>
                <MediaArtwork
                  uri={showcaseItem.artworkUrl}
                  icon={showcaseItem.icon}
                  iconSize={52}
                  borderRadius={radius.md}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {backgroundColor: colors.background.scrim},
                  ]}
                />
              </>
            ) : null}
            {/* Top Row: "✓ Recommended" pill left + Heart button right */}
            <View style={styles.showcaseTopRow}>
              <View
                style={[
                  styles.recommendedPill,
                  {
                    backgroundColor: colors.background.surface,
                    borderRadius: radius.xs + 2,
                  },
                ]}>
                <SimbaIcon
                  name="check-circle"
                  size={13}
                  color={colors.accent.gold}
                />
                <AppText variant="labelSmall" tone="gold">
                  Recommended
                </AppText>
              </View>

              <Pressable
                onPress={() => toggleBookmarkItem(showcaseItem)}
                accessibilityRole="button"
                accessibilityLabel="Bookmark featured pick"
                style={[
                  styles.showcaseHeartBtn,
                  {
                    backgroundColor: colors.background.onMediaPill,
                    borderRadius: radius.full,
                  },
                ]}>
                <SimbaIcon
                  name={isShowcaseBookmarked ? 'heart' : 'heart-outline'}
                  size={17}
                  color={
                    isShowcaseBookmarked
                      ? colors.semantic.error
                      : colors.text.bright
                  }
                />
              </Pressable>
            </View>

            {/* Center watermark icon */}
            <View style={styles.showcaseWatermark} pointerEvents="none">
              <SimbaIcon
                name={showcaseItem.icon}
                size={52}
                color={colors.brand.primaryLight}
              />
            </View>

            {/* Bottom Metadata & Kind Badge */}
            <View style={styles.showcaseBottom}>
              <AppText variant="h2" tone="bright" numberOfLines={1}>
                {showcaseItem.title}
              </AppText>
              <AppText variant="caption" tone="mutedOnMedia" numberOfLines={1}>
                {showcaseItem.subtitle}
              </AppText>

              <View style={styles.showcaseMetaRow}>
                <SimbaIcon
                  name="star"
                  size={14}
                  color={colors.accent.amber}
                />
                <AppText variant="labelSmall" tone="bright">
                  {`${(showcaseItem.rating ?? 4.9).toFixed(1)} (1,420)`}
                </AppText>
                <SimbaIcon
                  name="clock-outline"
                  size={12}
                  color={colors.text.onMediaMuted}
                />
                <AppText variant="caption" tone="mutedOnMedia">
                  {formatDurationShort(showcaseItem.durationSeconds)}
                </AppText>
                <View style={styles.spacer} />
                <Pressable
                  onPress={() => handlePlayItem(showcaseItem)}
                  accessibilityRole="button"
                  style={[
                    styles.showcaseKindPill,
                    {
                      backgroundColor: colors.brand.primary,
                      borderRadius: radius.xs + 2,
                    },
                  ]}>
                  <SimbaIcon
                    name="play"
                    size={13}
                    color={colors.brand.onPrimary}
                  />
                  <AppText
                    variant="labelSmall"
                    style={{color: colors.brand.onPrimary}}>
                    {MEDIA_KIND_LABELS[showcaseItem.kind]}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
        )}

        {/* 5. Canvas-Merged Handpicked Mixes Row -> /curated-mixes */}
        <View
          style={[
            styles.mixBannerWrap,
            {paddingHorizontal: spacing.lg},
          ]}>
          <Pressable
            onPress={() => router.push('/curated-mixes')}
            accessibilityRole="button"
            style={({pressed}) => [
              styles.mixBannerCard,
              {
                paddingHorizontal: 0,
                paddingVertical: 14,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border.subtle,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <View
              style={[
                styles.mixBannerIconBox,
                {
                  backgroundColor: colors.brand.primaryContainer,
                  borderRadius: radius.full,
                },
              ]}>
              <SimbaIcon
                name="creation"
                size={19}
                color={colors.brand.onPrimaryContainer}
              />
            </View>
            <View style={styles.mixBannerCopy}>
              <AppText variant="title">Handpicked Mixes</AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                Daily playlists gathered for every mood
              </AppText>
            </View>
            <SimbaIcon
              name="chevron-right"
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        </View>

        {/* 6. "Best experiences for you" Section (CodecM DiscoverPage) */}
        <SectionHeader
          title="Worth a listen & watch"
          action="View all"
          onAction={() => router.push('/search')}
        />

        <View
          style={[
            styles.experienceList,
            {paddingHorizontal: spacing.lg},
          ]}>
          {filteredItems.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({pathname: '/media/[id]', params: {id: item.id}})
              }
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              style={({pressed}) => [
                styles.experienceTile,
                {
                  borderBottomWidth:
                    idx === filteredItems.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <View
                style={[
                  styles.experienceArt,
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

              <View style={styles.experienceCopy}>
                <AppText variant="title" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {`${item.subtitle || MEDIA_KIND_LABELS[item.kind]} • ${MEDIA_KIND_LABELS[item.kind]}`}
                </AppText>
                <View style={styles.experienceMetaRow}>
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
                  styles.experiencePlayBtn,
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

          <View style={styles.footerWrap}>
            <AppText variant="caption" tone="tertiary">
              {"You're all caught up."}
            </AppText>
          </View>
        </View>

        <FilterSheet
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          title="Sort Explore"
          subtitle="Choose how to sort your feed"
          groups={exploreFilterGroups}
          values={{
            sort: filterValues.sort ?? ['popular'],
          }}
          onChange={(groupId, nextKeys) => {
            setFilterValues(prev => ({...prev, [groupId]: nextKeys}));
          }}
          onReset={() => {
            setFilterValues({sort: ['popular']});
          }}
        />
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
    gap: 12,
  },
  headerCopy: {flex: 1, gap: 2},
  searchBox: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  chipsSection: {
    marginTop: 12,
  },
  dropdownWrap: {
    marginTop: 10,
  },
  dropdownCard: {
    paddingVertical: 2,
  },
  dropdownRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownTerm: {flex: 1},
  dropdownCatPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  queryFillBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionPad: {
    marginTop: 12,
  },
  openCatalogueBar: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openCatalogueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showcaseWrap: {
    marginTop: 14,
  },
  showcaseCard: {
    height: 224,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  showcaseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendedPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showcaseHeartBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseWatermark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseBottom: {
    gap: 3,
  },
  showcaseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  spacer: {flex: 1},
  showcaseKindPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mixBannerWrap: {
    marginTop: 14,
  },
  mixBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  mixBannerIconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixBannerCopy: {
    flex: 1,
    gap: 2,
  },
  experienceList: {
    gap: 0,
  },
  experienceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  experienceArt: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceCopy: {
    flex: 1,
    gap: 3,
  },
  experienceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  experiencePlayBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
