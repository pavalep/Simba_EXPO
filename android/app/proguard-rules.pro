# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# libmpv JNI bridge (@simba-dev/react-native-media-player)
-keep class com.simba.player.mpv.MPVLib { *; }
-keep class com.simba.player.mpv.MPVLib$** { *; }
-keep class com.simba.player.mpv.MpvBridgeModule { *; }
-keep class com.simba.player.mpv.MpvRenderView { *; }
-keep class com.simba.player.mpv.MpvRenderViewManager { *; }
-keep class com.simba.player.MediaPlaybackService { *; }
-keep class com.simba.player.PipManager { *; }
-keep class com.simba.player.PlaybackHost { *; }

# Custom Simba native splash & host activities
-keep class app.simba.player.SimbaSplashModule { *; }
-keep class app.simba.player.MainActivity { *; }
-keep class app.simba.player.MainApplication { *; }

# Google Sign-In & Play Services
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# Expo modules & ReactMethod annotations
-keep class expo.modules.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
