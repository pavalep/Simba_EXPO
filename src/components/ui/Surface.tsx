import React from 'react';
import {View, ViewProps, StyleSheet} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

export interface SurfaceProps extends ViewProps {
  tone?: 'card' | 'elevated' | 'subtle' | 'goldWash' | 'onMedia' | 'glass';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  bordered?: boolean;
}

export function Surface({
  children,
  tone = 'card',
  radius = 'md',
  bordered = false,
  style,
  ...rest
}: SurfaceProps) {
  const {colors, radius: r, shadows} = useTheme();

  const bg = (() => {
    switch (tone) {
      case 'elevated':
        return colors.background.elevated;
      case 'subtle':
        return colors.background.surfaceSubtle;
      case 'goldWash':
        return colors.accent.goldWash;
      case 'onMedia':
        return colors.background.onMediaPill;
      case 'glass':
        return colors.background.glass;
      case 'card':
      default:
        return colors.background.surface;
    }
  })();

  const borderRadius =
    radius === 'sm' ? r.sm : radius === 'lg' ? r.lg : radius === 'xl' ? r.xl : r.md;

  const showBorder = bordered || tone === 'glass';

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderRadius,
          borderWidth: showBorder && tone !== 'onMedia' ? StyleSheet.hairlineWidth : 0,
          borderColor:
            tone === 'glass' ? colors.border.subtle : colors.border.default,
        },
        tone === 'elevated' || tone === 'card' ? shadows.card : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {overflow: 'hidden'},
});
