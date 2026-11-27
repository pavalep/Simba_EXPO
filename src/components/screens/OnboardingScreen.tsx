import React, {useState} from 'react';
import {ScrollView, StyleSheet, View, Pressable} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText, Button, Chip, SimbaLogo} from '../ui';
import {catalogueLanes} from '../../constants/catalogueConfig';

/**
 * ONBOARDING - taste calibration.
 *
 * The copy and the step indicator come from the onboarding board
 * (lane 01). The topics ARE the catalogue lanes, so the thing the user
 * picks here is the thing the app actually has.
 */
export function OnboardingScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>(['music', 'podcast']);
  const [step, setStep] = useState(1);

  const toggle = (id: string) =>
    setSelected(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
    );

  return (
    <ScrollView
      style={{backgroundColor: colors.background.primary}}
      contentContainerStyle={{padding: spacing.xl, paddingBottom: spacing.xxxl}}
      showsVerticalScrollIndicator={false}>
      {/* Steps + Skip */}
      <View style={styles.topRow}>
        <View style={styles.steps}>
          {[1, 2, 3].map(index => (
            <View
              key={index}
              style={[
                styles.step,
                {
                  backgroundColor:
                    index === step ? colors.accent.gold : colors.border.default,
                },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <AppText variant="label" tone="secondary">
            Skip
          </AppText>
        </Pressable>
      </View>

      {/* SIMBA Brand Emblem + Promise */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18}}>
        <SimbaLogo size={36} variant="auto" />
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.brand.primaryContainer,
              borderRadius: radius.pill,
              marginTop: 0,
            },
          ]}>
          <AppText variant="labelSmall" tone="gold">
            100% Private On-Device Personalization
          </AppText>
        </View>
      </View>

      {/* Headline */}
      <AppText variant="h1" style={styles.headline}>
        Calibrate Your
      </AppText>
      <AppText variant="h1" style={styles.headline}>
        Listening Space
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.subtitle}>
        Select topics to tune recommendations on your device. Your taste profile stays strictly
        private.
      </AppText>

      {/* Topics */}
      <View style={styles.topics}>
        {catalogueLanes.map(lane => (
          <Chip
            key={lane.id}
            label={lane.label}
            selected={selected.includes(lane.kind)}
            onPress={() => toggle(lane.kind)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={step < 3 ? 'Continue' : 'Start tuning'}
          onPress={() => {
            if (step < 3) {
              setStep(step + 1);
            } else {
              router.replace('/');
            }
          }}
          fullWidth
        />
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          style={styles.later}>
          <AppText variant="label" tone="tertiary">
            Later
          </AppText>
        </Pressable>
      </View>

      <View style={styles.footnote}>
        <SimbaIcon name="shield-check-outline" size={14} color={colors.text.tertiary} />
        <AppText variant="caption" tone="tertiary">
          Nothing you pick here leaves this device.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  steps: {flexDirection: 'row', gap: 8},
  step: {width: 28, height: 4, borderRadius: 2},
  badge: {alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, marginTop: 28},
  headline: {marginTop: 18},
  subtitle: {marginTop: 10},
  topics: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24},
  actions: {marginTop: 32, gap: 10},
  later: {alignItems: 'center', paddingVertical: 8},
  footnote: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20},
});
