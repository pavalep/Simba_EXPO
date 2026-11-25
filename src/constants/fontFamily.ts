// ─── Font family constants (Expo / Simba_EXPO) ─────────────────────
//
// In Expo every face is bundled through expo-font and REGISTERED UNDER
// ITS OWN FAMILY NAME, so a weight is carried by the family name and NOT
// by fontWeight (attaching fontWeight: '700' to a custom expo-font family
// on Android causes ReactFontManager to look for a non-existent _bold
// asset and fall back to system Roboto).
//
// Register the same names in src/app/_layout.tsx via useFonts().

export const FONT_FAMILY = {
  /** Lora - warm calligraphic serif for magical editorial headings. */
  lora: {
    medium: 'Lora Medium',
    semibold: 'Lora SemiBold',
    bold: 'Lora Bold',
  },

  /** Nunito - soft rounded humanist sans for effortless UI & body copy. */
  nunito: {
    regular: 'Nunito',
    medium: 'Nunito Medium',
    semibold: 'Nunito SemiBold',
    bold: 'Nunito Bold',
  },

  /** Comfortaa - retained for legacy references if needed. */
  comfortaa: {
    regular: 'Comfortaa',
    medium: 'Comfortaa Medium',
    semibold: 'Comfortaa SemiBold',
    bold: 'Comfortaa Bold',
  },

  /** Allura - the brand wordmark only. Single weight. */
  allura: 'Allura',

  /** Cormorant Garamond - editorial serif. */
  cormorant: {
    regular: 'Cormorant Garamond',
    bold: 'Cormorant Garamond Bold',
    italic: 'Cormorant Garamond Italic',
  },

  /** Inter - classic UI sans. */
  inter: {
    regular: 'Inter',
    medium: 'Inter Medium',
    semibold: 'Inter SemiBold',
    bold: 'Inter Bold',
  },

  /** Manrope - section titles. */
  manrope: {
    semibold: 'Manrope SemiBold',
    bold: 'Manrope Bold',
  },

  /** JetBrains Mono - metrics and tabular timestamps. */
  jetbrainsMono: {
    regular: 'JetBrains Mono',
  },
} as const;

export type FontFamily =
  | typeof FONT_FAMILY.allura
  | (typeof FONT_FAMILY.lora)[keyof typeof FONT_FAMILY.lora]
  | (typeof FONT_FAMILY.nunito)[keyof typeof FONT_FAMILY.nunito]
  | (typeof FONT_FAMILY.comfortaa)[keyof typeof FONT_FAMILY.comfortaa]
  | (typeof FONT_FAMILY.cormorant)[keyof typeof FONT_FAMILY.cormorant]
  | (typeof FONT_FAMILY.inter)[keyof typeof FONT_FAMILY.inter]
  | (typeof FONT_FAMILY.manrope)[keyof typeof FONT_FAMILY.manrope]
  | (typeof FONT_FAMILY.jetbrainsMono)[keyof typeof FONT_FAMILY.jetbrainsMono];
