import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Tabs} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';
import {SimbaIcon, type SimbaIconName} from '../../components/ui';
import {MiniPlayerDock} from '../../components/player/MiniPlayerDock';

/**
 * Persistent 3-Tab AppShell (Home / Explore / Profile) + Unified Mini-Player Dock
 * (Penpot 01.3 & 06.6).
 *
 * Active tab carries a soft Lion Gold pill (#EFE3C4 light / rgba gold dark)
 * behind its icon ("Active Pill 180ms").
 */
export default function TabsLayout() {
  const {colors, radius, typography} = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  const renderTabIcon = (
    activeName: SimbaIconName,
    inactiveName: SimbaIconName,
    color: string,
    focused: boolean,
  ) => (
    <View
      style={[
        styles.pill,
        {
          borderRadius: radius.pill,
          backgroundColor: focused
            ? colors.brand.primaryContainer
            : 'transparent',
        },
      ]}>
      <SimbaIcon
        name={focused ? activeName : inactiveName}
        size={20}
        color={
          focused ? colors.brand.onPrimaryContainer : color
        }
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: ({ref: _ref, ...props}) => (
            <Pressable
              {...(props as React.ComponentProps<typeof Pressable>)}
              android_ripple={undefined}
            />
          ),
          tabBarActiveTintColor: colors.accent.gold,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarIconStyle: {
            width: 56,
            height: 30,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={[colors.background.floating, colors.background.primary]}
              locations={[0, 0.55]}
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: Math.max(8, insets.bottom + 4),
            backgroundColor: 'transparent',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border.subtle,
            elevation: 0,
          },
          tabBarLabelStyle: typography.labelSm,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({color, focused}) =>
              renderTabIcon(
                'home-variant',
                'home-variant-outline',
                color as string,
                focused,
              ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({color, focused}) =>
              renderTabIcon(
                'compass',
                'compass-outline',
                color as string,
                focused,
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({color, focused}) =>
              renderTabIcon(
                'account-circle',
                'account-circle-outline',
                color as string,
                focused,
              ),
          }}
        />
      </Tabs>

      {/* Unified Mini-Player Dock positioned directly above the 3-Tab Bar */}
      <View
        style={[styles.dockOverlay, {bottom: tabBarHeight + 4}]}
        pointerEvents="box-none">
        <MiniPlayerDock />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  pill: {
    width: 52,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
