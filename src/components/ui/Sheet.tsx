import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaIcon} from './SimbaIcon';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** 'surface' uses theme card surface (default); 'onMedia' uses dark player sheet (#121216). */
  tone?: 'surface' | 'onMedia';
  rightAction?: {label: string; onPress: () => void};
  children: React.ReactNode;
}

/**
 * Universal Bottom Sheet primitive (00.2 / 02.5 / 02.6 / 05.2 / 06.2 / 06.5).
 * Zero raw hex/rgba literals; respects safe-area insets and 44dp touch floor.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  tone = 'surface',
  rightAction,
  children,
}: SheetProps) {
  const {colors, radius, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const isOnMedia = tone === 'onMedia';

  const sheetBg = isOnMedia
    ? colors.background.onMediaSheet
    : colors.background.surface;
  const grabberColor = isOnMedia
    ? colors.border.emphasis
    : colors.border.default;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.backdrop,
          {backgroundColor: colors.background.overlay},
        ]}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border.default,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}>
          <View style={[styles.grabber, {backgroundColor: grabberColor}]} />
          {title ? (
            <View style={styles.headerRow}>
              <View style={styles.headerTextCol}>
                <AppText
                  variant="h3"
                  tone={isOnMedia ? 'bright' : 'primary'}>
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText
                    variant="caption"
                    tone={isOnMedia ? 'mutedOnMedia' : 'secondary'}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {rightAction ? (
                <Pressable
                  onPress={rightAction.onPress}
                  accessibilityRole="button"
                  style={styles.rightActionBtn}>
                  <AppText variant="labelSmall" tone="gold">
                    {rightAction.label}
                  </AppText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                  style={styles.closeBtn}>
                  <SimbaIcon
                    name="close"
                    size={20}
                    color={
                      isOnMedia
                        ? colors.text.onMediaMuted
                        : colors.text.secondary
                    }
                  />
                </Pressable>
              )}
            </View>
          ) : null}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  dismissArea: {flex: 1},
  sheet: {
    maxHeight: '84%',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTextCol: {flex: 1, gap: 2},
  rightActionBtn: {
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
