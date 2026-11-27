import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {
  AppText,
  Badge,
  Chip,
  IconButton,
  Rail,
  Screen,
  SimbaLogo,
  Surface,
} from '../ui';
import {legalPages} from '../../constants/catalogueConfig';

export interface LegalScreenProps {
  slug?: string;
}

/**
 * ABOUT, LIFETIME STATS, HELP, CREDITS, CHANGELOG, LICENSES, PRIVACY & TERMS
 * (Penpot 07.6).
 */
export function LegalScreen({slug = 'about'}: LegalScreenProps) {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {history, bookmarks, playlistsList, podcastsList} = useSimbaStore();
  const liveStats = [
    {label: 'Played', value: String(history.length)},
    {label: 'Bookmarks', value: String(bookmarks.length)},
    {label: 'Playlists', value: String(playlistsList.length)},
    {label: 'Subscriptions', value: String(podcastsList.length)},
  ];
  const mostPlayedLabel = history[0]
    ? `Recently played: ${history[0].title}`
    : 'Start playing movies, music, podcasts, or radio to build your stats.';

  const page = legalPages[slug] ?? legalPages.about;

  const stickyHeader = (
    <View
      style={[
        styles.topBar,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 2,
          paddingBottom: spacing.sm,
        },
      ]}>
      <IconButton
        name="arrow-left"
        onPress={() => router.back()}
        accessibilityLabel="Back"
      />
      <View style={styles.titleCol}>
        <AppText variant="h2">{page.title}</AppText>
        <AppText variant="caption" tone="secondary">
          {page.subtitle}
        </AppText>
      </View>
      <Badge label="v2.4.0" tone="gold" />
    </View>
  );

  return (
    <Screen scroll header={stickyHeader}>
      <View
        style={[
          styles.container,
          {padding: spacing.lg, paddingBottom: spacing.lg},
        ]}>

        {/* Page Switcher Rail (all 8 pages on 07.6) */}
        <Rail gap={8} padding={0}>
          {Object.values(legalPages).map(entry => (
            <Chip
              key={entry.slug}
              label={entry.title}
              selected={entry.slug === page.slug}
              onPress={() => router.replace(`/legal/${entry.slug}` as never)}
            />
          ))}
        </Rail>

        {/* Hero Lockup (canvas-merged, bottom hairline) */}
        <View
          style={[
            styles.heroCard,
            {
              paddingHorizontal: 0,
              paddingTop: 4,
              paddingBottom: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border.subtle,
            },
          ]}>
          {page.slug === 'about' ? (
            <SimbaLogo size={44} variant="auto" />
          ) : (
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: colors.brand.primaryContainer,
                  borderRadius: radius.full,
                },
              ]}>
              <SimbaIcon
                name={page.icon}
                size={22}
                color={colors.brand.onPrimaryContainer}
              />
            </View>
          )}
          <View style={styles.heroCopy}>
            <AppText variant="title">{page.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {page.subtitle}
            </AppText>
          </View>
        </View>

        {/* Live Listening Stats Summary (canvas-merged, bottom hairline) */}
        {page.slug === 'stats' ? (
          <View
            style={[
              styles.statsCard,
              {
                paddingHorizontal: 0,
                paddingBottom: 18,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <AppText variant="overline" tone="gold">
              YOUR LISTENING SUMMARY
            </AppText>
            <View style={styles.statsGrid}>
              {liveStats.map(st => (
                <View key={st.label} style={styles.statCell}>
                  <AppText variant="h2" tone="gold">
                    {st.value}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {st.label}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="labelSmall" tone="gold">
              {mostPlayedLabel}
            </AppText>
          </View>
        ) : null}

        {/* Content Sections (canvas-merged, hairline-divided) */}
        {page.sections.map((sec, idx) => (
          <View
            key={sec.heading}
            style={[
              styles.sectionCard,
              {
                paddingHorizontal: 0,
                paddingTop: 4,
                paddingBottom: 16,
                borderBottomWidth:
                  idx === page.sections.length - 1
                    ? 0
                    : StyleSheet.hairlineWidth,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <AppText variant="overline" tone="gold">
              {sec.heading.toUpperCase()}
            </AppText>
            <AppText variant="body" tone="secondary">
              {sec.body}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 16},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {flex: 1, gap: 2},
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {flex: 1, gap: 2},
  statsCard: {
    padding: 16,
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '33%',
    minWidth: 96,
    gap: 2,
    marginBottom: 12,
  },
  sectionCard: {
    padding: 16,
    gap: 8,
  },
});
