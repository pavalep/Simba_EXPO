// ─────────────────────────────────────────────────────────────
// SIMBA (Expo) — Design Tokens
// ─────────────────────────────────────────────────────────────
// SIMBA is a LION. The palette is warm Lion Gold on warm ivory
// (light) and on near-black (dark). The values are SIMBA's OWN,
// taken verbatim from the V1 token source of truth
// (MOBILE_APP_REACT_NATIVE/src/theme/tokens.ts):
//   accent.gold      #B8922E light / #C9A84C dark
//   accent.brandInk  #5C3A1E light / #B27340 dark
//   background       #F5F0E8 ivory light / #0A0A0C near-black dark
//
// Typography is SIMBA's OWN: Inter (workhorse), Cormorant Garamond
// (editorial serif), Allura (brand wordmark), JetBrains Mono (metrics).
//
// RULE: gold surfaces carry near-black ink, never white.
//   white on #B8922E = 2.9:1  ✗   #0A0A0C on #B8922E = 6.7:1  ✓

import {TextStyle, ViewStyle} from 'react-native';
import {FONT_FAMILY} from '../constants/fontFamily';

export interface BrandColorTokens {
  /** Lion Gold (#B8922E light, #C9A84C dark) */
  primary: string;
  /** Deep Lion Brown (#5C3A1E light, #B27340 dark) */
  primaryDark: string;
  /** Lighter Gold (#C9A84C light, #DCC07C dark) */
  primaryLight: string;
  /** Ink on a gold fill — near-black, never white (6.7:1) */
  onPrimary: string;
  /** Soft gold container for active pills, badges and chips */
  primaryContainer: string;
  /** Ink on primaryContainer */
  onPrimaryContainer: string;
  /** The gold used by the lion mark */
  logoGold: string;
  /** Full-bleed splash background (near-black) */
  splashBackground: string;
  /** Rating & award amber */
  amber: string;
  /** Soft amber pill background */
  amberLight: string;
  /** Ink on amber fill */
  onAmber: string;
}

export interface ColorTokens {
  brand: BrandColorTokens;
  background: {
    primary: string;
    subtle: string;
    surface: string;
    elevated: string;
    surfaceSubtle: string;
    floating: string;
    overlay: string;
    glass: string;
    scrim: string;
    scrimMid: string;
    scrimStrong: string;
    scrimOpaque: string;
    scrimFaint: string;
    scrimSoft: string;
    scrimDim: string;
    scrimDeep: string;
    surfaceDark: string;
    warm: string;
    highlight: string;
    highlightDim: string;
    highlightStrong: string;
    onMediaPill: string;
    onMediaPillBorder: string;
    /** The video surface behind the player chrome (pure black). */
    videoStage: string;
    playerScrim: {none: string; header: string; transport: string};
    seekTrack: {empty: string; buffered: string; played: string};
    onMediaSheet: string;
  };
  border: {default: string; subtle: string; emphasis: string; divider: string};
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    bright: string;
    onMediaSoft: string;
    onMediaMuted: string;
  };
  accent: {
    gold: string;
    goldDim: string;
    goldGlow: string;
    love: string;
    goldFaint: string;
    goldSoft: string;
    goldWash: string;
    sky: string;
    brandInk: string;
    brandInkSoft: string;
    primaryCTA: string;
    amber: string;
    amberLight: string;
  };
  shadow: string;
  semantic: {success: string; error: string; warning: string; errorDim: string};
}

export interface TypographyTokens {
  /** Cormorant Garamond Bold — the editorial hero */
  displayEditorial: TextStyle;
  headlineLg: TextStyle;
  headlineMd: TextStyle;
  headlineSm: TextStyle;
  titleMd: TextStyle;
  bodyLg: TextStyle;
  bodyMd: TextStyle;
  bodySm: TextStyle;
  labelLg: TextStyle;
  labelMd: TextStyle;
  labelSm: TextStyle;
  monoMetric: TextStyle;
  /** Allura — the brand wordmark only */
  brandScript: TextStyle;
  /** Cormorant Garamond Italic — greeting line */
  editorialItalic: TextStyle;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface RadiusTokens {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
  pill: number;
}

export interface ShadowTokens {
  card: ViewStyle;
  floating: ViewStyle;
  primaryGlow: ViewStyle;
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  gold: ViewStyle;
}

export interface MotionTokens {
  duration: {fast: number; pill: number; normal: number; slow: number; shimmer: number};
}

export interface FullThemeTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  motion: MotionTokens;
  isDark: boolean;
}

export const lightColors: ColorTokens = {
  brand: {
    primary: '#B8922E',
    primaryDark: '#5C3A1E',
    primaryLight: '#C9A84C',
    onPrimary: '#0A0A0C',
    primaryContainer: '#EFE3C4',
    onPrimaryContainer: '#5C3A1E',
    logoGold: '#B8922E',
    splashBackground: '#0A0A0C',
    amber: '#FFA726',
    amberLight: '#FBE7C7',
    onAmber: '#0A0A0C',
  },
  background: {
    primary: '#F5F0E8',
    subtle: '#EFEAE0',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    surfaceSubtle: '#F1ECE1',
    floating: 'rgba(245,240,232,0.92)',
    overlay: 'rgba(26,26,28,0.55)',
    glass: 'rgba(255,255,255,0.78)',
    scrim: 'rgba(10,10,12,0.35)',
    scrimMid: 'rgba(10,10,12,0.60)',
    scrimStrong: 'rgba(10,10,12,0.78)',
    scrimOpaque: 'rgba(10,10,12,0.92)',
    scrimFaint: 'rgba(0,0,0,0.08)',
    scrimSoft: 'rgba(0,0,0,0.15)',
    scrimDim: 'rgba(0,0,0,0.40)',
    scrimDeep: 'rgba(0,0,0,0.60)',
    surfaceDark: 'rgba(18,18,22,0.92)',
    warm: 'rgba(245,240,232,0.95)',
    highlight: 'rgba(184,146,46,0.06)',
    highlightDim: 'rgba(184,146,46,0.03)',
    highlightStrong: 'rgba(184,146,46,0.12)',
    onMediaPill: 'rgba(0,0,0,0.42)',
    onMediaPillBorder: 'rgba(255,255,255,0.16)',
    videoStage: '#000000',
    playerScrim: {
      none: 'rgba(0,0,0,0)',
      header: 'rgba(0,0,0,0.55)',
      transport: 'rgba(0,0,0,0.72)',
    },
    seekTrack: {
      empty: 'rgba(255,255,255,0.28)',
      buffered: 'rgba(184,146,46,0.60)',
      played: '#B8922E',
    },
    onMediaSheet: '#121216',
  },
  border: {
    default: '#E2DAC9',
    subtle: '#EDE7DA',
    emphasis: '#D9D0BC',
    divider: '#E7E0D0',
  },
  text: {
    primary: '#1A1A1C',
    secondary: '#6E675C',
    tertiary: '#A9A296',
    inverse: '#FFFFFF',
    bright: '#FFFFFF',
    onMediaSoft: 'rgba(255,255,255,0.80)',
    onMediaMuted: 'rgba(255,255,255,0.70)',
  },
  accent: {
    gold: '#B8922E',
    goldDim: 'rgba(184,146,46,0.12)',
    goldGlow: 'rgba(184,146,46,0.20)',
    love: '#E02447',
    goldFaint: 'rgba(184,146,46,0.06)',
    goldSoft: 'rgba(184,146,46,0.08)',
    goldWash: 'rgba(184,146,46,0.12)',
    sky: 'rgba(100,181,246,0.12)',
    brandInk: '#5C3A1E',
    brandInkSoft: '#6B4226',
    primaryCTA: '#B8922E',
    amber: '#FFA726',
    amberLight: '#FBE7C7',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
    errorDim: 'rgba(239,83,80,0.12)',
  },
  shadow: '#000000',
};

export const darkColors: ColorTokens = {
  brand: {
    primary: '#C9A84C',
    primaryDark: '#B27340',
    primaryLight: '#DCC07C',
    onPrimary: '#0A0A0C',
    primaryContainer: 'rgba(201,168,76,0.16)',
    onPrimaryContainer: '#C9A84C',
    logoGold: '#C9A84C',
    splashBackground: '#0A0A0C',
    amber: '#FFA726',
    amberLight: 'rgba(255,167,38,0.18)',
    onAmber: '#0A0A0C',
  },
  background: {
    primary: '#0A0A0C',
    subtle: '#111113',
    surface: '#141416',
    elevated: '#1A1A1D',
    surfaceSubtle: '#1F1F22',
    floating: 'rgba(20,20,22,0.88)',
    overlay: 'rgba(10,10,12,0.85)',
    glass: 'rgba(20,20,22,0.72)',
    scrim: 'rgba(10,10,12,0.50)',
    scrimMid: 'rgba(10,10,12,0.78)',
    scrimStrong: 'rgba(10,10,12,0.92)',
    scrimOpaque: 'rgba(10,10,12,0.98)',
    scrimFaint: 'rgba(0,0,0,0.10)',
    scrimSoft: 'rgba(0,0,0,0.20)',
    scrimDim: 'rgba(0,0,0,0.45)',
    scrimDeep: 'rgba(0,0,0,0.65)',
    surfaceDark: 'rgba(18,18,22,0.92)',
    warm: 'rgba(240,235,225,0.95)',
    highlight: 'rgba(255,255,255,0.08)',
    highlightDim: 'rgba(255,255,255,0.04)',
    highlightStrong: 'rgba(255,255,255,0.15)',
    onMediaPill: 'rgba(0,0,0,0.42)',
    onMediaPillBorder: 'rgba(255,255,255,0.16)',
    videoStage: '#000000',
    playerScrim: {
      none: 'rgba(0,0,0,0)',
      header: 'rgba(0,0,0,0.55)',
      transport: 'rgba(0,0,0,0.72)',
    },
    seekTrack: {
      empty: 'rgba(255,255,255,0.28)',
      buffered: 'rgba(201,168,76,0.60)',
      played: '#C9A84C',
    },
    onMediaSheet: '#121216',
  },
  border: {
    default: 'rgba(255,255,255,0.12)',
    subtle: 'rgba(255,255,255,0.06)',
    emphasis: 'rgba(255,255,255,0.18)',
    divider: 'rgba(255,255,255,0.08)',
  },
  text: {
    primary: '#EDEDED',
    secondary: '#8E8E90',
    tertiary: '#5A5A5E',
    inverse: '#0A0A0C',
    bright: '#FFFFFF',
    onMediaSoft: 'rgba(255,255,255,0.85)',
    onMediaMuted: 'rgba(255,255,255,0.70)',
  },
  accent: {
    gold: '#C9A84C',
    goldDim: 'rgba(201,168,76,0.15)',
    goldGlow: 'rgba(201,168,76,0.25)',
    love: '#FF2D55',
    goldFaint: 'rgba(201,168,76,0.06)',
    goldSoft: 'rgba(201,168,76,0.10)',
    goldWash: 'rgba(201,168,76,0.18)',
    sky: 'rgba(100,181,246,0.15)',
    brandInk: '#B27340',
    brandInkSoft: '#A1733A',
    primaryCTA: '#C9A84C',
    amber: '#FFA726',
    amberLight: 'rgba(255,167,38,0.18)',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
    errorDim: 'rgba(239,83,80,0.15)',
  },
  shadow: '#000000',
};

// ─── Typography (Allura wordmark + Lora editorial headings + Nunito UI) ──
// Note: `includeFontPadding: false` + subtle `letterSpacing` prevents Android
// Fabric's BoringLayout/StaticLayout subpixel measurement mismatch on Google
// Fonts GPOS-kerned TTFs (Lora & Nunito) that otherwise clips trailing chars.

export const typography: TypographyTokens = {
  displayEditorial: {
    fontFamily: FONT_FAMILY.lora.bold,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  headlineLg: {
    fontFamily: FONT_FAMILY.lora.bold,
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  headlineMd: {
    fontFamily: FONT_FAMILY.lora.semibold,
    fontSize: 19.5,
    lineHeight: 26,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  headlineSm: {
    fontFamily: FONT_FAMILY.lora.semibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  titleMd: {
    fontFamily: FONT_FAMILY.nunito.bold,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  bodyLg: {
    fontFamily: FONT_FAMILY.nunito.medium,
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  bodyMd: {
    fontFamily: FONT_FAMILY.nunito.regular,
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  bodySm: {
    fontFamily: FONT_FAMILY.nunito.medium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  labelLg: {
    fontFamily: FONT_FAMILY.nunito.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  labelMd: {
    fontFamily: FONT_FAMILY.nunito.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  labelSm: {
    fontFamily: FONT_FAMILY.nunito.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  monoMetric: {
    fontFamily: FONT_FAMILY.jetbrainsMono.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  brandScript: {
    fontFamily: FONT_FAMILY.allura,
    fontSize: 44,
    lineHeight: 52,
  },
  editorialItalic: {
    fontFamily: FONT_FAMILY.cormorant.italic,
    fontSize: 18,
    lineHeight: 24,
  },
};

// ─── Spacing (4pt grid) ──────────────────────────────────────

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Radius ──────────────────────────────────────────────────

export const radius: RadiusTokens = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 9999,
  pill: 9999,
};

// ─── Shadows (gold glow, never CodecM green) ─────────────────

export const lightShadows: ShadowTokens = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  primaryGlow: {
    shadowColor: '#B8922E',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  gold: {
    shadowColor: '#B8922E',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const darkShadows: ShadowTokens = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: '#C9A84C',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 10,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
};

export const motion: MotionTokens = {
  duration: {fast: 150, pill: 180, normal: 250, slow: 350, shimmer: 1400},
};

export const lightTokens: FullThemeTokens = {
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows: lightShadows,
  motion,
  isDark: false,
};

export const darkTokens: FullThemeTokens = {
  colors: darkColors,
  typography,
  spacing,
  radius,
  shadows: darkShadows,
  motion,
  isDark: true,
};
