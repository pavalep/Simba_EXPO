import React, {useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewProps,
  View,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';

export interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  /** Optional sticky header pinned above the scroll area (safe-area aware, frosted translucent). */
  header?: React.ReactNode;
  /** Show a subtle bottom hairline under the sticky header (default: false for seamless editorial fade). */
  headerBorder?: boolean;
  /** Use a ScrollView as the container (default is a plain View). */
  scroll?: boolean;
  /** Extra bottom padding (e.g. to clear the mini-player dock). */
  bottomInset?: number;
  /** Set true on tab screens where the bottom TabBar already consumes `insets.bottom`. */
  inTabs?: boolean;
  /** Optional infinite-scroll callback triggered automatically as the user nears the bottom. */
  onEndReached?: () => void;
  /** Distance from the bottom (in dp) at which `onEndReached` fires (default: 360). */
  onEndReachedThreshold?: number;
}

/**
 * The page container: warm ivory / near-black canvas, safe-area aware,
 * with a frosted semi-transparent sticky `header` slot that content glides
 * softly underneath as the user scrolls.
 */
export function Screen({
  children,
  header,
  headerBorder = false,
  scroll,
  bottomInset = 0,
  inTabs = false,
  onEndReached,
  onEndReachedThreshold = 360,
  style,
  ...rest
}: ScreenProps) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const userDraggedRef = useRef(false);
  // When `inTabs` is true, the floating frosted bottom tab bar overlays the
  // bottom `64 + insets.bottom` so content visibly glides beneath it.
  const resolvedBottom = inTabs
    ? 64 + insets.bottom + bottomInset
    : bottomInset + insets.bottom;
  const [headerHeight, setHeaderHeight] = useState(Math.max(insets.top, 36) + 64);

  const handleHeaderLayout = (e: LayoutChangeEvent) => {
    const next = Math.ceil(e.nativeEvent.layout.height);
    if (next > 0 && Math.abs(next - headerHeight) > 1) {
      setHeaderHeight(next);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onEndReached || !userDraggedRef.current) {
      return;
    }
    const {layoutMeasurement, contentOffset, contentSize} = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom <= onEndReachedThreshold) {
      onEndReached();
    }
  };

  if (scroll) {
    if (header) {
      return (
        <View style={[styles.flex, {backgroundColor: colors.background.primary}]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              {paddingBottom: resolvedBottom},
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={120}
            onScrollBeginDrag={() => {
              userDraggedRef.current = true;
            }}
            onScroll={onEndReached ? handleScroll : undefined}
            {...(rest as ScrollViewProps)}>
            <View style={{height: headerHeight}} />
            {children}
          </ScrollView>

          <View
            onLayout={handleHeaderLayout}
            style={[
              styles.frostedHeader,
              {
                paddingTop: insets.top,
                borderBottomWidth: headerBorder ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <LinearGradient
              pointerEvents="none"
              colors={[colors.background.primary, colors.background.floating]}
              locations={[0, 1]}
              style={StyleSheet.absoluteFill}
            />
            {header}
            {/* Subtle downward atmospheric fade so scrolled content softens cleanly */}
            <LinearGradient
              pointerEvents="none"
              colors={[colors.background.floating, colors.background.playerScrim.none]}
              style={styles.headerFade}
            />
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        style={[styles.flex, {backgroundColor: colors.background.primary}]}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top, paddingBottom: resolvedBottom},
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={120}
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onScroll={onEndReached ? handleScroll : undefined}
        {...(rest as ScrollViewProps)}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
          paddingBottom: resolvedBottom,
        },
        style,
      ]}
      {...rest}>
      {header ? (
        <View
          style={[
            styles.stickyHeader,
            {
              backgroundColor: colors.background.primary,
              borderBottomWidth: headerBorder ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: colors.border.subtle,
            },
          ]}>
          {header}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {flexGrow: 1},
  stickyHeader: {
    zIndex: 10,
  },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -14,
    height: 14,
  },
});
