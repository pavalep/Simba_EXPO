import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {SimbaIcon, type SimbaIconName} from './SimbaIcon';

export type IconName = SimbaIconName;

export interface IconButtonProps {
  name: IconName;
  onPress?: () => void;
  size?: number;
  /** Draw the icon on artwork (bright ink) instead of on the canvas. */
  onMedia?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * Custom cohesive SVG icon button for SIMBA.
 */
export function IconButton({
  name,
  onPress,
  size = 22,
  onMedia,
  disabled,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const {colors, radius} = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({pressed}) => [
        styles.base,
        onMedia && {
          width: 38,
          height: 38,
          backgroundColor: colors.background.onMediaPill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.background.onMediaPillBorder,
        },
        {
          borderRadius: radius.full,
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
        },
        style,
      ]}>
      <SimbaIcon
        name={name}
        size={size}
        color={onMedia ? colors.text.bright : colors.text.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {alignItems: 'center', justifyContent: 'center', padding: 6},
});
