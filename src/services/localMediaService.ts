import {Platform} from 'react-native';
import {Directory, File} from 'expo-file-system';
import {StorageAccessFramework} from 'expo-file-system/legacy';
import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
import type {CatalogueItem} from '../types/catalogue';
import type {MediaKind} from '../types/media';

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'm4a',
  'aac',
  'flac',
  'wav',
  'ogg',
  'opus',
  'm4b',
  'wma',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mkv',
  'webm',
  'mov',
  'avi',
  'm4v',
  'ts',
  '3gp',
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) {
    return '';
  }
  return name.slice(dot + 1).toLowerCase();
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) {
    return '';
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function stableLocalId(uri: string): string {
  let hash = 2166136261;
  for (let i = 0; i < uri.length; i++) {
    hash ^= uri.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `local-${(hash >>> 0).toString(36)}`;
}

function decodeFolderName(uri: string, fallbackName?: string): string {
  if (fallbackName && fallbackName.trim().length > 0) {
    return decodeURIComponent(fallbackName).replace(/^primary:/i, '');
  }
  try {
    const decoded = decodeURIComponent(uri);
    const seg = decoded.split(/[/:]/).filter(Boolean).pop();
    return seg || 'Phone Folder';
  } catch {
    return 'Phone Folder';
  }
}

function inferLocalKind(ext: string, folderName: string): {
  kind: MediaKind;
  lane: 'audio' | 'video';
  icon: CatalogueItem['icon'];
} {
  if (VIDEO_EXTENSIONS.has(ext)) {
    const lowerFolder = folderName.toLowerCase();
    const isMovie = lowerFolder.includes('movie') || lowerFolder.includes('film');
    return {
      kind: isMovie ? 'movie' : 'video',
      lane: 'video',
      icon: 'movie-open-outline',
    };
  }
  const lowerFolder = folderName.toLowerCase();
  if (ext === 'm4b' || lowerFolder.includes('audiobook')) {
    return {
      kind: 'audiobook',
      lane: 'audio',
      icon: 'book-open-page-variant-outline',
    };
  }
  if (lowerFolder.includes('podcast')) {
    return {
      kind: 'podcast',
      lane: 'audio',
      icon: 'podcast',
    };
  }
  return {
    kind: 'music',
    lane: 'audio',
    icon: 'music-clef-treble',
  };
}

export interface ScannedFolderResult {
  name: string;
  path: string;
  uri: string;
  files: CatalogueItem[];
  trackCount: number;
  videoCount: number;
}

/**
 * Recursively scans a real Android SAF (`content://`) or `file://` directory
 * up to `maxDepth` levels for playable audio and video files.
 */
export function scanDirectoryUri(
  dirUri: string,
  displayName?: string,
  maxDepth = 3,
): ScannedFolderResult {
  const root = new Directory(dirUri);
  const folderName = decodeFolderName(dirUri, displayName || root.name);
  const discovered: CatalogueItem[] = [];
  let trackCount = 0;
  let videoCount = 0;

  const walk = (dir: Directory, depth: number) => {
    if (depth > maxDepth) {
      return;
    }
    let entries: (Directory | File)[] = [];
    try {
      entries = dir.list();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry instanceof Directory) {
        if (!entry.name.startsWith('.')) {
          walk(entry, depth + 1);
        }
        continue;
      }
      const rawName = entry.name || decodeFolderName(entry.uri);
      if (rawName.startsWith('.')) {
        continue;
      }
      const ext = getExtension(rawName);
      if (!AUDIO_EXTENSIONS.has(ext) && !VIDEO_EXTENSIONS.has(ext)) {
        continue;
      }
      const {kind, lane, icon} = inferLocalKind(ext, folderName);
      if (lane === 'video') {
        videoCount += 1;
      } else {
        trackCount += 1;
      }
      const sizeStr = formatFileSize(entry.size);
      const extUpper = ext.toUpperCase();
      const meta = [extUpper, sizeStr].filter(Boolean).join(' · ');

      discovered.push({
        id: stableLocalId(entry.uri),
        title: stripExtension(decodeURIComponent(rawName)),
        subtitle: folderName,
        meta: meta || 'On This Phone',
        kind,
        lane,
        source: 'local',
        provider: 'On Device',
        streamUrl: entry.uri,
        icon,
      });
    }
  };

  walk(root, 0);

  return {
    name: folderName,
    path: `Phone Storage / ${folderName}`,
    uri: dirUri,
    files: discovered,
    trackCount,
    videoCount,
  };
}

/**
 * Opens Android's native Storage Access Framework (SAF) folder picker,
 * persists read permission via `MpvPlayerModule.grantPersistablePermission`,
 * and scans all playable audio & video files inside.
 */
export async function pickAndScanLocalFolder(): Promise<ScannedFolderResult | null> {
  try {
    let dirUri: string | null = null;
    let pickedName: string | undefined;

    if (Platform.OS === 'android') {
      const perm =
        await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm?.granted || !perm.directoryUri) {
        return null;
      }
      dirUri = perm.directoryUri;
    } else {
      const picked = await Directory.pickDirectoryAsync();
      if (!picked?.uri) {
        return null;
      }
      dirUri = picked.uri;
      pickedName = picked.name;
    }

    try {
      getMpvPlayerModule().grantPersistablePermission(dirUri);
    } catch {
      // Non-fatal if OS already granted tree permission
    }
    return scanDirectoryUri(dirUri, pickedName);
  } catch {
    // User cancelled picker or picker unavailable
    return null;
  }
}
