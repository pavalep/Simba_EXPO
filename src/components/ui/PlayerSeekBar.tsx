import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

const MIN_BUFFER_ISLAND_PX = 2;

export interface CacheRange {
  start: number;
  end: number;
}

interface BufferedSegment {
  startFraction: number;
  endFraction: number;
}

/**
 * Derives normalized `[0, 1]` buffer islands from libmpv's `demuxer-cache-state`
 * `seekable-ranges` (`{start, end}` in ms), merging overlapping ranges while
 * preserving unbuffered gaps (matches main SIMBA's `useTransport.ts`).
 */
export function deriveBufferedSegments(
  cacheRanges: readonly CacheRange[] | undefined,
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

export interface PlayerSeekBarProps {
  /** Normalized `[0, 1]` played progress. */
  progress: number;
  /** Total duration in milliseconds (used to project buffer islands). */
  durationMs: number;
  /** Cached seekable ranges from `usePlayerProgress().cacheRanges`. */
  cacheRanges?: readonly CacheRange[];
  /** Whether the stream is currently preparing or buffering. */
  isBuffering?: boolean;
  /** Called with a normalized `[0, 1]` fraction when the user finishes tapping or dragging. */
  onSeekFraction?: (fraction: number) => void;
  /** Optional live preview callback while the user drags (`null` when released). */
  onScrubFraction?: (fraction: number | null) => void;
  accessibilityLabel?: string;
}

/**
 * YouTube / Netflix / Apple Music grade seek bar with:
 * - Translucent base track
 * - Distinct cached buffer islands (`demuxer-cache-state`)
 * - Warm gold played fill in exact pixel lockstep with playhead thumb
 * - Smooth tap + horizontal finger-drag scrubbing with live preview
 * - Subtle buffering shimmer sweep when stalled
 */
export function PlayerSeekBar({
  progress,
  durationMs,
  cacheRanges,
  isBuffering = false,
  onSeekFraction,
  onScrubFraction,
  accessibilityLabel = 'Seek timeline',
}: PlayerSeekBarProps) {
  const {colors} = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const barWidthRef = useRef(0);
  barWidthRef.current = barWidth;
  const dragFractionRef = useRef<number | null>(null);
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!isBuffering) {
      pulse.stopAnimation();
      pulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isBuffering, pulse]);

  const effectiveProgress = dragFraction ?? progress;
  const clamped = Math.min(1, Math.max(0, effectiveProgress));
  const bufferedSegments = useMemo(
    () => deriveBufferedSegments(cacheRanges, durationMs),
    [cacheRanges, durationMs],
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width > 0) {
      setBarWidth(e.nativeEvent.layout.width);
    }
  };

  const xToFraction = useCallback((x: number) => {
    const w = barWidthRef.current;
    if (w <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, x / w));
  }, []);

  const canSeek = Boolean(onSeekFraction);
  const responder = useMemo(
    () => ({
      onStartShouldSetResponder: () => canSeek,
      onMoveShouldSetResponder: () => canSeek,
      onResponderTerminationRequest: () => false,
      onResponderGrant: (e: GestureResponderEvent) => {
        if (!canSeek) {
          return;
        }
        const ratio = xToFraction(e.nativeEvent.locationX);
        dragFractionRef.current = ratio;
        setDragFraction(ratio);
        onScrubFraction?.(ratio);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (!canSeek) {
          return;
        }
        const ratio = xToFraction(e.nativeEvent.locationX);
        dragFractionRef.current = ratio;
        setDragFraction(ratio);
        onScrubFraction?.(ratio);
      },
      onResponderRelease: (e: GestureResponderEvent) => {
        if (!canSeek) {
          return;
        }
        const ratio =
          barWidthRef.current > 0
            ? xToFraction(e.nativeEvent.locationX)
            : (dragFractionRef.current ?? clamped);
        dragFractionRef.current = null;
        setDragFraction(null);
        onScrubFraction?.(null);
        onSeekFraction?.(ratio);
      },
      onResponderTerminate: () => {
        dragFractionRef.current = null;
        setDragFraction(null);
        onScrubFraction?.(null);
      },
    }),
    [canSeek, clamped, onScrubFraction, onSeekFraction, xToFraction],
  );

  const isDragging = dragFraction != null;
  const thumbSize = isDragging ? 16 : 13;
  const playedPx = barWidth > 0 ? clamped * barWidth : 0;
  const thumbLeft =
    barWidth > 0
      ? Math.max(0, Math.min(barWidth - thumbSize, playedPx - thumbSize / 2))
      : 0;

  return (
    <View
      onLayout={handleLayout}
      {...responder}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      style={styles.hitArea}>
      <View
        pointerEvents="none"
        style={[
          styles.track,
          {backgroundColor: colors.background.seekTrack.empty},
        ]}>
        {/* Cached Buffer Islands */}
        {barWidth > 0
          ? bufferedSegments.map((seg, idx) => {
              const leftPx = seg.startFraction * barWidth;
              const widthPx = Math.max(
                MIN_BUFFER_ISLAND_PX,
                (seg.endFraction - seg.startFraction) * barWidth,
              );
              return (
                <View
                  key={`${idx}-${seg.startFraction.toFixed(3)}`}
                  style={[
                    styles.island,
                    {
                      left: leftPx,
                      width: widthPx,
                      backgroundColor: colors.background.seekTrack.buffered,
                    },
                  ]}
                />
              );
            })
          : null}

        {/* Subtle Buffering Pulse Overlay */}
        {isBuffering ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.background.seekTrack.buffered,
                opacity: pulse,
              },
            ]}
          />
        ) : null}

        {/* Played Gold Fill */}
        <View
          style={[
            styles.played,
            {
              width: barWidth > 0 ? playedPx : `${clamped * 100}%`,
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      </View>

      {/* Playhead Thumb Dot */}
      {barWidth > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/**
 * Pure React Native smooth rotating arc ring for in-button buffering feedback
 * (replaces OS ActivityIndicator per Simba_EXPO design rules).
 */
export function BufferingRing({
  size = 28,
  color,
  strokeWidth = 3,
}: {
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: color,
        transform: [{rotate}],
      }}
    />
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  island: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  played: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 6.5,
  },
});
