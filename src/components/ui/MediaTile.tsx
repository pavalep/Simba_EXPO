import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';
import {Badge} from './Badge';
import {MediaArtwork} from './MediaArtwork';
import type {SimbaIconName} from './SimbaIcon';

export type KindIconName = SimbaIconName;

export interface MediaTileProps {
  title: string;
  /** The creator / channel line under the title. */
  subtitle?: string;
  meta?: string;
  /** The semantic kind label shown as a badge (Music, Podcast, Movie ...). */
  kindLabel?: string;
  /** Remote poster / cover artwork URL. */
  artworkUrl?: string;
  /** Icon standing in for the artwork until a real image is bound. */
  icon?: KindIconName;
  /** Poster tile (2:3) vs landscape tile (16:9). */
  aspect?: 'poster' | 'landscape' | 'square';
  onPress?: () => void;
  width?: number;
}

/**
 * The media card used across Home rails, catalogue rows and search results.
 * Renders real artwork via `MediaArtwork` with graceful icon fallback.
 */
export function MediaTile({
  title,
  meta,
  kindLabel,
  artworkUrl,
  icon = 'play-circle-outline',
  aspect = 'poster',
  onPress,
  width = 132,
}: MediaTileProps) {
  const {colors, radius} = useTheme();

  const artHeight =
    aspect === 'poster' ? width * 1.5 : aspect === 'landscape' ? width * 0.5625 : width;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({pressed}) => [{width, opacity: pressed ? 0.85 : 1}]}>
      <View
        style={[
          styles.art,
          {
            width,
            height: artHeight,
            borderRadius: radius.md,
            backgroundColor: colors.accent.goldWash,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border.default,
            overflow: 'hidden',
          },
        ]}>
        <MediaArtwork
          uri={artworkUrl}
          icon={icon}
          iconSize={26}
          borderRadius={radius.md}
          style={StyleSheet.absoluteFill}
        />
        {kindLabel ? (
          <View style={styles.badgeSlot}>
            <Badge label={kindLabel} tone="onMedia" />
          </View>
        ) : null}
      </View>
      <AppText variant="labelSmall" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {meta ? (
        <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.meta}>
          {meta}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: {alignItems: 'center', justifyContent: 'center'},
  badgeSlot: {position: 'absolute', left: 6, bottom: 6},
  title: {marginTop: 8},
  meta: {marginTop: 2},
});
