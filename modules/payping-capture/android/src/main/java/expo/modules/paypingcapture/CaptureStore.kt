package expo.modules.paypingcapture

import android.content.Context
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID

class CaptureStore internal constructor(context: Context) : SQLiteOpenHelper(context,
  File(context.filesDir, "SQLite/payping.db").also { it.parentFile!!.mkdirs() }.absolutePath, null, 4) {
  init { setWriteAheadLoggingEnabled(true) }
  override fun onConfigure(db: SQLiteDatabase) { db.rawQuery("PRAGMA busy_timeout=5000", null).use { it.moveToFirst() } }
  private val appContext = context.applicationContext
  private fun createCapture(db: SQLiteDatabase) {
    db.execSQL("""CREATE TABLE capture (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, source_app TEXT NOT NULL, parser_id TEXT,
      title TEXT NOT NULL, body TEXT NOT NULL, posted_at INTEGER NOT NULL, captured_at INTEGER NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE, rule_id TEXT, direction TEXT NOT NULL, amount_minor INTEGER,
      currency TEXT NOT NULL DEFAULT 'MYR', counterparty TEXT, reference TEXT, confidence TEXT NOT NULL,
      status TEXT NOT NULL, user_note TEXT, user_edited INTEGER NOT NULL DEFAULT 0, synced_at INTEGER)""")
  }
  private fun createConfiguration(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE parser (id TEXT PRIMARY KEY, json TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL, updated_at INTEGER NOT NULL)")
    db.execSQL("CREATE TABLE selected_app (package TEXT PRIMARY KEY, label TEXT NOT NULL, added_at INTEGER NOT NULL)")
    db.insertWithOnConflict("setting", null, ContentValues().apply {
      put("key", "generic_config"); put("value", genericDefault())
    }, SQLiteDatabase.CONFLICT_IGNORE)
  }
  override fun onCreate(db: SQLiteDatabase) {
    createCapture(db)
    db.execSQL("ALTER TABLE capture ADD COLUMN parse_state TEXT")
    db.execSQL("CREATE INDEX capture_posted_at ON capture(posted_at DESC)")
    db.execSQL("CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    createConfiguration(db)
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 2) db.execSQL("ALTER TABLE capture ADD COLUMN user_edited INTEGER NOT NULL DEFAULT 0")
    if (oldVersion < 3) {
      db.execSQL("ALTER TABLE capture RENAME TO capture_legacy")
      createCapture(db)
      db.execSQL("""INSERT INTO capture SELECT id,platform,source_app,bank,title,body,posted_at,captured_at,
        dedupe_key,rule_id,direction,amount_minor,currency,counterparty,reference,confidence,status,user_note,user_edited,synced_at FROM capture_legacy""")
      db.execSQL("DROP TABLE capture_legacy")
      db.execSQL("CREATE INDEX capture_posted_at ON capture(posted_at DESC)")
      createConfiguration(db)
      val oldPackages = db.rawQuery("SELECT value FROM setting WHERE key='enabled_packages'", null).use {
        if (it.moveToFirst()) it.getString(0) else "[]"
      }
      try {
        val a = JSONArray(oldPackages)
        for (i in 0 until a.length()) {
          val pkg = a.getString(i)
          db.insertWithOnConflict("selected_app", null, ContentValues().apply {
            put("package", pkg); put("label", pkg); put("added_at", System.currentTimeMillis())
          }, SQLiteDatabase.CONFLICT_IGNORE)
        }
      } catch (_: Exception) { android.util.Log.w("PayPingCapture", "Skipped malformed legacy enabled_packages") }
      db.execSQL("DELETE FROM setting WHERE key='enabled_packages'")
      db.execSQL("DROP TABLE IF EXISTS seen_app")
    }
    if (oldVersion < 4) db.execSQL("ALTER TABLE capture ADD COLUMN parse_state TEXT")
    check(newVersion == 4) { "Unsupported migration $oldVersion -> $newVersion" }
  }
  fun genericDefault(): String = appContext.assets.open("payping/generic.default.json").bufferedReader().use { it.readText() }
  fun resetGenericConfig() { setSetting("generic_config", genericDefault()); setSetting("generic_edited", "0"); reloadParsers() }
  /** An unedited generic rule follows the bundled default, so app updates deliver keyword fixes. JS sets generic_edited=1 on save. */
  fun syncGenericDefault() {
    if (setting("generic_edited") == "1") return
    val current = genericDefault()
    if (setting("generic_config") != current) setSetting("generic_config", current)
  }
  fun setting(key: String): String? = readableDatabase.rawQuery("SELECT value FROM setting WHERE key=?", arrayOf(key)).use {
    if (it.moveToFirst()) it.getString(0) else null
  }
  fun setSetting(key: String, value: String) { writableDatabase.insertWithOnConflict("setting", null,
    ContentValues().apply { put("key", key); put("value", value) }, SQLiteDatabase.CONFLICT_REPLACE) }
  fun selectedApps(): List<Map<String, Any>> = readableDatabase.rawQuery("SELECT package,label,added_at FROM selected_app ORDER BY label,package", null).use { c ->
    buildList { while (c.moveToNext()) add(mapOf("package" to c.getString(0), "label" to c.getString(1), "addedAt" to c.getLong(2))) }
  }
  fun isSelected(pkg: String): Boolean = readableDatabase.rawQuery("SELECT 1 FROM selected_app WHERE package=?", arrayOf(pkg)).use { it.moveToFirst() }
  fun setSelectedApps(apps: List<Map<String, String>>) {
    val db = writableDatabase
    db.beginTransaction()
    try {
      val keep = apps.map { requireNotNull(it["package"]) }.toSet()
      selectedApps().forEach { if (it["package"] !in keep) db.delete("selected_app", "package=?", arrayOf(it["package"] as String)) }
      apps.forEach { app ->
        val pkg = requireNotNull(app["package"]); require(pkg.isNotBlank())
        db.execSQL("INSERT OR IGNORE INTO selected_app(package,label,added_at) VALUES (?,?,?)", arrayOf(pkg, app["label"] ?: pkg, System.currentTimeMillis()))
        db.execSQL("UPDATE selected_app SET label=? WHERE package=?", arrayOf(app["label"] ?: pkg, pkg))
      }
      db.setTransactionSuccessful()
    } finally { db.endTransaction() }
  }
  private var cachedRevision: String? = null
  private var cachedGeneric: String? = null
  private var cachedEngine: RuleEngine? = null
  @Synchronized fun reloadParsers() { cachedEngine = null }
  @Synchronized fun engine(): RuleEngine {
    val revision = setting("parsers_rev") ?: "0"
    val genericRaw = setting("generic_config") ?: genericDefault()
    cachedEngine?.let { if (revision == cachedRevision && genericRaw == cachedGeneric) return it }
    val parsers = readableDatabase.rawQuery("SELECT id,json FROM parser WHERE enabled=1 ORDER BY id", null).use { c ->
      buildList { while (c.moveToNext()) {
        val id = c.getString(0)
        try {
          val p = ParserValidation.parser(c.getString(1))
          require(p.getString("id") == id) { "Parser id differs from database id" }
          add(p)
        } catch (e: Exception) {
          android.util.Log.w("PayPingCapture", "Skipped invalid stored parser $id")
          setSetting("parser_error:$id", e.message ?: "Invalid parser")
        }
      } }
    }
    val generic = try { ParserValidation.generic(genericRaw) }
      catch (e: Exception) { setSetting("parser_error:generic", e.message ?: "Invalid generic config"); ParserValidation.generic(genericDefault()) }
    return RuleEngine(parsers, generic)
      .also { cachedRevision = revision; cachedGeneric = genericRaw; cachedEngine = it }
  }
  fun parse(title: String, body: String, source: String): Map<String, Any?> {
    val engine = engine()
    val candidates = engine.parsers.filter { p -> val apps = p.getJSONArray("androidPackages"); (0 until apps.length()).any { apps.getString(it) == source } }
    return RegexSandbox.get(appContext).parse(candidates, engine.generic, title, body, source) { id ->
      setSetting("parser_slow:$id", System.currentTimeMillis().toString())
    }
  }
  fun preview(title: String, body: String, source: String, parserJson: String?): Map<String, Any?> {
    if (parserJson == null) return parse(title, body, source)
    val parser = try { ParserValidation.parser(parserJson) }
      catch (e: Exception) { return mapOf("error" to (e.message ?: "Invalid parser")) }
    // An editor preview with explicit JSON tests that parser alone, including no generic fallback.
    val generic = JSONObject().put("amountPatterns", JSONArray()).put("debitKeywords", JSONArray()).put("creditKeywords", JSONArray())
      .put("counterpartyPatterns", JSONObject().put("in", JSONArray()).put("out", JSONArray())).put("referencePatterns", JSONArray())
    return RegexSandbox.get(appContext).parse(listOf(parser), generic, title, body, source) { id -> setSetting("parser_slow:$id", System.currentTimeMillis().toString()) }
  }
  private fun parseValues(parsed: Map<String, Any?>): ContentValues = ContentValues().apply {
    for ((column, field) in mapOf("parser_id" to "parserId", "rule_id" to "ruleId", "direction" to "direction", "currency" to "currency", "counterparty" to "counterparty", "reference" to "reference", "confidence" to "confidence")) put(column, parsed[field] as String?)
    put("amount_minor", parsed["amountMinor"] as Long?)
    put("status", if (parsed["confidence"] == "high") "logged" else "needs_review")
    put("parse_state", parsed["parseState"] as? String)
  }
  fun reparse(source: String?): Int {
    val db = writableDatabase
    var changed = 0
    db.rawQuery("SELECT * FROM capture WHERE user_edited=0" + if (source == null) "" else " AND source_app=?", source?.let { arrayOf(it) }).use { c ->
      fun text(key: String): String = c.getString(c.getColumnIndexOrThrow(key))
      while (c.moveToNext()) {
        val values = parseValues(parse(text("title"), text("body"), text("source_app")))
        if (text("status") == "ignored") values.put("status", "ignored")
        val differs = values.keySet().any { key ->
          val i = c.getColumnIndexOrThrow(key)
          val old: Any? = if (c.isNull(i)) null else if (key == "amount_minor") c.getLong(i) else c.getString(i)
          old != values.get(key)
        }
        if (differs) changed += db.update("capture", values, "id=? AND user_edited=0 AND status=?", arrayOf(text("id"), text("status")))
      }
    }
    return changed
  }
  fun insert(source: String, title: String, body: String, posted: Long, parsed: Map<String, Any?>): String? {
    val now = System.currentTimeMillis(); val random = identityRandom
    val id = UUID((now shl 16) or 0x7000L or random.nextInt(4096).toLong(),
      (random.nextLong() and 0x3fffffffffffffffL) or Long.MIN_VALUE).toString()
    val key = MessageDigest.getInstance("SHA-256").digest("$source|${RuleEngine.normalize(title)}|${RuleEngine.normalize(body)}|${posted / 60000}".toByteArray())
      .joinToString("") { byte -> val n = byte.toInt() and 255; "${"0123456789abcdef"[n ushr 4]}${"0123456789abcdef"[n and 15]}" }
    val values = ContentValues().apply {
      put("id", id); put("platform", "android"); put("source_app", source); put("title", title); put("body", body)
      put("posted_at", posted); put("captured_at", now); put("dedupe_key", key)
      putAll(parseValues(parsed))
    }
    // Never UPDATE/REPLACE existing captures: user corrections (user_edited=1) are immutable to capture.
    return if (writableDatabase.insertWithOnConflict("capture", null, values, SQLiteDatabase.CONFLICT_IGNORE) == -1L) null else id
  }
  fun persistRaw(source: String, title: String, body: String, posted: Long): String? = insert(source, title, body, posted,
    mapOf("direction" to "info", "confidence" to "none", "currency" to "MYR", "parseState" to "pending"))
  fun pendingIds(): List<String> = readableDatabase.rawQuery("SELECT id FROM capture WHERE parse_state='pending' AND user_edited=0 ORDER BY captured_at", null).use { c ->
    buildList { while (c.moveToNext()) add(c.getString(0)) }
  }
  fun timeoutIds(): List<String> = readableDatabase.rawQuery("SELECT id FROM capture WHERE parse_state='timeout' AND user_edited=0 AND NOT EXISTS (SELECT 1 FROM setting WHERE key='parse_retry:' || capture.id)", null).use { c ->
    buildList { while (c.moveToNext()) add(c.getString(0)) }
  }
  fun claimRetry(id: String): Boolean {
    val db = writableDatabase
    db.beginTransaction()
    try {
      val claimed = db.insertWithOnConflict("setting", null,
        ContentValues().apply { put("key", "parse_retry:$id"); put("value", "1") }, SQLiteDatabase.CONFLICT_IGNORE) != -1L
      if (claimed) db.execSQL("UPDATE capture SET parse_state='pending' WHERE id=? AND user_edited=0", arrayOf(id))
      db.setTransactionSuccessful(); return claimed
    } finally { db.endTransaction() }
  }
  fun finishPending(id: String): Map<String, Any?>? {
    val row = readableDatabase.rawQuery("SELECT title,body,source_app,status,posted_at FROM capture WHERE id=? AND user_edited=0 AND parse_state IN ('pending','timeout')", arrayOf(id)).use { c ->
      if (!c.moveToFirst()) return null
      listOf(c.getString(0), c.getString(1), c.getString(2), c.getString(3), c.getLong(4).toString())
    }
    val parsed = parse(row[0], row[1], row[2])
    val values = parseValues(parsed)
    if (row[3] == "ignored") values.put("status", "ignored")
    val updated = writableDatabase.update("capture", values, "id=? AND user_edited=0 AND status=?", arrayOf(id, row[3]))
    android.util.Log.i("PayPingCapture", "Parsed $id latencyMs=${System.currentTimeMillis() - row[4].toLong()} state=${parsed["parseState"] ?: "done"}")
    return if (updated > 0 && row[3] != "ignored") parsed + ("sourceApp" to row[2]) else null
  }
  companion object {
    private val identityRandom = SecureRandom()
    @Volatile private var instance: CaptureStore? = null
    fun get(context: Context): CaptureStore = instance ?: synchronized(this) {
      instance ?: CaptureStore(context.applicationContext).also { instance = it; it.writableDatabase; it.syncGenericDefault() }
    }
  }
}
