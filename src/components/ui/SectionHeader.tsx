import React from 'react';
import {View, StyleSheet, Pressable} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';
import {Badge} from './Badge';
import {SimbaIcon, type SimbaIconName} from './SimbaIcon';

export type SectionIconName = SimbaIconName;

export interface SectionHeaderProps {
  title: string;
  /** Optional leading 18dp vector icon (matching CodecM Home section headers). */
  icon?: SectionIconName;
  /** Optional color tone for the leading icon ('gold' default, 'love' for Saved Bookmarks). */
  iconTone?: 'gold' | 'love' | 'secondary';
  /** Optional small pill badge next to the title (e.g. active category filter). */
  badge?: string;
  /** Optional right-hand action label or subtle note ("History (3)", "All (4)", "View all", "Based on your taste"). */
  action?: string;
  /** When provided, the right label renders as a tappable Lion Gold action link. */
  onAction?: () => void;
  /** Optional horizontal padding override (defaults to 16dp). */
  paddingHorizontal?: number;
}

/**
 * Clean, human-friendly left-aligned section header matching CodecM 1:1:
 * [Optional 18dp Icon] + [17sp Bold Title] + [Optional Filter Pill]  <--->  [Action Link / Note]
 */
export function SectionHeader({
  title,
  icon,
  iconTone = 'gold',
  badge,
  action,
  onAction,
  paddingHorizontal,
}: SectionHeaderProps) {
  const {colors, spacing} = useTheme();

  const resolvedIconColor =
    iconTone === 'love'
      ? colors.semantic.error
      : iconTone === 'secondary'
      ? colors.text.secondary
      : colors.accent.gold;

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: paddingHorizontal ?? spacing.lg,
          marginTop: spacing.lg,
          marginBottom: spacing.sm + 2,
        },
      ]}>
      <View style={styles.leftRow}>
        {icon ? (
          <SimbaIcon
            name={icon}
            size={18}
            color={resolvedIconColor}
          />
        ) : null}
        <AppText
          variant="h3"
          numberOfLines={1}
          style={badge ? styles.titleWithBadge : styles.title}>
          {title}
        </AppText>
        {badge ? <Badge label={badge} tone="gold" /> : null}
      </View>

      {action ? (
        onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${action}`}
            style={styles.actionBtn}
            hitSlop={8}>
            <AppText variant="label" tone="gold">
              {action.replace(/ /g, '\u00A0')}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="caption" tone="secondary" style={styles.actionBtn}>
            {action.replace(/ /g, '\u00A0')}
          </AppText>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
  },
  titleWithBadge: {
    flexShrink: 1,
  },
  actionBtn: {
    flexShrink: 0,
  },
});
