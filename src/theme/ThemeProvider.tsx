import React, {createContext, useContext, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';
import {
  lightTokens,
  darkTokens,
  FullThemeTokens,
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  MotionTokens,
} from './tokens';

export interface ThemeContextValue {
  tokens: FullThemeTokens;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  motion: MotionTokens;
  isDark: boolean;
  mode: 'system' | 'light' | 'dark';
  setMode: (mode: 'system' | 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('system');

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const tokens = isDark ? darkTokens : lightTokens;
    return {
      tokens,
      colors: tokens.colors,
      typography: tokens.typography,
      spacing: tokens.spacing,
      radius: tokens.radius,
      shadows: tokens.shadows,
      motion: tokens.motion,
      isDark,
      mode,
      setMode,
    };
  }, [isDark, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
