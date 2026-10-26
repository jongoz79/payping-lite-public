package expo.modules.paypingcapture

import android.app.Notification
import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.util.concurrent.Executors

class PayPingListenerService : NotificationListenerService() {
  private val worker = Executors.newSingleThreadScheduledExecutor()
  private lateinit var speech: CaptureSpeech
  private val processor by lazy { CaptureProcessor(this, speech) }
  override fun onCreate() {
    super.onCreate(); speech = CaptureSpeech(this)
    CaptureWake.begin(this)
    worker.execute {
      try {
        val store = CaptureStore.get(this)
        store.pendingIds().forEach { process(it) }
        store.timeoutIds().forEach { retry(it) }
      } finally { CaptureWake.end() }
    }
  }
  private fun retry(id: String) {
    CaptureWake.begin(this)
    worker.schedule({
      try {
        val store = CaptureStore.get(this)
        if (store.claimRetry(id)) processor.finish(id)
      } finally { CaptureWake.end() }
    }, 2, java.util.concurrent.TimeUnit.SECONDS)
  }
  private fun process(id: String) { if (processor.finish(id)) retry(id) }
  override fun onListenerConnected() { connected = true }
  override fun onListenerDisconnected() {
    connected = false
    requestRebind(ComponentName(this, PayPingListenerService::class.java))
  }
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    // Commit before queuing: a killed process can recover every delivered raw row.
    try {
      val n = sbn.notification
      if ((n.flags and (Notification.FLAG_GROUP_SUMMARY or Notification.FLAG_ONGOING_EVENT)) != 0) return
      val title = n.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val body = (n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        ?: n.extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""
      val id = processor.persist(sbn.packageName, title, body, sbn.postTime) ?: return
      CaptureWake.begin(this)
      try {
        worker.execute {
          try { process(id) } catch (e: Exception) { Log.e("PayPingCapture", "Parse failed; raw capture retained", e) }
          finally { CaptureWake.end() }
        }
      } catch (e: Exception) { CaptureWake.end(); throw e }
    } catch (e: Exception) { Log.e("PayPingCapture", "Raw capture failed", e) }
  }

  override fun onDestroy() { connected = false; worker.shutdown(); speech.close(); super.onDestroy() }
  companion object {
    @Volatile var connected = false
  }
}
