import React from 'react';
import {Text, TextProps} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

export type TextVariant =
  | 'display'
  | 'editorial'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'labelSmall'
  | 'overline'
  | 'mono'
  | 'wordmark'
  | 'gold';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'bright' | 'gold' | 'mutedOnMedia';
}

/**
 * The ONE text primitive. Every string in the app goes through it so the
 * type scale stays on the token sheet - no inline fontSize anywhere else.
 */
export function AppText({
  variant = 'body',
  tone,
  style,
  children,
  ...rest
}: AppTextProps) {
  const {typography, colors} = useTheme();

  // The 'gold' VARIANT carries its own colour, so it must not be
  // overwritten by the default (primary) tone.
  const effectiveTone = tone ?? (variant === 'gold' ? 'gold' : 'primary');

  const toneColor = (() => {
    switch (effectiveTone) {
      case 'secondary':
        return colors.text.secondary;
      case 'tertiary':
        return colors.text.tertiary;
      case 'inverse':
        return colors.text.inverse;
      case 'bright':
        return colors.text.bright;
      case 'gold':
        return colors.accent.gold;
      case 'mutedOnMedia':
        return colors.text.onMediaMuted;
      case 'primary':
      default:
        return colors.text.primary;
    }
  })();

  const variantStyle = (() => {
    switch (variant) {
      case 'display':
        return typography.displayEditorial;
      case 'editorial':
        return typography.editorialItalic;
      case 'h1':
        return typography.headlineLg;
      case 'h2':
        return typography.headlineMd;
      case 'h3':
        return typography.headlineSm;
      case 'title':
        return typography.titleMd;
      case 'bodySmall':
        return typography.bodySm;
      case 'caption':
        return typography.bodySm;
      case 'label':
        return typography.labelLg;
      case 'labelSmall':
        return typography.labelSm;
      case 'overline':
        return {...typography.labelSm, letterSpacing: 0.8};
      case 'mono':
        return typography.monoMetric;
      case 'wordmark':
        return typography.brandScript;
      case 'gold':
        return {...typography.headlineMd, color: colors.accent.gold};
      case 'body':
      default:
        return typography.bodyMd;
    }
  })();

  return (
    <Text
      textBreakStrategy="simple"
      {...rest}
      style={[variantStyle, {color: toneColor}, style]}>
      {children}
    </Text>
  );
}
