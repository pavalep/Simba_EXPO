import React, {useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import {SimbaIcon, type SimbaIconName} from '../ui/SimbaIcon';
import {useRouter} from 'expo-router';
import {useTheme} from '../../theme/ThemeProvider';
import {useSimbaStore} from '../../state/useSimbaStore';
import {AppText, Button, IconButton, Screen, Sheet} from '../ui';

interface QuickFolderPreset {
  name: string;
  path: string;
  formats: string;
  icon: SimbaIconName;
}

const STANDARD_PHONE_FOLDERS: QuickFolderPreset[] = [
  {
    name: 'Music',
    path: 'Phone Storage / Music',
    formats: 'MP3, FLAC, M4A, WAV',
    icon: 'music-clef-treble',
  },
  {
    name: 'Downloads',
    path: 'Phone Storage / Download',
    formats: 'Audio & video files',
    icon: 'folder-outline',
  },
  {
    name: 'Movies',
    path: 'Phone Storage / Movies',
    formats: 'MP4, MKV, WebM',
    icon: 'movie-open-outline',
  },
  {
    name: 'Audiobooks',
    path: 'Phone Storage / Audiobooks',
    formats: 'M4B, MP3 chapters',
    icon: 'book-open-page-variant-outline',
  },
  {
    name: 'Podcasts',
    path: 'Phone Storage / Podcasts',
    formats: 'Saved episodes',
    icon: 'podcast',
  },
];

/**
 * DEVICE FOLDERS — One-tap standard phone folders + optional custom folder sheet.
 *
 * Designed for everyday listeners: no manual path typing required. Tap "Connect"
 * on Music, Downloads, Movies, Audiobooks, or Podcasts and Simba indexes them
 * directly without copying files.
 */
export function FoldersScreen() {
  const {colors, spacing, radius} = useTheme();
  const router = useRouter();
  const {
    linkedFolders,
    addLinkedFolder,
    removeLinkedFolder,
    rescanLinkedFolders,
  } = useSimbaStore();

  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('Phone Storage / ');

  const findLinked = (name: string) =>
    linkedFolders.find(f => f.name.toLowerCase() === name.toLowerCase());

  const handleTogglePreset = (preset: QuickFolderPreset) => {
    const existing = findLinked(preset.name);
    if (existing) {
      removeLinkedFolder(existing.id);
    } else {
      addLinkedFolder(preset.name, preset.path);
    }
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    const path = customPath.trim();
    if (!name) {
      return;
    }
    addLinkedFolder(name, path || `Phone Storage / ${name}`);
    setCustomName('');
    setCustomPath('Phone Storage / ');
    setCustomOpen(false);
  };

  const customFolders = linkedFolders.filter(
    f =>
      !STANDARD_PHONE_FOLDERS.some(
        p => p.name.toLowerCase() === f.name.toLowerCase(),
      ),
  );

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
        <AppText variant="h1">On This Phone</AppText>
        <AppText variant="caption" tone="secondary">
          Tap any folder to play its files in Simba
        </AppText>
      </View>
      {linkedFolders.length > 0 ? (
        <IconButton
          name="folder-sync-outline"
          size={21}
          onPress={rescanLinkedFolders}
          accessibilityLabel="Refresh folders"
        />
      ) : null}
    </View>
  );

  return (
    <Screen scroll header={stickyHeader}>
      <View
        style={[
          styles.container,
          {paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl},
        ]}>
        {/* 1. One-Tap Standard Phone Folders */}
        <View style={styles.sectionBlock}>
          <AppText variant="h3">Choose Folders</AppText>
          <AppText variant="caption" tone="secondary">
            Files stay right where they are — Simba never duplicates your storage.
          </AppText>

          <View style={styles.list}>
            {STANDARD_PHONE_FOLDERS.map((preset, idx) => {
              const linked = findLinked(preset.name);
              const isLast = idx === STANDARD_PHONE_FOLDERS.length - 1;
              return (
                <Pressable
                  key={preset.name}
                  onPress={() => handleTogglePreset(preset)}
                  accessibilityRole="button"
                  style={({pressed}) => [
                    styles.folderRow,
                    {
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <View
                    style={[
                      styles.folderIconCircle,
                      {
                        backgroundColor: linked
                          ? colors.brand.primaryContainer
                          : colors.background.surfaceSubtle,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <SimbaIcon
                      name={preset.icon}
                      size={20}
                      color={
                        linked
                          ? colors.brand.onPrimaryContainer
                          : colors.text.secondary
                      }
                    />
                  </View>
                  <View style={styles.folderCopy}>
                    <AppText variant="title">{preset.name}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {linked
                        ? `${linked.trackCount} audio · ${linked.videoCount} video · ${linked.lastScanned}`
                        : preset.formats}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.actionPill,
                      {
                        backgroundColor: linked
                          ? colors.brand.primaryContainer
                          : colors.background.surfaceSubtle,
                        borderRadius: radius.pill,
                      },
                    ]}>
                    <AppText
                      variant="labelSmall"
                      style={{
                        color: linked
                          ? colors.brand.onPrimaryContainer
                          : colors.text.primary,
                      }}>
                      {linked ? 'Connected' : 'Connect'}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Custom Connected Folders (if any) */}
        {customFolders.length > 0 ? (
          <View style={styles.sectionBlock}>
            <AppText variant="h3">Custom Folders</AppText>
            <View style={styles.list}>
              {customFolders.map((fld, idx) => (
                <View
                  key={fld.id}
                  style={[
                    styles.folderRow,
                    {
                      borderBottomWidth:
                        idx === customFolders.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}>
                  <View
                    style={[
                      styles.folderIconCircle,
                      {
                        backgroundColor: colors.brand.primaryContainer,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <SimbaIcon
                      name="folder-music-outline"
                      size={20}
                      color={colors.brand.onPrimaryContainer}
                    />
                  </View>
                  <View style={styles.folderCopy}>
                    <AppText variant="title" numberOfLines={1}>
                      {fld.name}
                    </AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {`${fld.path} · ${fld.trackCount} audio · ${fld.videoCount} video`}
                    </AppText>
                  </View>
                  <IconButton
                    name="close"
                    size={18}
                    onPress={() => removeLinkedFolder(fld.id)}
                    accessibilityLabel={`Remove ${fld.name}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 3. Subtle Secondary Action for Custom / SD Card Folder */}
        <Pressable
          onPress={() => setCustomOpen(true)}
          accessibilityRole="button"
          style={({pressed}) => [
            styles.customRow,
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border.subtle,
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <SimbaIcon
            name="folder-plus-outline"
            size={20}
            color={colors.accent.gold}
          />
          <AppText variant="label" tone="gold">
            Add another folder or SD card path
          </AppText>
        </Pressable>
      </View>

      <Sheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add Custom Folder"
        subtitle="For SD cards or custom storage locations">
        <View style={styles.sheetBody}>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Folder name (e.g. Roadtrip Mix)"
            placeholderTextColor={colors.text.tertiary}
            style={[
              styles.input,
              {
                color: colors.text.primary,
                backgroundColor: colors.background.surfaceSubtle,
                borderRadius: radius.pill,
              },
            ]}
          />
          <TextInput
            value={customPath}
            onChangeText={setCustomPath}
            placeholder="Location (e.g. SD Card / Music)"
            placeholderTextColor={colors.text.tertiary}
            style={[
              styles.input,
              {
                color: colors.text.primary,
                backgroundColor: colors.background.surfaceSubtle,
                borderRadius: radius.pill,
              },
            ]}
          />
          <Button label="Connect Folder" onPress={handleAddCustom} fullWidth />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {gap: 20},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {flex: 1, gap: 2},
  sectionBlock: {gap: 6},
  list: {marginTop: 4},
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  folderIconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCopy: {flex: 1, gap: 2},
  actionPill: {
    minHeight: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
  },
  sheetBody: {gap: 12},
  input: {
    height: 46,
    paddingHorizontal: 16,
  },
});
