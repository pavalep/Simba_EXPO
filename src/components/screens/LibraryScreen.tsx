import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  getLiveItemById,
  reconstructItemFromSubscription,
  registerLiveItem,
} from '../../infrastructure/player';
import type {CatalogueItem} from '../../data/dummy';
import {
  AppText,
  Badge,
  Button,
  Chip,
  IconButton,
  MediaArtwork,
  Rail,
  Screen,
  Sheet,
  Surface,
  UnderlineTabs,
} from '../ui';
import {autoDeleteOptions} from '../../data/dummy';

export type LibraryTab =
  | 'podcasts'
  | 'stations'
  | 'channels'
  | 'playlists'
  | 'local';

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
const TAB_META: Record<LibraryTab, {title: string; subtitle: string}> = {
  podcasts: {
    title: 'Subscribed Podcasts',
    subtitle: 'Shows you follow — pin to show on Home',
  },
  stations: {
    title: 'Favorite Stations',
    subtitle: 'Saved radio stations — pin to show on Home',
  },
  channels: {
    title: 'Favorite Channels',
    subtitle: 'Saved live TV channels — pin to show on Home',
  },
  playlists: {
    title: 'Playlists',
    subtitle: 'Your playlists — pin to show on Home',
  },
  local: {
    title: 'On This Phone',
    subtitle: 'Local audio & video folders',
  },
};

export function LibraryScreen({initialTab = 'podcasts'}: LibraryScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    podcastsList,
    togglePinPodcast,
    toggleFollowPodcast,
    favoriteRadioIds,
    toggleFavoriteRadio,
    favoriteTvIds,
    toggleFavoriteTv,
    favoriteStations,
    pinnedStationIds,
    togglePinStation,
    playlistsList,
    togglePinPlaylist,
    createPlaylist,
    linkedFolders,
  } = useSimbaStore();

  const resolvedStations = useMemo<CatalogueItem[]>(() => {
    const byId = new Map<string, CatalogueItem>();
    for (const st of favoriteStations) {
      byId.set(st.id, st);
    }
    return favoriteRadioIds.map(
      id =>
        byId.get(id) ??
        getLiveItemById(id) ?? {
          id,
          title: 'Saved Station',
          subtitle: 'Radio',
          kind: 'radio',
          lane: 'audio',
          source: 'api',
          provider: 'RadioBrowser',
          icon: 'radio-tower',
          catalogueLaneId: 'radio',
        },
    );
  }, [favoriteRadioIds, favoriteStations]);

  const resolvedChannels = useMemo<CatalogueItem[]>(() => {
    const byId = new Map<string, CatalogueItem>();
    for (const st of favoriteStations) {
      byId.set(st.id, st);
    }
    return favoriteTvIds.map(
      id =>
        byId.get(id) ??
        getLiveItemById(id) ?? {
          id,
          title: 'Saved Channel',
          subtitle: 'Live TV',
          kind: 'live-tv',
          lane: 'video',
          source: 'api',
          provider: 'IPTV-org',
          icon: 'access-point',
          catalogueLaneId: 'livetv',
        },
    );
  }, [favoriteTvIds, favoriteStations]);

  const tab = initialTab;
  const meta = TAB_META[tab] ?? TAB_META.podcasts;
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
        <AppText variant="h2">{meta.title}</AppText>
        <AppText variant="caption" tone="secondary">
          {meta.subtitle}
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
                    onPress={() => {
                      const target = reconstructItemFromSubscription(pod);
                      router.push({
                        pathname: '/media/[id]',
                        params: {id: target.id},
                      });
                    }}
                    accessibilityRole="button"
                    style={styles.rowMain}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: colors.brand.primaryContainer,
                          borderRadius: radius.full,
                          overflow: 'hidden',
                        },
                      ]}>
                      <MediaArtwork
                        uri={pod.artworkUrl}
                        icon={pod.icon}
                        iconSize={22}
                        iconColor={colors.brand.onPrimaryContainer}
                        borderRadius={radius.full}
                        style={StyleSheet.absoluteFill}
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
                        {pod.episodes > 0
                          ? `${pod.author} · ${pod.episodes} episodes`
                          : pod.author}
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

        {/* 1b. Favorite Stations (Radio) & Favorite Channels (Live TV) with Pin-to-Home */}
        {tab === 'stations' || tab === 'channels'
          ? (() => {
              const isChannels = tab === 'channels';
              const list = isChannels ? resolvedChannels : resolvedStations;
              return (
                <View style={[styles.list, {gap: 0}]}>
                  {list.length === 0 ? (
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
                          name={isChannels ? 'access-point' : 'radio-tower'}
                          size={28}
                          color={colors.brand.onPrimaryContainer}
                        />
                      </View>
                      <AppText variant="h3" style={styles.emptyTitle}>
                        {isChannels
                          ? 'No favorite channels yet'
                          : 'No favorite stations yet'}
                      </AppText>
                      <AppText
                        variant="bodySmall"
                        tone="secondary"
                        style={styles.emptyBody}>
                        {isChannels
                          ? 'Heart any Live TV channel to save it here. Pin your favorites to show them on Home.'
                          : 'Heart any Radio station to save it here. Pin your favorites to show them on Home.'}
                      </AppText>
                      <View style={styles.emptyCta}>
                        <Button
                          label={isChannels ? 'Browse Live TV' : 'Browse Radio'}
                          onPress={() =>
                            router.push(
                              isChannels
                                ? '/catalogue/livetv'
                                : '/catalogue/radio',
                            )
                          }
                        />
                      </View>
                    </View>
                  ) : (
                    list.map((st, idx) => {
                      const isPinned = pinnedStationIds.includes(st.id);
                      return (
                        <View
                          key={st.id}
                          style={[
                            styles.rowCard,
                            {
                              paddingHorizontal: 0,
                              paddingVertical: 14,
                              borderBottomWidth:
                                idx === list.length - 1
                                  ? 0
                                  : StyleSheet.hairlineWidth,
                              borderBottomColor: colors.border.subtle,
                            },
                          ]}>
                          <Pressable
                            onPress={() => {
                              registerLiveItem(st);
                              router.push({
                                pathname: '/media/[id]',
                                params: {id: st.id},
                              });
                            }}
                            accessibilityRole="button"
                            style={styles.rowMain}>
                            <View
                              style={[
                                styles.iconBox,
                                {
                                  backgroundColor: colors.accent.goldWash,
                                  borderRadius: radius.full,
                                  overflow: 'hidden',
                                },
                              ]}>
                              <MediaArtwork
                                uri={st.artworkUrl}
                                icon={st.icon}
                                iconSize={22}
                                iconColor={colors.accent.gold}
                                borderRadius={radius.full}
                                style={StyleSheet.absoluteFill}
                              />
                            </View>
                            <View style={styles.rowCopy}>
                              <View style={styles.badgeRow}>
                                <Badge
                                  label={isChannels ? 'Live TV' : 'Radio'}
                                  tone="gold"
                                />
                                {isPinned ? <Badge label="Pinned" /> : null}
                              </View>
                              <AppText variant="title" numberOfLines={1}>
                                {st.title}
                              </AppText>
                              <AppText
                                variant="caption"
                                tone="secondary"
                                numberOfLines={1}>
                                {st.subtitle ||
                                  (isChannels ? 'Live TV' : 'Radio')}
                              </AppText>
                            </View>
                          </Pressable>
                          <IconButton
                            name={isPinned ? 'pin' : 'pin-outline'}
                            size={18}
                            onPress={() => togglePinStation(st.id)}
                            accessibilityLabel={
                              isPinned ? 'Unpin from Home' : 'Pin to Home'
                            }
                          />
                          <IconButton
                            name="close"
                            size={18}
                            onPress={() =>
                              isChannels
                                ? toggleFavoriteTv(st)
                                : toggleFavoriteRadio(st)
                            }
                            accessibilityLabel={`Remove ${st.title} from favorites`}
                          />
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })()
          : null}

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
