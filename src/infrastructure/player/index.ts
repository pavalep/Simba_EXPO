import {useCallback, useState} from 'react';
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
          await commands.openPlayer({
            uri: resolved.url,
            title: item.title,
            type: 'audio',
          });
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
