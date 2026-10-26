package expo.modules.paypingcapture

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.os.Parcel
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** One complete parse per IPC; CPU watchdog survives ICU copying CharSequence inputs. */
class RegexWorkerService : Service() {
  private val patterns = object : LinkedHashMap<String, Regex>(64, .75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Regex>?): Boolean = size > 512
  }
  private val watchdog = Executors.newSingleThreadScheduledExecutor()
  private val gate = Any()
  private val binder = object : Binder() {
    override fun onTransact(code: Int, data: Parcel, reply: Parcel?, flags: Int): Boolean {
      if (code == PID) {
        // Initialise engine classes before acknowledging readiness; startup never consumes a parse budget.
        RuleEngine(emptyList(), JSONObject().put("amountPatterns", JSONArray())).parse("", "", "")
        reply!!.writeNoException(); reply.writeInt(Process.myPid()); return true }
      if (code != PARSE) return super.onTransact(code, data, reply, flags)
      synchronized(gate) {
        val array = JSONArray(requireNotNull(data.readString()))
        val parsers = (0 until array.length()).map { array.getJSONObject(it) }
        val generic = JSONObject(requireNotNull(data.readString()))
        val title = requireNotNull(data.readString()); val body = requireNotNull(data.readString())
        val source = requireNotNull(data.readString())
        val slow = linkedSetOf<String>()
        val activeParser = java.util.concurrent.atomic.AtomicReference("generic")
        val budget = EvaluationBudget({ Process.getElapsedCpuTime() })
        val active = java.util.concurrent.atomic.AtomicBoolean(true)
        val guard = watchdog.scheduleAtFixedRate({
          if (active.get() && budget.expired()) {
            java.io.File(filesDir, "regex-timeout").writeText(activeParser.get())
            Process.killProcess(Process.myPid())
          }
        }, 10, 10, TimeUnit.MILLISECONDS)
        try {
          val result = RuleEngine(parsers, generic, { pattern, text, group ->
            val regex = patterns.getOrPut(pattern) { Regex(pattern, RegexOption.IGNORE_CASE) }
            budget.begin()
            try {
              val match = regex.find(text)
              match?.let { if (group == null) it.value else try { it.groups[group]?.value } catch (_: IllegalArgumentException) { null } }
            } finally { budget.finish() }
          }, onActive = { activeParser.set(it) }, onSlow = { slow.add(it) }).parse(title, body, source)
          val output = if (slow.isEmpty()) result else mapOf("direction" to "info", "confidence" to "none", "currency" to "MYR", "parseState" to "timeout", "timeoutParser" to slow.first())
          reply!!.writeNoException(); reply.writeString(JSONObject(output).toString())
        } catch (_: StackOverflowError) {
          java.io.File(filesDir, "regex-timeout").writeText(activeParser.get())
          reply!!.writeException(IllegalStateException("Regex stack exhausted"))
        } catch (e: Exception) { reply!!.writeException(IllegalStateException("Regex batch failed", e)) }
        finally { active.set(false); guard.cancel(false) }
      }
      return true
    }
  }
  override fun onBind(intent: Intent): IBinder = binder
  override fun onDestroy() { watchdog.shutdownNow(); super.onDestroy() }
  companion object { const val PID = IBinder.FIRST_CALL_TRANSACTION; const val PARSE = PID + 1 }
}
