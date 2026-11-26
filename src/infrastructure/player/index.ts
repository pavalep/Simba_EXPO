import {useCallback, useEffect, useRef, useState} from 'react';
import {
  SimbaVideo,
  usePlayer,
  usePlayerProgress,
  resolveStreamType,
  captureFrame,
  type SimbaVideoProps,
  type SimbaVideoResizeMode,
  type PlayerState,
  type PlayerProgress,
  type PlayerCommands,
  type MpvTrack,
  type MpvChapter,
  type MpvFileInfo,
} from '@simba-dev/react-native-media-player';
import type {CatalogueItem} from '../../data/dummy';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  isArchiveDirectoryUrl,
  resolvePlayableStreamUrl,
} from '../api/mappers';
import {logger} from '../../lib/logger';

/**
 * Native view ID read by `MainActivity.onUserLeaveHint()` ->
 * `MpvBridgeModule.notifyUserLeaveHint()` to synchronously hide video controls
 * before Android snapshots the window for Picture-in-Picture.
 */
export const PIP_CHROME_NATIVE_ID = 'simba-pip-chrome';

export {
  SimbaVideo,
  usePlayer,
  usePlayerProgress,
  resolveStreamType,
  captureFrame,
  type SimbaVideoProps,
  type SimbaVideoResizeMode,
  type PlayerState,
  type PlayerProgress,
  type PlayerCommands,
  type MpvTrack,
  type MpvChapter,
  type MpvFileInfo,
};

// ─── Live Catalogue Item Registry ───────────────────────────────────────────
// Stores live API items by `id` so detail/player routes (`/media/[id]`) can
// immediately resolve live metadata, artwork, and stream URLs.
const liveItemRegistry = new Map<string, CatalogueItem>();
const MAX_REGISTRY_SIZE = 400;

export function registerLiveItems(items: CatalogueItem[]): void {
  for (const item of items) {
    liveItemRegistry.set(item.id, item);
  }
  if (liveItemRegistry.size > MAX_REGISTRY_SIZE) {
    const excess = liveItemRegistry.size - MAX_REGISTRY_SIZE;
    const keys = liveItemRegistry.keys();
    for (let i = 0; i < excess; i++) {
      const next = keys.next();
      if (next.done) {
        break;
      }
      liveItemRegistry.delete(next.value);
    }
  }
}

export function registerLiveItem(item: CatalogueItem): void {
  registerLiveItems([item]);
}

export function getLiveItemById(id: string): CatalogueItem | undefined {
  return liveItemRegistry.get(id);
}

// ─── Pending Video Stream Cache ─────────────────────────────────────────────
// Video streams load once `<SimbaVideo>` surface is mounted in VideoPlayerScreen.
let pendingVideoLoad: {
  itemId: string;
  url: string;
  title: string;
  headers?: Record<string, string>;
} | null = null;

export function getPendingVideoLoad() {
  return pendingVideoLoad;
}

export function clearPendingVideoLoad(itemId?: string) {
  if (!itemId || pendingVideoLoad?.itemId === itemId) {
    pendingVideoLoad = null;
  }
}

const EQ_BAND_FREQS = [60, 230, 910, 3600, 14000] as const;

export function buildMpvEqFilter(gainsDb: number[]): string {
  const allFlat = gainsDb.every(g => Math.abs(g) < 0.25);
  if (allFlat) {
    return '';
  }
  const filters = EQ_BAND_FREQS.map((freq, idx) => {
    const gain = Math.max(-12, Math.min(12, gainsDb[idx] ?? 0));
    return `equalizer=f=${freq}:t=q:w=1.2:g=${gain.toFixed(1)}`;
  });
  return `lavfi=[${filters.join(',')}]`;
}

/**
 * Unified playback hook bridging SIMBA's CatalogueItem domain, live stream URL
 * resolution, `useSimbaDummy` UI state, and `@simba-dev/react-native-media-player`.
 */
export function useSimbaPlayback() {
  const {state: mpvState, commands} = usePlayer();
  const dummy = useSimbaStore();
  const [resolvingStream, setResolvingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const applyHttpHeaders = useCallback(
    (headers?: Record<string, string>) => {
      if (!headers || Object.keys(headers).length === 0) {
        commands.setProperty('http-header-fields', '');
        return;
      }
      const formatted = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join(',');
      commands.setProperty('http-header-fields', formatted);
    },
    [commands],
  );

  const playCatalogueItem = useCallback(
    async (item: CatalogueItem): Promise<boolean> => {
      registerLiveItem(item);
      dummy.playItem(item);
      setStreamError(null);

      // Fast synchronous path: if the direct stream URL is already known
      // (prefetched on MediaDetailScreen mount or provided by listing API),
      // stage it immediately with zero async wait so libmpv loads on frame 1.
      const hasDirectUrl =
        typeof item.streamUrl === 'string' &&
        item.streamUrl.startsWith('http') &&
        !isArchiveDirectoryUrl(item.streamUrl);

      if (hasDirectUrl && item.streamUrl) {
        applyHttpHeaders(item.httpHeaders);
        if (item.lane === 'video') {
          pendingVideoLoad = {
            itemId: item.id,
            url: item.streamUrl,
            title: item.title,
            headers: item.httpHeaders,
          };
        } else {
          pendingVideoLoad = null;
          commands.loadFile(item.streamUrl, item.title);
          commands.play();
        }
        setResolvingStream(false);
        return true;
      }

      setResolvingStream(true);

      try {
        const resolved = await resolvePlayableStreamUrl(item);
        if (!resolved?.url) {
          logger.info('No remote stream URL for item; keeping UI state', {
            id: item.id,
            provider: item.provider,
          });
          setStreamError('No playable stream is available for this title.');
          setResolvingStream(false);
          return false;
        }

        // Persist resolved stream URL on the cached item for replay
        const enriched: CatalogueItem = {
          ...item,
          streamUrl: resolved.url,
          httpHeaders: resolved.headers ?? item.httpHeaders,
        };
        registerLiveItem(enriched);
        dummy.playItem(enriched);

        applyHttpHeaders(enriched.httpHeaders);

        if (item.lane === 'video') {
          pendingVideoLoad = {
            itemId: item.id,
            url: resolved.url,
            title: item.title,
            headers: enriched.httpHeaders,
          };
        } else {
          pendingVideoLoad = null;
          commands.loadFile(resolved.url, item.title);
          commands.play();
        }
        setResolvingStream(false);
        return true;
      } catch (err) {
        logger.warn('Failed to resolve or start stream', {
          id: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
        setStreamError('Unable to start playback right now.');
        setResolvingStream(false);
        return false;
      }
    },
    [applyHttpHeaders, commands, dummy],
  );

  const stopAndClose = useCallback(() => {
    pendingVideoLoad = null;
    try {
      commands.stopPlayback();
    } catch {
      commands.stop();
    }
    dummy.setIsPipActive(false);
    dummy.setDockVisible(false);
  }, [commands, dummy]);

  const applyEqualizer = useCallback(
    (gainsDb: number[]) => {
      const af = buildMpvEqFilter(gainsDb);
      commands.setProperty('af', af);
    },
    [commands],
  );

  return {
    mpvState,
    commands,
    resolvingStream,
    streamError,
    playCatalogueItem,
    stopAndClose,
    applyEqualizer,
  };
}

export interface SmoothPlaybackPositionOptions {
  /** Authoritative position in ms from libmpv (`usePlayerProgress().positionMs`). */
  positionMs: number;
  /** Total duration in ms. */
  durationMs: number;
  /** True when the engine is actively playing. */
  isPlaying: boolean;
  /** True when stalled/buffering (pauses interpolation). */
  isBuffering?: boolean;
  /** True while engine is seeking (pauses interpolation). */
  isSeeking?: boolean;
  /** Playback rate multiplier (defaults to 1). */
  speed?: number;
  /** Active media identifier; resets interpolation anchor on track change. */
  mediaKey?: string | null;
}

const SMOOTH_TICK_MS = 100;
const SEEK_CONFIRM_TOLERANCE_MS = 650;
const SEEK_CONFIRM_FALLBACK_MS = 1200;
const BACKWARD_JITTER_GUARD_MS = 350;

/**
 * Smooth 10 Hz playback clock anchored to libmpv's `time-pos` events.
 *
 * On audio-only streams (podcasts, music, audiobooks), libmpv has no video
 * frames to trigger per-frame `time-pos` updates and instead emits `time-pos`
 * only when audio buffers flush (every 2–5 s on Android AudioTrack). Without
 * local interpolation, the seekbar and elapsed timer jump in 3–5 s chunks.
 *
 * This hook advances smoothly between native ticks at `speed`x, re-anchors on
 * every authoritative libmpv update (suppressing tiny backward audio-buffer
 * jitter), freezes immediately when paused/buffering, and holds optimistic
 * seek targets until libmpv confirms the new position.
 */
export function useSmoothPlaybackPosition({
  positionMs,
  durationMs,
  isPlaying,
  isBuffering = false,
  isSeeking = false,
  speed = 1,
  mediaKey,
}: SmoothPlaybackPositionOptions) {
  const safeSpeed = speed > 0 && Number.isFinite(speed) ? speed : 1;
  const anchorRef = useRef({posMs: positionMs, wallMs: Date.now()});
  const [displayPositionMs, setDisplayPositionMs] = useState(positionMs);
  const [pendingSeekMs, setPendingSeekMs] = useState<number | null>(null);
  const seekFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMediaKeyRef = useRef(mediaKey);

  // Reset immediately when switching tracks
  useEffect(() => {
    if (lastMediaKeyRef.current !== mediaKey) {
      lastMediaKeyRef.current = mediaKey;
      anchorRef.current = {posMs: positionMs, wallMs: Date.now()};
      setPendingSeekMs(null);
      if (seekFallbackRef.current) {
        clearTimeout(seekFallbackRef.current);
        seekFallbackRef.current = null;
      }
      setDisplayPositionMs(positionMs);
    }
  }, [mediaKey, positionMs]);

  // Clear pending seek once libmpv confirms arrival near the target
  useEffect(() => {
    if (pendingSeekMs == null) {
      return;
    }
    if (Math.abs(positionMs - pendingSeekMs) <= SEEK_CONFIRM_TOLERANCE_MS) {
      setPendingSeekMs(null);
      if (seekFallbackRef.current) {
        clearTimeout(seekFallbackRef.current);
        seekFallbackRef.current = null;
      }
      anchorRef.current = {posMs: positionMs, wallMs: Date.now()};
      setDisplayPositionMs(positionMs);
    }
  }, [positionMs, pendingSeekMs]);

  // Re-anchor whenever an authoritative positionMs arrives from libmpv
  useEffect(() => {
    if (pendingSeekMs != null) {
      return;
    }
    const now = Date.now();
    const elapsedWall = now - anchorRef.current.wallMs;
    const predictedMs =
      isPlaying && !isBuffering && !isSeeking
        ? anchorRef.current.posMs + elapsedWall * safeSpeed
        : anchorRef.current.posMs;

    const backwardDelta = predictedMs - positionMs;
    if (
      isPlaying &&
      !isBuffering &&
      !isSeeking &&
      backwardDelta > 0 &&
      backwardDelta < BACKWARD_JITTER_GUARD_MS
    ) {
      // Suppress tiny backward audio-buffer jitter while playing
      return;
    }

    anchorRef.current = {posMs: positionMs, wallMs: now};
    setDisplayPositionMs(positionMs);
  }, [positionMs, isPlaying, isBuffering, isSeeking, safeSpeed, pendingSeekMs]);

  // Smooth 10 Hz tick between native libmpv updates
  useEffect(() => {
    if (!isPlaying || isBuffering || isSeeking || durationMs <= 0) {
      return;
    }
    anchorRef.current = {
      posMs: pendingSeekMs ?? displayPositionMs,
      wallMs: Date.now(),
    };
    const id = setInterval(() => {
      if (pendingSeekMs != null) {
        return;
      }
      const elapsed = Date.now() - anchorRef.current.wallMs;
      const next = Math.min(
        durationMs,
        Math.max(0, anchorRef.current.posMs + elapsed * safeSpeed),
      );
      setDisplayPositionMs(next);
    }, SMOOTH_TICK_MS);
    return () => clearInterval(id);
    // Intentionally anchor when play/pause/buffering/speed/duration/seek state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isBuffering, isSeeking, durationMs, safeSpeed, pendingSeekMs]);

  useEffect(() => {
    return () => {
      if (seekFallbackRef.current) {
        clearTimeout(seekFallbackRef.current);
      }
    };
  }, []);

  const commitOptimisticSeek = useCallback((targetMs: number) => {
    const clamped = Math.max(0, targetMs);
    setPendingSeekMs(clamped);
    anchorRef.current = {posMs: clamped, wallMs: Date.now()};
    setDisplayPositionMs(clamped);
    if (seekFallbackRef.current) {
      clearTimeout(seekFallbackRef.current);
    }
    seekFallbackRef.current = setTimeout(() => {
      setPendingSeekMs(null);
      seekFallbackRef.current = null;
    }, SEEK_CONFIRM_FALLBACK_MS);
  }, []);

  return {
    displayPositionMs: pendingSeekMs ?? displayPositionMs,
    commitOptimisticSeek,
  };
}
