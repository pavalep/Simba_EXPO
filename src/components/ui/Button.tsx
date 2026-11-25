import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';
import {ShimmerBox} from './Shimmer';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
}: ButtonProps) {
  const {colors, radius, spacing} = useTheme();

  const bg =
    variant === 'primary'
      ? colors.brand.primary
      : variant === 'secondary'
      ? colors.background.surface
      : 'transparent';

  const fg =
    variant === 'primary'
      ? colors.brand.onPrimary
      : variant === 'secondary'
      ? colors.text.primary
      : colors.accent.gold;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border.default,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}>
      {loading ? (
        <ShimmerBox width={68} height={14} borderRadius={radius.pill} onMedia={variant === 'primary'} />
      ) : (
        <AppText variant="label" style={{color: fg}}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
});
