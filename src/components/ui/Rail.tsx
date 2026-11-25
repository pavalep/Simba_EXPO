import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

export interface RailProps {
  children: React.ReactNode;
  /** Gap between items. */
  gap?: number;
  /** Padding at the leading and trailing edge. */
  padding?: number;
}

/** A horizontal carousel of tiles - the Home lane's basic unit. */
export function Rail({children, gap = 12, padding = 16}: RailProps) {
  const {colors} = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, {gap, paddingHorizontal: padding}]}
      style={styles.root}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flexGrow: 0},
  content: {alignItems: 'flex-start'},
});
