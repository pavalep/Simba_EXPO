import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';

export interface UnderlineTabOption {
  key: string;
  label: string;
}

export interface UnderlineTabsProps {
  options: UnderlineTabOption[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Enable horizontal scrolling (ideal for category strips like Explore/Search). */
  scrollable?: boolean;
  /** Horizontal inset matching page margins (default: 16). */
  paddingHorizontal?: number;
  /** Render a subtle full-width baseline hairline beneath the tabs (default: true). */
  baseline?: boolean;
}

/**
 * Editorial underline tab bar — zero pill boxes.
 * Active tab carries primary ink + a crisp 2.5dp Lion Gold bottom indicator.
 */
export function UnderlineTabs({
  options,
  activeKey,
  onChange,
  scrollable = false,
  paddingHorizontal = 16,
  baseline = true,
}: UnderlineTabsProps) {
  const {colors, radius} = useTheme();

  const renderTabs = () =>
    options.map(opt => {
      const active = opt.key === activeKey;
      return (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          accessibilityRole="tab"
          accessibilityState={{selected: active}}
          hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}
          style={styles.tab}>
          <AppText
            variant="label"
            numberOfLines={1}
            style={{
              color: active ? colors.text.primary : colors.text.tertiary,
            }}>
            {opt.label}
          </AppText>
          <View
            style={[
              styles.indicator,
              {
                borderRadius: radius.full,
                backgroundColor: active ? colors.accent.gold : 'transparent',
              },
            ]}
          />
        </Pressable>
      );
    });

  const containerBorder = baseline
    ? {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
      }
    : null;

  if (scrollable) {
    return (
      <View style={containerBorder}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollRow,
            {paddingHorizontal},
          ]}>
          {renderTabs()}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.row, {paddingHorizontal}, containerBorder]}>
      {renderTabs()}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  tab: {
    paddingTop: 8,
    paddingBottom: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
  },
});
