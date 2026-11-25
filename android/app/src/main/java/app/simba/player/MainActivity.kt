package app.simba.player

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.simba.player.mpv.MpvBridgeModule
import com.simba.player.mpv.PlaybackState
import expo.modules.ReactActivityDelegateWrapper
import java.lang.ref.WeakReference

/**
 * Single-Activity host for SIMBA.
 *
 * Zero-blank-gap native animated splash architecture:
 *  - Inflates `view_native_splash.xml` directly into `android.R.id.content` at
 *    t = 0ms (during `onCreate`, BEFORE Hermes / React Native JS finishes booting)
 *    so Android's cold-start boot time is completely masked by the native SIMBA
 *    Lion + radial gold glow + orbiting ring + wordmark animation.
 *  - React Native boots and paints `<HomeScreen />` in parallel underneath the
 *    native overlay inside this EXACT same Activity (no `SplashActivity` gap).
 *  - When BOTH the minimum signature animation (1350ms) AND React Native's first
 *    painted frame (`SimbaSplash.hide()`) are ready, the native overlay crossfades
 *    smoothly out (`alpha 1 -> 0`, `scale 1 -> 1.04`) directly revealing the live
 *    Home screen with 0ms blank flash.
 */
class MainActivity : ReactActivity() {

  private var splashOverlay: View? = null
  private val runningAnimators = mutableListOf<Animator>()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var minAnimationDone = false
  private var jsReady = false
  private var dismissing = false

  override fun onCreate(savedInstanceState: Bundle?) {
    // Switch from the OS static splash theme to AppTheme immediately so our
    // native animated overlay inside MainActivity takes over at t = 0ms while
    // React Native / Hermes boots underneath in the exact same Activity.
    setTheme(R.style.AppTheme)
    super.onCreate(null)
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT

    activeInstance = WeakReference(this)
    attachNativeAnimatedSplash()
  }

  override fun onPostCreate(savedInstanceState: Bundle?) {
    super.onPostCreate(savedInstanceState)
    splashOverlay?.bringToFront()
  }

  private fun attachNativeAnimatedSplash() {
    val contentRoot = findViewById<FrameLayout>(android.R.id.content) ?: return
    val overlay = LayoutInflater.from(this).inflate(
      R.layout.view_native_splash,
      contentRoot,
      false,
    )
    splashOverlay = overlay
    contentRoot.addView(
      overlay,
      FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )

    val logo = overlay.findViewById<View>(R.id.splash_logo)
    val glow = overlay.findViewById<View>(R.id.splash_glow)
    val ring = overlay.findViewById<View>(R.id.splash_loading_ring)
    val wordmark = overlay.findViewById<View>(R.id.splash_wordmark)
    val tagline = overlay.findViewById<View>(R.id.splash_tagline)

    // 1. Lion scale-in & regal breath (starts visible at 0.92 -> 1.04 -> 1.0 so OS splash hands off invisibly)
    val scaleX = ObjectAnimator.ofFloat(logo, View.SCALE_X, 0.92f, 1.05f, 1.0f).apply {
      duration = 700L
      interpolator = DecelerateInterpolator()
    }
    val scaleY = ObjectAnimator.ofFloat(logo, View.SCALE_Y, 0.92f, 1.05f, 1.0f).apply {
      duration = 700L
      interpolator = DecelerateInterpolator()
    }

    // 2. Soft gold radial glow pulse (infinite until dismissed)
    val glowPulse = ObjectAnimator.ofFloat(glow, View.ALPHA, 0.35f, 0.85f, 0.35f).apply {
      duration = 1200L
      repeatCount = ValueAnimator.INFINITE
      interpolator = AccelerateDecelerateInterpolator()
    }

    // 3. SIMBA-gold orbiting halo ring: fade in + continuous smooth 360° spin
    val ringFade = ObjectAnimator.ofFloat(ring, View.ALPHA, 0f, 1f).apply {
      startDelay = 200L
      duration = 400L
      interpolator = DecelerateInterpolator()
    }
    val ringSpin = ObjectAnimator.ofFloat(ring, View.ROTATION, 0f, 360f).apply {
      duration = 1250L
      repeatCount = ValueAnimator.INFINITE
      interpolator = LinearInterpolator()
    }

    // 4. "Simba" wordmark & tagline glide up
    wordmark.translationY = 18f
    tagline.translationY = 14f
    val wordmarkFade = ObjectAnimator.ofFloat(wordmark, View.ALPHA, 0f, 1f).apply {
      startDelay = 380L
      duration = 420L
      interpolator = DecelerateInterpolator()
    }
    val wordmarkSlide = ObjectAnimator.ofFloat(wordmark, View.TRANSLATION_Y, 18f, 0f).apply {
      startDelay = 380L
      duration = 420L
      interpolator = DecelerateInterpolator()
    }
    val taglineFade = ObjectAnimator.ofFloat(tagline, View.ALPHA, 0f, 1f).apply {
      startDelay = 520L
      duration = 420L
      interpolator = DecelerateInterpolator()
    }
    val taglineSlide = ObjectAnimator.ofFloat(tagline, View.TRANSLATION_Y, 14f, 0f).apply {
      startDelay = 520L
      duration = 420L
      interpolator = DecelerateInterpolator()
    }

    runningAnimators.addAll(
      listOf(
        scaleX,
        scaleY,
        glowPulse,
        ringFade,
        ringSpin,
        wordmarkFade,
        wordmarkSlide,
        taglineFade,
        taglineSlide,
      ),
    )
    runningAnimators.forEach { it.start() }

    // Minimum signature animation gate (1300ms)
    mainHandler.postDelayed({
      minAnimationDone = true
      tryDismissSplash()
    }, 1300L)

    // Safety ceiling (15s) in case Metro is offline during local dev
    mainHandler.postDelayed({
      if (!dismissing) {
        jsReady = true
        minAnimationDone = true
        tryDismissSplash()
      }
    }, 15000L)
  }

  private fun onJsReadyInternal() {
    jsReady = true
    tryDismissSplash()
  }

  private fun tryDismissSplash() {
    if (dismissing || !minAnimationDone || !jsReady) return
    val overlay = splashOverlay ?: return
    dismissing = true

    // Ensure the native overlay stays on top right up to the final crossfade frame
    overlay.bringToFront()
    overlay.animate()
      .alpha(0f)
      .scaleX(1.04f)
      .scaleY(1.04f)
      .setDuration(340L)
      .setInterpolator(DecelerateInterpolator())
      .setListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          cleanupSplashOverlay()
        }
      })
      .start()
  }

  private fun cleanupSplashOverlay() {
    runningAnimators.forEach { it.cancel() }
    runningAnimators.clear()
    val overlay = splashOverlay ?: return
    (overlay.parent as? ViewGroup)?.removeView(overlay)
    splashOverlay = null
  }

  override fun onDestroy() {
    mainHandler.removeCallbacksAndMessages(null)
    cleanupSplashOverlay()
    super.onDestroy()
  }

  override fun onResume() {
    super.onResume()
    if (!PlaybackState.hasMediaNow()) {
      requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
    }
  }

  override fun onPictureInPictureRequested(): Boolean {
    MpvBridgeModule.notifyUserLeaveHint(this)
    return true
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    MpvBridgeModule.notifyUserLeaveHint(this)
  }

  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    MpvBridgeModule.onPictureInPictureModeChanged(isInPictureInPictureMode)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled,
      ) {},
    )
  }

  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
      finish()
      return
    }
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        super.invokeDefaultOnBackPressed()
      }
      return
    }
    super.invokeDefaultOnBackPressed()
  }

  companion object {
    @Volatile
    private var activeInstance: WeakReference<MainActivity>? = null

    fun markJsReady() {
      val activity = activeInstance?.get() ?: return
      activity.runOnUiThread {
        activity.onJsReadyInternal()
      }
    }
  }
}
