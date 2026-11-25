import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SimbaIcon} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {AppText, Screen, Surface} from '../ui';
import {profile} from '../../data/dummy';

const AUDIO_QUALITIES = [
  'Lossless (320 kbps)',
  'High Quality (256 kbps)',
  'Standard (128 kbps)',
] as const;

const VIDEO_QUALITIES = [
  'Auto HD (1080p)',
  'Standard HD (720p)',
  'Data Saver (480p)',
] as const;

/**
 * Profile & Library Page (matching CodecM `profile_page.dart` 1:1 in SIMBA Lion Gold & Brown).
 *
 * Deceptively simple 4-card layout:
 *   1. Account Card (Guest Listener with white bordered "Continue with Google", or Signed-In with Sync & Sign Out)
 *   2. My Content & Library (Clean grouped list card with icons, subtitles, and count badges)
 *   3. Streaming & Playback (Audio Quality, Video Quality, Wi-Fi Only toggle, Local Media Cache Clear)
 *   4. Media Sources (6 connected public libraries with status checkmarks)
 */
export function ProfileScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    dockVisible,
    signedIn,
    setSignedIn,
    bookmarks,
    history,
    playlistsList,
    podcastsList,
    linkedFolders,
    downloads,
  } = useSimbaStore();

  const [audioQualityIdx, setAudioQualityIdx] = useState(0);
  const [videoQualityIdx, setVideoQualityIdx] = useState(0);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  const stickyHeader = (
    <View
      style={[
        styles.headerBlock,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        },
      ]}>
      <AppText variant="h1">Profile & Library</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        Your library, subscriptions, downloads, and preferences.
      </AppText>
    </View>
  );

  return (
    <Screen scroll inTabs bottomInset={dockVisible ? 80 : 12} header={stickyHeader}>
      <View style={[styles.container, {padding: spacing.lg}]}>

        {/* 1. Account Status (canvas-merged, bottom hairline) */}
        {signedIn ? (
          <View
            style={[
              styles.accountCard,
              {
                paddingHorizontal: 0,
                paddingTop: 4,
                paddingBottom: 18,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <View style={styles.accountTopRow}>
              <View
                style={[
                  styles.avatarSignedIn,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderColor: colors.brand.primary,
                    borderRadius: radius.full,
                  },
                ]}>
                <AppText
                  variant="h2"
                  style={{color: colors.brand.onPrimaryContainer}}>
                  {profile.signedIn.name.charAt(0)}
                </AppText>
              </View>

              <View style={styles.accountCopy}>
                <View style={styles.verifiedRow}>
                  <AppText variant="title">{profile.signedIn.name}</AppText>
                  <SimbaIcon
                    name="check-decagram"
                    size={16}
                    color={colors.accent.gold}
                  />
                </View>
                <AppText variant="caption" tone="secondary">
                  {profile.signedIn.email}
                </AppText>
                <View style={styles.statusDotRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: colors.semantic.success,
                        borderRadius: radius.full,
                      },
                    ]}
                  />
                  <AppText variant="caption" tone="tertiary">
                    Connected via Google Sign-In
                  </AppText>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.dividerFull,
                {backgroundColor: colors.border.default},
              ]}
            />

            <View style={styles.signedInActions}>
              <Pressable
                onPress={() => setSignedIn(false)}
                accessibilityRole="button"
                hitSlop={8}>
                <AppText
                  variant="label"
                  style={{color: colors.semantic.error}}>
                  Sign Out
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => {}}
                accessibilityRole="button"
                style={[
                  styles.outlinedSmallBtn,
                  {
                    borderColor: colors.border.default,
                    borderRadius: radius.sm,
                  },
                ]}>
                <AppText variant="labelSmall">Sync Library</AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.accountCard,
              {
                paddingHorizontal: 0,
                paddingTop: 4,
                paddingBottom: 18,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border.subtle,
              },
            ]}>
            <View style={styles.accountTopRow}>
              <View
                style={[
                  styles.avatarGuest,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.full,
                  },
                ]}>
                <SimbaIcon
                  name="account-outline"
                  size={26}
                  color={colors.brand.onPrimaryContainer}
                />
              </View>

              <View style={styles.accountCopy}>
                <AppText variant="title">{profile.guest.name}</AppText>
                <AppText variant="caption" tone="secondary">
                  Sign in to sync your keepsakes, subscriptions, and listening across devices.
                </AppText>
              </View>
            </View>

            <Pressable
              onPress={() => setSignedIn(true)}
              accessibilityRole="button"
              style={({pressed}) => [
                styles.googleSignInBtn,
                {
                  backgroundColor: colors.background.surfaceSubtle,
                  borderRadius: radius.pill,
                  borderWidth: 0,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}>
              <SimbaIcon
                name="google"
                size={18}
                color={colors.accent.gold}
              />
              <AppText variant="label">Continue with Google</AppText>
            </Pressable>
          </View>
        )}

        {/* 2. Your Collection (Canvas-merged, hairline-divided) */}
        <View style={styles.sectionBlock}>
          <AppText variant="h3">Your Collection</AppText>

          <View style={styles.groupCard}>
            <LibraryHubTile
              icon="rss"
              iconTone="gold"
              title="Subscribed Podcasts"
              subtitle={`${podcastsList.length} shows followed`}
              badgeCount={podcastsList.length}
              onPress={() => router.push('/library?tab=podcasts')}
              showDivider
            />
            <LibraryHubTile
              icon="heart-outline"
              iconTone="love"
              title="Saved Bookmarks"
              subtitle={`${bookmarks.length} items saved`}
              badgeCount={bookmarks.length}
              onPress={() => router.push('/saved?tab=bookmarks')}
              showDivider
            />
            <LibraryHubTile
              icon="history"
              iconTone="amber"
              title="Playback History"
              subtitle={`${history.length} recently played`}
              badgeCount={history.length}
              onPress={() => router.push('/saved?tab=history')}
              showDivider
            />
            <LibraryHubTile
              icon="creation"
              iconTone="gold"
              title="Handpicked Mixes"
              subtitle="Daily mixes gathered for every mood"
              badgeCount={0}
              onPress={() => router.push('/curated-mixes')}
              showDivider
            />
            <LibraryHubTile
              icon="playlist-music"
              iconTone="gold"
              title="Playlists & Downloads"
              subtitle={`${playlistsList.length} playlists • ${downloads.length} offline downloads`}
              badgeCount={playlistsList.length}
              onPress={() => router.push('/library?tab=playlists')}
              showDivider
            />
            <LibraryHubTile
              icon="folder-music-outline"
              iconTone="gold"
              title="Device Folders"
              subtitle={`${linkedFolders.length} folders connected on this phone`}
              badgeCount={linkedFolders.length}
              onPress={() => router.push('/folders')}
              showDivider={false}
            />
          </View>
        </View>

        {/* 3. Playback & Storage (Canvas-merged, hairline-divided) */}
        <View style={styles.sectionBlock}>
          <AppText variant="h3">Playback &amp; Storage</AppText>

          <View style={styles.groupCard}>
            {/* Audio Stream Quality */}
            <Pressable
              onPress={() =>
                setAudioQualityIdx(i => (i + 1) % AUDIO_QUALITIES.length)
              }
              accessibilityRole="button"
              style={styles.prefRow}>
              <View
                style={[
                  styles.tileIconBox,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.sm,
                  },
                ]}>
                <SimbaIcon
                  name="equalizer"
                  size={20}
                  color={colors.brand.onPrimaryContainer}
                />
              </View>
              <View style={styles.tileCopy}>
                <AppText variant="title">Audio Stream Quality</AppText>
                <AppText variant="caption" tone="secondary">
                  {AUDIO_QUALITIES[audioQualityIdx]}
                </AppText>
              </View>
              <SimbaIcon
                name="chevron-right"
                size={18}
                color={colors.text.tertiary}
              />
            </Pressable>
            <View
              style={[
                styles.indentedDivider,
                {backgroundColor: colors.border.subtle},
              ]}
            />

            {/* Video Quality */}
            <Pressable
              onPress={() =>
                setVideoQualityIdx(i => (i + 1) % VIDEO_QUALITIES.length)
              }
              accessibilityRole="button"
              style={styles.prefRow}>
              <View
                style={[
                  styles.tileIconBox,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.sm,
                  },
                ]}>
                <SimbaIcon
                  name="high-definition-box"
                  size={20}
                  color={colors.brand.onPrimaryContainer}
                />
              </View>
              <View style={styles.tileCopy}>
                <AppText variant="title">Video Quality</AppText>
                <AppText variant="caption" tone="secondary">
                  {VIDEO_QUALITIES[videoQualityIdx]}
                </AppText>
              </View>
              <SimbaIcon
                name="chevron-right"
                size={18}
                color={colors.text.tertiary}
              />
            </Pressable>
            <View
              style={[
                styles.indentedDivider,
                {backgroundColor: colors.border.subtle},
              ]}
            />

            {/* Stream Over Wi-Fi Only */}
            <Pressable
              onPress={() => setWifiOnly(v => !v)}
              accessibilityRole="switch"
              accessibilityState={{checked: wifiOnly}}
              style={styles.prefRow}>
              <View
                style={[
                  styles.tileIconBox,
                  {
                    backgroundColor: colors.brand.primaryContainer,
                    borderRadius: radius.sm,
                  },
                ]}>
                <SimbaIcon
                  name="wifi"
                  size={20}
                  color={colors.brand.onPrimaryContainer}
                />
              </View>
              <View style={styles.tileCopy}>
                <AppText variant="title">Stream Over Wi-Fi Only</AppText>
                <AppText variant="caption" tone="secondary">
                  Prevent cellular data consumption
                </AppText>
              </View>
              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: wifiOnly
                      ? colors.brand.primary
                      : colors.border.default,
                    borderRadius: radius.pill,
                  },
                ]}>
                <View
                  style={[
                    styles.switchThumb,
                    {
                      backgroundColor: wifiOnly
                        ? colors.brand.onPrimary
                        : colors.background.surface,
                      borderRadius: radius.full,
                      alignSelf: wifiOnly ? 'flex-end' : 'flex-start',
                    },
                  ]}
                />
              </View>
            </Pressable>
            <View
              style={[
                styles.indentedDivider,
                {backgroundColor: colors.border.subtle},
              ]}
            />

            {/* Local Media Cache */}
            <View style={styles.prefRow}>
              <View
                style={[
                  styles.tileIconBox,
                  {
                    backgroundColor: colors.semantic.errorDim,
                    borderRadius: radius.sm,
                  },
                ]}>
                <SimbaIcon
                  name="delete-sweep-outline"
                  size={20}
                  color={colors.semantic.error}
                />
              </View>
              <View style={styles.tileCopy}>
                <AppText variant="title">Local Media Cache</AppText>
                <AppText variant="caption" tone="secondary">
                  {cacheCleared
                    ? '0.0 MB cached on device'
                    : '14.2 MB cached on device'}
                </AppText>
              </View>
              <Pressable
                onPress={() => setCacheCleared(true)}
                accessibilityRole="button"
                style={[
                  styles.outlinedSmallBtn,
                  {
                    borderColor: colors.border.default,
                    borderRadius: radius.xs + 2,
                  },
                ]}>
                <AppText variant="labelSmall">
                  {cacheCleared ? 'Cleared' : 'Clear'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerBlock}>
          <AppText variant="labelSmall" tone="tertiary">
            Simba v1.1.0 • Cinema, Music & Podcasts
          </AppText>
          <View style={styles.footerLinksRow}>
            <Pressable
              onPress={() =>
                router.push({pathname: '/legal/[slug]', params: {slug: 'about'}})
              }
              accessibilityRole="button">
              <AppText variant="caption" tone="gold">
                About
              </AppText>
            </Pressable>
            <AppText variant="caption" tone="tertiary">
              •
            </AppText>
            <Pressable
              onPress={() =>
                router.push({pathname: '/legal/[slug]', params: {slug: 'stats'}})
              }
              accessibilityRole="button">
              <AppText variant="caption" tone="gold">
                Activity
              </AppText>
            </Pressable>
            <AppText variant="caption" tone="tertiary">
              •
            </AppText>
            <Pressable
              onPress={() =>
                router.push({pathname: '/legal/[slug]', params: {slug: 'help'}})
              }
              accessibilityRole="button">
              <AppText variant="caption" tone="gold">
                Help
              </AppText>
            </Pressable>
            <AppText variant="caption" tone="tertiary">
              •
            </AppText>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/legal/[slug]',
                  params: {slug: 'privacy'},
                })
              }
              accessibilityRole="button">
              <AppText variant="caption" tone="gold">
                Privacy
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function LibraryHubTile({
  icon,
  iconTone,
  title,
  subtitle,
  badgeCount,
  onPress,
  showDivider,
}: {
  icon: import('../ui/SimbaIcon').SimbaIconName;
  iconTone: 'gold' | 'love' | 'amber';
  title: string;
  subtitle: string;
  badgeCount: number;
  onPress: () => void;
  showDivider: boolean;
}) {
  const {colors, radius} = useTheme();

  const iconBg =
    iconTone === 'love'
      ? colors.semantic.errorDim
      : iconTone === 'amber'
      ? colors.brand.amberLight
      : colors.brand.primaryContainer;

  const iconColor =
    iconTone === 'love'
      ? colors.semantic.error
      : iconTone === 'amber'
      ? colors.brand.onAmber
      : colors.brand.onPrimaryContainer;

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={styles.prefRow}>
        <View
          style={[
            styles.tileIconBox,
            {
              backgroundColor: iconBg,
              borderRadius: radius.sm,
            },
          ]}>
          <SimbaIcon name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.tileCopy}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.tileRight}>
          {badgeCount > 0 ? (
            <View
              style={[
                styles.countPill,
                {
                  backgroundColor: colors.brand.primaryContainer,
                  borderRadius: radius.sm,
                },
              ]}>
              <AppText
                variant="labelSmall"
                style={{color: colors.brand.onPrimaryContainer}}>
                {badgeCount}
              </AppText>
            </View>
          ) : null}
          <SimbaIcon
            name="chevron-right"
            size={18}
            color={colors.text.tertiary}
          />
        </View>
      </Pressable>
      {showDivider ? (
        <View
          style={[
            styles.indentedDivider,
            {backgroundColor: colors.border.subtle},
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  headerBlock: {
    gap: 4,
  },
  accountCard: {
    padding: 16,
    gap: 14,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarGuest: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSignedIn: {
    width: 50,
    height: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
  },
  dividerFull: {
    height: StyleSheet.hairlineWidth,
  },
  signedInActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  googleSignInBtn: {
    height: 46,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sectionBlock: {
    gap: 10,
  },
  groupCard: {
    overflow: 'hidden',
  },
  prefRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCopy: {
    flex: 1,
    gap: 2,
  },
  tileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  indentedDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  outlinedSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  switchTrack: {
    width: 44,
    height: 24,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 18,
    height: 18,
  },
  sourceRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
  },
  footerBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
