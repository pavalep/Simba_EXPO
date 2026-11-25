import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useUniversalSearch} from '../../hooks/useUniversalSearch';
import {
  registerLiveItems,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Button,
  CatalogueListShimmer,
  Chip,
  FilterIconButton,
  FilterSheet,
  MediaArtwork,
  Rail,
  Screen,
  Surface,
  UnderlineTabs,
  type FilterGroup,
} from '../ui';
import {
  catalogueLanes,
  curatedSuggestionPool,
  relatedSearchChips,
  searchScopes,
  type CatalogueItem,
  type LocalFileRecord,
  type SearchScope,
} from '../../data/dummy';
import {MEDIA_KIND_LABELS} from '../../types/media';

type SearchUiState = 'zero' | 'typing' | 'results';

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
 * 3-State Universal Search (matching CodecM `search_page.dart` 1:1 in SIMBA Lion Gold & Brown).
 *
 * State 1 — Zero-State:
 *   - Recent searches card (history icon + term + `↖` fill + `×` delete) + "Clear all"
 *   - Suggested searches card ("Based on your taste", search icon + term + category pill + `↖` fill)
 *   - Browse by Category grid
 * State 2 — Active Typing Autocomplete:
 *   - Instant suggestions with history/search icons, category pill, and `↖` query-fill button
 * State 3 — Committed Results:
 *   - Related searches horizontal chip strip
 *   - Clean 60x60 media result tiles with rating, duration, heart bookmark, and circular play button
 */
export interface SearchScreenProps {
  initialQuery?: string;
}

export function SearchScreen(props: SearchScreenProps = {}) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{q?: string; scope?: string}>();

  const {
    recentSearches,
    commitSearchQuery,
    deleteRecentSearch,
    clearRecentSearches,
    bookmarks,
    toggleBookmarkItem,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();

  const initialQuery =
    props.initialQuery ?? (typeof params.q === 'string' ? params.q : '');
  const initialScope = (
    typeof params.scope === 'string' ? params.scope : 'all'
  ) as SearchScope;

  const [query, setQuery] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [uiState, setUiState] = useState<SearchUiState>(
    initialQuery.trim().length > 0 ? 'results' : 'zero',
  );
  const [selectedScope, setSelectedScope] = useState<SearchScope>(initialScope);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({
    scope: [initialScope],
    sort: ['relevance'],
  });

  const handleTextChange = (text: string) => {
    setQuery(text);
    if (text.trim().length === 0) {
      setUiState('zero');
    } else {
      setUiState('typing');
    }
  };

  const handleCommit = (term?: string) => {
    const target = (term ?? query).trim();
    if (!target) {
      setUiState('zero');
      return;
    }
    commitSearchQuery(target);
    setQuery(target);
    setCommittedQuery(target);
    setUiState('results');
  };

  const handleFill = (term: string) => {
    setQuery(`${term} `);
    setUiState('typing');
  };

  const handleClearInput = () => {
    setQuery('');
    setCommittedQuery('');
    setUiState('zero');
  };

  const typingSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    const historyMatches = recentSearches
      .filter(r => r.toLowerCase().includes(q))
      .map(term => ({
        term,
        category: 'Recent',
        isHistory: true,
      }));

    const poolMatches = curatedSuggestionPool
      .filter(
        s =>
          s.term.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      )
      .filter(
        s =>
          !historyMatches.some(
            h => h.term.toLowerCase() === s.term.toLowerCase(),
          ),
      )
      .map(s => ({
        term: s.term,
        category: s.category,
        isHistory: false,
      }));

    const combined = [...historyMatches, ...poolMatches];
    if (combined.length === 0) {
      return curatedSuggestionPool.slice(0, 5).map(s => ({
        term: s.term,
        category: s.category,
        isHistory: false,
      }));
    }
    return combined.slice(0, 7);
  }, [query, recentSearches]);

  const relatedChips = useMemo(() => {
    const q = committedQuery.toLowerCase();
    if (q.includes('charade') || q.includes('movie') || q.includes('noir')) {
      return relatedSearchChips.charade;
    }
    if (q.includes('jazz') || q.includes('blue') || q.includes('music')) {
      return relatedSearchChips.jazz;
    }
    return relatedSearchChips.default;
  }, [committedQuery]);

  const sortKey = filterValues.sort?.[0] ?? 'relevance';
  const liveSearch = useUniversalSearch({
    query: committedQuery,
    scope: selectedScope,
    sortKey,
    enabled: uiState === 'results' && committedQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (liveSearch.items.length > 0) {
      registerLiveItems(liveSearch.items);
    }
  }, [liveSearch.items]);

  const results = liveSearch.items;
  const localMatches: LocalFileRecord[] = [];

  const searchFilterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'scope',
        title: 'Category',
        multiSelect: false,
        options: searchScopes.map(s => ({key: s.id, label: s.label})),
      },
      {
        id: 'sort',
        title: 'Sort By',
        multiSelect: false,
        options: [
          {key: 'relevance', label: 'Most Relevant'},
          {key: 'rating', label: 'Highest Rated'},
          {key: 'az', label: 'A to Z'},
        ],
      },
    ],
    [],
  );

  const activeFilterCount =
    (selectedScope !== 'all' ? 1 : 0) +
    ((filterValues.sort?.[0] ?? 'relevance') !== 'relevance' ? 1 : 0);

  const handlePlayItem = (item: CatalogueItem) => {
    void playCatalogueItem(item);
    router.push(item.lane === 'video' ? '/player/video' : '/player/audio');
  };

  const stickyHeader = (
    <View
      style={[
        styles.topBar,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 2,
          paddingBottom: spacing.sm,
        },
      ]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={6}
        style={({pressed}) => [
          styles.backBtn,
          {
            backgroundColor: pressed
              ? colors.background.surfaceSubtle
              : 'transparent',
            borderRadius: radius.full,
            borderWidth: 0,
          },
        ]}>
        <SimbaIcon
          name="arrow-left"
          size={21}
          color={colors.text.primary}
        />
      </Pressable>
      <AppText variant="h1" style={styles.topTitle}>
        Find
      </AppText>
      <FilterIconButton
        activeCount={activeFilterCount}
        onPress={() => setFilterVisible(true)}
      />
    </View>
  );

  return (
    <Screen scroll bottomInset={16} header={stickyHeader}>
      <View style={[styles.container, {paddingHorizontal: spacing.lg, paddingTop: spacing.sm}]}>

        {/* 2. Soft Tonal Search Field (no harsh outline box) */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.background.surfaceSubtle,
              borderRadius: radius.pill,
              borderColor:
                uiState === 'typing'
                  ? colors.brand.primary
                  : 'transparent',
            },
          ]}>
          <SimbaIcon
            name="magnify"
            size={20}
            color={colors.accent.gold}
          />
          <TextInput
            value={query}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleCommit()}
            placeholder="Search movies, podcasts, music, radio..."
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            style={[styles.input, {color: colors.text.primary}]}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={handleClearInput}
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
              hitSlop={8}>
              <SimbaIcon
                name="close-circle"
                size={18}
                color={colors.text.secondary}
              />
            </Pressable>
          ) : null}
        </View>

        {/* ── STATE 1: ZERO-STATE (Canvas-merged, zero boxy cards) ── */}
        {uiState === 'zero' ? (
          <>
            {recentSearches.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.rowHeader}>
                  <AppText variant="h3">Recent</AppText>
                  <Pressable
                    onPress={clearRecentSearches}
                    accessibilityRole="button"
                    hitSlop={8}>
                    <AppText variant="label" tone="gold">
                      Clear all
                    </AppText>
                  </Pressable>
                </View>

                <View style={styles.sugListPlain}>
                  {recentSearches.map((term, idx, arr) => (
                    <View
                      key={term}
                      style={[
                        styles.sugRow,
                        {
                          borderBottomWidth:
                            idx === arr.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border.subtle,
                        },
                      ]}>
                      <Pressable
                        onPress={() => handleCommit(term)}
                        accessibilityRole="button"
                        style={styles.sugLeft}>
                        <SimbaIcon
                          name="history"
                          size={18}
                          color={colors.text.secondary}
                        />
                        <AppText
                          variant="body"
                          numberOfLines={1}
                          style={styles.sugText}>
                          {term}
                        </AppText>
                      </Pressable>

                      <View style={styles.sugRightActions}>
                        <Pressable
                          onPress={() => handleFill(term)}
                          accessibilityRole="button"
                          accessibilityLabel={`Fill search bar with ${term}`}
                          style={styles.smallTap}>
                          <SimbaIcon
                            name="arrow-top-left"
                            size={17}
                            color={colors.text.tertiary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => deleteRecentSearch(term)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${term}`}
                          style={styles.smallTap}>
                          <SimbaIcon
                            name="close"
                            size={17}
                            color={colors.text.tertiary}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <View style={styles.rowHeader}>
                <AppText variant="h3">Ideas to wander</AppText>
              </View>
              <View style={styles.sugListPlain}>
                {curatedSuggestionPool.slice(0, 6).map((sug, idx, arr) => (
                  <View
                    key={sug.term}
                    style={[
                      styles.sugRow,
                      {
                        borderBottomWidth:
                          idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border.subtle,
                      },
                    ]}>
                    <Pressable
                      onPress={() => handleCommit(sug.term)}
                      accessibilityRole="button"
                      style={styles.sugLeft}>
                      <SimbaIcon
                        name="magnify"
                        size={17}
                        color={colors.accent.gold}
                      />
                      <AppText
                        variant="body"
                        numberOfLines={1}
                        style={styles.sugText}>
                        {sug.term}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {sug.category}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleFill(sug.term)}
                      accessibilityRole="button"
                      style={styles.smallTap}>
                      <SimbaIcon
                        name="arrow-top-left"
                        size={17}
                        color={colors.text.tertiary}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

          </>
        ) : null}

        {/* ── STATE 2: ACTIVE TYPING AUTOCOMPLETE (CodecM _buildTypingAutocompleteView) ── */}
        {uiState === 'typing' ? (
          <View style={styles.sectionBlock}>
            <Pressable
              onPress={() => handleCommit()}
              accessibilityRole="button"
              style={[
                styles.directCommitRow,
                {
                  backgroundColor: colors.brand.primaryContainer,
                  borderRadius: radius.sm + 2,
                },
              ]}>
              <SimbaIcon
                name="magnify"
                size={19}
                color={colors.brand.onPrimaryContainer}
              />
              <AppText
                variant="label"
                style={{color: colors.brand.onPrimaryContainer}}>
                {`Search for "${query.trim()}"`}
              </AppText>
            </Pressable>

            <View style={styles.sugListPlain}>
              {typingSuggestions.map((item, idx, arr) => (
                <View
                  key={`${item.isHistory ? 'h' : 's'}-${item.term}`}
                  style={[
                    styles.sugRow,
                    {
                      borderBottomWidth:
                        idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => handleCommit(item.term)}
                    accessibilityRole="button"
                    style={styles.sugLeft}>
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
                      style={styles.sugText}>
                      {item.term}
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      {item.category}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleFill(item.term)}
                    accessibilityRole="button"
                    accessibilityLabel={`Fill search input ${item.term}`}
                    style={styles.smallTap}>
                    <SimbaIcon
                      name="arrow-top-left"
                      size={17}
                      color={colors.text.tertiary}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── STATE 3: COMMITTED RESULTS + RELATED CHIPS (CodecM _buildCommittedResultsView) ── */}
        {uiState === 'results' ? (
          <>
            <View style={styles.sectionBlock}>
              <AppText variant="caption" tone="secondary">
                Related searches
              </AppText>
              <Rail gap={8} padding={0}>
                {relatedChips.map(chip => (
                  <Pressable
                    key={chip}
                    onPress={() => handleCommit(chip)}
                    accessibilityRole="button"
                    style={[
                      styles.relatedChip,
                      {
                        backgroundColor: colors.background.surface,
                        borderRadius: radius.sm,
                        borderColor: colors.border.default,
                      },
                    ]}>
                    <SimbaIcon
                      name="magnify"
                      size={14}
                      color={colors.accent.gold}
                    />
                    <AppText variant="labelSmall">{chip}</AppText>
                  </Pressable>
                ))}
              </Rail>
            </View>

            <View style={styles.resultsHeadRow}>
              <AppText variant="h3">{`Results for "${committedQuery}"`}</AppText>
              <AppText variant="caption" tone="secondary">
                {liveSearch.isLoading && results.length === 0
                  ? 'Searching…'
                  : `${results.length + localMatches.length} items`}
              </AppText>
            </View>

            {liveSearch.isLoading && results.length === 0 ? (
              <CatalogueListShimmer count={5} />
            ) : null}

            <View style={styles.resultsList}>
              {results.map((item, idx) => {
                const isSaved = bookmarks.some(b => b.itemId === item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      router.push({
                        pathname: '/media/[id]',
                        params: {id: item.id},
                      })
                    }
                    accessibilityRole="button"
                    style={({pressed}) => [
                      styles.resultTile,
                      {
                        borderBottomWidth:
                          idx === results.length - 1
                            ? 0
                            : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border.subtle,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}>
                    <View
                      style={[
                        styles.resultArt,
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

                    <View style={styles.resultCopy}>
                      <AppText variant="title" numberOfLines={1}>
                        {item.title}
                      </AppText>
                      <AppText
                        variant="caption"
                        tone="secondary"
                        numberOfLines={1}>
                        {`${item.subtitle || MEDIA_KIND_LABELS[item.kind]} • ${MEDIA_KIND_LABELS[item.kind]}`}
                      </AppText>
                      <View style={styles.resultMetaRow}>
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

                    <View style={styles.resultRightActions}>
                      <Pressable
                        onPress={() => toggleBookmarkItem(item)}
                        accessibilityRole="button"
                        style={styles.smallTap}>
                        <SimbaIcon
                          name={isSaved ? 'heart' : 'heart-outline'}
                          size={19}
                          color={
                            isSaved
                              ? colors.semantic.error
                              : colors.text.tertiary
                          }
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handlePlayItem(item)}
                        accessibilityRole="button"
                        style={[
                          styles.resultPlayCircle,
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
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* On-Device Local Matches */}
            {localMatches.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.rowHeader}>
                  <AppText variant="h3">On Your Device</AppText>
                  <Pressable
                    onPress={() => router.push('/library?tab=local')}
                    accessibilityRole="button">
                    <AppText variant="label" tone="gold">
                      Device Files
                    </AppText>
                  </Pressable>
                </View>

                <View style={styles.resultsList}>
                  {localMatches.map(lf => (
                    <Surface
                      key={lf.id}
                      tone="card"
                      radius="md"
                      style={styles.localFileRow}>
                      <View
                        style={[
                          styles.localIconBox,
                          {
                            backgroundColor: colors.brand.primaryContainer,
                            borderRadius: radius.sm,
                          },
                        ]}>
                        <SimbaIcon
                          name={
                            lf.lane === 'video' ? 'file-video' : 'file-music'
                          }
                          size={22}
                          color={colors.brand.onPrimaryContainer}
                        />
                      </View>
                      <View style={styles.localFileCopy}>
                        <AppText variant="title" numberOfLines={1}>
                          {lf.title}
                        </AppText>
                        <AppText
                          variant="caption"
                          tone="secondary"
                          numberOfLines={1}>
                          {`${lf.artist} • ${lf.durationLabel}`}
                        </AppText>
                      </View>
                      <Badge label={lf.formatBadge} tone="gold" />
                    </Surface>
                  ))}
                </View>
              </View>
            ) : null}

            {results.length === 0 && localMatches.length === 0 ? (
              <View style={styles.emptyBox}>
                <SimbaIcon
                  name="magnify-close"
                  size={34}
                  color={colors.accent.gold}
                />
                <AppText variant="title">No matches found</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Try another keyword or reset your active filters.
                </AppText>
                <Button
                  label="Reset Search"
                  variant="secondary"
                  onPress={handleClearInput}
                />
              </View>
            ) : null}
          </>
        ) : null}

        <FilterSheet
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          title="Refine Search"
          subtitle="Narrow by category or sort order"
          groups={searchFilterGroups}
          values={{
            scope: [selectedScope],
            sort: filterValues.sort ?? ['relevance'],
          }}
          onChange={(groupId, nextKeys) => {
            if (groupId === 'scope') {
              setSelectedScope((nextKeys[0] ?? 'all') as SearchScope);
            }
            setFilterValues(prev => ({...prev, [groupId]: nextKeys}));
          }}
          onReset={() => {
            setSelectedScope('all');
            setFilterValues({scope: ['all'], sort: ['relevance']});
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 12},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {flex: 1},
  searchBox: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  sectionBlock: {gap: 8, marginTop: 4},
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sugListPlain: {paddingVertical: 0},
  sugRow: {
    minHeight: 48,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sugLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sugText: {flex: 1},
  catTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sugRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallTap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  browseGridCell: {width: '48%'},
  browseCard: {
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directCommitRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relatedChip: {
    height: 34,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultsHeadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  resultsList: {gap: 0},
  resultTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  resultArt: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: {
    flex: 1,
    gap: 3,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  resultRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultPlayCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  localIconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localFileCopy: {flex: 1, gap: 2},
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
});
