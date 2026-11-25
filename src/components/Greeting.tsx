import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {AppText} from './ui';

/**
 * The greeting - V2, unboxed.
 *
 * Line 1  Cormorant Garamond Italic 18/24   "Good evening,"
 * Line 2  Inter Bold, Lion Gold, 22-32 px    the name (the hero)
 * Line 3  Inter 13/18                         the weather caption
 *
 * The 56 dp snapshot chip lives at the TOP RIGHT, aligned with the name,
 * and is drawn ONLY when a real snapshot exists - there is no placeholder
 * chip, no empty line and no "Fetching..." row.
 */
export interface GreetingProps {
  name: string;
  partOfDay: string;
  weather?: string;
  /** A real snapshot URL, when one has been loaded. */
  snapshotUri?: string;
}

export function Greeting({name, partOfDay, weather, snapshotUri}: GreetingProps) {
  const {colors, spacing} = useTheme();

  // The name is the hero: the longer the name, the smaller the line.
  const nameSize = name.length <= 8 ? 32 : name.length <= 14 ? 26 : 22;

  return (
    <View style={[styles.row, {paddingHorizontal: spacing.lg}]}>
      <View style={styles.copy}>
        <AppText variant="editorial">Good {partOfDay},</AppText>
        <AppText
          variant="h1"
          tone="gold"
          style={[styles.name, {fontSize: nameSize, lineHeight: nameSize + 6}]}>
          {name}
        </AppText>
        {weather ? (
          <AppText variant="caption" tone="secondary" style={styles.weather}>
            {weather}
          </AppText>
        ) : null}
      </View>
      {snapshotUri ? (
        <View
          accessibilityRole="image"
          style={[styles.chip, {borderColor: colors.border.default, backgroundColor: colors.background.surface}]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8},
  copy: {flex: 1},
  name: {marginTop: 2},
  weather: {marginTop: 2},
  chip: {width: 56, height: 56, borderRadius: 28, marginTop: 14},
});
