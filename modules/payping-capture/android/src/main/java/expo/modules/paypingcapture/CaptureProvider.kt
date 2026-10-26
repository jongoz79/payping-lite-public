package expo.modules.paypingcapture

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import org.json.JSONObject

/**
 * All platform SQLite handles live in :paypingCapture, separate from expo-sqlite's
 * bundled SQLite in the UI process. Two SQLite libraries in one process can unlink
 * each other's live WAL files when a connection closes (sqlite.org/howtocorrupt.html#multiple_copies_of_sqlite_linked_into_the_same_application).
 * This provider is private to the app UID; no captured data is exposed externally.
 */
class CaptureProvider : ContentProvider() {
  private val store get() = CaptureStore.get(requireNotNull(context))
  private val speech by lazy { CaptureSpeech(requireNotNull(context).applicationContext) }
  override fun onCreate(): Boolean = true
  override fun call(method: String, arg: String?, extras: Bundle?): Bundle {
    val result = Bundle()
    when (method) {
      "initialize" -> store.writableDatabase
      "isListenerConnected" -> result.putBoolean("value", PayPingListenerService.connected)
      "getSelectedApps" -> result.putString("value", org.json.JSONArray(store.selectedApps()).toString())
      "setSelectedApps" -> {
        val a = org.json.JSONArray(requireNotNull(extras?.getString("value")))
        store.setSelectedApps((0 until a.length()).map { i -> val app = a.getJSONObject(i)
          mapOf("package" to app.getString("package"), "label" to app.getString("label")) })
      }
      "reloadParsers" -> store.reloadParsers()
      "resetGenericConfig" -> store.resetGenericConfig()
      "reparse" -> result.putInt("value", store.reparse(arg))
      "getSetting" -> result.putString("value", store.setting(requireNotNull(arg)))
      "setSetting" -> store.setSetting(requireNotNull(arg), requireNotNull(extras?.getString("value")))
      "parsePreview" -> result.putString("value", JSONObject(store.preview(
        extras?.getString("title") ?: "", extras?.getString("body") ?: "", requireNotNull(arg), extras?.getString("parserJson"))).toString())
      "speakTest" -> speech.speak(requireNotNull(arg))
      else -> throw IllegalArgumentException("Unknown capture operation: $method")
    }
    return result
  }
  override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? = null
  override fun getType(uri: Uri): String? = null
  override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()
}
