import React, {useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {useHomeFeed} from '../../hooks/useHomeFeed';
import {
  getLiveItemById,
  registerLiveItem,
  registerLiveItems,
  useSimbaPlayback,
} from '../../infrastructure/player';
import {
  AppText,
  Badge,
  CatalogueListShimmer,
  Chip,
  MediaArtwork,
  Screen,
  ShimmerBox,
  Surface,
} from '../ui';
import {
  curatedTopics,
  dailyMixSynthesis,
  type CuratedMixRecord,
} from '../../data/dummy';
import {MEDIA_KIND_LABELS} from '../../types/media';

export function CuratedMixesScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {selectedTopics, toggleTopic, pinnedMixIds, togglePinMix} =
    useSimbaStore();
  const {playCatalogueItem} = useSimbaPlayback();
  const homeFeed = useHomeFeed();

  const livePool = useMemo(
    () => [
      ...homeFeed.movies,
      ...homeFeed.podcasts,
      ...homeFeed.music,
      ...homeFeed.radio,
    ],
    [homeFeed.movies, homeFeed.podcasts, homeFeed.music, homeFeed.radio],
  );

  useEffect(() => {
    if (livePool.length > 0) {
      registerLiveItems(livePool);
    }
  }, [livePool]);

  const sortedMixes = useMemo(
    () =>
      homeFeed.curatedMixes
        .map(m => ({...m, pinned: pinnedMixIds.includes(m.id)}))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [homeFeed.curatedMixes, pinnedMixIds],
  );

  const recommendedTracks = useMemo(() => {
    const activeLabels = curatedTopics
      .filter(t => selectedTopics.includes(t.id))
      .map(t => t.label.toLowerCase());
    if (activeLabels.length === 0) {
      return livePool.slice(0, 6);
    }
    const filtered = livePool.filter(item => {
      if (
        selectedTopics.includes('cinema') &&
        (item.kind === 'movie' || item.kind === 'video')
      ) {
        return true;
      }
      if (selectedTopics.includes('music') && item.kind === 'music') {
        return true;
      }
      if (selectedTopics.includes('tech') && item.kind === 'podcast') {
        return true;
      }
      if (selectedTopics.includes('radio') && item.kind === 'radio') {
        return true;
      }
      if (selectedTopics.includes('books') && item.kind === 'audiobook') {
        return true;
      }
      return false;
    });
    return filtered.length > 0 ? filtered.slice(0, 6) : livePool.slice(0, 6);
  }, [selectedTopics, livePool]);

  const playMix = (mix: CuratedMixRecord) => {
    const firstId = mix.trackIds[0];
    const firstItem = (firstId ? getLiveItemById(firstId) : undefined) ?? livePool[0];
    if (!firstItem) {
      return;
    }
    void playCatalogueItem(firstItem);
    router.push(
      firstItem.lane === 'video' ? '/player/video' : '/player/audio',
    );
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
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={6}
        style={({pressed}) => [
          styles.iconBox,
          {
            backgroundColor: pressed
              ? colors.background.surfaceSubtle
              : 'transparent',
            borderRadius: radius.full,
            borderWidth: 0,
          },
        ]}>
        <SimbaIcon
          name="arrow-left"
          size={21}
          color={colors.text.primary}
        />
      </Pressable>
      <AppText variant="h1" style={styles.topTitle}>
        Handpicked Mixes
      </AppText>
      <Pressable
        onPress={() => toggleTopic(selectedTopics[0] ?? 'music')}
        accessibilityRole="button"
        accessibilityLabel="Refresh Mixes"
        hitSlop={6}
        style={({pressed}) => [
          styles.iconBox,
          {
            backgroundColor: pressed
              ? colors.background.surfaceSubtle
              : 'transparent',
            borderRadius: radius.full,
            borderWidth: 0,
          },
        ]}>
        <SimbaIcon
          name="refresh"
          size={21}
          color={colors.accent.gold}
        />
      </Pressable>
    </View>
  );

  return (
    <Screen scroll bottomInset={16} header={stickyHeader}>
      {homeFeed.isLoading && sortedMixes.length === 0 ? (
        <View style={{paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 16}}>
          <ShimmerBox width={160} height={14} borderRadius={radius.xs} />
          <View style={{flexDirection: 'row', gap: 8}}>
            <ShimmerBox width={96} height={34} borderRadius={radius.pill} />
            <ShimmerBox width={110} height={34} borderRadius={radius.pill} />
            <ShimmerBox width={88} height={34} borderRadius={radius.pill} />
          </View>
          <ShimmerBox width="100%" height={148} borderRadius={radius.md} />
          <ShimmerBox width="100%" height={148} borderRadius={radius.md} />
          <CatalogueListShimmer count={4} />
        </View>
      ) : (
      <View style={[styles.container, {paddingHorizontal: spacing.lg, paddingTop: spacing.sm}]}>

        {/* 2. Topic Chips ("PERSONALIZE YOUR MIX") */}
        <View style={styles.sectionBlock}>
          <AppText variant="overline" tone="tertiary">
            PERSONALIZE YOUR MIX
          </AppText>
          <View style={styles.topicWrap}>
            {curatedTopics.map(topic => {
              const selected = selectedTopics.includes(topic.id);
              return (
                <Chip
                  key={topic.id}
                  label={topic.label}
                  selected={selected}
                  onPress={() => toggleTopic(topic.id)}
                />
              );
            })}
          </View>
        </View>

        {/* 3. Open Editorial Daily Mix Hero (canvas-merged, bottom hairline) */}
        <View
          style={[
            styles.heroCard,
            {
              paddingHorizontal: 0,
              paddingTop: 6,
              paddingBottom: 20,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border.subtle,
            },
          ]}>
          <View style={styles.heroTopRow}>
            <Badge label={dailyMixSynthesis.eyebrow} tone="gold" />
            <AppText variant="caption" tone="tertiary">
              {`${recommendedTracks.length} titles`}
            </AppText>
          </View>

          <AppText variant="h2">{dailyMixSynthesis.title}</AppText>
          <AppText variant="body" tone="secondary">
            {dailyMixSynthesis.narrative}
          </AppText>

          <Pressable
            onPress={() => {
              const target = recommendedTracks[0] ?? livePool[0];
              if (!target) {
                return;
              }
              void playCatalogueItem(target);
              router.push(
                target.lane === 'video' ? '/player/video' : '/player/audio',
              );
            }}
            accessibilityRole="button"
            style={[
              styles.heroPlayCta,
              {
                backgroundColor: colors.brand.primary,
                borderRadius: radius.pill,
              },
            ]}>
            <SimbaIcon
              name="play"
              size={20}
              color={colors.brand.onPrimary}
            />
            <AppText
              variant="label"
              style={{color: colors.brand.onPrimary}}>
              {`Play Handpicked Mix (${recommendedTracks.length} Titles)`}
            </AppText>
          </Pressable>
        </View>

        {/* 4. More Mixes (Canvas-merged, hairline-divided) */}
        <View style={styles.sectionBlock}>
          <AppText variant="h3">More Mixes</AppText>

          <View style={[styles.mixList, {gap: 0}]}>
            {sortedMixes.map((mix, idx) => (
              <Pressable
                key={mix.id}
                onPress={() => playMix(mix)}
                accessibilityRole="button"
                style={({pressed}) => [
                  styles.mixTile,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 14,
                    borderBottomWidth:
                      idx === sortedMixes.length - 1
                        ? 0
                        : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.mixIconBox,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="creation"
                    size={20}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>

                <View style={styles.mixTileCopy}>
                  <View style={styles.mixTitleRow}>
                    <AppText
                      variant="title"
                      numberOfLines={1}
                      style={styles.mixTitleText}>
                      {mix.title}
                    </AppText>
                    <AppText variant="caption" tone="gold">
                      {`${mix.count} titles`}
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    tone="secondary"
                    numberOfLines={1}>
                    {mix.editorialReason}
                  </AppText>
                </View>

                <Pressable
                  onPress={() => togglePinMix(mix.id)}
                  accessibilityRole="button"
                  accessibilityLabel={mix.pinned ? 'Unpin mix' : 'Pin mix'}
                  style={styles.pinIconBtn}>
                  <SimbaIcon
                    name={mix.pinned ? 'pin' : 'pin-outline'}
                    size={18}
                    color={
                      mix.pinned ? colors.accent.gold : colors.text.tertiary
                    }
                  />
                </Pressable>

                <SimbaIcon
                  name="play"
                  size={20}
                  color={colors.accent.gold}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 5. Picked For Today Tracks (Canvas-merged, hairline-divided) */}
        <View style={styles.sectionBlock}>
          <AppText variant="h3">Picked For Today</AppText>
          <View style={styles.trackList}>
            {recommendedTracks.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  registerLiveItem(item);
                  router.push({pathname: '/media/[id]', params: {id: item.id}});
                }}
                accessibilityRole="button"
                style={({pressed}) => [
                  styles.trackRow,
                  {
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth:
                      idx === recommendedTracks.length - 1
                        ? 0
                        : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border.subtle,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.trackIconBox,
                    {
                      backgroundColor: colors.brand.primaryContainer,
                      borderRadius: radius.xs + 2,
                    },
                  ]}>
                  <SimbaIcon
                    name={item.icon}
                    size={22}
                    color={colors.brand.onPrimaryContainer}
                  />
                </View>
                <View style={styles.trackCopy}>
                  <AppText variant="title" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText
                    variant="caption"
                    tone="secondary"
                    numberOfLines={1}>
                    {`${item.subtitle || MEDIA_KIND_LABELS[item.kind]} • ${MEDIA_KIND_LABELS[item.kind]}`}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => {
                    void playCatalogueItem(item);
                    router.push(
                      item.lane === 'video'
                        ? '/player/video'
                        : '/player/audio',
                    );
                  }}
                  accessibilityRole="button"
                  style={[
                    styles.trackPlayBtn,
                    {
                      backgroundColor: colors.brand.primary,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <SimbaIcon
                    name="play"
                    size={18}
                    color={colors.brand.onPrimary}
                  />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 16},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {flex: 1},
  sectionBlock: {gap: 10},
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroCard: {
    padding: 18,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPlayCta: {
    height: 46,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mixList: {gap: 10},
  mixTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  mixIconBox: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixTileCopy: {
    flex: 1,
    gap: 2,
  },
  mixTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mixTitleText: {flex: 1},
  pinIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackList: {gap: 8},
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  trackIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCopy: {flex: 1, gap: 2},
  trackPlayBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
