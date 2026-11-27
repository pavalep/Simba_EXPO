import React, {useEffect} from 'react';
import {DeviceEventEmitter} from 'react-native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SimbaPlayer} from '@simba-dev/react-native-media-player';
import {QueryProvider} from '../providers/QueryProvider';
import {ThemeProvider, useTheme} from '../theme/ThemeProvider';
import {SimbaStoreProvider, useSimbaStore} from '../state/useSimbaStore';
import {
  clearPendingTrackSwitch,
  useSimbaPlayback,
} from '../infrastructure/player';

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
              <MediaSessionQueueBridge />
              <ThemedStack />
            </SimbaStoreProvider>
          </SimbaPlayer>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

function MediaSessionQueueBridge() {
  const {nowPlaying, queue} = useSimbaStore();
  const {playCatalogueItem, commands} = useSimbaPlayback();
  const consecutiveErrorSkipsRef = React.useRef(0);

  useEffect(() => {
    const advanceToNext = () => {
      if (!nowPlaying) {
        return false;
      }
      const laneQueue = queue.filter(q => q.lane === nowPlaying.lane);
      if (laneQueue.length === 0) {
        return false;
      }
      const idx = laneQueue.findIndex(q => q.id === nowPlaying.id);
      const nextIdx = idx === -1 ? 0 : idx + 1;
      if (nextIdx >= laneQueue.length) {
        return false;
      }
      const nextItem = laneQueue[nextIdx];
      if (nextItem && nextItem.id !== nowPlaying.id) {
        void playCatalogueItem(nextItem);
        return true;
      }
      return false;
    };

    const loadedSub = DeviceEventEmitter.addListener('onFileLoaded', () => {
      consecutiveErrorSkipsRef.current = 0;
      clearPendingTrackSwitch();
    });

    const actionSub = DeviceEventEmitter.addListener(
      'onMediaSessionAction',
      (payload?: {action?: string}) => {
        const action = payload?.action;
        if (!nowPlaying || (action !== 'next' && action !== 'previous')) {
          return;
        }
        const laneQueue = queue.filter(q => q.lane === nowPlaying.lane);
        if (laneQueue.length === 0) {
          if (action === 'previous') {
            commands.seek(0);
          }
          return;
        }
        const idx = laneQueue.findIndex(q => q.id === nowPlaying.id);
        if (action === 'next') {
          const nextIdx = idx === -1 ? 0 : (idx + 1) % laneQueue.length;
          const nextItem = laneQueue[nextIdx];
          if (nextItem && nextItem.id !== nowPlaying.id) {
            void playCatalogueItem(nextItem);
          }
        } else {
          const prevIdx = idx > 0 ? idx - 1 : laneQueue.length - 1;
          const prevItem = laneQueue[prevIdx];
          if (prevItem && prevItem.id !== nowPlaying.id) {
            void playCatalogueItem(prevItem);
          } else {
            commands.seek(0);
          }
        }
      },
    );

    // Auto-advance to the next queued audio or video track on natural EOF (reason === 0),
    // and auto-skip broken upstream 404/500 tracks (reason === 4) up to 3 in a row.
    const eofSub = DeviceEventEmitter.addListener(
      'onEndFile',
      (payload?: {reason?: number; error?: number}) => {
        if (payload?.reason === 0 && (payload.error ?? 0) === 0) {
          consecutiveErrorSkipsRef.current = 0;
          advanceToNext();
        } else if (payload?.reason === 4 && consecutiveErrorSkipsRef.current < 3) {
          consecutiveErrorSkipsRef.current += 1;
          advanceToNext();
        }
      },
    );

    return () => {
      loadedSub.remove();
      actionSub.remove();
      eofSub.remove();
    };
  }, [nowPlaying, queue, playCatalogueItem, commands]);

  return null;
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
