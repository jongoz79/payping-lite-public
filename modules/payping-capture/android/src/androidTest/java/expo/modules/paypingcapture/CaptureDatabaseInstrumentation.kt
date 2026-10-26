package expo.modules.paypingcapture

import android.app.Instrumentation
import android.app.Activity
import android.content.ContextWrapper
import android.database.sqlite.SQLiteDatabase
import android.os.Bundle
import java.io.File
import java.util.UUID

/** Runs against actual Android SQLite, with no React runtime or third-party test runner. */
class CaptureDatabaseInstrumentation : Instrumentation() {
  override fun onCreate(arguments: Bundle?) { super.onCreate(arguments); start() }
  override fun onStart() {
    val status = Bundle().apply {
      putString("id", "PayPingNativeTests"); putInt("numtests", 1); putInt("current", 1)
      putString("class", CaptureDatabaseInstrumentation::class.java.name); putString("test", "databaseContract")
    }
    sendStatus(1, status)
    val root = File(targetContext.cacheDir, "payping-db-test-${UUID.randomUUID()}").apply { mkdirs() }
    val context = object : ContextWrapper(targetContext) { override fun getFilesDir(): File = root }
    var store: CaptureStore? = null
    try {
      val file = File(root, "SQLite/payping.db").also { it.parentFile!!.mkdirs() }
      // Frozen v1 schema, before the Review correction flag existed.
      SQLiteDatabase.openOrCreateDatabase(file, null).use { old ->
        old.execSQL("""CREATE TABLE capture (
          id TEXT PRIMARY KEY, platform TEXT NOT NULL, source_app TEXT NOT NULL, bank TEXT,
          title TEXT NOT NULL, body TEXT NOT NULL, posted_at INTEGER NOT NULL, captured_at INTEGER NOT NULL,
          dedupe_key TEXT NOT NULL UNIQUE, rule_id TEXT, direction TEXT NOT NULL, amount_minor INTEGER,
          currency TEXT NOT NULL DEFAULT 'MYR', counterparty TEXT, reference TEXT, confidence TEXT NOT NULL,
          status TEXT NOT NULL, user_note TEXT, synced_at INTEGER)""")
        old.execSQL("CREATE INDEX capture_posted_at ON capture(posted_at DESC)")
        old.execSQL("CREATE TABLE seen_app (package TEXT PRIMARY KEY, last_seen_at INTEGER NOT NULL)")
        old.execSQL("CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        old.execSQL("""INSERT INTO capture (id,platform,source_app,title,body,posted_at,captured_at,dedupe_key,direction,confidence,status,user_note)
          VALUES ('legacy','android','test','Legacy','Legacy body',1,1,'old-key','in','high','logged','keep note')""")
        old.version = 1
      }
      store = CaptureStore(context)
      val db = store.writableDatabase
      check(db.version == 4)
      db.rawQuery("PRAGMA journal_mode", null).use { check(it.moveToFirst() && it.getString(0) == "wal") }
      db.rawQuery("SELECT user_edited, user_note FROM capture WHERE id='legacy'", null).use {
        check(it.moveToFirst() && it.getInt(0) == 0 && it.getString(1) == "keep note")
      }
      val parsed = mapOf<String, Any?>("direction" to "in", "confidence" to "high", "amountMinor" to 1250L,
        "currency" to "MYR", "counterparty" to "Ali")
      val id = requireNotNull(store.insert("test", "Received", "RM 12.50", 60000, parsed))
      check(UUID.fromString(id).version() == 7 && UUID.fromString(id).variant() == 2)
      // Simulate JS applying a Review correction to allowed columns.
      db.execSQL("UPDATE capture SET direction='out', amount_minor=999, counterparty='Corrected', user_edited=1 WHERE id=?", arrayOf(id))
      check(store.insert("test", "Received", "RM 12.50", 60001, parsed) == null)
      db.rawQuery("SELECT direction, amount_minor, counterparty, user_edited FROM capture WHERE id=?", arrayOf(id)).use {
        check(it.moveToFirst() && it.getString(0) == "out" && it.getLong(1) == 999L && it.getString(2) == "Corrected" && it.getInt(3) == 1)
      }
      check(store.selectedApps().isEmpty())
      check(db.rawQuery("SELECT count(*) FROM parser", null).use { it.moveToFirst(); it.getInt(0) } == 0)
      check(store.setting("generic_config") != null)
      store.setSelectedApps(listOf(mapOf("package" to "test", "label" to "Test")))
      check(store.isSelected("test"))
      // DB-loaded parser cache observes the JS-owned revision marker.
      val rawParser = """{"schemaVersion":1,"id":"test","name":"Test","version":1,
        "androidPackages":["test"],"iosAppNames":[],"rules":[{"id":"test.received.v1","priority":1,
        "match":{"title":"Received"},"direction":"in","extract":{"amount":"RM (?<amount>[0-9.]+)"}}]}"""
      db.execSQL("INSERT INTO parser VALUES (?,?,1,'pasted',1)", arrayOf("test", rawParser))
      store.setSetting("parsers_rev", "1")
      check(store.parse("Received", "RM 12.50", "test")["parserId"] == "test")
      check(store.preview("Received", "RM 12.50", "other.app", rawParser)["confidence"] == "none")
      db.execSQL("UPDATE parser SET enabled=0 WHERE id='test'")
      store.setSetting("parsers_rev", "2")
      check(store.parse("Received", "RM 12.50", "test")["parserId"] == null)
      check(store.reparse(null) == 1) // legacy row changes; manually edited capture stays untouched.
      db.rawQuery("SELECT amount_minor,user_edited FROM capture WHERE id=?", arrayOf(id)).use {
        check(it.moveToFirst() && it.getLong(0) == 999L && it.getInt(1) == 1)
      }
      val ignored = requireNotNull(store.insert("test", "Received", "RM 2.00", 120000, parsed))
      db.execSQL("UPDATE capture SET status='ignored' WHERE id=?", arrayOf(ignored))
      check(store.reparse("test") == 1)
      db.rawQuery("SELECT status,amount_minor FROM capture WHERE id=?", arrayOf(ignored)).use {
        check(it.moveToFirst() && it.getString(0) == "ignored" && it.getLong(1) == 200L)
      }
      db.execSQL("INSERT INTO parser VALUES ('broken','{',1,'pasted',1)")
      store.reloadParsers()
      store.parse("Any", "Anything", "test")
      check(store.setting("parser_error:broken") != null)
      check(store.preview("", "", "test", "{").containsKey("error"))
      val slow = org.json.JSONObject(rawParser).put("id", "slow").apply {
        getJSONArray("rules").getJSONObject(0).put("id", "slow.info.v1").put("direction", "info")
          .put("match", org.json.JSONObject().put("title", "^a{0,3900}a{0,3900}a{0,3900}b$"))
      }
      db.execSQL("INSERT INTO parser VALUES ('slow',?,1,'pasted',1)", arrayOf(slow.toString()))
      store.reloadParsers()
      repeat(2) {
        check(store.parse("a".repeat(3900) + "!", "", "test")["parseState"] == "timeout")
        check(store.setting("parser_slow:slow") == null)
      }
      check(store.parse("a".repeat(3900) + "!", "", "test")["parseState"] == "timeout")
      check(store.setting("parser_slow:slow") != null)
      store.setSetting("generic_config", "{")
      check(store.parse("Money received", "Received RM 1.00", "other.app")["amountMinor"] == 100L)
      check(store.setting("parser_error:generic") != null)
      store.resetGenericConfig()
      check(store.setting("generic_config") == store.genericDefault())
      val currencyParser = org.json.JSONObject(rawParser).put("id", "currency").apply {
        getJSONArray("rules").getJSONObject(0).put("id", "currency.paid.v1").put("direction", "out")
          .put("match", org.json.JSONObject().put("body", " with "))
          .put("extract", org.json.JSONObject()
            .put("amount", org.json.JSONObject().put("pattern", "(?<currency>JP¥|US[$])(?<amount>[0-9]+[.][0-9]{2})").put("source", "body"))
            .put("counterparty", org.json.JSONObject().put("pattern", "^(?<counterparty>.+)$").put("source", "title")))
      }
      db.execSQL("INSERT INTO parser VALUES ('currency',?,1,'pasted',1)", arrayOf(currencyParser.toString()))
      store.reloadParsers()
      val foreign = store.parse("Cafe", "JP¥790.00 with Card", "test")
      check(foreign["currency"] == "JPY" && foreign["amountMinor"] == 79000L && foreign["counterparty"] == "Cafe")
      check(CaptureSpeech.text(foreign) == "Paid 790 JPY to Cafe")
      val fxId = requireNotNull(store.insert("test", "Cafe", "JP¥790.00 with Card", 180000, foreign))
      db.rawQuery("SELECT currency,amount_minor FROM capture WHERE id=?", arrayOf(fxId)).use {
        check(it.moveToFirst() && it.getString(0) == "JPY" && it.getLong(1) == 79000L)
      }

      // Durable raw rows survive closing/reopening before parsing; user corrections remain protected.
      val pending = requireNotNull(store.persistRaw("test", "Cafe", "US$12.05 with Card", 240000))
      val pendingEdit = requireNotNull(store.persistRaw("test", "Edited pending", "US$2.00 with Card", 300000))
      db.execSQL("UPDATE capture SET user_edited=1,amount_minor=999,user_note='keep' WHERE id=?", arrayOf(pendingEdit))
      check(pending in store.pendingIds() && pendingEdit !in store.pendingIds())
      store.close(); store = CaptureStore(context)
      check(store.finishPending(pending)?.get("amountMinor") == 1205L)
      check(store.finishPending(pendingEdit) == null)
      store.writableDatabase.execSQL("UPDATE capture SET parse_state='timeout' WHERE id=?", arrayOf(pending))
      check(pending in store.timeoutIds())
      check(store.claimRetry(pending) && !store.claimRetry(pending))
      check(pending in store.pendingIds())
      check(store.finishPending(pending)?.get("amountMinor") == 1205L)
      store.readableDatabase.rawQuery("SELECT parse_state,amount_minor FROM capture WHERE id=?", arrayOf(pending)).use {
        check(it.moveToFirst() && it.isNull(0) && it.getLong(1) == 1205L)
      }
      store.close(); store = null
      check(file.delete())
      store = CaptureStore(context)
      store.readableDatabase.rawQuery("PRAGMA table_info(capture)", null).use { c ->
        val columns = buildList { while (c.moveToNext()) add(c.getString(c.getColumnIndexOrThrow("name"))) }
        check(columns[columns.indexOf("user_note") + 1] == "user_edited")
      }
      store.close(); store = null
      // A v2 database already contains user_edited; that correction and selection must survive v3.
      SQLiteDatabase.openDatabase(file.absolutePath, null, SQLiteDatabase.OPEN_READWRITE).use { v2 ->
        v2.execSQL("ALTER TABLE capture DROP COLUMN parse_state")
        v2.execSQL("ALTER TABLE capture RENAME COLUMN parser_id TO bank")
        v2.execSQL("DROP TABLE parser"); v2.execSQL("DROP TABLE selected_app")
        v2.execSQL("CREATE TABLE seen_app (package TEXT PRIMARY KEY, last_seen_at INTEGER NOT NULL)")
        v2.execSQL("INSERT INTO setting VALUES ('enabled_packages','[\"test.legacy\"]')")
        v2.execSQL("""INSERT INTO capture(id,platform,source_app,bank,title,body,posted_at,captured_at,dedupe_key,direction,confidence,status,user_edited)
          VALUES ('edited-v2','android','test','legacy-parser','Edited','Body',1,1,'v2-key','out','high','logged',1)""")
        v2.version = 2
      }
      store = CaptureStore(context)
      check(store.writableDatabase.version == 4 && store.isSelected("test.legacy"))
      store.readableDatabase.rawQuery("SELECT parser_id,user_edited FROM capture WHERE id='edited-v2'", null).use {
        check(it.moveToFirst() && it.getString(0) == "legacy-parser" && it.getInt(1) == 1)
      }
      check(store.setting("enabled_packages") == null)
      sendStatus(0, status)
      finish(Activity.RESULT_OK, Bundle().apply { putString("stream", "PASS: v1/v2->v4 migration preserves rows; fresh schema has zero parsers; WAL; UUIDv7; edited rows survive reparse; DB parser cache/revision; malformed config skipped; three consecutive warm regex timeouts flagged; durable pending recovery; generic reset; currency/amount/source/TTS persisted\n") })
    } catch (error: Throwable) {
      status.putString("stack", error.stackTraceToString()); sendStatus(-2, status)
      finish(Activity.RESULT_CANCELED, Bundle().apply { putString("stream", "FAIL: ${error.stackTraceToString()}\n") })
    } finally { store?.close(); root.deleteRecursively() }
  }
}
