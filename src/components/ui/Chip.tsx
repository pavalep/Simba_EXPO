import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';
import {SimbaIcon, type SimbaIconName} from './SimbaIcon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional leading custom SVG icon. */
  icon?: SimbaIconName;
  /** Small count shown at the right of the label. */
  count?: number;
}

export function Chip({label, selected, onPress, icon, count}: ChipProps) {
  const {colors, radius} = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: !!selected}}
      style={({pressed}) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected
            ? colors.brand.primary
            : colors.background.surfaceSubtle,
          borderWidth: 0,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      {icon ? (
        <SimbaIcon
          name={icon}
          size={15}
          color={selected ? colors.brand.onPrimary : colors.accent.gold}
        />
      ) : null}
      <AppText
        variant="label"
        numberOfLines={1}
        style={{
          color: selected ? colors.brand.onPrimary : colors.text.primary,
          flexShrink: 0,
        }}>
        {label}
      </AppText>
      {count !== undefined ? (
        <View
          style={[
            styles.count,
            {
              backgroundColor: selected
                ? colors.brand.onPrimary
                : colors.background.surfaceSubtle,
            },
          ]}>
          <AppText
            variant="labelSmall"
            style={{
              color: selected ? colors.brand.primary : colors.text.tertiary,
            }}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  count: {
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9,
    alignItems: 'center',
  },
});
