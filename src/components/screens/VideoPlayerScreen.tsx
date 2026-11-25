import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useApiQuery} from '../../hooks/useApiQuery';
import {iptvApi} from '../../infrastructure/api';
import {
  isArchiveDirectoryUrl,
  mapIPTVChannelToItem,
} from '../../infrastructure/api/mappers';
import {
  clearPendingVideoLoad,
  getPendingVideoLoad,
  PIP_CHROME_NATIVE_ID,
  SimbaVideo,
  usePlayer,
  usePlayerProgress,
  useSimbaPlayback,
  type SimbaVideoResizeMode,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  BufferingRing,
  Button,
  IconButton,
  PlayerSeekBar,
  Sheet,
} from '../ui';

/**
 * VIDEO PLAYER — Clean, distinct VOD Film/Show Mode vs Live TV Mode.
 *
 * VOD Mode (Movies, Shows, Archive Video, Local Video):
 *   - Interactive seek bar (tap anywhere to scrub), elapsed / remaining time
 *   - Previous (if queue) / Rewind 10s / Play-Pause / Forward 10s / Next (if queue)
 *   - Playback Speed (0.75x–2x), Aspect Ratio, Picture-in-Picture, Quality/More sheet
 *   - Zero "Live Channels" clutter on normal movies
 *
 * Live TV Mode (`nowPlaying.kind === 'live-tv'`):
 *   - Pulsing LIVE badge, NO scrub bar, NO speed selector, NO ±10s skip
 *   - Prev Channel / Play-Pause / Next Channel + Channel Switcher sheet
 */

const QUALITY_PRESETS = [
  {
    value: 'battery-saver',
    label: 'Data & Battery Saver',
    description: 'Uses less battery and data on longer videos',
  },
  {
    value: 'balanced',
    label: 'Balanced HD',
    description: 'Smooth playback with crisp high-definition video',
  },
  {
    value: 'high-quality',
    label: 'Best Picture Quality',
    description: 'Maximum clarity and detail',
  },
] as const;

const ASPECT_MODES = ['Fit', 'Fill', 'Original'] as const;
const ASPECT_RESIZE_MODES: readonly SimbaVideoResizeMode[] = [
  'contain',
  'cover',
  'stretch',
];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

const SEEK_CONFIRM_TOLERANCE_MS = 500;
const SEEK_CONFIRM_FALLBACK_MS = 1000;
const MIN_BUFFER_ISLAND_PX = 2;

interface BufferedSegment {
  startFraction: number;
  endFraction: number;
}

/**
 * Ported from main SIMBA (`useTransport.ts:deriveBufferedSegments`).
 * Clamps `demuxer-cache-state` seekable ranges to `[0, durationMs]`, merges
 * overlapping islands while preserving unbuffered gaps, and returns normalized
 * `[0, 1]` fractions for the seek bar.
 */
function deriveBufferedSegments(
  cacheRanges: readonly {start: number; end: number}[] | undefined,
  durationMs: number,
): BufferedSegment[] {
  if (!cacheRanges || cacheRanges.length === 0 || durationMs <= 0) {
    return [];
  }
  const clamped = cacheRanges
    .map(r => ({
      startMs: Math.max(0, Math.min(durationMs, r.start)),
      endMs: Math.max(0, Math.min(durationMs, r.end)),
    }))
    .filter(r => r.endMs > r.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: {startMs: number; endMs: number}[] = [];
  for (const r of clamped) {
    const last = merged[merged.length - 1];
    if (last && r.startMs < last.endMs) {
      last.endMs = Math.max(last.endMs, r.endMs);
    } else {
      merged.push({...r});
    }
  }
  return merged.map(r => ({
    startFraction: r.startMs / durationMs,
    endFraction: r.endMs / durationMs,
  }));
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface VideoPlayerScreenProps {
  title?: string;
  subtitle?: string;
  duration?: number;
}

export function VideoPlayerScreen(props: VideoPlayerScreenProps) {
  const {colors, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const screen = useWindowDimensions();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    nowPlaying,
    queue,
    isPlaying: storeIsPlaying,
    positionSeconds: storePositionSeconds,
    togglePlay: storeTogglePlay,
    seekTo: storeSeekTo,
    setIsPipActive,
    activeLiveChannelId,
    setActiveLiveChannelId,
  } = useSimbaStore();
  const {state: mpvState, commands} = usePlayer();
  const mpvProgress = usePlayerProgress();
  const {playCatalogueItem, stopAndClose, resolvingStream, streamError} =
    useSimbaPlayback();

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev;
      commands.setOrientation(next ? 'landscape' : 'portrait');
      commands.setImmersive(next);
      return next;
    });
  }, [commands]);

  const exitToPortrait = useCallback(() => {
    setIsFullscreen(false);
    commands.setOrientation('portrait');
    commands.setImmersive(false);
  }, [commands]);

  const isLiveMode = nowPlaying?.kind === 'live-tv';

  const liveChannelsQuery = useApiQuery({
    queryKey: ['iptv', 'player-channels'],
    queryFn: ({signal}) => iptvApi.getIPTVCatalogue(signal),
    enabled: isLiveMode,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const liveTvChannels = useMemo(
    () =>
      (liveChannelsQuery.data?.channels ?? [])
        .slice(0, 30)
        .map(mapIPTVChannelToItem),
    [liveChannelsQuery.data],
  );

  // Video queue navigation (for playlists / queues containing video items)
  const videoQueue = useMemo(
    () => queue.filter(q => q.lane === 'video'),
    [queue],
  );
  const currentQueueIdx = useMemo(
    () => (nowPlaying ? videoQueue.findIndex(q => q.id === nowPlaying.id) : -1),
    [videoQueue, nowPlaying],
  );
  const hasPrevVideo = currentQueueIdx > 0;
  const hasNextVideo =
    videoQueue.length > 0 &&
    (currentQueueIdx === -1 || currentQueueIdx < videoQueue.length - 1);

  const [chromeVisible, setChromeVisible] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1); // 1x
  const [aspectIdx, setAspectIdx] = useState(0);
  const [channelSheetOpen, setChannelSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quality, setQuality] =
    useState<(typeof QUALITY_PRESETS)[number]['value']>('balanced');
  const [seekBarWidth, setSeekBarWidth] = useState(screen.width - 32);
  const [hudText, setHudText] = useState<string | null>(null);

  const loadedUrlRef = useRef<string | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  const startY = useRef(0);
  const brightnessRef = useRef(0.8);
  const volumeRef = useRef(0.75);

  const showHud = useCallback((msg: string) => {
    setHudText(msg);
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = setTimeout(() => setHudText(null), 900);
  }, []);

  // Resolve target stream URL from pending cache or nowPlaying (ignoring IA directory URLs)
  const rawCandidateUrl =
    getPendingVideoLoad()?.url ??
    (typeof nowPlaying?.streamUrl === 'string' ? nowPlaying.streamUrl : undefined);
  const targetStreamUrl =
    rawCandidateUrl && !isArchiveDirectoryUrl(rawCandidateUrl)
      ? rawCandidateUrl
      : undefined;
  const targetTitle =
    getPendingVideoLoad()?.title ?? props.title ?? nowPlaying?.title ?? 'Simba Video';

  // If player was opened via MiniPlayerDock or with an unresolved IA directory URL,
  // kick off stream resolution automatically once per item.
  const resolvedAttemptItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !targetStreamUrl &&
      nowPlaying &&
      !resolvingStream &&
      resolvedAttemptItemRef.current !== nowPlaying.id
    ) {
      resolvedAttemptItemRef.current = nowPlaying.id;
      void playCatalogueItem(nowPlaying);
    }
  }, [targetStreamUrl, nowPlaying, resolvingStream, playCatalogueItem]);

  // Reliable libmpv video launch: wait for both resolved URL AND mounted
  // native SurfaceView (`openPlayer` returns false until SurfaceHolder attaches).
  useEffect(() => {
    if (!targetStreamUrl || loadedUrlRef.current === targetStreamUrl) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryStart = async () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      try {
        const started = await commands.openPlayer({
          uri: targetStreamUrl,
          title: targetTitle,
          type: 'video',
        });
        if (started) {
          loadedUrlRef.current = targetStreamUrl;
          clearPendingVideoLoad(nowPlaying?.id);
          return;
        }
      } catch {
        // Retry briefly if surface is still attaching
      }
      if (attempts < 30 && !cancelled) {
        timer = setTimeout(() => {
          void tryStart();
        }, 50);
      }
    };

    // Launch on the first paint frame once Fabric SurfaceView mounts
    const raf = requestAnimationFrame(() => {
      void tryStart();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [commands, targetStreamUrl, targetTitle, nowPlaying?.id]);

  // Keep screen awake while video player is open, and always restore portrait
  // + system bars when leaving the player.
  useEffect(() => {
    commands.setKeepScreenOn(true);
    return () => {
      commands.setKeepScreenOn(false);
      commands.setOrientation('portrait');
      commands.setImmersive(false);
      if (hudTimerRef.current) {
        clearTimeout(hudTimerRef.current);
      }
    };
  }, [commands]);

  const hasLiveMpvMedia =
    Boolean(loadedUrlRef.current) ||
    mpvProgress.durationMs > 0 ||
    mpvState.isPlaying ||
    mpvState.isLoading ||
    mpvState.isBuffering;

  const [pendingSeekMs, setPendingSeekMs] = useState<number | null>(null);
  const seekFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Closed-loop seek confirmation (main SIMBA TransportBar): hold optimistic
  // playhead until libmpv reports a position within 500ms of the target.
  useEffect(() => {
    if (pendingSeekMs == null) {
      return;
    }
    if (
      Math.abs(mpvProgress.positionMs - pendingSeekMs) <=
      SEEK_CONFIRM_TOLERANCE_MS
    ) {
      setPendingSeekMs(null);
      if (seekFallbackRef.current) {
        clearTimeout(seekFallbackRef.current);
        seekFallbackRef.current = null;
      }
    }
  }, [mpvProgress.positionMs, pendingSeekMs]);

  const isPlaying = hasLiveMpvMedia ? mpvState.isPlaying : storeIsPlaying;
  const effectivePositionMs =
    pendingSeekMs != null
      ? pendingSeekMs
      : hasLiveMpvMedia
      ? mpvProgress.positionMs
      : storePositionSeconds * 1000;
  const positionSeconds = Math.floor(effectivePositionMs / 1000);
  const durationMs =
    mpvProgress.durationMs > 0
      ? mpvProgress.durationMs
      : (props.duration ?? nowPlaying?.durationSeconds ?? 0) * 1000;
  const duration = Math.floor(durationMs / 1000);

  const progress =
    !isLiveMode && durationMs > 0
      ? Math.min(1, Math.max(0, effectivePositionMs / durationMs))
      : 0;

  const bufferedSegments = useMemo(
    () => deriveBufferedSegments(mpvProgress.cacheRanges, durationMs),
    [mpvProgress.cacheRanges, durationMs],
  );

  const isStalled =
    resolvingStream ||
    (mpvState.isLoading && positionSeconds === 0 && !mpvState.isPlaying) ||
    (mpvState.isBuffering && !mpvState.isPlaying);

  // Debounced buffering overlay (main SIMBA VideoLoadingOverlay: 450ms onset,
  // 400ms minimum hold) so micro-stalls never flash or block video frames.
  const [showBufferingOverlay, setShowBufferingOverlay] = useState(false);
  const bufferingShownAtRef = useRef<number>(0);
  useEffect(() => {
    if (isStalled) {
      const t = setTimeout(() => {
        bufferingShownAtRef.current = Date.now();
        setShowBufferingOverlay(true);
      }, 450);
      return () => clearTimeout(t);
    }
    if (!showBufferingOverlay) {
      return;
    }
    const elapsed = Date.now() - bufferingShownAtRef.current;
    const remaining = Math.max(0, 400 - elapsed);
    const t = setTimeout(() => setShowBufferingOverlay(false), remaining);
    return () => clearTimeout(t);
  }, [isStalled, showBufferingOverlay]);

  const isBuffering = showBufferingOverlay;

  const handleTogglePlay = useCallback(() => {
    if (hasLiveMpvMedia) {
      commands.togglePlayPause();
    } else if (targetStreamUrl) {
      loadedUrlRef.current = null;
      void commands.openPlayer({
        uri: targetStreamUrl,
        title: targetTitle,
        type: 'video',
      });
    } else {
      storeTogglePlay();
    }
  }, [hasLiveMpvMedia, commands, targetStreamUrl, targetTitle, storeTogglePlay]);

  const handleSeekSeconds = useCallback(
    (secs: number) => {
      if (isLiveMode) {
        return;
      }
      const clamped = Math.max(0, duration > 0 ? Math.min(duration, secs) : secs);
      const targetMs = clamped * 1000;
      if (hasLiveMpvMedia) {
        setPendingSeekMs(targetMs);
        if (seekFallbackRef.current) {
          clearTimeout(seekFallbackRef.current);
        }
        seekFallbackRef.current = setTimeout(() => {
          setPendingSeekMs(null);
        }, SEEK_CONFIRM_FALLBACK_MS);
        commands.seek(targetMs);
      } else {
        storeSeekTo(clamped);
      }
    },
    [isLiveMode, duration, hasLiveMpvMedia, commands, storeSeekTo],
  );

  const handlePrev = useCallback(() => {
    if (isLiveMode && liveTvChannels.length > 0) {
      const idx = liveTvChannels.findIndex(
        c => c.id === (activeLiveChannelId || nowPlaying?.id),
      );
      const prevCh =
        liveTvChannels[(idx - 1 + liveTvChannels.length) % liveTvChannels.length];
      if (prevCh) {
        loadedUrlRef.current = null;
        setActiveLiveChannelId(prevCh.id);
        void playCatalogueItem(prevCh);
        showHud(prevCh.title);
      }
      return;
    }
    if (hasPrevVideo) {
      const prevItem = videoQueue[currentQueueIdx - 1];
      if (prevItem) {
        loadedUrlRef.current = null;
        void playCatalogueItem(prevItem);
      }
    } else {
      handleSeekSeconds(0);
    }
  }, [
    isLiveMode,
    liveTvChannels,
    activeLiveChannelId,
    nowPlaying?.id,
    setActiveLiveChannelId,
    playCatalogueItem,
    showHud,
    hasPrevVideo,
    videoQueue,
    currentQueueIdx,
    handleSeekSeconds,
  ]);

  const handleNext = useCallback(() => {
    if (isLiveMode && liveTvChannels.length > 0) {
      const idx = liveTvChannels.findIndex(
        c => c.id === (activeLiveChannelId || nowPlaying?.id),
      );
      const nextCh = liveTvChannels[(idx + 1) % liveTvChannels.length];
      if (nextCh) {
        loadedUrlRef.current = null;
        setActiveLiveChannelId(nextCh.id);
        void playCatalogueItem(nextCh);
        showHud(nextCh.title);
      }
      return;
    }
    if (hasNextVideo) {
      const nextItem =
        currentQueueIdx === -1 ? videoQueue[0] : videoQueue[currentQueueIdx + 1];
      if (nextItem) {
        loadedUrlRef.current = null;
        void playCatalogueItem(nextItem);
      }
    }
  }, [
    isLiveMode,
    liveTvChannels,
    activeLiveChannelId,
    nowPlaying?.id,
    setActiveLiveChannelId,
    playCatalogueItem,
    showHud,
    hasNextVideo,
    currentQueueIdx,
    videoQueue,
  ]);

  const activeChannel =
    liveTvChannels.find(c => c.id === (activeLiveChannelId || nowPlaying?.id)) ??
    liveTvChannels[0];

  const title =
    isLiveMode && activeChannel
      ? activeChannel.title
      : props.title ?? nowPlaying?.title ?? 'Simba Video';
  const subtitle =
    isLiveMode && activeChannel
      ? [activeChannel.genre, activeChannel.country].filter(Boolean).join(' · ') ||
        'Live TV'
      : props.subtitle ?? nowPlaying?.subtitle ?? '';

  const handleStageTap = useCallback(
    (locationX: number) => {
      const now = Date.now();
      const isDouble = now - lastTap.current < 260;
      if (isDouble && !isLiveMode) {
        const leftHalf = locationX < screen.width / 2;
        if (leftHalf) {
          commands.skipBackward(10);
          showHud('-10s');
        } else {
          commands.skipForward(10);
          showHud('+10s');
        }
        lastTap.current = 0;
        return;
      }
      setChromeVisible(v => !v);
      lastTap.current = now;
    },
    [isLiveMode, screen.width, commands, showHud],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 14,
      onPanResponderGrant: e => {
        startY.current = e.nativeEvent.locationY;
      },
      onPanResponderMove: (e, g) => {
        if (Math.abs(g.dy) < 24) {
          return;
        }
        const leftHalf = e.nativeEvent.locationX < screen.width / 2;
        const delta = -g.dy / (screen.height * 1.4);
        if (leftHalf) {
          const next = Math.min(1, Math.max(0.1, brightnessRef.current + delta));
          brightnessRef.current = next;
          commands.setScreenBrightness(next);
          showHud(`Brightness ${Math.round(next * 100)}%`);
        } else {
          const next = Math.min(1, Math.max(0, volumeRef.current + delta));
          volumeRef.current = next;
          commands.setVolume(Math.round(next * 100));
          showHud(`Volume ${Math.round(next * 100)}%`);
        }
      },
    }),
  ).current;

  const handleSeekBarLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width > 0) {
      setSeekBarWidth(e.nativeEvent.layout.width);
    }
  };

  const handleRetry = () => {
    if (nowPlaying) {
      loadedUrlRef.current = null;
      void playCatalogueItem(nowPlaying);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.videoStage},
      ]}>
      <View style={styles.stage} {...panResponder.panHandlers}>
        {/* Real Fabric libmpv SurfaceView */}
        <SimbaVideo
          style={StyleSheet.absoluteFill}
          resizeMode={ASPECT_RESIZE_MODES[aspectIdx]}
        />

        {/* Full-stage tap backdrop ONLY when controls are hidden */}
        {!chromeVisible ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={e => handleStageTap(e.nativeEvent.locationX)}
            accessibilityLabel="Show player controls"
          />
        ) : null}

        {/* Buffering / Error Center Overlay */}
        {streamError ? (
          <View style={styles.centerOverlay}>
            <SimbaIcon
              name="alert-circle-outline"
              size={40}
              color={colors.accent.gold}
            />
            <AppText variant="title" tone="bright">
              Unable to load video
            </AppText>
            <AppText variant="caption" tone="mutedOnMedia">
              {streamError}
            </AppText>
            <View style={{marginTop: 6}}>
              <Button label="Retry" onPress={handleRetry} />
            </View>
          </View>
        ) : isBuffering && !chromeVisible ? (
          <View style={styles.centerOverlay} pointerEvents="none">
            <View
              style={[
                styles.bufferingBadge,
                {
                  backgroundColor: colors.background.scrimStrong,
                  borderRadius: radius.full,
                },
              ]}>
              <BufferingRing size={32} color={colors.accent.gold} strokeWidth={3} />
            </View>
            <AppText variant="caption" tone="bright">
              {positionSeconds === 0 ? 'Preparing…' : 'Buffering…'}
            </AppText>
          </View>
        ) : null}

        {/* Gesture HUD pill (Volume / Brightness / ±10s) */}
        {hudText ? (
          <View
            pointerEvents="none"
            style={[
              styles.hudPill,
              {
                top: insets.top + 68,
                backgroundColor: colors.background.onMediaPill,
                borderRadius: radius.pill,
              },
            ]}>
            <AppText variant="labelSmall" tone="bright">
              {hudText}
            </AppText>
          </View>
        ) : null}

        {/* Interactive Player Chrome — 3 non-overlapping flex regions (Top / Middle / Bottom) */}
        {chromeVisible ? (
          <View
            nativeID={PIP_CHROME_NATIVE_ID}
            style={[StyleSheet.absoluteFill, styles.chromeColumn]}>
            {/* Top Gradient Scrim + Flush Safe-Area Header */}
            <View
              style={[styles.topScrim, {paddingTop: insets.top + 6}]}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  colors.background.scrimStrong,
                  colors.background.scrimDim,
                  colors.background.playerScrim.none,
                ]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.topBar}>
                <IconButton
                  name="chevron-down"
                  onPress={() => {
                    exitToPortrait();
                    router.back();
                  }}
                  accessibilityLabel="Minimise player"
                  onMedia
                />
                <View style={styles.titleWrap}>
                  <AppText variant="title" tone="bright" numberOfLines={1}>
                    {title}
                  </AppText>
                  {subtitle ? (
                    <AppText
                      variant="caption"
                      tone="mutedOnMedia"
                      numberOfLines={1}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>

                <IconButton
                  name="dots-vertical"
                  onPress={() => setMoreOpen(true)}
                  accessibilityLabel="More options"
                  onMedia
                />
                <IconButton
                  name="close"
                  onPress={() => {
                    exitToPortrait();
                    stopAndClose();
                    router.back();
                  }}
                  accessibilityLabel="Stop and close player"
                  onMedia
                />
              </View>
            </View>

            {/* Center Stage (tap empty area to hide controls; transport buttons sit centered) */}
            <Pressable
              style={styles.centerTransport}
              onPress={e => handleStageTap(e.nativeEvent.locationX)}
              accessibilityLabel="Hide player controls">
              {isLiveMode ? (
                <IconButton
                  name="skip-previous"
                  onPress={handlePrev}
                  accessibilityLabel="Previous channel"
                  onMedia
                  size={28}
                />
              ) : (
                <>
                  <View style={{opacity: hasPrevVideo || positionSeconds > 3 ? 1 : 0.35}}>
                    <IconButton
                      name="skip-previous"
                      onPress={handlePrev}
                      accessibilityLabel={
                        hasPrevVideo ? 'Previous video' : 'Restart video'
                      }
                      onMedia
                      size={24}
                    />
                  </View>
                  <IconButton
                    name="rewind-10"
                    onPress={() => {
                      handleSeekSeconds(positionSeconds - 10);
                      showHud('-10s');
                    }}
                    accessibilityLabel="Rewind 10 seconds"
                    onMedia
                    size={28}
                  />
                </>
              )}

              <Pressable
                onPress={handleTogglePlay}
                accessibilityRole="button"
                accessibilityLabel={isBuffering ? 'Buffering' : isPlaying ? 'Pause' : 'Play'}
                style={[
                  styles.playButton,
                  {
                    backgroundColor: colors.brand.primary,
                    borderRadius: radius.full,
                  },
                ]}>
                {isBuffering ? (
                  <BufferingRing
                    size={30}
                    color={colors.brand.onPrimary}
                    strokeWidth={3}
                  />
                ) : (
                  <SimbaIcon
                    name={isPlaying ? 'pause' : 'play'}
                    size={34}
                    color={colors.brand.onPrimary}
                  />
                )}
              </Pressable>

              {isLiveMode ? (
                <IconButton
                  name="skip-next"
                  onPress={handleNext}
                  accessibilityLabel="Next channel"
                  onMedia
                  size={28}
                />
              ) : (
                <>
                  <IconButton
                    name="fast-forward-10"
                    onPress={() => {
                      handleSeekSeconds(positionSeconds + 10);
                      showHud('+10s');
                    }}
                    accessibilityLabel="Forward 10 seconds"
                    onMedia
                    size={28}
                  />
                  <View style={{opacity: hasNextVideo ? 1 : 0.35}}>
                    <IconButton
                      name="skip-next"
                      onPress={handleNext}
                      disabled={!hasNextVideo}
                      accessibilityLabel="Next video"
                      onMedia
                      size={24}
                    />
                  </View>
                </>
              )}
            </Pressable>

            {/* Bottom Gradient Scrim + Context-Aware Transport Bar */}
            <View
              style={[
                styles.bottomScrim,
                {paddingBottom: Math.max(16, insets.bottom + 8)},
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  colors.background.playerScrim.none,
                  colors.background.scrimDim,
                  colors.background.scrimStrong,
                ]}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
              />
              {isLiveMode ? (
                /* Live TV Bottom Bar — NO scrub bar, NO speed selector */
                <View style={styles.liveBottomRow}>
                  <View style={styles.livePill}>
                    <View
                      style={[
                        styles.liveDot,
                        {
                          backgroundColor: colors.semantic.error,
                          borderRadius: radius.full,
                        },
                      ]}
                    />
                    <AppText variant="labelSmall" tone="bright">
                      LIVE
                    </AppText>
                  </View>

                  <View style={styles.liveRightRow}>
                    <Pressable
                      onPress={() => setChannelSheetOpen(true)}
                      accessibilityRole="button"
                      style={[
                        styles.channelBtn,
                        {
                          backgroundColor: colors.brand.primary,
                          borderRadius: radius.pill,
                        },
                      ]}>
                      <SimbaIcon
                        name="television-guide"
                        size={16}
                        color={colors.brand.onPrimary}
                      />
                      <AppText
                        variant="labelSmall"
                        style={{color: colors.brand.onPrimary}}>
                        {`Channels (${liveTvChannels.length})`}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setChromeVisible(false);
                        requestAnimationFrame(() => {
                          const entered = commands.enterPip(title, 'LIVE');
                          if (!entered) {
                            setChromeVisible(true);
                            setIsPipActive(true);
                            router.back();
                          }
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Enter Picture in Picture"
                      style={styles.bottomIconBtn}>
                      <SimbaIcon
                        name="picture-in-picture-bottom-right-outline"
                        size={20}
                        color={colors.text.bright}
                      />
                    </Pressable>
                    <Pressable
                      onPress={toggleFullscreen}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                      }
                      style={styles.bottomIconBtn}>
                      <SimbaIcon
                        name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                        size={22}
                        color={colors.text.bright}
                      />
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* VOD Bottom Bar — Interactive Scrub Bar with Buffer Islands + Thumb Dot */
                <View style={styles.vodBottomCol}>
                  <PlayerSeekBar
                    progress={progress}
                    durationMs={durationMs}
                    cacheRanges={mpvProgress.cacheRanges}
                    isBuffering={isBuffering}
                    onSeekFraction={ratio => {
                      if (duration > 0) {
                        handleSeekSeconds(Math.round(ratio * duration));
                      }
                    }}
                    accessibilityLabel="Seek timeline"
                  />

                  <View style={styles.timeRow}>
                    <View style={styles.timeReadoutRow}>
                      <AppText variant="mono" tone="gold">
                        {formatTime(positionSeconds)}
                      </AppText>
                      <AppText variant="mono" tone="mutedOnMedia">
                        {duration > 0 ? ` / ${formatTime(duration)}` : ''}
                      </AppText>
                    </View>

                    <View style={styles.bottomControlsRow}>
                      <Pressable
                        onPress={() => {
                          const nextIdx = (speedIdx + 1) % SPEEDS.length;
                          setSpeedIdx(nextIdx);
                          commands.setSpeed(SPEEDS[nextIdx]);
                          showHud(`Speed ${SPEEDS[nextIdx]}x`);
                        }}
                        accessibilityRole="button"
                        style={styles.bottomTextBtn}>
                        <AppText variant="labelSmall" tone="gold">
                          {`${SPEEDS[speedIdx]}x`}
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => router.push('/player/queue')}
                        accessibilityRole="button"
                        style={styles.bottomTextBtn}>
                        <AppText variant="labelSmall" tone="mutedOnMedia">
                          Queue
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          const pct = `${Math.round(progress * 100)}%`;
                          setChromeVisible(false);
                          requestAnimationFrame(() => {
                            const entered = commands.enterPip(title, pct);
                            if (!entered) {
                              setChromeVisible(true);
                              setIsPipActive(true);
                              router.back();
                            }
                          });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Enter Picture in Picture"
                        style={styles.bottomIconBtn}>
                        <SimbaIcon
                          name="picture-in-picture-bottom-right-outline"
                          size={20}
                          color={colors.text.bright}
                        />
                      </Pressable>

                      <Pressable
                        onPress={toggleFullscreen}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                        }
                        style={styles.bottomIconBtn}>
                        <SimbaIcon
                          name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                          size={22}
                          color={colors.text.bright}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </View>

      {/* Sheet 1: Live TV Channel Switcher (Live TV mode only) */}
      <Sheet
        visible={channelSheetOpen}
        onClose={() => setChannelSheetOpen(false)}
        title="Live TV Channels"
        subtitle="Switch broadcast without leaving the player"
        tone="onMedia">
        <View style={styles.sheetList}>
          {liveTvChannels.map(ch => {
            const active = ch.id === (activeLiveChannelId || nowPlaying?.id);
            return (
              <Pressable
                key={ch.id}
                onPress={() => {
                  loadedUrlRef.current = null;
                  setActiveLiveChannelId(ch.id);
                  void playCatalogueItem(ch);
                  setChannelSheetOpen(false);
                }}
                accessibilityRole="button"
                style={[
                  styles.channelRow,
                  {
                    borderBottomColor: colors.border.subtle,
                  },
                ]}>
                <SimbaIcon
                  name="access-point"
                  size={18}
                  color={active ? colors.accent.gold : colors.text.onMediaMuted}
                />
                <View style={styles.channelCopy}>
                  <AppText variant="label" tone="bright" numberOfLines={1}>
                    {ch.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    tone="mutedOnMedia"
                    numberOfLines={1}>
                    {ch.subtitle}
                  </AppText>
                </View>
                {active ? <Badge label="LIVE" tone="gold" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Sheet 2: Video More Options */}
      <Sheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Playback Settings"
        tone="onMedia">
        <View style={styles.sheetList}>
          <Pressable
            onPress={() => {
              const next = (aspectIdx + 1) % ASPECT_MODES.length;
              setAspectIdx(next);
              showHud(`Aspect: ${ASPECT_MODES[next]}`);
            }}
            accessibilityRole="button"
            style={[
              styles.qualityRow,
              {
                borderBottomColor: colors.border.subtle,
                marginBottom: 8,
              },
            ]}>
            <View style={styles.channelCopy}>
              <AppText variant="label" tone="bright">
                Video Zoom / Aspect Ratio
              </AppText>
              <AppText variant="caption" tone="mutedOnMedia">
                {`Current: ${ASPECT_MODES[aspectIdx]}`}
              </AppText>
            </View>
            <AppText variant="labelSmall" tone="gold">
              {ASPECT_MODES[aspectIdx]}
            </AppText>
          </Pressable>

          <AppText variant="overline" tone="gold">
            STREAM QUALITY
          </AppText>
          {QUALITY_PRESETS.map(preset => {
            const active = preset.value === quality;
            return (
              <Pressable
                key={preset.value}
                onPress={() => {
                  setQuality(preset.value);
                  setMoreOpen(false);
                }}
                accessibilityRole="button"
                style={[
                  styles.qualityRow,
                  {
                    borderBottomColor: colors.border.subtle,
                  },
                ]}>
                <View style={styles.channelCopy}>
                  <AppText
                    variant="label"
                    tone={active ? 'gold' : 'bright'}>
                    {preset.label}
                  </AppText>
                  <AppText variant="caption" tone="mutedOnMedia">
                    {preset.description}
                  </AppText>
                </View>
                {active ? (
                  <SimbaIcon
                    name="check-circle"
                    size={18}
                    color={colors.accent.gold}
                  />
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => {
              setMoreOpen(false);
              stopAndClose();
              router.back();
            }}
            accessibilityRole="button"
            style={styles.stopRow}>
            <SimbaIcon name="close" size={18} color={colors.semantic.error} />
            <AppText
              variant="label"
              style={{color: colors.semantic.error}}>
              Stop Playback &amp; Close
            </AppText>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  stage: {flex: 1},
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  bufferingBadge: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudPill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chromeColumn: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  topScrim: {
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleWrap: {
    flex: 1,
    gap: 1,
    paddingHorizontal: 4,
  },
  centerTransport: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  playButton: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomScrim: {
    paddingTop: 28,
    paddingHorizontal: 16,
  },
  vodBottomCol: {gap: 6},
  seekHitArea: {
    paddingVertical: 10,
  },
  seekTrack: {
    height: 4.5,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  bufferIsland: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  playedFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeReadoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTextBtn: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
  },
  channelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sheetList: {gap: 4},
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  channelCopy: {flex: 1, gap: 2},
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
  },
});
