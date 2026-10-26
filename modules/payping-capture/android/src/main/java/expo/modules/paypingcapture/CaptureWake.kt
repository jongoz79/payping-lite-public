package expo.modules.paypingcapture

import android.content.Context
import android.os.PowerManager

/**
 * Keeps the CPU on from notification delivery until the announcement finishes. Without it a phone with
 * the screen off can sleep between the raw write and the parse/speak work, so the payment is only spoken
 * when the user next wakes the phone. Each holder is counted; the timeout caps a stuck parse or TTS engine.
 */
object CaptureWake {
  private const val MAX_MS = 60_000L
  private var lock: PowerManager.WakeLock? = null
  private var holders = 0
  @Synchronized fun begin(context: Context) {
    val wake = lock ?: context.applicationContext.getSystemService(PowerManager::class.java)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PayPing:capture").apply { setReferenceCounted(false) }.also { lock = it }
    holders++
    wake.acquire(MAX_MS)
  }
  @Synchronized fun end() {
    holders = (holders - 1).coerceAtLeast(0)
    if (holders == 0) lock?.takeIf { it.isHeld }?.release()
  }
}
