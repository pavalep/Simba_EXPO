import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  usePlayer,
  usePlayerProgress,
  useSimbaPlayback,
  useSmoothPlaybackPosition,
} from '../../infrastructure/player';
import {AppText, Badge, IconButton, MediaArtwork, ProgressBar} from '../ui';

/**
 * Unified Mini-Player Cutout Dock & Floating PiP Preview (Penpot 01.3 / 06.6).
 *
 * Sits persistently above the 3-tab bottom bar when `dockVisible` is true.
 * Tapping the dock expands the active lane (`/player/video` or `/player/audio`).
 */
export function MiniPlayerDock() {
  const {colors, radius, spacing, shadows} = useTheme();
  const router = useRouter();
  const {
    nowPlaying,
    isPlaying: storeIsPlaying,
    positionSeconds: storePositionSeconds,
    isPipActive,
    dockVisible,
    togglePlay: storeTogglePlay,
    setIsPipActive,
  } = useSimbaStore();
  const {state: mpvState, commands} = usePlayer();
  const mpvProgress = usePlayerProgress();
  const {stopAndClose} = useSimbaPlayback();

  const hasLiveMpvMedia = Boolean(
    nowPlaying &&
      (nowPlaying.streamUrl ||
        mpvProgress.durationMs > 0 ||
        mpvState.isPlaying ||
        mpvState.isLoading),
  );

  const isPlaying = hasLiveMpvMedia ? mpvState.isPlaying : storeIsPlaying;
  const durationMs =
    mpvProgress.durationMs > 0
      ? mpvProgress.durationMs
      : (nowPlaying?.durationSeconds ?? 0) * 1000;

  const {displayPositionMs} = useSmoothPlaybackPosition({
    positionMs: hasLiveMpvMedia
      ? mpvProgress.positionMs
      : storePositionSeconds * 1000,
    durationMs,
    isPlaying: Boolean(dockVisible && nowPlaying && isPlaying),
    isBuffering: mpvState.isBuffering,
    isSeeking: mpvProgress.isSeeking,
    speed: mpvState.speed || 1,
    mediaKey: nowPlaying?.id,
  });

  if (!dockVisible || !nowPlaying) {
    return null;
  }

  const isVideo = nowPlaying.lane === 'video';
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, displayPositionMs / durationMs)) : 0;

  const handleTogglePlay = () => {
    if (hasLiveMpvMedia) {
      commands.togglePlayPause();
    } else {
      storeTogglePlay();
    }
  };

  const openFullPlayer = () => {
    router.push(isVideo ? '/player/video' : '/player/audio');
  };

  return (
    <>
      {/* Floating PiP Window Preview (06.6) when PiP is toggled on */}
      {isPipActive ? (
        <Pressable
          onPress={openFullPlayer}
          accessibilityRole="button"
          accessibilityLabel="Expand Picture in Picture window"
          style={[
            styles.pipWindow,
            {
              backgroundColor: colors.background.videoStage,
              borderRadius: radius.md,
              borderColor: colors.accent.gold,
            },
            shadows.floating,
          ]}>
          <View style={styles.pipTopRow}>
            <Badge label="PiP · 16:9" tone="gold" />
            <Pressable
              onPress={() => setIsPipActive(false)}
              accessibilityRole="button"
              accessibilityLabel="Close PiP"
              style={styles.pipClose}>
              <SimbaIcon
                name="close"
                size={14}
                color={colors.text.bright}
              />
            </Pressable>
          </View>
          <View style={styles.pipCenter}>
            <SimbaIcon
              name={nowPlaying.icon}
              size={26}
              color={colors.accent.gold}
            />
            <AppText
              variant="labelSmall"
              tone="bright"
              numberOfLines={1}>
              {nowPlaying.title}
            </AppText>
          </View>
        </Pressable>
      ) : null}

      {/* Unified Mini-Player Dock Bar — Frosted Translucent Capsule */}
      <View
        style={[
          styles.dockWrap,
          {
            marginHorizontal: spacing.md,
            marginBottom: spacing.xs + 2,
            backgroundColor: colors.background.floating,
            borderRadius: radius.xl,
            borderColor: colors.border.subtle,
          },
          shadows.floating,
        ]}>
        <View style={styles.dockTopRow}>
          <Pressable
            onPress={openFullPlayer}
            accessibilityRole="button"
            accessibilityLabel={`Expand player for ${nowPlaying.title}`}
            style={styles.dockMain}>
            {/* 44x44 Cutout Slot (D9 Video Surface / Audio Artwork) */}
            <View
              style={[
                styles.cutoutSlot,
                {
                  borderRadius: radius.sm,
                  backgroundColor: isVideo
                    ? colors.background.videoStage
                    : colors.accent.goldWash,
                  borderColor: colors.border.default,
                  overflow: 'hidden',
                },
              ]}>
              <MediaArtwork
                uri={nowPlaying.artworkUrl}
                icon={nowPlaying.icon}
                iconSize={22}
                borderRadius={radius.sm}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={styles.metaCol}>
              <View style={styles.titleRow}>
                <Badge
                  label={isVideo ? 'VIDEO' : 'AUDIO'}
                  tone="gold"
                />
                <AppText
                  variant="labelSmall"
                  numberOfLines={1}
                  style={styles.titleText}>
                  {nowPlaying.title}
                </AppText>
              </View>
              <AppText
                variant="caption"
                tone="tertiary"
                numberOfLines={1}>
                {nowPlaying.subtitle || (isVideo ? 'Video' : 'Audio')}
              </AppText>
            </View>
          </Pressable>

          <View style={styles.actions}>
            {isVideo ? (
              <IconButton
                name={
                  isPipActive
                    ? 'picture-in-picture-bottom-right'
                    : 'picture-in-picture-bottom-right-outline'
                }
                size={18}
                onPress={() => setIsPipActive(!isPipActive)}
                accessibilityLabel="Toggle Picture in Picture"
              />
            ) : null}
            <IconButton
              name="playlist-play"
              size={20}
              onPress={() => router.push('/player/queue')}
              accessibilityLabel="Open playback queue"
            />
            <Pressable
              onPress={handleTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={[
                styles.playPill,
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
            <IconButton
              name="close"
              size={18}
              onPress={stopAndClose}
              accessibilityLabel="Dismiss mini player"
            />
          </View>
        </View>

        <ProgressBar
          progress={progress}
          height={3}
          trackColor={colors.border.subtle}
          fillColor={colors.accent.gold}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pipWindow: {
    position: 'absolute',
    right: 16,
    bottom: 144,
    width: 172,
    height: 106,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
    zIndex: 40,
  },
  pipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pipClose: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipCenter: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  dockWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 8,
    gap: 6,
  },
  dockMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cutoutSlot: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  playPill: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
