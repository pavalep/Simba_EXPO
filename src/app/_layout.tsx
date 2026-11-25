import React from 'react';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SimbaPlayer} from '@simba-dev/react-native-media-player';
import {QueryProvider} from '../providers/QueryProvider';
import {ThemeProvider, useTheme} from '../theme/ThemeProvider';
import {SimbaStoreProvider} from '../state/useSimbaStore';

/**
 * SIMBA (Expo SDK 58 + expo-router) — Root Layout.
 *
 * Native Single-Activity Splash Handoff:
 * `MainActivity` plays the native Android Lion + glow + orbiting ring splash
 * at t = 0ms while Hermes & React Native boot underneath. `HomeScreen` itself
 * signals `NativeModules.SimbaSplash.hide()` on its first painted layout frame
 * so the native splash crossfades directly into Home with ZERO white flash.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Lora Medium': require('../../assets/fonts/Lora-Medium.ttf'),
    'Lora SemiBold': require('../../assets/fonts/Lora-SemiBold.ttf'),
    'Lora Bold': require('../../assets/fonts/Lora-Bold.ttf'),
    Nunito: require('../../assets/fonts/Nunito-Regular.ttf'),
    'Nunito Medium': require('../../assets/fonts/Nunito-Medium.ttf'),
    'Nunito SemiBold': require('../../assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito Bold': require('../../assets/fonts/Nunito-Bold.ttf'),
    Comfortaa: require('../../assets/fonts/Comfortaa.ttf'),
    'Comfortaa Medium': require('../../assets/fonts/Comfortaa Medium.ttf'),
    'Comfortaa SemiBold': require('../../assets/fonts/Comfortaa SemiBold.ttf'),
    'Comfortaa Bold': require('../../assets/fonts/Comfortaa_bold.ttf'),
    Allura: require('../../assets/fonts/Allura.ttf'),
    'Cormorant Garamond': require('../../assets/fonts/Cormorant Garamond.ttf'),
    'Cormorant Garamond Bold': require('../../assets/fonts/Cormorant Garamond_bold.ttf'),
    'Cormorant Garamond Italic': require('../../assets/fonts/Cormorant Garamond_italic.ttf'),
    Inter: require('../../assets/fonts/Inter.ttf'),
    'Inter Medium': require('../../assets/fonts/Inter Medium.ttf'),
    'Inter SemiBold': require('../../assets/fonts/Inter SemiBold.ttf'),
    'Inter Bold': require('../../assets/fonts/Inter_bold.ttf'),
    'Manrope SemiBold': require('../../assets/fonts/Manrope SemiBold.ttf'),
    'Manrope Bold': require('../../assets/fonts/Manrope_bold.ttf'),
    'JetBrains Mono': require('../../assets/fonts/JetBrains Mono.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <SimbaPlayer>
            <SimbaStoreProvider>
              <ThemedStack />
            </SimbaStoreProvider>
          </SimbaPlayer>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

function ThemedStack() {
  const {colors, isDark} = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: colors.background.primary},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="splash" options={{animation: 'fade'}} />
        <Stack.Screen
          name="onboarding"
          options={{presentation: 'modal', animation: 'fade'}}
        />
        <Stack.Screen name="search" />
        <Stack.Screen name="curated-mixes" />
        <Stack.Screen name="catalogue/[lane]" />
        <Stack.Screen name="media/[id]" />
        <Stack.Screen
          name="player/audio"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="player/video"
          options={{animation: 'none'}}
        />
        <Stack.Screen
          name="player/queue"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="saved" />
        <Stack.Screen name="library" />
        <Stack.Screen name="folders" />
        <Stack.Screen name="legal/[slug]" />
      </Stack>
    </>
  );
}
