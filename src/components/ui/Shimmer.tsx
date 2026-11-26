import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useTheme} from '../../theme/ThemeProvider';
import {radius, spacing} from '../../theme/tokens';

export interface ShimmerBoxProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Set true when rendered on dark media/player surfaces. */
  onMedia?: boolean;
}

/**
 * Animated sweeping shimmer skeleton primitive (native-driver translateX gradient wave).
 * Calm, editorial loading placeholders in SIMBA's Lion Gold & Warm Parchment palette.
 */
export function ShimmerBox({
  width = '100%',
  height,
  borderRadius = radius.md,
  style,
  onMedia = false,
}: ShimmerBoxProps) {
  const {colors} = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const baseColor = onMedia
    ? colors.background.onMediaPill
    : colors.background.surfaceSubtle;
  const highlightColor = onMedia
    ? colors.accent.goldWash
    : colors.brand.primaryContainer;

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 320],
  });

  return (
    <View
      style={[
        styles.shell,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          {
            transform: [{translateX}],
          },
        ]}>
        <LinearGradient
          colors={['transparent', highlightColor, 'transparent']}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export interface HomeFeedShimmerProps {
  hasHistory?: boolean;
  hasSubscriptions?: boolean;
  hasBookmarks?: boolean;
  hasPlaylists?: boolean;
}

/**
 * Matches HomeScreen's full editorial feed — including personal sections
 * (Jump Back In, Subscriptions, Saved Bookmarks, Pinned Playlists) when present —
 * so the entire screen shimmers uniformly with zero static/loaded mixing.
 */
export function HomeFeedShimmer({
  hasHistory = false,
  hasSubscriptions = false,
  hasBookmarks = false,
  hasPlaylists = false,
}: HomeFeedShimmerProps = {}) {
  return (
    <View style={styles.homeWrap}>
      {hasHistory ? (
        <View style={styles.sectionPad}>
          <View style={styles.headerSkeletonRow}>
            <ShimmerBox width={136} height={18} borderRadius={radius.xs} />
            <ShimmerBox width={64} height={14} borderRadius={radius.xs} />
          </View>
          <View style={styles.rowGap}>
            {[0, 1].map(i => (
              <View key={i} style={styles.squareCol}>
                <ShimmerBox width={214} height={120} borderRadius={radius.md} />
                <ShimmerBox width={168} height={13} borderRadius={radius.xs} />
                <ShimmerBox width={104} height={11} borderRadius={radius.xs} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {hasSubscriptions ? (
        <View style={styles.sectionPad}>
          <View style={styles.headerSkeletonRow}>
            <ShimmerBox width={154} height={18} borderRadius={radius.xs} />
            <ShimmerBox width={48} height={14} borderRadius={radius.xs} />
          </View>
          <View style={styles.rowGap}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.squareCol}>
                <ShimmerBox width={68} height={68} borderRadius={radius.sm + 2} />
                <ShimmerBox width={58} height={10} borderRadius={radius.xs} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {hasBookmarks ? (
        <View style={styles.sectionPad}>
          <View style={styles.headerSkeletonRow}>
            <ShimmerBox width={148} height={18} borderRadius={radius.xs} />
            <ShimmerBox width={46} height={14} borderRadius={radius.xs} />
          </View>
          <View style={styles.rowGap}>
            <ShimmerBox width={220} height={74} borderRadius={radius.md} />
            <ShimmerBox width={220} height={74} borderRadius={radius.md} />
          </View>
        </View>
      ) : null}

      {hasPlaylists ? (
        <View style={styles.sectionPad}>
          <View style={styles.headerSkeletonRow}>
            <ShimmerBox width={140} height={18} borderRadius={radius.xs} />
            <ShimmerBox width={48} height={14} borderRadius={radius.xs} />
          </View>
          <View style={styles.rowGap}>
            <ShimmerBox width={208} height={72} borderRadius={radius.md} />
            <ShimmerBox width={208} height={72} borderRadius={radius.md} />
          </View>
        </View>
      ) : null}

      {/* Handpicked Mixes rail */}
      <View style={styles.sectionPad}>
        <View style={styles.headerSkeletonRow}>
          <ShimmerBox width={156} height={18} borderRadius={radius.xs} />
          <ShimmerBox width={46} height={14} borderRadius={radius.xs} />
        </View>
        <View style={styles.rowGap}>
          <ShimmerBox width={238} height={146} borderRadius={radius.md} />
          <ShimmerBox width={238} height={146} borderRadius={radius.md} />
        </View>
      </View>

      {/* Picked For Today square rail */}
      <View style={styles.sectionPad}>
        <View style={styles.headerSkeletonRow}>
          <ShimmerBox width={148} height={18} borderRadius={radius.xs} />
        </View>
        <View style={styles.rowGap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.squareCol}>
              <ShimmerBox width={116} height={116} borderRadius={radius.sm + 2} />
              <ShimmerBox width={98} height={12} borderRadius={radius.xs} />
              <ShimmerBox width={72} height={10} borderRadius={radius.xs} />
            </View>
          ))}
        </View>
      </View>

      {/* Silver Screen Classics landscape rail */}
      <View style={styles.sectionPad}>
        <View style={styles.headerSkeletonRow}>
          <ShimmerBox width={174} height={18} borderRadius={radius.xs} />
          <ShimmerBox width={52} height={14} borderRadius={radius.xs} />
        </View>
        <View style={styles.rowGap}>
          <ShimmerBox width={220} height={152} borderRadius={radius.sm + 2} />
          <ShimmerBox width={220} height={152} borderRadius={radius.sm + 2} />
        </View>
      </View>

      {/* Stories & Voices rail */}
      <View style={styles.sectionPad}>
        <View style={styles.headerSkeletonRow}>
          <ShimmerBox width={140} height={18} borderRadius={radius.xs} />
          <ShimmerBox width={52} height={14} borderRadius={radius.xs} />
        </View>
        <View style={styles.rowGap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.squareCol}>
              <ShimmerBox width={136} height={104} borderRadius={radius.md} />
              <ShimmerBox width={108} height={12} borderRadius={radius.xs} />
              <ShimmerBox width={76} height={10} borderRadius={radius.xs} />
            </View>
          ))}
        </View>
      </View>

      {/* Keep Wandering list rows */}
      <View style={styles.sectionPad}>
        <View style={styles.headerSkeletonRow}>
          <ShimmerBox width={144} height={18} borderRadius={radius.xs} />
          <ShimmerBox width={52} height={14} borderRadius={radius.xs} />
        </View>
        <View style={styles.listGap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.rowTile}>
              <ShimmerBox width={58} height={58} borderRadius={radius.sm} />
              <View style={styles.rowTextCol}>
                <ShimmerBox width="76%" height={14} borderRadius={radius.xs} />
                <ShimmerBox width="52%" height={11} borderRadius={radius.xs} />
                <ShimmerBox width="32%" height={10} borderRadius={radius.xs} />
              </View>
              <ShimmerBox width={34} height={34} borderRadius={radius.full} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Matches ExploreScreen's full body: Browse banner + Showcase + Mixes row + List rows. */
export function ShowcaseShimmer() {
  return (
    <View style={styles.showcaseWrap}>
      <ShimmerBox width={156} height={18} borderRadius={radius.xs} />
      <ShimmerBox width="100%" height={230} borderRadius={radius.md} />
      <View style={styles.rowTile}>
        <ShimmerBox width={42} height={42} borderRadius={radius.full} />
        <View style={styles.rowTextCol}>
          <ShimmerBox width="48%" height={14} borderRadius={radius.xs} />
          <ShimmerBox width="72%" height={11} borderRadius={radius.xs} />
        </View>
      </View>
      <View style={styles.headerSkeletonRow}>
        <ShimmerBox width={164} height={18} borderRadius={radius.xs} />
        <ShimmerBox width={52} height={14} borderRadius={radius.xs} />
      </View>
      <View style={styles.listGap}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.rowTile}>
            <ShimmerBox width={58} height={58} borderRadius={radius.sm} />
            <View style={styles.rowTextCol}>
              <ShimmerBox width="75%" height={14} borderRadius={radius.xs} />
              <ShimmerBox width="52%" height={11} borderRadius={radius.xs} />
              <ShimmerBox width="35%" height={10} borderRadius={radius.xs} />
            </View>
            <ShimmerBox width={34} height={34} borderRadius={radius.full} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Matches 2-column poster/broadcast catalogue grids (Movies, Shows, Live TV, Archive). */
export function CatalogueGridShimmer({
  count = 6,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  const cardHeight = compact ? 112 : 186;
  return (
    <View style={styles.gridWrap}>
      {Array.from({length: count}).map((_, idx) => (
        <View key={idx} style={styles.gridCell}>
          <ShimmerBox width="100%" height={cardHeight} borderRadius={radius.lg} />
          <ShimmerBox width="82%" height={13} borderRadius={radius.xs} />
          <ShimmerBox width="54%" height={10} borderRadius={radius.xs} />
        </View>
      ))}
    </View>
  );
}

/** Matches editorial list rows (Podcasts, Music, Radio, Audiobooks, Search, Pagination). */
export function CatalogueListShimmer({count = 5}: {count?: number}) {
  return (
    <View style={styles.listWrap}>
      {Array.from({length: count}).map((_, idx) => (
        <View key={idx} style={styles.rowTile}>
          <ShimmerBox width={60} height={60} borderRadius={radius.md} />
          <View style={styles.rowTextCol}>
            <ShimmerBox width="78%" height={14} borderRadius={radius.xs} />
            <ShimmerBox width="55%" height={11} borderRadius={radius.xs} />
            <ShimmerBox width="38%" height={10} borderRadius={radius.xs} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 180,
  },
  homeWrap: {
    gap: 22,
    paddingTop: spacing.md,
  },
  sectionPad: {
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  headerSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap: {
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
  },
  squareCol: {
    gap: 6,
  },
  showcaseWrap: {
    paddingHorizontal: spacing.lg,
    gap: 16,
    paddingTop: spacing.sm,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  gridCell: {
    width: '48%',
    gap: 6,
  },
  listWrap: {
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  listGap: {
    gap: 12,
  },
  rowTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTextCol: {
    flex: 1,
    gap: 7,
  },
});
