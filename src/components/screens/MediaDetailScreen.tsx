import React, {useMemo, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useApiQuery} from '../../hooks/useApiQuery';
import {
  internetArchiveApi,
  podcastIndexApi,
  tvmazeApi,
} from '../../infrastructure/api';
import {
  isArchiveDirectoryUrl,
  resolvePlayableStreamUrl,
} from '../../infrastructure/api/mappers';
import {
  getLiveItemById,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  Button,
  IconButton,
  MediaArtwork,
  ProgressBar,
  Rail,
  Sheet,
  Surface,
  UnderlineTabs,
} from '../ui';
import type {CatalogueItem, ChapterRow} from '../../data/dummy';
import {MEDIA_KIND_LABELS, type MediaKind} from '../../types/media';

/**
 * EDITORIAL DETAIL SCREEN (Penpot Swimlane 05: 05.1–05.5 + CodecM MediaDetailPage & PodcastDetailsPage).
 *
 * Features:
 *   • 05.1 — 310dp Full-Bleed Editorial Hero + 52dp Circular Play CTA + Follow/Pin pill
 *   • 05.2 — Scroll-Reactive Pinned Blurred Top Bar (>140dp scroll) + MediaActionsSheet + PlaylistSheet
 *   • 05.3 — Video/Audio Metric Pills + 4-Tab Bar (Overview / Content / Notes / Reviews)
 *   • 05.4 — Audiobook/Podcast Chapter & Episode Run List with "% Match" Affinity & Progress Bars
 *   • 05.5 — MusicBrainz Enrichment Match Banner & Playlist Pinning
 */

const TABS = ['Overview', 'Content', 'Notes', 'Reviews'] as const;
type TabKey = (typeof TABS)[number];

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return (
      h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
    );
  }
  return m + ':' + String(s).padStart(2, '0');
}

export interface MediaDetailScreenProps {
  id?: string;
}

export function MediaDetailScreen({id}: MediaDetailScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    addToQueue,
    playNextInQueue,
    bookmarks,
    toggleBookmarkItem,
    podcastsList,
    toggleFollowPodcast,
    playlistsList,
    createPlaylist,
    addItemToPlaylist,
  } = useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();

  const item: CatalogueItem = useMemo(
    () =>
      (id ? getLiveItemById(id) : undefined) ?? {
        id: id ?? 'unknown',
        title: 'Media Title',
        subtitle: 'Simba',
        kind: 'audio',
        lane: 'audio',
        source: 'api',
        provider: 'Simba',
        icon: 'play-circle-outline',
      },
    [id],
  );

  // Prefetch direct playable stream URL on detail mount (matches main SIMBA's
  // useMovieDetailScreen) so tapping Play Now starts playback immediately with
  // zero metadata lookup latency.
  const needsStreamPrefetch =
    Boolean(item.externalId) &&
    (!item.streamUrl || isArchiveDirectoryUrl(item.streamUrl));

  const prefetchedStreamQuery = useApiQuery({
    queryKey: ['prefetch-stream', item.provider, item.externalId, item.lane],
    enabled: needsStreamPrefetch,
    queryFn: () => resolvePlayableStreamUrl(item),
    staleTime: 10 * 60_000,
    retry: 2,
  });

  const liveChaptersQuery = useApiQuery<(ChapterRow & {streamUrl?: string})[]>({
    queryKey: ['detail-chapters', item.provider, item.externalId, item.lane],
    enabled: Boolean(item.externalId),
    queryFn: async ({signal}) => {
      if (item.provider === 'PodcastIndex' && item.externalId) {
        const feedId = Number(item.externalId);
        if (Number.isFinite(feedId) && feedId > 0) {
          const eps = await podcastIndexApi.getEpisodes(feedId, 20, signal);
          return eps.map((ep, idx) => ({
            code: String(idx + 1).padStart(2, '0'),
            title: ep.title,
            meta: [
              ep.datePublished
                ? new Date(ep.datePublished * 1000).toLocaleDateString()
                : `Ep ${idx + 1}`,
              ep.duration ? `${Math.max(1, Math.round(ep.duration / 60))} min` : null,
            ]
              .filter(Boolean)
              .join(' · '),
            streamUrl: ep.enclosureUrl,
          }));
        }
      }
      if (item.provider === 'Internet Archive' && item.lane === 'audio' && item.externalId) {
        const tracks = await internetArchiveApi.getArchiveTracks(item.externalId, signal);
        return tracks.slice(0, 30).map((tr, idx) => ({
          code: String(idx + 1).padStart(2, '0'),
          title: tr.title || tr.name,
          meta: tr.lengthSeconds ? formatDuration(tr.lengthSeconds) : tr.format,
          streamUrl: tr.url,
        }));
      }
      if (item.provider === 'TVMaze' && item.externalId) {
        const showId = Number(item.externalId);
        if (Number.isFinite(showId) && showId > 0) {
          const eps = await tvmazeApi.getEpisodeList(showId, signal);
          return eps.slice(0, 30).map(ep => ({
            code: `S${ep.season}E${ep.number}`,
            title: ep.name,
            meta: [ep.airdate, `Season ${ep.season}`].filter(Boolean).join(' · '),
          }));
        }
      }
      return [];
    },
    staleTime: 10 * 60_000,
  });

  const extras = useMemo(
    () => ({
      chapters: liveChaptersQuery.data ?? [],
      notes: [] as {id: string; at: string; body: string}[],
      reviews: [] as {id: string; author: string; rating: number; body: string}[],
    }),
    [liveChaptersQuery.data],
  );

  const [tab, setTab] = useState<TabKey>('Overview');
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistFeedback, setPlaylistFeedback] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterRow | null>(
    null,
  );
  const [localNotes, setLocalNotes] = useState<{id: string; at: string; body: string}[]>([]);

  const isVideo = item.lane === 'video';
  const isBookmarked = bookmarks.some(b => b.itemId === item.id);
  const isFollowed = podcastsList.some(
    p => p.title === item.title || item.subtitle?.includes(p.title),
  );

  const metrics: {label: string; value: string}[] = [
    {label: 'Format', value: isVideo ? 'HD Video' : 'High Quality'},
  ];
  if (item.durationSeconds) {
    metrics.push({
      label: 'Duration',
      value: formatDuration(item.durationSeconds),
    });
  }
  if (item.rating) {
    metrics.push({label: 'Rating', value: '★ ' + item.rating.toFixed(1)});
  }
  if (item.year) {
    metrics.push({label: 'Year', value: item.year});
  }
  if (item.genre) {
    metrics.push({label: 'Genre', value: item.genre});
  }

  const relatedItems: CatalogueItem[] = [];

  const launchPlayer = (overrideStreamUrl?: unknown, overrideTitle?: string) => {
    const cleanUrl =
      typeof overrideStreamUrl === 'string' && overrideStreamUrl.trim().length > 0
        ? overrideStreamUrl
        : prefetchedStreamQuery.data?.url;
    const cleanHeaders =
      typeof overrideStreamUrl === 'string'
        ? item.httpHeaders
        : prefetchedStreamQuery.data?.headers ?? item.httpHeaders;
    const target: CatalogueItem = cleanUrl
      ? {
          ...item,
          title: overrideTitle ?? item.title,
          streamUrl: cleanUrl,
          httpHeaders: cleanHeaders,
        }
      : item;
    void playCatalogueItem(target);
    router.push(isVideo ? '/player/video' : '/player/audio');
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 140 && !scrolledPastHero) {
      setScrolledPastHero(true);
    } else if (y <= 140 && scrolledPastHero) {
      setScrolledPastHero(false);
    }
  };

  const handleAddQuickNote = () => {
    setLocalNotes(prev => [
      {
        id: 'n-' + Date.now(),
        at: '14:20',
        body: `Saved editorial note on "${item.title}" during review.`,
      },
      ...prev,
    ]);
  };

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      {/* Scroll-Reactive Blurred Pinned Header (Penpot 05.2 — appears when scrolled >140dp) */}
      {scrolledPastHero ? (
        <View
          style={[
            styles.pinnedBlurBar,
            {
              backgroundColor: colors.background.floating,
              borderBottomColor: colors.border.subtle,
              paddingHorizontal: spacing.md,
              paddingTop: insets.top,
              height: 56 + insets.top,
            },
          ]}>
          <IconButton
            name="arrow-left"
            onPress={() => router.back()}
            accessibilityLabel="Back"
          />
          <AppText variant="title" numberOfLines={1} style={styles.pinnedTitle}>
            {item.title}
          </AppText>
          <IconButton
            name="play-circle"
            onPress={launchPlayer}
            accessibilityLabel="Play"
          />
          <IconButton
            name="dots-vertical"
            onPress={() => setActionsVisible(true)}
            accessibilityLabel="More options"
          />
        </View>
      ) : null}

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{paddingBottom: spacing.xxxl + spacing.lg}}
        showsVerticalScrollIndicator={false}>
        {/* 1. 310dp Full-Bleed Editorial Hero + 52dp Circular Play Button (Penpot 05.1) */}
        <View
          style={[
            styles.hero310,
            {
              backgroundColor: colors.brand.primaryDark,
              paddingTop: insets.top + 10,
              overflow: 'hidden',
            },
          ]}>
          {item.artworkUrl ? (
            <>
              <MediaArtwork
                uri={item.artworkUrl}
                icon={item.icon}
                iconSize={48}
                borderRadius={0}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  colors.background.scrimDim,
                  colors.background.playerScrim.none,
                  colors.background.scrimMid,
                  colors.background.scrimOpaque,
                ]}
                locations={[0, 0.35, 0.72, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : null}
          {/* Top Circle Controls over Hero */}
          <View style={[styles.heroTopBar, {paddingHorizontal: spacing.lg}]}>
            <IconButton
              name="arrow-left"
              onMedia
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
            <View style={styles.heroTopActions}>
              <IconButton
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                onMedia
                onPress={() => toggleBookmarkItem(item)}
                accessibilityLabel="Toggle bookmark"
              />
              <IconButton
                name="dots-vertical"
                onMedia
                onPress={() => setActionsVisible(true)}
                accessibilityLabel="Open media actions sheet"
              />
            </View>
          </View>

          {/* Center 52dp Circular Play Button (Penpot 05.1) */}
          <View style={styles.heroCenter}>
            <Pressable
              onPress={() => launchPlayer()}
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title}`}
              style={[
                styles.heroPlayCircle,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}>
              <SimbaIcon
                name="play"
                size={26}
                color={colors.brand.onPrimary}
              />
            </Pressable>
          </View>

          {/* Bottom Title & Creator Lockup inside 310dp Hero */}
          <View style={[styles.heroBottomBlock, {paddingHorizontal: spacing.lg}]}>
            <View style={styles.heroBadgesRow}>
              <Badge
                label={MEDIA_KIND_LABELS[item.kind as MediaKind]}
                tone="gold"
              />
              {item.genre ? (
                <Badge label={item.genre} tone="onMedia" />
              ) : null}
              {item.year ? (
                <Badge label={item.year} tone="onMedia" />
              ) : null}
            </View>
            <AppText variant="h1" tone="bright" numberOfLines={2}>
              {item.title}
            </AppText>
            <View style={styles.heroCreatorRow}>
              <AppText
                variant="bodySmall"
                tone="mutedOnMedia"
                numberOfLines={1}
                style={styles.heroCreatorText}>
                {item.subtitle}
              </AppText>
              {item.kind === 'podcast' ? (
                <Pressable
                  onPress={() => toggleFollowPodcast(item.title)}
                  accessibilityRole="button"
                  style={[
                    styles.followPill,
                    {
                      backgroundColor: isFollowed
                        ? colors.brand.primaryContainer
                        : colors.brand.primary,
                      borderRadius: radius.pill,
                    },
                  ]}>
                  <AppText
                    variant="labelSmall"
                    style={{
                      color: isFollowed
                        ? colors.brand.onPrimaryContainer
                        : colors.brand.onPrimary,
                    }}>
                    {isFollowed ? 'Subscribed' : '+ Subscribe'}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* 2. Live Broadcast Indicator — only shown for actual Live TV / Live Radio */}
        {item.kind === 'live-tv' || item.kind === 'radio' ? (
          <View
            style={[
              styles.verifiedLine,
              {paddingHorizontal: spacing.lg, marginTop: spacing.lg},
            ]}>
            <SimbaIcon
              name="access-point"
              size={16}
              color={colors.semantic.error}
            />
            <AppText
              variant="caption"
              tone="secondary"
              numberOfLines={1}
              style={{flex: 1}}>
              Live broadcast
            </AppText>
          </View>
        ) : null}

        {/* 3. Canvas-Merged Editorial Spec Strip (vertical hairlines, zero card boxes) */}
        {metrics.length > 0 ? (
          <View
            style={[
              styles.specStripWrap,
              {
                marginHorizontal: spacing.lg,
                marginTop: spacing.md,
                borderTopColor: colors.border.subtle,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <Rail gap={0} padding={0}>
              {metrics.map((metric, idx) => (
                <View
                  key={metric.label}
                  style={[
                    styles.specCol,
                    idx > 0 && {
                      borderLeftWidth: StyleSheet.hairlineWidth,
                      borderLeftColor: colors.border.subtle,
                    },
                  ]}>
                  <AppText variant="overline" tone="tertiary">
                    {metric.label.toUpperCase()}
                  </AppText>
                  <AppText variant="label" tone="gold">
                    {metric.value}
                  </AppText>
                </View>
              ))}
            </Rail>
          </View>
        ) : null}

        {/* 4. Primary Action Row (Play Now / Add to Queue / Add to Playlist) */}
        <View style={[styles.actionRow, {paddingHorizontal: spacing.lg}]}>
          <Button label="Play Now" onPress={() => launchPlayer()} />
          <Button
            label="Add to Queue"
            variant="secondary"
            onPress={() => addToQueue(item)}
          />
          <Button
            label="+ Playlist"
            variant="secondary"
            onPress={() => setPlaylistOpen(true)}
          />
        </View>

        {/* 5. Four-Tab Bar: Editorial Underline Tabs (Overview / Content / Notes / Reviews) */}
        <View style={{marginTop: spacing.lg}}>
          <UnderlineTabs
            options={TABS.map(name => ({key: name, label: name}))}
            activeKey={tab}
            onChange={next => setTab(next as (typeof TABS)[number])}
            paddingHorizontal={spacing.lg}
          />
        </View>

        {/* TAB 1: Overview */}
        {tab === 'Overview' ? (
          <View style={[styles.section, {paddingHorizontal: spacing.lg}]}>
            <AppText variant="h3">
              {`About this ${MEDIA_KIND_LABELS[item.kind as MediaKind].toLowerCase()}`}
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.synopsis}>
              {item.synopsis ??
                item.meta ??
                'Available for streaming and offline playback.'}
            </AppText>

            {/* Quick Episode / Chapter Preview inside Overview */}
            {extras?.chapters.length ? (
              <View style={styles.previewSection}>
                <View style={styles.previewHeadRow}>
                  <AppText variant="title">
                    {isVideo ? 'Featured Chapters & Scenes' : 'Episodes & Tracks'}
                  </AppText>
                  <Pressable
                    onPress={() => setTab('Content')}
                    accessibilityRole="button">
                    <AppText variant="labelSmall" tone="gold">
                      {`See all (${extras.chapters.length})`}
                    </AppText>
                  </Pressable>
                </View>
                {extras.chapters.slice(0, 3).map(row => (
                  <ChapterItemCard
                    key={row.code}
                    row={row}
                    onPlay={() => launchPlayer(row.streamUrl, row.title)}
                    onMore={() => {
                      setSelectedChapter(row);
                      setActionsVisible(true);
                    }}
                  />
                ))}
              </View>
            ) : null}

            {/* Related Titles */}
            {relatedItems.length > 0 ? (
              <View style={styles.previewSection}>
                <AppText variant="title">More Like This</AppText>
                <View style={styles.relatedList}>
                  {relatedItems.map(rel => (
                    <Pressable
                      key={rel.id}
                      onPress={() =>
                        router.replace({
                          pathname: '/media/[id]',
                          params: {id: rel.id},
                        })
                      }
                      accessibilityRole="button"
                      style={({pressed}) => [
                        styles.relatedRow,
                        {
                          paddingHorizontal: 0,
                          paddingVertical: 12,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border.subtle,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <SimbaIcon
                        name={rel.icon}
                        size={20}
                        color={colors.accent.gold}
                      />
                      <View style={styles.relatedCopy}>
                        <AppText variant="labelSmall" numberOfLines={1}>
                          {rel.title}
                        </AppText>
                        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                          {rel.subtitle}
                        </AppText>
                      </View>
                      <Badge
                        label={rel.genre ?? MEDIA_KIND_LABELS[rel.kind]}
                        tone="gold"
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* TAB 2: Content — Episodes, Chapters & Tracks with Affinity Badges & Progress Bars (05.1 / 05.4) */}
        {tab === 'Content' ? (
          <View style={[styles.section, {paddingHorizontal: spacing.lg}]}>
            <AppText variant="overline" tone="gold">
              {isVideo ? 'CHAPTERS & SCENES RUN LIST' : 'EPISODES & TRACKS'}
            </AppText>
            {extras?.chapters.map(row => (
              <ChapterItemCard
                key={row.code}
                row={row}
                onPlay={launchPlayer}
                onMore={() => {
                  setSelectedChapter(row);
                  setActionsVisible(true);
                }}
              />
            ))}
          </View>
        ) : null}

        {/* TAB 3: Notes — Timestamped Bookmarks & Personal Notes (05.3) */}
        {tab === 'Notes' ? (
          <View style={[styles.section, {paddingHorizontal: spacing.lg}]}>
            <View style={styles.previewHeadRow}>
              <AppText variant="overline" tone="gold">
                TIMESTAMPED NOTES & BOOKMARKS
              </AppText>
              <Pressable
                onPress={handleAddQuickNote}
                accessibilityRole="button">
                <AppText variant="labelSmall" tone="gold">
                  + Add Note at 14:20
                </AppText>
              </Pressable>
            </View>
            {localNotes.map((note, idx) => (
              <View
                key={note.id}
                style={[
                  styles.noteCard,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth:
                      idx === localNotes.length - 1
                        ? 0
                        : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                  },
                ]}>
                <Badge label={note.at} tone="gold" />
                <AppText variant="body" style={styles.noteBody}>
                  {note.body}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {/* TAB 4: Reviews (05.3) */}
        {tab === 'Reviews' ? (
          <View style={[styles.section, {paddingHorizontal: spacing.lg}]}>
            <AppText variant="overline" tone="gold">
              LISTENER & ARCHIVE REVIEWS
            </AppText>
            {extras?.reviews.map((review, idx, arr) => (
              <View
                key={review.id}
                style={[
                  styles.review,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth:
                      idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                  },
                ]}>
                <View style={styles.reviewHead}>
                  <AppText variant="labelSmall">{review.author}</AppText>
                  <AppText variant="labelSmall" tone="gold">
                    {'★'.repeat(review.rating)}
                  </AppText>
                </View>
                <AppText variant="body" tone="secondary">
                  {review.body}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Sheet 1: MediaActionsSheet (Penpot 05.2) */}
      <Sheet
        visible={actionsVisible}
        onClose={() => {
          setActionsVisible(false);
          setSelectedChapter(null);
        }}
        title={selectedChapter ? selectedChapter.title : item.title}
        subtitle={selectedChapter ? selectedChapter.meta : item.subtitle}>
        <View style={styles.sheetList}>
          <SheetMenuRow
            icon="play-circle-outline"
            label="Play Immediately"
            onPress={() => {
              setActionsVisible(false);
              launchPlayer();
            }}
          />
          <SheetMenuRow
            icon="playlist-play"
            label="Play Next in Queue"
            onPress={() => {
              playNextInQueue(item);
              setActionsVisible(false);
            }}
          />
          <SheetMenuRow
            icon="playlist-plus"
            label="Add to Queue"
            onPress={() => {
              addToQueue(item);
              setActionsVisible(false);
            }}
          />
          <SheetMenuRow
            icon="playlist-music-outline"
            label="Add to Playlist..."
            onPress={() => {
              setActionsVisible(false);
              setPlaylistOpen(true);
            }}
          />
          <SheetMenuRow
            icon={isBookmarked ? 'bookmark-check' : 'bookmark-outline'}
            label={isBookmarked ? 'Remove Bookmark' : 'Save Timestamp Bookmark'}
            onPress={() => {
              toggleBookmarkItem(item, selectedChapter?.title);
              setActionsVisible(false);
            }}
          />
          <SheetMenuRow
            icon="download-outline"
            label="Download for Offline Playback"
            onPress={() => {
              setActionsVisible(false);
              router.push('/library?tab=downloads');
            }}
          />
        </View>
      </Sheet>

      {/* Sheet 2: Lane-Filtered PlaylistSheet + On-Demand Create */}
      <Sheet
        visible={playlistOpen}
        onClose={() => {
          setPlaylistOpen(false);
          setCreatingPlaylist(false);
          setNewPlaylistName('');
          setPlaylistFeedback(null);
        }}
        title={isVideo ? 'Add to Video Playlist' : 'Add to Audio Playlist'}
        subtitle={`Only ${isVideo ? 'video' : 'audio'} playlists are shown for "${item.title}"`}
        rightAction={{
          label: creatingPlaylist ? 'Cancel' : '+ New',
          onPress: () => {
            setCreatingPlaylist(v => !v);
            setPlaylistFeedback(null);
          },
        }}>
        <View style={styles.sheetList}>
          {playlistFeedback ? (
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 8,
                borderRadius: radius.md,
                backgroundColor:
                  playlistFeedback.tone === 'error'
                    ? colors.semantic.errorDim
                    : colors.brand.primaryContainer,
              }}>
              <AppText
                variant="caption"
                style={{
                  color:
                    playlistFeedback.tone === 'error'
                      ? colors.semantic.error
                      : colors.brand.onPrimaryContainer,
                }}>
                {playlistFeedback.text}
              </AppText>
            </View>
          ) : null}

          {creatingPlaylist ? (
            <View style={{gap: 10, paddingVertical: 6, marginBottom: 8}}>
              <TextInput
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder={
                  isVideo
                    ? 'New video playlist name (e.g. Weekend Films)...'
                    : 'New audio playlist name (e.g. Late Night)...'
                }
                placeholderTextColor={colors.text.tertiary}
                style={{
                  height: 46,
                  paddingHorizontal: 16,
                  color: colors.text.primary,
                  backgroundColor: colors.background.surfaceSubtle,
                  borderRadius: radius.pill,
                }}
              />
              <Button
                label={`Create ${isVideo ? 'Video' : 'Audio'} Playlist & Add`}
                fullWidth
                onPress={() => {
                  const name =
                    newPlaylistName.trim() ||
                    `${item.genre ?? (isVideo ? 'Video' : 'Audio')} Favorites`;
                  createPlaylist(name, isVideo ? 'VIDEO' : 'AUDIO', item);
                  setNewPlaylistName('');
                  setCreatingPlaylist(false);
                  setPlaylistFeedback({
                    tone: 'success',
                    text: `Created "${name}" and added this ${isVideo ? 'video' : 'audio item'}.`,
                  });
                }}
              />
            </View>
          ) : null}

          {(() => {
            const matchingPlaylists = playlistsList.filter(
              pl => pl.lane === item.lane,
            );
            if (matchingPlaylists.length === 0) {
              return (
                <View style={{paddingVertical: 18, alignItems: 'center', gap: 10}}>
                  <AppText
                    variant="bodySmall"
                    tone="secondary"
                    style={{textAlign: 'center'}}>
                    {`No ${isVideo ? 'video' : 'audio'} playlists yet.`}
                  </AppText>
                  {!creatingPlaylist ? (
                    <Button
                      label={`+ Create ${isVideo ? 'Video' : 'Audio'} Playlist`}
                      variant="secondary"
                      onPress={() => setCreatingPlaylist(true)}
                    />
                  ) : null}
                </View>
              );
            }
            return matchingPlaylists.map(pl => (
              <SheetMenuRow
                key={pl.id}
                icon={pl.icon}
                label={`${pl.name} · ${pl.count} ${pl.count === 1 ? 'item' : 'items'}`}
                onPress={() => {
                  const res = addItemToPlaylist(pl.id, item);
                  if (!res.ok) {
                    setPlaylistFeedback({tone: 'error', text: res.message});
                  } else {
                    setPlaylistFeedback({
                      tone: 'success',
                      text: `Added to "${res.playlistName}".`,
                    });
                  }
                }}
              />
            ));
          })()}
        </View>
      </Sheet>
    </View>
  );
}

function ChapterItemCard({
  row,
  onPlay,
  onMore,
}: {
  row: ChapterRow;
  onPlay: () => void;
  onMore: () => void;
}) {
  const {colors, radius} = useTheme();
  return (
    <View
      style={[
        styles.chapterCard,
        {
          paddingHorizontal: 0,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
      ]}>
      <View style={styles.chapterTopRow}>
        <View
          style={[
            styles.chapterBadge,
            {
              backgroundColor: colors.accent.goldWash,
              borderRadius: radius.xs,
            },
          ]}>
          <AppText variant="labelSmall" tone="gold">
            {row.code}
          </AppText>
        </View>
        <View style={styles.chapterCopy}>
          <AppText variant="label" numberOfLines={1}>
            {row.title}
          </AppText>
          <AppText variant="caption" tone="tertiary">
            {row.meta}
          </AppText>
        </View>
        <IconButton
          name="play-circle"
          size={24}
          onPress={onPlay}
          accessibilityLabel={`Play ${row.title}`}
        />
        <IconButton
          name="dots-vertical"
          size={18}
          onPress={onMore}
          accessibilityLabel={`More options for ${row.title}`}
        />
      </View>
      {row.progress !== undefined && row.progress > 0 ? (
        <ProgressBar
          progress={row.progress}
          height={3}
          trackColor={colors.border.subtle}
          fillColor={colors.accent.gold}
        />
      ) : null}
    </View>
  );
}

function SheetMenuRow({
  icon,
  label,
  onPress,
}: {
  icon: import('../ui/SimbaIcon').SimbaIconName;
  label: string;
  onPress: () => void;
}) {
  const {colors} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.sheetRow,
        {borderBottomColor: colors.border.subtle},
      ]}>
      <SimbaIcon name={icon} size={20} color={colors.accent.gold} />
      <AppText variant="body" style={styles.sheetRowLabel}>
        {label}
      </AppText>
      <SimbaIcon
        name="chevron-right"
        size={18}
        color={colors.text.tertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  pinnedBlurBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
  },
  pinnedTitle: {flex: 1},
  hero310: {
    minHeight: 310,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  heroPlayCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomBlock: {
    gap: 6,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  heroCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCreatorText: {flex: 1},
  followPill: {
    minHeight: 34,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specStripWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  specCol: {
    minWidth: 96,
    paddingHorizontal: 14,
    gap: 3,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  section: {marginTop: 16, gap: 10},
  synopsis: {marginTop: 2},
  previewSection: {marginTop: 12, gap: 10},
  previewHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterCard: {
    padding: 12,
    gap: 8,
  },
  chapterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chapterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chapterCopy: {flex: 1, gap: 2},
  relatedList: {gap: 10},
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  relatedCopy: {flex: 1, gap: 2},
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  noteBody: {flex: 1},
  review: {padding: 12, gap: 6},
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetList: {gap: 4},
  sheetRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetRowLabel: {flex: 1},
});
