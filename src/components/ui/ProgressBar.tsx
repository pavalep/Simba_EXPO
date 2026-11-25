import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

export interface ProgressBarProps {
  /** 0 to 1 */
  progress: number;
  height?: number;
  style?: ViewStyle;
  trackColor?: string;
  fillColor?: string;
}

export function ProgressBar({
  progress,
  height = 3,
  style,
  trackColor,
  fillColor,
}: ProgressBarProps) {
  const {colors, radius} = useTheme();
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: radius.full,
          backgroundColor: trackColor ?? colors.background.seekTrack.empty,
        },
        style,
      ]}>
      <View
        style={{
          width: pct * 100 + '%',
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: fillColor ?? colors.background.seekTrack.played,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {overflow: 'hidden', width: '100%'},
});
