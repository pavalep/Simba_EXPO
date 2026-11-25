package app.simba.player

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * Minimal native bridge letting React Native signal the exact frame when the
 * root UI (`HomeScreen`) is mounted & painted so `MainActivity` can crossfade
 * its native animated splash overlay with ZERO blank gap.
 */
class SimbaSplashModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SimbaSplash"

  @ReactMethod
  fun hide() {
    MainActivity.markJsReady()
  }
}

class SimbaSplashPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> = listOf(SimbaSplashModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
