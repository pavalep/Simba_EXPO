import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from './SimbaIcon';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';
import {Button} from './Button';
import {Sheet} from './Sheet';

export interface FilterOption {
  key: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  multiSelect?: boolean;
  options: FilterOption[];
}

export interface FilterSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  groups: FilterGroup[];
  initialValues?: Record<string, string[]>;
  values?: Record<string, string[]>;
  onApply?: (selected: Record<string, string[]>) => void;
  onChange?: (groupId: string, nextKeys: string[]) => void;
  onReset?: () => void;
  onClose: () => void;
}

export interface FilterIconButtonProps {
  activeCount?: number;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * 44x44dp Filter button with Lion Gold active badge (Penpot 00.2 / 02.1 / 03.1 / 04.x).
 */
export function FilterIconButton({
  activeCount = 0,
  onPress,
  accessibilityLabel = 'Open filters and sort',
}: FilterIconButtonProps) {
  const {colors, radius} = useTheme();
  const hasActive = activeCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({pressed}) => [
        styles.iconButton,
        {
          borderRadius: radius.full,
          backgroundColor: hasActive
            ? colors.brand.primaryContainer
            : pressed
            ? colors.background.surfaceSubtle
            : 'transparent',
          borderWidth: 0,
        },
      ]}>
      <SimbaIcon
        name="tune-variant"
        size={21}
        color={hasActive ? colors.brand.onPrimaryContainer : colors.text.primary}
      />
      {hasActive ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.brand.primary,
              borderRadius: radius.full,
            },
          ]}>
          <AppText
            variant="labelSmall"
            style={{color: colors.brand.onPrimary}}>
            {activeCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Universal Multi-Group Editorial Filter Sheet (Penpot 00.2 / 03.6 / 04.1–04.8).
 * Ported 1:1 from CodecM's FilterSheet with SIMBA Lion Gold tokens & near-black ink on gold.
 */
export function FilterSheet({
  visible,
  title = 'Filters & Refine',
  subtitle,
  groups,
  initialValues,
  values,
  onApply,
  onChange,
  onReset,
  onClose,
}: FilterSheetProps) {
  const {colors, radius, spacing} = useTheme();
  const activeValues = values ?? initialValues ?? {};
  const [draft, setDraft] = useState<Record<string, string[]>>(activeValues);

  useEffect(() => {
    if (visible) {
      setDraft(values ?? initialValues ?? {});
    }
  }, [visible, values, initialValues]);

  const toggleOption = (group: FilterGroup, key: string) => {
    setDraft(prev => {
      const current = prev[group.id] ?? [];
      if (group.multiSelect) {
        const exists = current.includes(key);
        const next = exists
          ? current.filter(k => k !== key)
          : [...current, key];
        const resolved = next.length > 0 ? next : [group.options[0].key];
        onChange?.(group.id, resolved);
        return {...prev, [group.id]: resolved};
      }
      onChange?.(group.id, [key]);
      return {...prev, [group.id]: [key]};
    });
  };

  const handleReset = () => {
    const defaults: Record<string, string[]> = {};
    for (const g of groups) {
      if (g.options[0]) {
        defaults[g.id] = [g.options[0].key];
      }
    }
    setDraft(defaults);
    onReset?.();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      rightAction={{label: 'Reset All', onPress: handleReset}}>
      <View style={styles.content}>
        {groups.map(group => {
          const selectedKeys = draft[group.id] ?? [];
          return (
            <View key={group.id} style={styles.groupBlock}>
              <View style={styles.groupHeader}>
                <AppText variant="label" tone="primary">
                  {group.title}
                </AppText>
                {group.multiSelect ? (
                  <AppText variant="caption" tone="tertiary">
                    Multi-select
                  </AppText>
                ) : null}
              </View>
              <View style={styles.chipWrap}>
                {group.options.map(opt => {
                  const active = selectedKeys.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggleOption(group, opt.key)}
                      accessibilityRole="button"
                      accessibilityState={{selected: active}}
                      style={[
                        styles.optionChip,
                        {
                          borderRadius: radius.pill,
                          paddingHorizontal: spacing.md,
                          backgroundColor: active
                            ? colors.brand.primary
                            : colors.background.surfaceSubtle,
                          borderColor: active
                            ? colors.brand.primary
                            : colors.border.default,
                        },
                      ]}>
                      {active ? (
                        <SimbaIcon
                          name="check"
                          size={14}
                          color={colors.brand.onPrimary}
                        />
                      ) : null}
                      <AppText
                        variant="labelSmall"
                        style={{
                          color: active
                            ? colors.brand.onPrimary
                            : colors.text.primary,
                        }}>
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Button
            label="Apply Filters"
            fullWidth
            onPress={() => {
              onApply?.(draft);
              onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 4,
    gap: 18,
  },
  groupBlock: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    marginTop: 8,
  },
});
