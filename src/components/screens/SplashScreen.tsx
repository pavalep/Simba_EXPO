import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText, Button, SimbaLogo} from '../ui';

/**
 * SPLASH — Lion Gold Brand Moment (#B8922E) on Near-Black (#0A0A0C) Canvas
 * (Penpot 01.1).
 *
 * Rule: Gold surfaces carry near-black ink (#0A0A0C, 6.7:1 contrast), never white.
 */
export function SplashScreen() {
  const {colors, radius, spacing} = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.brand.splashBackground,
          padding: spacing.xl,
        },
      ]}>
      <View />

      {/* Center Lion Gold Brand Lockup */}
      <View style={styles.center}>
        <View
          style={[
            styles.lionCircle,
            {
              backgroundColor: colors.background.onMediaPill,
              borderRadius: radius.xxl,
              borderWidth: 1,
              borderColor: colors.accent.gold,
            },
          ]}>
          <SimbaLogo size={76} variant="glow" />
        </View>
        <AppText variant="wordmark" tone="gold">
          Simba
        </AppText>
        <AppText variant="h2" tone="bright" style={styles.tagline}>
          Sound & Cinema Without Limits
        </AppText>
        <View
          style={[
            styles.promisePill,
            {
              backgroundColor: colors.brand.primary,
              borderRadius: radius.pill,
            },
          ]}>
          <SimbaIcon
            name="shield-check"
            size={15}
            color={colors.brand.onPrimary}
          />
          <AppText
            variant="labelSmall"
            style={{color: colors.brand.onPrimary}}>
            100% Private On-Device Personalization
          </AppText>
        </View>
      </View>

      {/* Entry Actions -> Taste Calibration (01.2) or 3-Tab Shell (01.3) */}
      <View style={styles.footer}>
        <Button
          label="Calibrate Taste Space"
          fullWidth
          onPress={() => router.replace('/onboarding')}
        />
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          style={styles.skipBtn}>
          <AppText variant="labelSmall" tone="gold">
            Enter 3-Tab App Shell →
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  lionCircle: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tagline: {
    textAlign: 'center',
  },
  promisePill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  skipBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
