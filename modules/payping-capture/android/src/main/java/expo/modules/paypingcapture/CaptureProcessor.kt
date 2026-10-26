package expo.modules.paypingcapture

import android.content.Context
import android.content.Intent

/** Durable raw write is separate from the slow parse/announce queue. */
class CaptureProcessor(private val context: Context, private val speech: CaptureSpeech) {
  fun persist(source: String, rawTitle: String, rawBody: String, postedAt: Long): String? {
    val store = CaptureStore.get(context)
    if (source == context.packageName || !store.isSelected(source)) return null
    android.util.Log.i("PayPingCapture", "Delivered source=$source postedAt=$postedAt")
    val title = rawTitle.take(4000); val body = rawBody.take(4000 - title.length)
    return store.persistRaw(source, title, body, postedAt)
  }
  fun finish(id: String): Boolean {
    val store = CaptureStore.get(context)
    val parsed = store.finishPending(id) ?: return false
    try { context.sendBroadcast(Intent("${context.packageName}.CAPTURE_INSERTED").setPackage(context.packageName).putExtra("id", id),
      "${context.packageName}.permission.CAPTURE_EVENT") }
    catch (e: Exception) { android.util.Log.w("PayPingCapture", "Live event unavailable", e) }
    if (parsed["parseState"] == "timeout") return true
    if (store.setting("tts_enabled") != "false") speech.payment(parsed + ("appName" to appName(store, parsed["sourceApp"] as? String)))
    return false
  }
  /** The label the user picked the app by; legacy rows stored the package name, so fall back to the launcher label. */
  private fun appName(store: CaptureStore, pkg: String?): String? {
    if (pkg == null) return null
    val label = store.selectedApps().firstOrNull { it["package"] == pkg }?.get("label") as? String
    if (label != null && label != pkg) return label
    return try { context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(pkg, 0)).toString() }
      catch (_: Exception) { null }
  }
  fun capture(source: String, rawTitle: String, rawBody: String, postedAt: Long): String? =
    persist(source, rawTitle, rawBody, postedAt)?.also { finish(it) }
}
