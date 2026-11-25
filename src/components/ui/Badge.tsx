import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';

export interface BadgeProps {
  label: string;
  tone?: 'gold' | 'neutral' | 'onMedia' | 'amber';
}

/** The kind badge (Music, Podcast, Movie, Live TV ...) used on media tiles. */
export function Badge({label, tone = 'neutral'}: BadgeProps) {
  const {colors, radius} = useTheme();

  const bg =
    tone === 'gold'
      ? colors.accent.goldWash
      : tone === 'amber'
      ? colors.brand.amberLight
      : tone === 'onMedia'
      ? colors.background.onMediaPill
      : colors.background.surfaceSubtle;

  const fg =
    tone === 'gold'
      ? colors.accent.brandInk
      : tone === 'amber'
      ? colors.brand.onAmber
      : tone === 'onMedia'
      ? colors.text.onMediaSoft
      : colors.text.secondary;

  return (
    <View style={[styles.badge, {backgroundColor: bg, borderRadius: radius.xs}]}>
      <AppText variant="labelSmall" numberOfLines={1} style={{color: fg}}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
});
