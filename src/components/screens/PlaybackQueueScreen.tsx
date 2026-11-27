import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useSimbaPlayback} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  IconButton,
  MediaArtwork,
  Screen,
  Surface,
} from '../ui';
import {MEDIA_KIND_LABELS} from '../../types/media';

/**
 * PLAYBACK QUEUE — Active Run, Reorder, Shuffle/Clear, Undo Toast & Previously Played
 * (Penpot 06.7 + CodecM PlaybackQueuePage + SIMBA QueueScreen).
 */
export function PlaybackQueueScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    nowPlaying,
    isPlaying: storeIsPlaying,
    togglePlay: storeTogglePlay,
    queue,
    history,
    undoMessage,
    removeFromQueue,
    moveQueueItem,
    shuffleQueue,
    clearQueue,
    undoQueueAction,
    dismissUndo,
  } = useSimbaStore();
  const {mpvState, commands, playCatalogueItem} = useSimbaPlayback();
  const isPlaying =
    mpvState.isPlaying || mpvState.isLoading
      ? mpvState.isPlaying
      : storeIsPlaying;
  const togglePlay = () => {
    if (nowPlaying?.streamUrl || mpvState.isPlaying || mpvState.isLoading) {
      commands.togglePlayPause();
    } else if (nowPlaying) {
      void playCatalogueItem(nowPlaying);
    } else {
      storeTogglePlay();
    }
  };
  const playItem = (item: Parameters<typeof playCatalogueItem>[0]) => {
    void playCatalogueItem(item);
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
      <IconButton
        name="arrow-left"
        onPress={() => router.back()}
        accessibilityLabel="Back"
      />
      <View style={styles.topTitleCol}>
        <AppText variant="h2">Playback Queue</AppText>
        <AppText variant="caption" tone="secondary">
          {`${queue.length} upcoming · Tap to jump in-place`}
        </AppText>
      </View>
      <Pressable
        onPress={shuffleQueue}
        accessibilityRole="button"
        style={[
          styles.headerActionPill,
          {
            backgroundColor: colors.brand.primaryContainer,
            borderRadius: radius.pill,
          },
        ]}>
        <SimbaIcon
          name="shuffle-variant"
          size={15}
          color={colors.brand.onPrimaryContainer}
        />
        <AppText
          variant="labelSmall"
          style={{color: colors.brand.onPrimaryContainer}}>
          Shuffle
        </AppText>
      </Pressable>
      <Pressable
        onPress={clearQueue}
        accessibilityRole="button"
        style={[
          styles.headerActionPill,
          {
            backgroundColor: colors.background.surfaceSubtle,
            borderRadius: radius.pill,
          },
        ]}>
        <AppText variant="labelSmall" tone="secondary">
          Clear
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

        {/* 2. Undo Toast Banner (Penpot 06.7) */}
        {undoMessage ? (
          <Surface tone="goldWash" radius="md" style={styles.undoBanner}>
            <SimbaIcon
              name="playlist-check"
              size={20}
              color={colors.accent.gold}
            />
            <AppText
              variant="labelSmall"
              style={{color: colors.brand.onPrimaryContainer, flex: 1}}
              numberOfLines={1}>
              {undoMessage}
            </AppText>
            <Pressable
              onPress={undoQueueAction}
              accessibilityRole="button"
              style={[
                styles.undoBtn,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.pill,
                },
              ]}>
              <AppText
                variant="labelSmall"
                style={{color: colors.brand.onPrimary}}>
                Undo
              </AppText>
            </Pressable>
            <Pressable
              onPress={dismissUndo}
              accessibilityRole="button"
              style={styles.dismissBtn}>
              <SimbaIcon
                name="close"
                size={16}
                color={colors.brand.onPrimaryContainer}
              />
            </Pressable>
          </Surface>
        ) : null}

        {/* 3. Now Playing Section */}
        {nowPlaying ? (
        <View style={styles.sectionBlock}>
          <AppText variant="overline" tone="gold">
            NOW PLAYING
          </AppText>
          <Surface tone="card" radius="lg" style={styles.nowPlayingCard}>
            <View
              style={[
                styles.nowArt,
                {
                  backgroundColor: colors.brand.primaryDark,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                },
              ]}>
              <MediaArtwork
                uri={nowPlaying.artworkUrl}
                icon={nowPlaying.icon}
                iconSize={26}
                iconColor={colors.accent.gold}
                borderRadius={radius.md}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.rowCopy}>
              <View style={styles.badgeRow}>
                <Badge
                  label={nowPlaying.lane === 'video' ? 'VIDEO' : 'AUDIO'}
                  tone="gold"
                />
                <Badge label={MEDIA_KIND_LABELS[nowPlaying.kind]} />
              </View>
              <AppText variant="title" numberOfLines={1}>
                {nowPlaying.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {nowPlaying.subtitle || MEDIA_KIND_LABELS[nowPlaying.kind]}
              </AppText>
            </View>
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              style={[
                styles.playCircle,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}>
              <SimbaIcon
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={colors.brand.onPrimary}
              />
            </Pressable>
          </Surface>
        </View>
        ) : null}

        {/* 4. Up Next Reorderable Queue (Penpot 06.7) */}
        <View style={styles.sectionBlock}>
          <AppText variant="overline" tone="gold">
            {`UP NEXT (${queue.length})`}
          </AppText>
          {queue.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppText variant="bodySmall" tone="secondary">
                Queue is empty. Tap any item below or in Explore to queue it.
              </AppText>
            </View>
          ) : (
            queue.map((item, idx) => (
              <View
                key={`${item.id}-${idx}`}
                style={[
                  styles.queueRow,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth:
                      idx === queue.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                  },
                ]}>
                <SimbaIcon
                  name="drag-horizontal-variant"
                  size={20}
                  color={colors.text.tertiary}
                />
                <Pressable
                  onPress={() => playItem(item)}
                  accessibilityRole="button"
                  style={styles.rowCopy}>
                  <AppText variant="labelSmall" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                    {`${MEDIA_KIND_LABELS[item.kind]} · ${item.subtitle || item.meta}`}
                  </AppText>
                </Pressable>
                <View style={styles.rowActions}>
                  <IconButton
                    name="arrow-up"
                    size={16}
                    onPress={() => moveQueueItem(idx, 'up')}
                    accessibilityLabel="Move up"
                  />
                  <IconButton
                    name="arrow-down"
                    size={16}
                    onPress={() => moveQueueItem(idx, 'down')}
                    accessibilityLabel="Move down"
                  />
                  <IconButton
                    name="close"
                    size={16}
                    onPress={() => removeFromQueue(item.id)}
                    accessibilityLabel="Remove from queue"
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* 5. Previously Played History (Penpot 06.7) */}
        <View style={styles.sectionBlock}>
          <AppText variant="overline" tone="tertiary">
            PREVIOUSLY PLAYED
          </AppText>
          {history.slice(0, 5).map((item, idx, arr) => (
            <Pressable
              key={`prev-${item.id}`}
              onPress={() => playItem(item)}
              accessibilityRole="button"
              style={({pressed}) => [
                styles.queueRow,
                {
                  paddingHorizontal: 0,
                  paddingVertical: 12,
                  borderBottomWidth:
                    idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <SimbaIcon
                name="history"
                size={18}
                color={colors.accent.gold}
              />
              <View style={styles.rowCopy}>
                <AppText variant="labelSmall" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                  {item.subtitle || MEDIA_KIND_LABELS[item.kind]}
                </AppText>
              </View>
              <SimbaIcon
                name="play-circle-outline"
                size={22}
                color={colors.accent.gold}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 18},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTitleCol: {flex: 1, gap: 2},
  headerActionPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  undoBtn: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {gap: 10},
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  nowArt: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCopy: {flex: 1, gap: 2},
  playCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBox: {
    padding: 18,
    alignItems: 'center',
  },
});
