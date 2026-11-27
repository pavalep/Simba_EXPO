# Simba Player (`com.shalabham.simbaplayer`) — Play Store Release Guide

> Concise, production-ready checklist for releasing `Simba_EXPO` to Google Play.

---

## 1. Safe Minification (R8 / ProGuard + Resource Shrinking)

`android/gradle.properties` already has `android.enableMinifyInReleaseBuilds=true`, **but `@simba-dev/react-native-media-player/android/consumer-rules.pro` is currently empty**. Without JNI & native-module keep rules, R8 will strip `libmpv` callbacks and crash in release builds.

### A. Add to `android/app/proguard-rules.pro`
```proguard
# 1. libmpv JNI bridge (C++ calls these via FindClass / GetMethodID)
-keep class com.simba.player.mpv.MPVLib { *; }
-keep class com.simba.player.mpv.MPVLib$** { *; }
-keep class com.simba.player.mpv.MpvBridgeModule { *; }
-keep class com.simba.player.mpv.MpvRenderView { *; }
-keep class com.simba.player.mpv.MpvRenderViewManager { *; }
-keep class com.simba.player.MediaPlaybackService { *; }
-keep class com.simba.player.PipManager { *; }
-keep class com.simba.player.PlaybackHost { *; }

# 2. Custom Simba native splash module (NativeModules.SimbaSplash)
-keep class app.simba.player.SimbaSplashModule { *; }
-keep class app.simba.player.MainActivity { *; }
-keep class app.simba.player.MainApplication { *; }

# 3. Google Sign-In & Play Services
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# 4. React Native / Reanimated / Expo
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class expo.modules.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
```

### B. `android/gradle.properties` Release Flags
- Keep `android.enableMinifyInReleaseBuilds=true`
- Add `android.enableShrinkResourcesInReleaseBuilds=true` (strips unused drawables/strings; safe for `assets/mpv/cacert.pem`)
- For Play Store `.aab`, set `reactNativeArchitectures=arm64-v8a,armeabi-v7a` (drop `x86_64` for smaller bundles, or keep `arm64-v8a,armeabi-v7a,x86_64` for Chromebook support).
- **Mandatory smoke test before uploading**: build and install `.\gradlew.bat assembleRelease` on a device/emulator and verify:
  1. Native splash → Home transition (`SimbaSplashModule`).
  2. Audio + Video playback + seek + notification (`MPVLib` JNI).
  3. Google Sign-In + Sign-Out / Unlink.
- **Keep `mapping.txt`**: Upload `android/app/build/outputs/mapping/release/mapping.txt` to Play Console (App bundle explorer → Deobfuscation file) so crash stack traces are readable.

---

## 2. Unlinking Google Account & Play Store Account Deletion Policy

### In-App Unlink (`src/services/authService.ts` + `ProfileScreen.tsx`)
- **Bug to fix**: `signOutFromGoogle()` currently calls `signOut()` *before* `revokeAccess()`. Call **`revokeAccess()` BEFORE `signOut()`** (each wrapped in its own `try/catch`), otherwise Google Play Services rejects `revokeAccess()` after the session is already cleared.
- **Two clear actions in Profile**:
  1. **Sign Out** → calls `GoogleSignin.signOut()` and switches to Guest (keeps local favorites/history).
  2. **Disconnect Google & Clear Data** → calls `GoogleSignin.revokeAccess()` → `GoogleSignin.signOut()` → deletes local profile, history, favorites, bookmarks, and saved folders from MMKV/AsyncStorage.

### Google Play Policy Requirement
- Because Simba stores **zero user data on any backend server** (Google Sign-In only reads Name, Email, and Avatar locally on-device):
  - In Play Console **Data Safety**, declare:
    - Does your app collect or share user data? **Yes** (Name, Email address, User ID via Google Sign-In — **not** shared with third parties, stored **on-device only**).
    - Do you provide a way for users to request that their data be deleted? **Yes** → point to your Account/Data Deletion web URL (below).
  - Your **Delete Account / Unlink** web page simply states:
    1. Simba Player has no cloud/server database — all profile & playback data stays on your device.
    2. How to unlink in-app: **Profile → Disconnect Google & Clear Data**.
    3. How to revoke from outside the app: visit [myaccount.google.com/permissions](https://myaccount.google.com/permissions) → select **Simba Player** → **Delete all connections** (and uninstall the app to remove local data).

---

## 3. Minimal Website Needed (Free on GitHub Pages / Cloudflare Pages)

You do **not** need a complex backend — a lightweight static site (e.g. `https://shalabham.com/simbaplayer` or `https://pavalep.github.io/simbaplayer`) with 4 static pages covers every Play Store & Google OAuth verification requirement:

| Page / Path | Required By | Contents |
|---|---|---|
| `/` (Landing page) | Google OAuth Consent Screen + Play Store | App name, description, screenshots, support email (`support@...`), links to Privacy & Terms |
| `/privacy` | Play Console + Google OAuth | What data is accessed (Google name/email/avatar locally, optional local storage via SAF, Open-Meteo location for weather), zero server storage, third-party media APIs (Internet Archive, Jamendo, Audius, Podcast Index, Radio Browser, IPTV-org, LibriVox) |
| `/delete-account` | Play Console Data Safety | In-app disconnect steps + Google permissions revoke link + note that no server data is retained |
| `/terms` | Google OAuth + Store trust | Public-domain / open-API media disclaimer, user-owned local files disclaimer, contact email |

> **Tip**: The domain on your **Google Cloud OAuth Consent Screen** (Authorized domains) must match your Privacy Policy & Homepage URLs, and the **App Name** on the OAuth consent screen must match your Play Store listing (`Simba Player`).

---

## 4. Play Console Required Documents & Declarations Checklist

### A. Store Listing Assets
- **App Icon**: `512 × 512 px` PNG (32-bit, no alpha)
- **Feature Graphic**: `1024 × 500 px` PNG/JPG
- **Phone Screenshots**: Min 2 (recommended 4–8), 16:9 or 9:16, `1080 × 1920`+
- **Short Description** (≤ 80 chars) & **Full Description** (≤ 4000 chars)
- **Support Email** (publicly visible on Play Store) + **Website URL**

### B. App Content & Policy Forms (Play Console → Policy → App content)
1. **Privacy Policy URL**: Link to `/privacy`.
2. **App Access**: Select *"All or some functionality is restricted"* ONLY if reviewers need login — since Guest mode works without login, select **"All functionality is available without special access"** (reviewers can still test Google Sign-In if they choose).
3. **Ads**: *"No, my app does not contain ads"*.
4. **Content Rating (IARC)**: Fill questionnaire (media player + public-domain/open media streams → typically **Teen / 12+** because of unmoderated third-party podcasts/radio/archive streams).
5. **Target Audience**: **13+ or 18+** (avoid under-13 to stay outside COPPA/Families policy).
6. **Data Safety**: Declare Name / Email (Google Sign-In, on-device only, optional) + Coarse Location (optional, for weather greeting via Open-Meteo, not stored). Provide `/delete-account` URL.
7. **Foreground Service Permissions Declaration** *(Critical — will be rejected if skipped!)*:
   - You declare `FOREGROUND_SERVICE_MEDIA_PLAYBACK` in `AndroidManifest.xml`.
   - In Play Console, select **`mediaPlayback`**, explain: *"Plays background audio/video via libmpv with persistent MediaSession notification controls"*, and attach a **short 15–30s screen recording** showing audio playing in the background with the notification shade controls.
8. **Google OAuth Verification (Google Cloud Console → APIs & Services → OAuth consent screen)**:
   - Publish OAuth consent screen from **Testing** → **In Production** (using only non-sensitive scopes `email`, `profile`, `openid` does **not** require a paid security audit; brand verification only requires your homepage + privacy policy URLs).
9. **Play App Signing SHA-1**:
   - After uploading your first `.aab` to **Internal Testing**, go to **Play Console → Setup → App signing**, copy the **App signing key certificate SHA-1**, and add it to **Firebase Console → Project Settings → Your apps → `com.shalabham.simbaplayer` → Add fingerprint** (no need to rebuild `.aab`, but download updated `google-services.json` for future builds).
10. **Closed Testing (Personal Play Accounts created after Nov 2023)**:
    - Requires **12 opted-in testers for 14 continuous days** on a Closed Testing track before Production access unlocks.
11. **Technical Gates (Already Satisfied in `Simba_EXPO`)**:
    - `targetSdk = 36` (Play Store requires API 35+) ✅
    - 16 KB page-size aligned `.so` binaries (`@simba-dev/react-native-media-player@3.5.4` verified in CI) ✅
    - Signed `.aab` via `.\gradlew.bat bundleRelease` using `simbaplayer-release.jks` ✅
