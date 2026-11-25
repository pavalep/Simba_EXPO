import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {Image} from 'expo-image';
import {useTheme} from '../../theme/ThemeProvider';
import {radius} from '../../theme/tokens';
import {SimbaIcon} from './SimbaIcon';

export interface MediaArtworkProps {
  uri?: string | null;
  icon?: string;
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

/**
 * Renders live remote artwork via `expo-image` with disk caching and crossfade,
 * gracefully falling back to a themed MaterialCommunityIcons glyph when no URI
 * is available or the remote image fails to load.
 */
export function MediaArtwork({
  uri,
  icon = 'play-circle-outline',
  iconSize = 26,
  iconColor,
  style,
  borderRadius = radius.md,
}: MediaArtworkProps) {
  const {colors} = useTheme();
  const [failed, setFailed] = useState(false);

  const showImage = Boolean(uri && uri.startsWith('http') && !failed);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.elevated,
          borderRadius,
        },
        style,
      ]}>
      {showImage ? (
        <Image
          source={{uri: uri!}}
          style={[StyleSheet.absoluteFill, {borderRadius}]}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <SimbaIcon
          name={icon}
          size={iconSize}
          color={iconColor ?? colors.accent.gold}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
