import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  canBookmarkItem,
  canFavoriteItem,
  consumePendingSeekTarget,
  formatTimestampLabel,
  isTrackSwitchPending,
  usePlayer,
  usePlayerProgress,
  useSimbaPlayback,
  useSmoothPlaybackPosition,
} from '../../infrastructure/player';
import {
  AppText,
  BufferingRing,
  Chip,
  IconButton,
  MediaArtwork,
  PlayerSeekBar,
  ProgressBar,
  Sheet,
  Surface,
} from '../ui';
import {eqBands, eqPresets} from '../../constants/catalogueConfig';

/**
 * FULL-SCREEN AUDIO PLAYER + MORE SHEET + 10-BAND EQUALIZER
 * (Penpot 06.1 & 06.2 + CodecM FullScreenPlayerPage + SIMBA AudioMoreSheet).
 */

const BAR_COUNT = 38;
const WAVE_PROFILE = [
  0.22, 0.34, 0.28, 0.46, 0.62, 0.38, 0.54, 0.71, 0.44, 0.3, 0.58, 0.8, 0.66,
  0.42, 0.26, 0.48, 0.74, 0.9, 0.56, 0.38, 0.64, 0.82, 0.5, 0.32, 0.52, 0.78,
  0.6, 0.36, 0.24, 0.46, 0.7, 0.88, 0.58, 0.34, 0.26, 0.42, 0.6, 0.32,
];

const SPEEDS = [1.0, 1.2, 1.5, 2.0] as const;
const SLEEP_TIMERS = ['Off', '15m', '30m', '45m', '60m'] as const;

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' + s : String(s));
}

export interface AudioPlayerScreenProps {
  title?: string;
  subtitle?: string;
  duration?: number;
}

export function AudioPlayerScreen(props: AudioPlayerScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    nowPlaying,
    queue,
    isPlaying: storeIsPlaying,
    positionSeconds: storePositionSeconds,
    togglePlay: storeTogglePlay,
    seekTo: storeSeekTo,
    isFavorite,
    toggleFavorite,
    addBookmark,
    updateHistoryProgress,
    eqPreset,
    eqGains,
    selectEqPreset,
    adjustEqBand,
  } = useSimbaStore();
  const {state: mpvState, commands} = usePlayer();
  const mpvProgress = usePlayerProgress();
  const {playCatalogueItem, stopAndClose, applyEqualizer, resolvingStream} =
    useSimbaPlayback();

  const isLiveRadio = nowPlaying?.kind === 'radio';
  const isSpoken =
    nowPlaying?.kind === 'podcast' || nowPlaying?.kind === 'audiobook';
  const audioQueue = useMemo(
    () => queue.filter(q => q.lane === 'audio'),
    [queue],
  );
  const currentQueueIdx = useMemo(
    () => (nowPlaying ? audioQueue.findIndex(q => q.id === nowPlaying.id) : -1),
    [audioQueue, nowPlaying],
  );

  const hasLiveMpvMedia =
    Boolean(nowPlaying?.streamUrl) ||
    mpvProgress.durationMs > 0 ||
    mpvState.isPlaying ||
    mpvState.isLoading;

  // Track when libmpv has actually loaded the *current* track so stale duration
  // from the previous track is never shown while switching items.
  const prevTrackDurationRef = useRef<{id?: string; staleDurMs: number}>({
    id: nowPlaying?.id,
    staleDurMs: 0,
  });
  if (prevTrackDurationRef.current.id !== nowPlaying?.id) {
    prevTrackDurationRef.current = {
      id: nowPlaying?.id,
      staleDurMs: mpvProgress.durationMs,
    };
  }
  const trackSwitchPending = isTrackSwitchPending(nowPlaying?.id);
  const hasFreshMpvDuration =
    mpvProgress.durationMs > 0 &&
    !mpvState.isLoading &&
    !resolvingStream &&
    !trackSwitchPending &&
    (prevTrackDurationRef.current.staleDurMs === 0 ||
      mpvProgress.durationMs !== prevTrackDurationRef.current.staleDurMs ||
      mpvState.isPlaying);

  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const isPlaying = hasLiveMpvMedia ? mpvState.isPlaying : storeIsPlaying;
  const liveDurationSeconds = hasFreshMpvDuration
    ? Math.floor(mpvProgress.durationMs / 1000)
    : undefined;

  const title = props.title ?? nowPlaying?.title ?? 'Now Playing';
  const subtitle = props.subtitle ?? nowPlaying?.subtitle ?? '';
  const duration =
    liveDurationSeconds ?? props.duration ?? nowPlaying?.durationSeconds ?? 0;
  const durationMs = hasFreshMpvDuration
    ? mpvProgress.durationMs
    : duration * 1000;

  const {displayPositionMs, commitOptimisticSeek} = useSmoothPlaybackPosition({
    positionMs: hasLiveMpvMedia
      ? mpvProgress.positionMs
      : storePositionSeconds * 1000,
    durationMs,
    isPlaying,
    isBuffering: mpvState.isLoading || mpvState.isBuffering || resolvingStream,
    isSeeking: mpvProgress.isSeeking,
    speed: mpvState.speed || 1,
    mediaKey: nowPlaying?.id,
  });

  const shownPositionMs =
    scrubFraction != null && durationMs > 0
      ? scrubFraction * durationMs
      : displayPositionMs;
  const positionSeconds = Math.floor(shownPositionMs / 1000);

  const togglePlay = () => {
    const atEnd =
      !isLiveRadio &&
      !isPlaying &&
      duration > 0 &&
      positionSeconds >= duration - 2;
    if (atEnd && nowPlaying) {
      void playCatalogueItem(nowPlaying);
      return;
    }
    if (hasLiveMpvMedia) {
      commands.togglePlayPause();
    } else if (nowPlaying) {
      void playCatalogueItem(nowPlaying);
    } else {
      storeTogglePlay();
    }
  };

  const seekTo = useCallback(
    (secs: number) => {
      if (isLiveRadio) {
        return;
      }
      const clamped = Math.max(0, duration > 0 ? Math.min(duration, secs) : secs);
      if (hasLiveMpvMedia) {
        const targetMs = Math.round(clamped * 1000);
        commitOptimisticSeek(targetMs);
        commands.seek(targetMs);
      } else {
        storeSeekTo(Math.round(clamped));
      }
    },
    [
      isLiveRadio,
      duration,
      hasLiveMpvMedia,
      commitOptimisticSeek,
      commands,
      storeSeekTo,
    ],
  );

  const handleSkipPrev = useCallback(() => {
    if (positionSeconds > 4) {
      seekTo(0);
      return;
    }
    if (currentQueueIdx > 0) {
      const prev = audioQueue[currentQueueIdx - 1];
      if (prev) {
        void playCatalogueItem(prev);
        return;
      }
    }
    seekTo(0);
  }, [positionSeconds, currentQueueIdx, audioQueue, playCatalogueItem, seekTo]);

  const handleSkipNext = useCallback(() => {
    if (audioQueue.length > 0) {
      const nextIdx =
        currentQueueIdx === -1
          ? 0
          : (currentQueueIdx + 1) % audioQueue.length;
      const next = audioQueue[nextIdx];
      if (next && next.id !== nowPlaying?.id) {
        void playCatalogueItem(next);
        return;
      }
    }
    seekTo(Math.min(duration, positionSeconds + 30));
  }, [
    audioQueue,
    currentQueueIdx,
    nowPlaying?.id,
    playCatalogueItem,
    seekTo,
    duration,
    positionSeconds,
  ]);

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [sleepIdx, setSleepIdx] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [volume, setVolume] = useState(0.76);
  const [volumeWidth, setVolumeWidth] = useState(240);
  const [hudToast, setHudToast] = useState<string | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHudToast = useCallback((msg: string) => {
    setHudToast(msg);
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = setTimeout(() => setHudToast(null), 1600);
  }, []);

  // Surface a clear message when an upstream stream returns 404/500 and cannot load
  useEffect(() => {
    if (mpvState.error && !mpvState.isPlaying && !mpvState.isLoading) {
      showHudToast('Stream unavailable on source — try another track');
    }
  }, [mpvState.error, mpvState.isPlaying, mpvState.isLoading, showHudToast]);

  useEffect(() => {
    return () => {
      if (hudTimerRef.current) {
        clearTimeout(hudTimerRef.current);
      }
    };
  }, []);

  // Apply initial seek when opened from a frozen Bookmark or Jump Back In resume
  useEffect(() => {
    if (!nowPlaying || isLiveRadio) {
      return;
    }
    if (mpvProgress.durationMs <= 0 && !mpvState.isPlaying) {
      return;
    }
    const targetSec = consumePendingSeekTarget(nowPlaying.id);
    if (targetSec != null && targetSec > 0) {
      seekTo(targetSec);
    }
  }, [nowPlaying, isLiveRadio, mpvProgress.durationMs, mpvState.isPlaying, seekTo]);

  // Continuously sync live playback position into Jump Back In / Playback History
  // (throttled every ~5s while playing + flushed on pause/unmount)
  const lastSavedPosRef = useRef<number>(-1);
  const latestPosRef = useRef({id: nowPlaying?.id, pos: positionSeconds, dur: duration, live: isLiveRadio});
  latestPosRef.current = {id: nowPlaying?.id, pos: positionSeconds, dur: duration, live: isLiveRadio};

  useEffect(() => {
    if (!nowPlaying || isLiveRadio || positionSeconds <= 0 || trackSwitchPending) {
      return;
    }
    if (!isPlaying || Math.abs(positionSeconds - lastSavedPosRef.current) >= 5) {
      lastSavedPosRef.current = positionSeconds;
      updateHistoryProgress(nowPlaying.id, positionSeconds, duration > 0 ? duration : undefined);
    }
  }, [nowPlaying, isLiveRadio, isPlaying, positionSeconds, duration, trackSwitchPending, updateHistoryProgress]);

  useEffect(() => {
    return () => {
      const snap = latestPosRef.current;
      if (snap.id && !snap.live && snap.pos > 0) {
        updateHistoryProgress(snap.id, snap.pos, snap.dur > 0 ? snap.dur : undefined);
      }
    };
  }, [updateHistoryProgress]);

  const headerContextLabel = isLiveRadio
    ? 'LIVE RADIO'
    : nowPlaying?.kind === 'podcast'
      ? 'PODCAST'
      : nowPlaying?.kind === 'audiobook'
        ? 'AUDIOBOOK'
        : 'NOW PLAYING';

  const favorited = nowPlaying ? isFavorite(nowPlaying.id) : false;
  const allowFavorite = canFavoriteItem(nowPlaying);
  const allowBookmark = canBookmarkItem(nowPlaying);
  const progress =
    durationMs > 0
      ? Math.min(1, Math.max(0, shownPositionMs / durationMs))
      : 0;
  const remaining = Math.max(0, duration - positionSeconds);
  const isAudioBuffering =
    resolvingStream ||
    (mpvState.isLoading && positionSeconds === 0 && !mpvState.isPlaying) ||
    (mpvState.isBuffering && !mpvState.isPlaying);
  const bars = useMemo(() => WAVE_PROFILE.slice(0, BAR_COUNT), []);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.onMediaSheet,
          paddingTop: insets.top + 6,
          paddingBottom: Math.max(20, insets.bottom + 12),
        },
      ]}>
      {/* 1. Top Bar: Minimise, Context, Bookmark, Queue, More, Close */}
      <View style={styles.topBar}>
        <IconButton
          name="chevron-down"
          onPress={() => router.back()}
          accessibilityLabel="Minimise player"
          onMedia
        />
        <AppText variant="overline" tone="gold">
          {headerContextLabel}
        </AppText>
        <View style={styles.topRight}>
          {allowFavorite && nowPlaying ? (
            <IconButton
              name={favorited ? 'heart' : 'heart-outline'}
              onPress={() => {
                toggleFavorite(nowPlaying);
                showHudToast(
                  favorited ? 'Removed from Favorites' : 'Added to Favorites',
                );
              }}
              accessibilityLabel={
                favorited ? 'Remove from Favorites' : 'Add to Favorites'
              }
              onMedia
            />
          ) : null}
          {allowBookmark && nowPlaying ? (
            <IconButton
              name="bookmark-outline"
              onPress={() => {
                const created = addBookmark(
                  nowPlaying,
                  positionSeconds,
                  duration > 0 ? duration : undefined,
                );
                if (created) {
                  showHudToast(
                    `Bookmarked at ${formatTimestampLabel(positionSeconds)}`,
                  );
                }
              }}
              accessibilityLabel="Bookmark this timestamp"
              onMedia
            />
          ) : null}
          <IconButton
            name="playlist-play"
            onPress={() => router.push('/player/queue')}
            accessibilityLabel="Open playback queue"
            onMedia
          />
          <IconButton
            name="dots-vertical"
            onPress={() => setMoreOpen(true)}
            accessibilityLabel="More options"
            onMedia
          />
          <IconButton
            name="close"
            onPress={() => {
              stopAndClose();
              router.back();
            }}
            accessibilityLabel="Stop and close player"
            onMedia
          />
        </View>
      </View>

      {hudToast ? (
        <View
          pointerEvents="none"
          style={{
            alignSelf: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.background.onMediaPill,
            marginBottom: 4,
          }}>
          <AppText variant="labelSmall" tone="gold">
            {hudToast}
          </AppText>
        </View>
      ) : null}

      {/* 2. 28dp Rounded Artwork Plate (Penpot 06.1) */}
      <View style={styles.artWrap}>
        <View
          style={[
            styles.art,
            {
              backgroundColor: colors.brand.primaryDark,
              borderColor: colors.accent.gold,
              borderRadius: radius.xxl,
              overflow: 'hidden',
            },
          ]}>
          <MediaArtwork
            uri={nowPlaying?.artworkUrl}
            icon={nowPlaying?.icon ?? 'music-clef-treble'}
            iconSize={72}
            borderRadius={radius.xxl}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      {/* 3. Title & Quick Speed / Sleep Cycler Pills (06.1) */}
      <View style={styles.titleBlock}>
        <AppText variant="h2" tone="bright" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="body" tone="mutedOnMedia" numberOfLines={1}>
          {subtitle}
        </AppText>
        <View style={styles.quickPillsRow}>
          <Pressable
            onPress={() => {
              const nextIdx = (speedIdx + 1) % SPEEDS.length;
              setSpeedIdx(nextIdx);
              commands.setSpeed(SPEEDS[nextIdx]);
            }}
            accessibilityRole="button"
            style={[
              styles.metaPill,
              {
                backgroundColor: colors.background.onMediaPill,
                borderRadius: radius.pill,
                borderColor: colors.border.emphasis,
              },
            ]}>
            <SimbaIcon
              name="speedometer"
              size={14}
              color={colors.accent.gold}
            />
            <AppText variant="labelSmall" tone="gold">
              {`${SPEEDS[speedIdx].toFixed(1)}x`}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setSleepIdx(i => (i + 1) % SLEEP_TIMERS.length)}
            accessibilityRole="button"
            style={[
              styles.metaPill,
              {
                backgroundColor: colors.background.onMediaPill,
                borderRadius: radius.pill,
                borderColor: colors.border.emphasis,
              },
            ]}>
            <SimbaIcon
              name="timer-outline"
              size={14}
              color={colors.accent.gold}
            />
            <AppText variant="labelSmall" tone="bright" numberOfLines={1}>
              {`Sleep:\u00A0${SLEEP_TIMERS[sleepIdx]}`}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setEqOpen(true)}
            accessibilityRole="button"
            style={[
              styles.metaPill,
              {
                backgroundColor: colors.background.onMediaPill,
                borderRadius: radius.pill,
                borderColor: colors.border.emphasis,
              },
            ]}>
            <SimbaIcon
              name="equalizer"
              size={14}
              color={colors.accent.gold}
            />
            <AppText variant="labelSmall" tone="gold" numberOfLines={1}>
              {`EQ:\u00A0${eqPreset}`}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* 4. Waveform / Live Radio Indicator */}
      {isLiveRadio ? (
        <View style={styles.liveRadioRow}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.semantic.error,
            }}
          />
          <AppText variant="labelSmall" tone="bright">
            LIVE BROADCAST
          </AppText>
        </View>
      ) : (
        <View style={styles.seekSection}>
          <View style={styles.wave}>
            {bars.map((h, i) => {
              const barFraction = i / BAR_COUNT;
              const played = barFraction <= progress;
              return (
                <Pressable
                  key={i}
                  onPress={() => seekTo(Math.round(barFraction * duration))}
                  style={[
                    styles.bar,
                    {
                      height: Math.max(6, Math.round(h * 38)),
                      backgroundColor: played
                        ? colors.accent.gold
                        : colors.background.seekTrack.empty,
                    },
                  ]}
                />
              );
            })}
          </View>

          <PlayerSeekBar
            progress={progress}
            durationMs={durationMs}
            cacheRanges={mpvProgress.cacheRanges}
            isBuffering={isAudioBuffering}
            onScrubFraction={setScrubFraction}
            onSeekFraction={ratio => {
              if (duration > 0) {
                seekTo(ratio * duration);
              }
            }}
            accessibilityLabel="Audio seek bar"
          />

          <View style={styles.timeRow}>
            <AppText variant="mono" tone="gold">
              {formatTime(positionSeconds)}
            </AppText>
            <AppText variant="mono" tone="mutedOnMedia">
              {duration > 0 ? formatTime(duration) : '--:--'}
            </AppText>
          </View>
        </View>
      )}

      {/* 6. Clean 5-Control Transport Row (Context-Aware: Music vs Spoken vs Live Radio) */}
      <View style={styles.transport}>
        {isLiveRadio ? (
          <>
            <IconButton
              name={favorited ? 'heart' : 'heart-outline'}
              onPress={() => {
                if (nowPlaying) {
                  toggleFavorite(nowPlaying);
                  showHudToast(
                    favorited
                      ? 'Removed from Favorites'
                      : 'Added to Favorites',
                  );
                }
              }}
              accessibilityLabel={
                favorited ? 'Remove station from Favorites' : 'Favorite station'
              }
              onMedia
              size={22}
            />
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={[
                styles.playButton,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}>
              {isAudioBuffering ? (
                <BufferingRing
                  size={28}
                  color={colors.brand.onPrimary}
                  strokeWidth={3}
                />
              ) : (
                <SimbaIcon
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.brand.onPrimary}
                />
              )}
            </Pressable>
            <IconButton
              name="playlist-play"
              onPress={() => router.push('/player/queue')}
              accessibilityLabel="Open queue"
              onMedia
              size={22}
            />
          </>
        ) : isSpoken ? (
          <>
            <IconButton
              name="skip-previous"
              onPress={handleSkipPrev}
              accessibilityLabel="Previous episode"
              onMedia
              size={24}
            />
            <IconButton
              name="rewind-10"
              onPress={() => seekTo(positionSeconds - 10)}
              accessibilityLabel="Back 10 seconds"
              onMedia
              size={26}
            />
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={[
                styles.playButton,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}>
              {isAudioBuffering ? (
                <BufferingRing
                  size={28}
                  color={colors.brand.onPrimary}
                  strokeWidth={3}
                />
              ) : (
                <SimbaIcon
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.brand.onPrimary}
                />
              )}
            </Pressable>
            <IconButton
              name="fast-forward-10"
              onPress={() => seekTo(positionSeconds + 10)}
              accessibilityLabel="Forward 10 seconds"
              onMedia
              size={26}
            />
            <IconButton
              name="skip-next"
              onPress={handleSkipNext}
              accessibilityLabel="Next episode"
              onMedia
              size={24}
            />
          </>
        ) : (
          <>
            <IconButton
              name={shuffle ? 'shuffle-variant' : 'shuffle-disabled'}
              onPress={() => setShuffle(s => !s)}
              accessibilityLabel="Shuffle"
              onMedia
              size={20}
            />
            <IconButton
              name="skip-previous"
              onPress={handleSkipPrev}
              accessibilityLabel="Previous track"
              onMedia
              size={28}
            />
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={[
                styles.playButton,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}>
              {isAudioBuffering ? (
                <BufferingRing
                  size={28}
                  color={colors.brand.onPrimary}
                  strokeWidth={3}
                />
              ) : (
                <SimbaIcon
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.brand.onPrimary}
                />
              )}
            </Pressable>
            <IconButton
              name="skip-next"
              onPress={handleSkipNext}
              accessibilityLabel="Next track"
              onMedia
              size={28}
            />
            <IconButton
              name={repeat ? 'repeat-once' : 'repeat'}
              onPress={() => setRepeat(r => !r)}
              accessibilityLabel="Repeat"
              onMedia
              size={20}
            />
          </>
        )}
      </View>

      {/* 7. Clean Single-Icon Interactive Volume Bar */}
      <View style={styles.volumeRow}>
        <Pressable
          onPress={() => {
            const next = volume > 0.02 ? 0 : 0.75;
            setVolume(next);
            commands.setVolume(Math.round(next * 100));
          }}
          accessibilityRole="button"
          accessibilityLabel={volume > 0.02 ? 'Mute audio' : 'Unmute audio'}
          hitSlop={10}>
          <SimbaIcon
            name={volume <= 0.02 ? 'volume-off' : 'volume-high'}
            size={20}
            color={volume <= 0.02 ? colors.text.onMediaMuted : colors.accent.gold}
          />
        </Pressable>
        <Pressable
          onLayout={(e: LayoutChangeEvent) => {
            if (e.nativeEvent.layout.width > 0) {
              setVolumeWidth(e.nativeEvent.layout.width);
            }
          }}
          onPress={e => {
            if (volumeWidth <= 0) {
              return;
            }
            const next = Math.min(
              1,
              Math.max(0, e.nativeEvent.locationX / volumeWidth),
            );
            setVolume(next);
            commands.setVolume(Math.round(next * 100));
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Volume"
          style={[styles.volumeBar, {paddingVertical: 10}]}>
          <ProgressBar
            progress={volume}
            height={4}
            trackColor={colors.background.seekTrack.empty}
            fillColor={colors.accent.gold}
          />
        </Pressable>
        <AppText variant="mono" tone="mutedOnMedia" style={styles.volumePct}>
          {`${Math.round(volume * 100)}%`}
        </AppText>
      </View>

      {/* Sheet 1: Audio More Sheet (Penpot 06.2) */}
      <Sheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Audio Playback Options"
        subtitle={title}
        tone="onMedia">
        <View style={styles.sheetSection}>
          <AppText variant="overline" tone="gold">
            SOUND & PLAYBACK
          </AppText>
          <SheetRow
            icon="equalizer"
            label="10-Band Equalizer & Presets"
            value={eqPreset}
            onPress={() => {
              setMoreOpen(false);
              setEqOpen(true);
            }}
          />
          <SheetRow
            icon="speedometer"
            label="Playback Speed"
            value={`${SPEEDS[speedIdx].toFixed(1)}x`}
            onPress={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
          />
          <SheetRow
            icon="timer-outline"
            label="Sleep Timer"
            value={SLEEP_TIMERS[sleepIdx]}
            onPress={() => setSleepIdx(i => (i + 1) % SLEEP_TIMERS.length)}
          />
        </View>
        <View style={styles.sheetSection}>
          <AppText variant="overline" tone="gold">
            QUEUE & LIBRARY
          </AppText>
          <SheetRow
            icon="playlist-play"
            label="Open Playback Queue"
            onPress={() => {
              setMoreOpen(false);
              router.push('/player/queue');
            }}
          />
          {allowFavorite && nowPlaying ? (
            <SheetRow
              icon={favorited ? 'heart' : 'heart-outline'}
              label={favorited ? 'Remove from Favorites' : 'Add to Favorites'}
              onPress={() => {
                toggleFavorite(nowPlaying);
                showHudToast(
                  favorited ? 'Removed from Favorites' : 'Added to Favorites',
                );
                setMoreOpen(false);
              }}
            />
          ) : null}
          {allowBookmark && nowPlaying ? (
            <SheetRow
              icon="bookmark-outline"
              label={`Bookmark at ${formatTimestampLabel(positionSeconds)}`}
              onPress={() => {
                const created = addBookmark(
                  nowPlaying,
                  positionSeconds,
                  duration > 0 ? duration : undefined,
                );
                if (created) {
                  showHudToast(
                    `Bookmarked at ${formatTimestampLabel(positionSeconds)}`,
                  );
                }
                setMoreOpen(false);
              }}
            />
          ) : null}
        </View>
      </Sheet>

      {/* Sheet 2: 10-Band Equalizer Sheet (Penpot 06.2) */}
      <Sheet
        visible={eqOpen}
        onClose={() => setEqOpen(false)}
        title="10-Band Equalizer"
        subtitle="Customize bass, midrange, and treble"
        tone="onMedia">
        <View style={styles.eqContainer}>
          <View style={styles.eqPresetWrap}>
            {Object.keys(eqPresets).map(presetName => (
              <Chip
                key={presetName}
                label={presetName}
                selected={eqPreset === presetName}
                onPress={() => selectEqPreset(presetName)}
              />
            ))}
          </View>

          <Surface tone="onMedia" radius="lg" style={styles.eqBandsCard}>
            <View style={styles.eqBandsRow}>
              {eqBands.map((band, idx) => {
                const gain = eqGains[idx] ?? 0;
                const fillFrac = (gain + 6) / 12;
                return (
                  <View key={band.freq} style={styles.eqBandCol}>
                    <Pressable
                      onPress={() => adjustEqBand(idx, 1)}
                      accessibilityRole="button"
                      style={styles.eqStepBtn}>
                      <SimbaIcon
                        name="plus"
                        size={12}
                        color={colors.accent.gold}
                      />
                    </Pressable>
                    <View
                      style={[
                        styles.eqTrack,
                        {backgroundColor: colors.border.emphasis},
                      ]}>
                      <View
                        style={[
                          styles.eqFill,
                          {
                            height: `${Math.round(fillFrac * 100)}%`,
                            backgroundColor: colors.accent.gold,
                          },
                        ]}
                      />
                    </View>
                    <Pressable
                      onPress={() => adjustEqBand(idx, -1)}
                      accessibilityRole="button"
                      style={styles.eqStepBtn}>
                      <SimbaIcon
                        name="minus"
                        size={12}
                        color={colors.text.onMediaMuted}
                      />
                    </Pressable>
                    <AppText variant="caption" tone="gold">
                      {`${gain >= 0 ? '+' : ''}${gain}`}
                    </AppText>
                    <AppText variant="caption" tone="mutedOnMedia">
                      {band.freq}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </Surface>
        </View>
      </Sheet>
    </View>
  );
}

function SheetRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: import('../ui/SimbaIcon').SimbaIconName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sheetRow,
        {
          paddingVertical: spacing.md,
          borderBottomColor: colors.border.subtle,
        },
      ]}
      accessibilityRole="button">
      <SimbaIcon name={icon} size={20} color={colors.accent.gold} />
      <AppText variant="body" tone="bright" style={styles.sheetLabel}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="labelSmall" tone="gold">
          {value}
        </AppText>
      ) : null}
      <SimbaIcon
        name="chevron-right"
        size={18}
        color={colors.text.onMediaMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRight: {flexDirection: 'row', gap: 2},
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  art: {
    width: 248,
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleBlock: {alignItems: 'center', gap: 6, marginBottom: 8},
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  liveRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  seekSection: {
    gap: 4,
    marginVertical: 6,
  },
  wave: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    marginBottom: 2,
  },
  bar: {flex: 1, borderRadius: 2},
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  volumeBar: {flex: 1},
  volumePct: {
    width: 36,
    textAlign: 'right',
  },
  sheetSection: {marginTop: 12, gap: 4},
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetLabel: {flex: 1},
  eqContainer: {gap: 16, paddingTop: 6},
  eqPresetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eqBandsCard: {padding: 12},
  eqBandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eqBandCol: {
    alignItems: 'center',
    gap: 6,
  },
  eqStepBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqTrack: {
    width: 8,
    height: 96,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  eqFill: {
    width: '100%',
    borderRadius: 4,
  },
});
