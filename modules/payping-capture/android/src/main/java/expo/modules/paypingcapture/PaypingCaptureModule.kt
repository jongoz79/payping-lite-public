package expo.modules.paypingcapture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.net.Uri
import org.json.JSONObject
import android.content.ComponentName
import android.content.Intent
import android.app.NotificationManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class PaypingCaptureModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private fun call(method: String, arg: String? = null, extras: Bundle? = null): Bundle =
    requireNotNull(context.contentResolver.call(Uri.parse("content://${context.packageName}.paypingcapture"), method, arg, extras))
  private fun setting(key: String): String? = call("getSetting", key).getString("value")
  private fun setSetting(key: String, value: String) { call("setSetting", key, Bundle().apply { putString("value", value) }) }
  private fun selected(): List<Map<String, Any?>> = org.json.JSONArray(call("getSelectedApps").getString("value")!!).let { a ->
    (0 until a.length()).map { i -> val o = a.getJSONObject(i); o.keys().asSequence().associateWith { o.get(it) } }
  }
  private var observing = false
  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      intent.getStringExtra("id")?.let { sendEvent("onCapture", mapOf("id" to it)) }
    }
  }
  private fun stopObserving() {
    if (observing) { context.unregisterReceiver(receiver); observing = false }
  }
  override fun definition() = ModuleDefinition {
    Name("PaypingCapture")
    Events("onCapture")
    OnCreate { call("initialize") }
    OnStartObserving {
      if (!observing) {
        val filter = IntentFilter("${context.packageName}.CAPTURE_INSERTED")
        val permission = "${context.packageName}.permission.CAPTURE_EVENT"
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(receiver, filter, permission, null, Context.RECEIVER_NOT_EXPORTED)
        else { @Suppress("DEPRECATION") context.registerReceiver(receiver, filter, permission, null) }
        observing = true
      }
    }
    OnStopObserving { stopObserving() }
    OnDestroy { stopObserving() }
    Function("getDatabaseDirectory") { java.io.File(context.filesDir, "SQLite").absolutePath }
    Function("getPermissionStatus") {
      val manager = context.getSystemService(NotificationManager::class.java)
      if (manager.isNotificationListenerAccessGranted(ComponentName(context, PayPingListenerService::class.java))) "granted" else "denied"
    }
    Function("isIgnoringBatteryOptimizations") {
      context.getSystemService(android.os.PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)
    }
    // No REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (Play restricts it): send the user to settings instead.
    // Android 12+ keeps the per-app Battery → Unrestricted switch on the App info page.
    Function("requestIgnoreBatteryOptimizations") {
      val details = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
      val first = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) details else list
      try { context.startActivity(first.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
      catch (_: android.content.ActivityNotFoundException) {
        context.startActivity(details.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    Function("openAppDetails") {
      context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    Function("getDeviceMaker") { Build.MANUFACTURER.lowercase() }
    Function("openNotificationAccessSettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    Function("isListenerConnected") { call("isListenerConnected").getBoolean("value") }
    AsyncFunction("getInstalledApps") { InstalledApps.list(context.applicationContext) }
    Function("setSelectedApps") { apps: List<Map<String, Any?>> ->
      call("setSelectedApps", extras = Bundle().apply { putString("value", JSONArray(apps).toString()) })
    }
    Function("getSelectedApps") { selected() }
    Function("reloadParsers") { call("reloadParsers") }
    Function("resetGenericConfig") { call("resetGenericConfig") }
    AsyncFunction("reparse") { source: String? -> call("reparse", source).getInt("value") }
    Function("setSetting") { key: String, value: String ->
      when (key) {
        "generic_config" -> ParserValidation.generic(value)
        "tts_enabled", "tts_duck" -> require(value == "true" || value == "false")
        "tts_template_in", "tts_template_out" -> require(value.length <= AnnouncementText.TEMPLATE_MAX)
        "tts_rate" -> require(value.toFloatOrNull()?.let { it.isFinite() && it in 0.1f..3f } == true)
      }
      setSetting(key, value)
    }
    Function("getSetting") { key: String -> setting(key) }
    Function("parsePreview") { title: String, body: String, source: String, parserJson: String? -> JSONObject(call("parsePreview", source, Bundle().apply {
        putString("title", title); putString("body", body); putString("parserJson", parserJson)
      }).getString("value")!!).let { json -> json.keys().asSequence().associateWith { key ->
        json.get(key).let { if (it == JSONObject.NULL) null else it }
      } } }
    Function("speakTest") { text: String ->
      call("speakTest", text)
    }
  }
}
