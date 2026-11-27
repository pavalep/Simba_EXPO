import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  registerLiveItem,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {pickAndScanLocalFolder} from '../../services/localMediaService';
import {MEDIA_KIND_LABELS} from '../../types/media';
import {
  AppText,
  Badge,
  Button,
  Chip,
  IconButton,
  MediaArtwork,
  Rail,
  Screen,
} from '../ui';

type LocalFilter = 'all' | 'audio' | 'video';

/**
 * ON THIS PHONE (DEVICE FOLDERS & LOCAL MEDIA)
 *
 * Uses Android's native Storage Access Framework (`Directory.pickDirectoryAsync`)
 * to connect any folder on the phone (Music, Movies, Downloads, Podcasts, SD card),
 * scans real playable audio & video files, and integrates them seamlessly with
 * Jump Back In (Recent), Favorites (♥), Player Bookmarks (🔖), Playlists, and Search.
 */
export function FoldersScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    linkedFolders,
    localFiles,
    addLinkedFolder,
    removeLinkedFolder,
    rescanLinkedFolders,
    isFavorite,
    toggleFavorite,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();

  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<LocalFilter>('all');

  const audioCount = useMemo(
    () => localFiles.filter(f => f.lane === 'audio').length,
    [localFiles],
  );
  const videoCount = useMemo(
    () => localFiles.filter(f => f.lane === 'video').length,
    [localFiles],
  );

  const filteredFiles = useMemo(() => {
    if (filter === 'audio') {
      return localFiles.filter(f => f.lane === 'audio');
    }
    if (filter === 'video') {
      return localFiles.filter(f => f.lane === 'video');
    }
    return localFiles;
  }, [localFiles, filter]);

  const handlePickFolder = async () => {
    if (picking) {
      return;
    }
    setPicking(true);
    try {
      const scanned = await pickAndScanLocalFolder();
      if (scanned) {
        addLinkedFolder(scanned.name, scanned.path, {
          uri: scanned.uri,
          files: scanned.files,
          trackCount: scanned.trackCount,
          videoCount: scanned.videoCount,
        });
      }
    } finally {
      setPicking(false);
    }
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
      <View style={styles.titleCol}>
        <AppText variant="h2">On This Phone</AppText>
        <AppText variant="caption" tone="secondary">
          {localFiles.length > 0
            ? `${localFiles.length} local ${localFiles.length === 1 ? 'file' : 'files'} across ${linkedFolders.length} ${linkedFolders.length === 1 ? 'folder' : 'folders'}`
            : 'Connect phone folders to play local audio & video'}
        </AppText>
      </View>
      {linkedFolders.length > 0 ? (
        <IconButton
          name="folder-sync-outline"
          size={21}
          onPress={rescanLinkedFolders}
          accessibilityLabel="Rescan folders"
        />
      ) : null}
    </View>
  );

  return (
    <Screen scroll header={stickyHeader}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xxl,
          },
        ]}>
        {/* 1. Primary Connect Folder Action */}
        <View style={styles.sectionBlock}>
          <Button
            label={picking ? 'Opening Folder Picker…' : '+ Connect Phone Folder'}
            onPress={() => void handlePickFolder()}
            disabled={picking}
            fullWidth
          />
          <AppText variant="caption" tone="tertiary">
            Choose any Music, Movies, Audiobooks, or Downloads folder. Files stay on your phone and never get copied.
          </AppText>
        </View>

        {/* 2. Connected Folders */}
        {linkedFolders.length > 0 ? (
          <View style={styles.sectionBlock}>
            <AppText variant="h3">Connected Folders</AppText>
            <View style={styles.list}>
              {linkedFolders.map((fld, idx) => (
                <View
                  key={fld.id}
                  style={[
                    styles.folderRow,
                    {
                      borderBottomWidth:
                        idx === linkedFolders.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <View
                    style={[
                      styles.folderIconCircle,
                      {
                        backgroundColor: colors.brand.primaryContainer,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <SimbaIcon
                      name="folder-music-outline"
                      size={20}
                      color={colors.brand.onPrimaryContainer}
                    />
                  </View>
                  <View style={styles.folderCopy}>
                    <AppText variant="title" numberOfLines={1}>
                      {fld.name}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {`${fld.trackCount} audio · ${fld.videoCount} video · ${fld.lastScanned}`}
                    </AppText>
                  </View>
                  <IconButton
                    name="close"
                    size={18}
                    onPress={() => removeLinkedFolder(fld.id)}
                    accessibilityLabel={`Disconnect ${fld.name}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 3. Playable Local Audio & Video Files */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadRow}>
            <AppText variant="h3">Local Media</AppText>
            {picking ? (
              <ActivityIndicator size="small" color={colors.accent.gold} />
            ) : null}
          </View>

          {localFiles.length > 0 && audioCount > 0 && videoCount > 0 ? (
            <Rail gap={8} padding={0}>
              <Chip
                label={`All (${localFiles.length})`}
                selected={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <Chip
                label={`Audio (${audioCount})`}
                selected={filter === 'audio'}
                onPress={() => setFilter('audio')}
              />
              <Chip
                label={`Video (${videoCount})`}
                selected={filter === 'video'}
                onPress={() => setFilter('video')}
              />
            </Rail>
          ) : null}

          {filteredFiles.length === 0 ? (
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
                  name="folder-music-outline"
                  size={28}
                  color={colors.brand.onPrimaryContainer}
                />
              </View>
              <AppText variant="h3" style={{textAlign: 'center'}}>
                {linkedFolders.length === 0
                  ? 'No phone folders connected yet'
                  : 'No audio or video files found'}
              </AppText>
              <AppText
                variant="bodySmall"
                tone="secondary"
                style={{textAlign: 'center', maxWidth: 280}}>
                {linkedFolders.length === 0
                  ? 'Tap "+ Connect Phone Folder" above to browse MP3, FLAC, M4A, MP4, or MKV files stored on your device.'
                  : 'Supported formats: MP3, FLAC, M4A, WAV, OGG, MP4, MKV, WebM, MOV.'}
              </AppText>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredFiles.map((file, idx) => {
                const fav = isFavorite(file.id);
                return (
                  <View
                    key={file.id}
                    style={[
                      styles.fileRow,
                      {
                        borderBottomWidth:
                          idx === filteredFiles.length - 1
                            ? 0
                            : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border.subtle,
                      },
                    ]}>
                    <Pressable
                      onPress={() => {
                        registerLiveItem(file);
                        router.push({
                          pathname: '/media/[id]',
                          params: {id: file.id},
                        });
                      }}
                      accessibilityRole="button"
                      style={styles.fileMain}>
                      <View
                        style={[
                          styles.fileArt,
                          {
                            backgroundColor: colors.accent.goldWash,
                            borderRadius: radius.md,
                            overflow: 'hidden',
                          },
                        ]}>
                        <MediaArtwork
                          uri={file.artworkUrl}
                          icon={file.icon}
                          iconSize={22}
                          iconColor={colors.accent.gold}
                          borderRadius={radius.md}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>
                      <View style={styles.folderCopy}>
                        <View style={styles.badgeRow}>
                          <Badge
                            label={MEDIA_KIND_LABELS[file.kind]}
                            tone="gold"
                          />
                          {file.meta ? <Badge label={file.meta} /> : null}
                        </View>
                        <AppText variant="title" numberOfLines={1}>
                          {file.title}
                        </AppText>
                        <AppText
                          variant="caption"
                          tone="secondary"
                          numberOfLines={1}>
                          {file.subtitle || 'On This Phone'}
                        </AppText>
                      </View>
                    </Pressable>
                    <IconButton
                      name={fav ? 'heart' : 'heart-outline'}
                      size={18}
                      onPress={() => toggleFavorite(file)}
                      accessibilityLabel={
                        fav
                          ? `Remove ${file.title} from Favorites`
                          : `Add ${file.title} to Favorites`
                      }
                    />
                    <IconButton
                      name="play-circle"
                      size={24}
                      onPress={() => {
                        void playCatalogueItem(file);
                        router.push(
                          file.lane === 'video'
                            ? '/player/video'
                            : '/player/audio',
                        );
                      }}
                      accessibilityLabel={`Play ${file.title}`}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 20},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {flex: 1, gap: 2},
  sectionBlock: {gap: 8},
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {marginTop: 2},
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  folderIconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCopy: {flex: 1, gap: 3},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  fileMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileArt: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
