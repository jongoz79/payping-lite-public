package expo.modules.paypingcapture

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Parcel
import android.os.Process
import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** A single IPC thread, recovered by killing only our private regex process on deadline. */
class RegexSandbox private constructor(private val context: Context) {
  private val main = Handler(Looper.getMainLooper())
  private val calls = Executors.newSingleThreadExecutor()
  private var binding: Binding? = null
  private inner class Binding {
    val connected = CountDownLatch(1)
    @Volatile var binder: IBinder? = null
    @Volatile var pid = -1
    @Volatile var cancelled = false
    val connection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName, service: IBinder) {
        if (cancelled) return
        try {
          pid = transact(service, RegexWorkerService.PID) { _, reply -> reply.readInt() }
          binder = service
        } catch (_: Exception) { binder = null }
        connected.countDown()
      }
      override fun onServiceDisconnected(name: ComponentName) { binder = null }
      override fun onBindingDied(name: ComponentName) { binder = null; connected.countDown() }
      override fun onNullBinding(name: ComponentName) { connected.countDown() }
    }
  }
  private fun <T> transact(binder: IBinder, code: Int, block: (Parcel, Parcel) -> T): T {
    val data = Parcel.obtain(); val reply = Parcel.obtain()
    try {
      if (code == RegexWorkerService.PID) {
        check(binder.transact(code, data, reply, 0)); reply.readException()
      }
      return block(data, reply)
    } finally { data.recycle(); reply.recycle() }
  }
  private fun discard(b: Binding, kill: Boolean) {
    b.cancelled = true
    if (binding === b) binding = null
    if (kill && b.binder?.isBinderAlive == true && b.pid > 0 && b.pid != Process.myPid()) Process.killProcess(b.pid)
    main.post { try { context.unbindService(b.connection) } catch (_: IllegalArgumentException) { } }
  }
  private fun endpoint(): Binding {
    binding?.let { if (it.binder?.isBinderAlive == true) return it else discard(it, false) }
    val b = Binding(); binding = b
    main.post {
      try {
        if (!b.cancelled && !context.bindService(Intent(context, RegexWorkerService::class.java), b.connection, Context.BIND_AUTO_CREATE)) b.connected.countDown()
      } catch (e: Exception) { Log.w("PayPingCapture", "Regex worker unavailable", e); b.connected.countDown() }
    }
    // A cold :paypingRegex start on an idle phone can take several seconds; this wait is not the regex budget.
    if (!b.connected.await(10, TimeUnit.SECONDS) || b.binder == null) {
      discard(b, true); throw RegexDeadlineExceeded()
    }
    return b
  }
  private val history = TimeoutHistory()
  @Synchronized fun parse(parsers: List<org.json.JSONObject>, generic: org.json.JSONObject,
    title: String, body: String, source: String, onSlow: (String) -> Unit): Map<String, Any?> {
    check(Looper.myLooper() != Looper.getMainLooper()) { "Regex IPC must run off the main thread" }
    val b = endpoint() // Cold binding is outside the evaluation/transport budget.
    val timeoutFile = java.io.File(context.filesDir, "regex-timeout")
    timeoutFile.delete()
    val future = calls.submit<Map<String, Any?>> {
      transact(requireNotNull(b.binder), RegexWorkerService.PARSE) { data, reply ->
        data.writeString(org.json.JSONArray(parsers).toString()); data.writeString(generic.toString())
        data.writeString(title); data.writeString(body); data.writeString(source)
        check(b.binder!!.transact(RegexWorkerService.PARSE, data, reply, 0)); reply.readException()
        val json = org.json.JSONObject(requireNotNull(reply.readString()))
        json.keys().asSequence().associateWith { key -> json.opt(key).let { if (it == org.json.JSONObject.NULL) null else if (key == "amountMinor") (it as Number).toLong() else it } }
      }
    }
    val ids = parsers.map { it.getString("id") } + "generic"
    try {
      // The worker enforces CPU evaluation limits. This longer wall limit only supervises IPC failure.
      val result = future.get(3, TimeUnit.SECONDS)
      history.record(ids, result["timeoutParser"] as? String, onSlow)
      return result
    } catch (e: Exception) {
      discard(b, true)
      try { future.get(1, TimeUnit.SECONDS) } catch (_: Exception) { }
      // Only an evaluation watchdog breadcrumb identifies a slow parser. Binding/IPC failures do not.
      val offender = if (timeoutFile.exists()) timeoutFile.readText() else null
      history.record(ids, offender, onSlow)
      Log.w("PayPingCapture", "Regex batch timed out or worker failed; raw capture retained", e)
      return mapOf("direction" to "info", "confidence" to "none", "currency" to "MYR", "parseState" to "timeout")
    }
  }
  companion object {
    @Volatile private var instance: RegexSandbox? = null
    fun get(context: Context): RegexSandbox = instance ?: synchronized(this) {
      instance ?: RegexSandbox(context.applicationContext).also { instance = it }
    }
  }
}
