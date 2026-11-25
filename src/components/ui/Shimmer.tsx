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
 * Animated shimmer skeleton primitive using native-driver opacity wave.
 * Replaces all ActivityIndicator spinners across SIMBA with calm, editorial
 * loading placeholders in SIMBA's Lion Gold & Warm Parchment palette.
 */
export function ShimmerBox({
  width = '100%',
  height,
  borderRadius = radius.md,
  style,
  onMedia = false,
}: ShimmerBoxProps) {
  const {colors} = useTheme();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 780,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 780,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const baseColor = onMedia
    ? colors.background.onMediaPill
    : colors.background.surfaceSubtle;
  const highlightColor = onMedia
    ? colors.accent.goldWash
    : colors.brand.primaryContainer;

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
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor: highlightColor,
            opacity: pulse,
          },
        ]}
      />
    </View>
  );
}

/** Matches HomeScreen's Curated Mixes + Recommended + Classic Cinema rails. */
export function HomeFeedShimmer() {
  return (
    <View style={styles.homeWrap}>
      {/* Curated For You rail */}
      <View style={styles.sectionPad}>
        <ShimmerBox width={150} height={18} borderRadius={radius.xs} />
        <View style={styles.rowGap}>
          <ShimmerBox width={238} height={146} borderRadius={radius.md} />
          <ShimmerBox width={238} height={146} borderRadius={radius.md} />
        </View>
      </View>

      {/* Recommended For You square rail */}
      <View style={styles.sectionPad}>
        <ShimmerBox width={180} height={18} borderRadius={radius.xs} />
        <View style={styles.rowGap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.squareCol}>
              <ShimmerBox width={112} height={112} borderRadius={radius.sm + 2} />
              <ShimmerBox width={96} height={12} borderRadius={radius.xs} />
              <ShimmerBox width={72} height={10} borderRadius={radius.xs} />
            </View>
          ))}
        </View>
      </View>

      {/* Classic Cinema landscape rail */}
      <View style={styles.sectionPad}>
        <ShimmerBox width={170} height={18} borderRadius={radius.xs} />
        <View style={styles.rowGap}>
          <ShimmerBox width={220} height={152} borderRadius={radius.sm + 2} />
          <ShimmerBox width={220} height={152} borderRadius={radius.sm + 2} />
        </View>
      </View>
    </View>
  );
}

/** Matches ExploreScreen's 230dp Showcase card + list rows. */
export function ShowcaseShimmer() {
  return (
    <View style={styles.showcaseWrap}>
      <ShimmerBox width="100%" height={230} borderRadius={radius.md} />
      <View style={styles.listGap}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.rowTile}>
            <ShimmerBox width={58} height={58} borderRadius={radius.sm} />
            <View style={styles.rowTextCol}>
              <ShimmerBox width="75%" height={14} borderRadius={radius.xs} />
              <ShimmerBox width="52%" height={11} borderRadius={radius.xs} />
              <ShimmerBox width="35%" height={10} borderRadius={radius.xs} />
            </View>
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
  homeWrap: {
    gap: 20,
    paddingTop: spacing.md,
  },
  sectionPad: {
    paddingHorizontal: spacing.lg,
    gap: 12,
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
