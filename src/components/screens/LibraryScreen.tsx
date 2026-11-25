import React, {useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  AppText,
  Badge,
  Button,
  Chip,
  IconButton,
  Rail,
  Screen,
  Sheet,
  Surface,
  UnderlineTabs,
} from '../ui';
import {autoDeleteOptions} from '../../data/dummy';

export type LibraryTab = 'podcasts' | 'playlists' | 'local' | 'downloads';

export interface LibraryScreenProps {
  initialTab?: LibraryTab;
}

/**
 * LIBRARY — My Podcasts & All Playlists (07.3) + Local Files & Offline Downloads (07.4).
 *
 * Respects PF5 label alignment:
 *   • "My Podcasts" (with long-press / Pin to top action, no "Manage" button)
 *   • "All Playlists" (with Pin toggle & Create Playlist sheet)
 *   • "Local Audio & Video" (linked to /folders)
 *   • "Downloads" (with Auto-Delete Policy chips: Never / After 7 days / After 30 days / When watched)
 */
export function LibraryScreen({initialTab = 'podcasts'}: LibraryScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    podcastsList,
    togglePinPodcast,
    toggleFollowPodcast,
    playlistsList,
    togglePinPlaylist,
    createPlaylist,
    downloads,
    removeDownload,
    autoDeletePolicy,
    setAutoDeletePolicy,
    linkedFolders,
  } = useSimbaStore();

  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistKind, setNewPlaylistKind] = useState<'AUDIO' | 'VIDEO'>('AUDIO');

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
        <AppText variant="h2">Your Library</AppText>
        <AppText variant="caption" tone="secondary">
          Podcasts, playlists, phone media &amp; downloads
        </AppText>
      </View>
      {tab === 'playlists' ? (
        <Pressable
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          style={[
            styles.topPill,
            {
              backgroundColor: colors.brand.primary,
              borderRadius: radius.pill,
            },
          ]}>
          <AppText
            variant="labelSmall"
            style={{color: colors.brand.onPrimary}}>
            + New
          </AppText>
        </Pressable>
      ) : tab === 'local' ? (
        <Pressable
          onPress={() => router.push('/folders')}
          accessibilityRole="button"
          style={[
            styles.topPill,
            {
              backgroundColor: colors.brand.primaryContainer,
              borderRadius: radius.pill,
            },
          ]}>
          <AppText
            variant="labelSmall"
            style={{color: colors.brand.onPrimaryContainer}}>
            Folders
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Screen scroll header={stickyHeader}>
      <View
        style={[
          styles.container,
          {padding: spacing.lg, paddingBottom: spacing.lg},
        ]}>

        {/* 4-Tab Editorial Underline Switcher (zero pill boxes) */}
        <View style={{marginHorizontal: -spacing.lg}}>
          <UnderlineTabs
            scrollable
            paddingHorizontal={spacing.lg}
            activeKey={tab}
            onChange={next => setTab(next as LibraryTab)}
            options={[
              {key: 'podcasts', label: `Podcasts (${podcastsList.length})`},
              {key: 'playlists', label: `Playlists (${playlistsList.length})`},
              {key: 'local', label: `Folders (${linkedFolders.length})`},
              {key: 'downloads', label: `Downloads (${downloads.length})`},
            ]}
          />
        </View>

        {/* 1. Podcasts (Actionable empty state + canvas-merged rows) */}
        {tab === 'podcasts' ? (
          <View style={[styles.list, {gap: 0}]}>
            {podcastsList.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="podcast"
                    size={28}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <AppText variant="h3" style={styles.emptyTitle}>
                  No podcasts followed yet
                </AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={styles.emptyBody}>
                  Follow shows you enjoy so new episodes are always waiting right here.
                </AppText>
                <View style={styles.emptyCta}>
                  <Button
                    label="Browse Podcasts"
                    onPress={() => router.push('/catalogue/podcasts')}
                  />
                </View>
              </View>
            ) : (
              podcastsList.map((pod, idx) => (
                <View
                  key={pod.id}
                  style={[
                    styles.rowCard,
                    {
                      paddingHorizontal: 0,
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === podcastsList.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => router.push('/catalogue/podcasts')}
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.brand.primaryContainer,
                          borderRadius: radius.full,
                        },
                      ]}>
                      <SimbaIcon
                        name={pod.icon}
                        size={22}
                        color={colors.brand.onPrimaryContainer}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.badgeRow}>
                        <Badge label={pod.category} tone="gold" />
                        {pod.pinned ? <Badge label="Pinned" /> : null}
                      </View>
                      <AppText variant="title" numberOfLines={1}>
                        {pod.title}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {`${pod.author} · ${pod.episodes} episodes`}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    name={pod.pinned ? 'pin' : 'pin-outline'}
                    size={18}
                    onPress={() => togglePinPodcast(pod.id)}
                    accessibilityLabel="Pin to top"
                  />
                  <IconButton
                    name="close"
                    size={18}
                    onPress={() => toggleFollowPodcast(pod.id)}
                    accessibilityLabel={`Unsubscribe ${pod.title}`}
                  />
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* 2. Playlists (Actionable empty state + canvas-merged rows) */}
        {tab === 'playlists' ? (
          <View style={[styles.list, {gap: 0}]}>
            {playlistsList.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="playlist-music"
                    size={28}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <AppText variant="h3" style={styles.emptyTitle}>
                  No playlists yet
                </AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={styles.emptyBody}>
                  Group favorite songs, episodes, or films into your own personal collections.
                </AppText>
                <View style={styles.emptyCta}>
                  <Button
                    label="Create a Playlist"
                    onPress={() => setCreateOpen(true)}
                  />
                </View>
              </View>
            ) : (
              playlistsList.map((pl, idx) => (
                <View
                  key={pl.id}
                  style={[
                    styles.rowCard,
                    {
                      paddingHorizontal: 0,
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === playlistsList.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() => router.push('/catalogue/music')}
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.accent.goldWash,
                          borderRadius: radius.md,
                        },
                      ]}>
                      <SimbaIcon
                        name={pl.icon}
                        size={22}
                        color={colors.accent.gold}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.badgeRow}>
                        <Badge label={pl.kindLabel} tone="gold" />
                        {pl.pinned ? <Badge label="Pinned" /> : null}
                      </View>
                      <AppText variant="title" numberOfLines={1}>
                        {pl.name}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {`${pl.count} tracks`}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    name={pl.pinned ? 'pin' : 'pin-outline'}
                    size={18}
                    onPress={() => togglePinPlaylist(pl.id)}
                    accessibilityLabel={`Pin ${pl.name}`}
                  />
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* 3. Local Library Files (Canvas-merged, zero stacked boxes) */}
        {tab === 'local' ? (
          <View style={styles.list}>
            {linkedFolders.length === 0 ? (
              <View
                style={{
                  paddingVertical: spacing.xxl,
                  paddingHorizontal: spacing.lg,
                  alignItems: 'center',
                  gap: 10,
                }}>
                <SimbaIcon
                  name="folder-music-outline"
                  size={36}
                  color={colors.accent.gold}
                />
                <AppText variant="title">No device folders linked yet</AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={{textAlign: 'center'}}>
                  Connect music, audiobook, or video folders on your phone to play them right here.
                </AppText>
                <View style={{marginTop: 6}}>
                  <Button
                    label="Manage Folders"
                    onPress={() => router.push('/folders')}
                  />
                </View>
              </View>
            ) : (
              linkedFolders.map((folder, idx) => (
                <Pressable
                  key={folder.id}
                  onPress={() => router.push('/folders')}
                  accessibilityRole="button"
                  style={({pressed}) => [
                    styles.rowMain,
                    {
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === linkedFolders.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: colors.accent.goldWash,
                        borderRadius: radius.md,
                      },
                    ]}>
                    <SimbaIcon
                      name="folder-outline"
                      size={22}
                      color={colors.accent.gold}
                    />
                  </View>
                  <View style={styles.rowCopy}>
                    <AppText variant="labelSmall" numberOfLines={1}>
                      {folder.name}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {folder.path}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {`${folder.trackCount + folder.videoCount} items · ${folder.lastScanned}`}
                    </AppText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {/* 4. Offline Downloads + Auto-Delete Policy (Canvas-merged) */}
        {tab === 'downloads' ? (
          <View style={styles.list}>
            <View
              style={[
                styles.policyCard,
                {
                  paddingHorizontal: 0,
                  paddingTop: 4,
                  paddingBottom: 16,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                },
              ]}>
              <AppText variant="overline" tone="gold">
                AUTO-DELETE COMPLETED DOWNLOADS
              </AppText>
              <View style={styles.policyChips}>
                {autoDeleteOptions.map(opt => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={autoDeletePolicy === opt}
                    onPress={() => setAutoDeletePolicy(opt)}
                  />
                ))}
              </View>
            </View>

            {downloads.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="download-circle-outline"
                    size={28}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <AppText variant="h3" style={styles.emptyTitle}>
                  Nothing downloaded yet
                </AppText>
                <AppText
                  variant="bodySmall"
                  tone="secondary"
                  style={styles.emptyBody}>
                  Save tracks or episodes to listen offline on flights and commutes.
                </AppText>
                <View style={styles.emptyCta}>
                  <Button
                    label="Explore Media"
                    onPress={() => router.push('/(tabs)/explore')}
                  />
                </View>
              </View>
            ) : (
              downloads.map((dl, idx) => (
                <View
                  key={dl.id}
                  style={[
                    styles.rowCard,
                    {
                      paddingHorizontal: 0,
                      paddingVertical: 14,
                      borderBottomWidth:
                        idx === downloads.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/media/[id]',
                        params: {id: dl.itemId},
                      })
                    }
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.brand.primaryContainer,
                          borderRadius: radius.full,
                        },
                      ]}>
                      <SimbaIcon
                        name="download-circle-outline"
                        size={22}
                        color={colors.brand.onPrimaryContainer}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <View style={styles.badgeRow}>
                        <Badge label={dl.status} tone="gold" />
                        <Badge label={dl.sizeLabel} />
                      </View>
                      <AppText variant="title" numberOfLines={1}>
                        {dl.title}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {dl.subtitle}
                      </AppText>
                    </View>
                  </Pressable>
                  <IconButton
                    name="delete-outline"
                    size={18}
                    onPress={() => removeDownload(dl.id)}
                    accessibilityLabel={`Delete download ${dl.title}`}
                  />
                </View>
              ))
            )}
          </View>
        ) : null}
      </View>

      {/* Create Playlist Sheet */}
      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Playlist"
        subtitle="Choose audio or video — playlists keep media lanes separate">
        <View style={styles.createForm}>
          <View style={styles.policyChips}>
            <Chip
              label="Audio Playlist"
              icon="playlist-music"
              selected={newPlaylistKind === 'AUDIO'}
              onPress={() => setNewPlaylistKind('AUDIO')}
            />
            <Chip
              label="Video Playlist"
              icon="movie-roll"
              selected={newPlaylistKind === 'VIDEO'}
              onPress={() => setNewPlaylistKind('VIDEO')}
            />
          </View>
          <TextInput
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            placeholder={
              newPlaylistKind === 'VIDEO'
                ? 'Playlist name (e.g. Weekend Classics)...'
                : 'Playlist name (e.g. Late Night Vinyl)...'
            }
            placeholderTextColor={colors.text.tertiary}
            style={[
              styles.input,
              {
                color: colors.text.primary,
                backgroundColor: colors.background.surfaceSubtle,
                borderWidth: 0,
                borderRadius: radius.pill,
              },
            ]}
          />
          <Button
            label="Create & Pin Playlist"
            fullWidth
            onPress={() => {
              createPlaylist(
                newPlaylistName || (newPlaylistKind === 'VIDEO' ? 'Watchlist' : 'Curated Session'),
                newPlaylistKind,
              );
              setNewPlaylistName('');
              setCreateOpen(false);
            }}
          />
        </View>
      </Sheet>
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
  topPill: {
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {gap: 12},
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyStateWrap: {
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
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 8,
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
  folderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  policyCard: {
    padding: 14,
    gap: 10,
  },
  policyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  createForm: {
    gap: 14,
    paddingTop: 6,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
});
