import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  getLiveItemById,
  getSmartResumeSeconds,
  reconstructItemFromBookmark,
  registerLiveItem,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Chip,
  IconButton,
  MediaArtwork,
  Rail,
  Screen,
} from '../ui';
import {MEDIA_KIND_LABELS, type MediaKind} from '../../types/media';

const BOOKMARK_FILTER_ORDER: {key: string; label: string; kinds: MediaKind[]}[] = [
  {key: 'movie', label: 'Movies', kinds: ['movie']},
  {key: 'music', label: 'Music', kinds: ['music', 'audio']},
  {key: 'audiobook', label: 'Audiobooks', kinds: ['audiobook']},
  {key: 'podcast', label: 'Podcasts', kinds: ['podcast']},
  {key: 'archive', label: 'Archive', kinds: ['archive-audio', 'archive-video']},
  {key: 'video', label: 'Video', kinds: ['video']},
];

export interface SavedScreenProps {
  initialTab?: 'bookmarks' | 'history';
}

/**
 * SAVED — Segmented Saved Bookmarks & Playback History (Penpot 07.2 + CodecM SavedPage).
 */
export function SavedScreen({initialTab = 'bookmarks'}: SavedScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    bookmarks,
    removeBookmark,
    clearBookmarks,
    history,
    removeHistoryItem,
    clearHistory,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();

  const tab = initialTab;
  const isBookmarks = tab === 'bookmarks';
  const [bmFilter, setBmFilter] = useState<string>('all');

  const resolvedBookmarks = useMemo(
    () =>
      bookmarks.map(bm => {
        const resolvedItem =
          bm.item ??
          getLiveItemById(bm.itemId) ??
          history.find(h => h.id === bm.itemId) ??
          reconstructItemFromBookmark(bm);
        return {bm, resolvedItem};
      }),
    [bookmarks, history],
  );

  const activeBookmarkChips = useMemo(() => {
    const chips: {key: string; label: string}[] = [
      {key: 'all', label: `All (${resolvedBookmarks.length})`},
    ];
    for (const def of BOOKMARK_FILTER_ORDER) {
      const count = resolvedBookmarks.filter(entry =>
        def.kinds.includes(entry.resolvedItem.kind),
      ).length;
      if (count > 0) {
        chips.push({key: def.key, label: `${def.label} (${count})`});
      }
    }
    return chips;
  }, [resolvedBookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (bmFilter === 'all') {
      return resolvedBookmarks;
    }
    const def = BOOKMARK_FILTER_ORDER.find(d => d.key === bmFilter);
    if (!def) {
      return resolvedBookmarks;
    }
    return resolvedBookmarks.filter(entry =>
      def.kinds.includes(entry.resolvedItem.kind),
    );
  }, [resolvedBookmarks, bmFilter]);

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
      <IconButton
        name="arrow-left"
        onPress={() => router.back()}
        accessibilityLabel="Back"
      />
      <View style={styles.titleCol}>
        <AppText variant="h2">
          {isBookmarks ? 'Bookmarks' : 'Playback History'}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {isBookmarks
            ? `${bookmarks.length} ${bookmarks.length === 1 ? 'moment' : 'moments'} saved`
            : `${history.length} recently played`}
        </AppText>
      </View>
      <Pressable
        onPress={() =>
          isBookmarks ? clearBookmarks() : clearHistory()
        }
        accessibilityRole="button">
        <AppText variant="labelSmall" tone="gold">
          Clear All
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <Screen scroll header={stickyHeader}>
      <View
        style={[
          styles.container,
          {padding: spacing.lg, paddingBottom: spacing.lg},
        ]}>

        {/* TAB 1: Bookmarks */}
        {tab === 'bookmarks' ? (
          <View style={[styles.list, {gap: 12}]}>
            {resolvedBookmarks.length > 0 && activeBookmarkChips.length > 2 ? (
              <Rail gap={8} padding={0}>
                {activeBookmarkChips.map(ch => (
                  <Chip
                    key={ch.key}
                    label={ch.label}
                    selected={bmFilter === ch.key}
                    onPress={() => setBmFilter(ch.key)}
                  />
                ))}
              </Rail>
            ) : null}
            <View style={[styles.list, {gap: 0}]}>
            {filteredBookmarks.length === 0 ? (
              <View style={styles.emptyBox}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="bookmark-outline"
                    size={28}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <AppText variant="h3" style={{textAlign: 'center'}}>
                  No bookmarks yet
                </AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={{textAlign: 'center', maxWidth: 280}}>
                  Tap the bookmark icon inside the audio or video player to save exact timestamps.
                </AppText>
              </View>
            ) : (
              filteredBookmarks.map(({bm, resolvedItem}, idx) => {
                const kindBadgeLabel =
                  MEDIA_KIND_LABELS[resolvedItem.kind] ?? 'Media';
                return (
                <View
                  key={bm.id}
                  style={[
                    styles.rowCard,
                    {
                      paddingHorizontal: 0,
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === filteredBookmarks.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => {
                      registerLiveItem(resolvedItem);
                      void playCatalogueItem(resolvedItem, {
                        startPositionSeconds: bm.positionSeconds ?? 0,
                      });
                      router.push(
                        resolvedItem.lane === 'video'
                          ? '/player/video'
                          : '/player/audio',
                      );
                    }}
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.brand.primaryContainer,
                          borderRadius: radius.md,
                          overflow: 'hidden',
                        },
                      ]}>
                      <MediaArtwork
                        uri={resolvedItem.artworkUrl}
                        icon="bookmark-check"
                        iconSize={20}
                        iconColor={colors.brand.onPrimaryContainer}
                        borderRadius={radius.md}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.badgeRow}>
                        <Badge label={kindBadgeLabel} tone="gold" />
                        <Badge
                          label={
                            bm.durationLabel
                              ? `${bm.positionLabel} / ${bm.durationLabel}`
                              : bm.positionLabel
                          }
                        />
                      </View>
                      <AppText variant="title" numberOfLines={1}>
                        {bm.label}
                      </AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={2}>
                        {bm.note}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    name="delete-outline"
                    size={18}
                    onPress={() => removeBookmark(bm.id)}
                    accessibilityLabel={`Delete bookmark ${bm.label}`}
                  />
                </View>
                );
              })
            )}
            </View>
          </View>
        ) : (
          /* TAB 2: Playback History */
          <View style={[styles.list, {gap: 0}]}>
            {history.length === 0 ? (
              <View style={styles.emptyBox}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="history"
                    size={28}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <AppText variant="h3" style={{textAlign: 'center'}}>
                  Playback history is clear
                </AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={{textAlign: 'center', maxWidth: 280}}>
                  Media you watch or listen to will appear here with resume progress.
                </AppText>
              </View>
            ) : (
              history.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.rowCard,
                    {
                      paddingHorizontal: 0,
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === history.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => {
                      void playCatalogueItem(item, {
                        startPositionSeconds: getSmartResumeSeconds(item),
                      });
                      router.push(
                        item.lane === 'video'
                          ? '/player/video'
                          : '/player/audio',
                      );
                    }}
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.accent.goldWash,
                          borderRadius: radius.md,
                          overflow: 'hidden',
                        },
                      ]}>
                      <MediaArtwork
                        uri={item.artworkUrl}
                        icon={item.icon}
                        iconSize={22}
                        iconColor={colors.accent.gold}
                        borderRadius={radius.md}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.badgeRow}>
                        <Badge
                          label={MEDIA_KIND_LABELS[item.kind]}
                          tone="gold"
                        />
                        {item.kind === 'live-tv' || item.kind === 'radio' ? (
                          <Badge label="LIVE" />
                        ) : item.completed ? (
                          <Badge label="Completed" />
                        ) : item.elapsedTotalLabel ? (
                          <Badge label={item.elapsedTotalLabel} />
                        ) : null}
                      </View>
                      <AppText variant="title" numberOfLines={1}>
                        {item.title}
                      </AppText>
                      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                        {item.subtitle || MEDIA_KIND_LABELS[item.kind]}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    name="close"
                    size={18}
                    onPress={() => removeHistoryItem(item.id)}
                    accessibilityLabel={`Remove ${item.title} from history`}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 16},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {flex: 1, gap: 2},
  segmentBar: {
    flexDirection: 'row',
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {gap: 12},
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {flex: 1, gap: 3},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
