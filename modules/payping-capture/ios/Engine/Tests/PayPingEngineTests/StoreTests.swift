import XCTest
import CSQLite
@testable import PayPingEngine

final class StoreTests: XCTestCase {
  private func directory() throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("payping-tests-" + UUID().uuidString)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true); return url
  }
  func testIdentityVectors() {
    XCTAssertEqual(Identity.sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    XCTAssertEqual(Identity.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    let id = Identity.uuidV7(milliseconds: 1_700_000_000_000)
    XCTAssertEqual(id.split(separator: "-")[2].first, "7")
    XCTAssertTrue("89ab".contains(id.split(separator: "-")[3].first!)); XCTAssertNotNil(UUID(uuidString: id))
  }
  func testFreshStoreImportReparseAndDedupe() throws {
    let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
    let store = try CaptureStore(url: root.appendingPathComponent("payping.db"), genericDefault: defaultGeneric())
    XCTAssertEqual(try store.query("PRAGMA user_version").first?["user_version"], .integer(4))
    XCTAssertEqual(try store.query("PRAGMA journal_mode").first?["journal_mode"], .text("wal"))
    XCTAssertEqual(try store.query("SELECT * FROM parser").count, 0)
    let first = try store.capture(sourceApp: "Google Wallet", title: "Shop", body: "JP¥790.00 with Card", postedAt: 120000)
    XCTAssertNotNil(first.id); XCTAssertEqual(first.result.confidence, "none"); XCTAssertEqual(first.spokenText, "")
    XCTAssertNil(try store.capture(sourceApp: "Google Wallet", title: "Shop", body: "JP¥790.00   with Card", postedAt: 120001).id)
    let raw = try String(contentsOf: library().appendingPathComponent("parsers/google-wallet.json"), encoding: .utf8)
    try store.execute("INSERT INTO parser VALUES ('google-wallet',?,1,'pasted',1)", [.text(raw)])
    try store.setSetting("parsers_rev", "1")
    XCTAssertEqual(try store.reparse(), 1)
    XCTAssertEqual(try store.query("SELECT currency,amount_minor FROM capture").first?["currency"], .text("JPY"))
    XCTAssertEqual(try store.query("SELECT amount_minor FROM capture").first?["amount_minor"], .integer(79000))
    let next = try store.capture(sourceApp: "Google Wallet", title: "Cafe", body: "US$12.05 with Card", postedAt: 180000)
    XCTAssertEqual(next.spokenText, "Minus 12.05 USD, Google Wallet, Cafe")
    try store.execute("UPDATE capture SET amount_minor=999,user_edited=1,user_note='keep' WHERE id=?", [.text(next.id!)])
    try store.execute("UPDATE parser SET enabled=0")
    try store.setSetting("parsers_rev", "2")
    XCTAssertEqual(try store.reparse(), 1)
    let edited = try store.query("SELECT * FROM capture WHERE id=?", [.text(next.id!)]).first!
    XCTAssertEqual(edited["amount_minor"], .integer(999)); XCTAssertEqual(edited["user_note"], .text("keep"))
    try store.execute("INSERT INTO parser VALUES ('bad','{',1,'pasted',1)")
    store.reloadParsers(); _ = try store.preview(title: "", body: "", sourceApp: "Any")
    XCTAssertNotNil(try store.setting("parser_error:bad"))
    XCTAssertNotNil(try store.preview(title: "", body: "", sourceApp: "Any", parserJSON: "{")["error"])
    try store.execute("UPDATE setting SET value='{' WHERE key='generic_config'")
    _ = try store.preview(title: "Money received", body: "Received RM 1.00", sourceApp: "Other")
    XCTAssertNotNil(try store.setting("parser_error:generic"))
    try store.resetGenericConfig(); XCTAssertEqual(try store.setting("generic_config"), try defaultGeneric())
    try store.setSetting("tts_enabled", "false")
    XCTAssertEqual(try store.capture(sourceApp: "Other", title: "Money received", body: "Received RM 1.00", postedAt: 240000).spokenText, "")
  }
  func testMultipleConnectionsAndRawUnicode() throws {
    let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
    let url = root.appendingPathComponent("payping.db")
    let a = try CaptureStore(url: url, genericDefault: defaultGeneric())
    let b = try CaptureStore(url: url, genericDefault: defaultGeneric())
    let body = "Raw 👋 Café\u{0000} tail"
    XCTAssertNotNil(try a.capture(sourceApp: "Unknown", title: "Note", body: body, postedAt: 60000).id)
    XCTAssertNil(try b.capture(sourceApp: "Unknown", title: "Note", body: body, postedAt: 60001).id)
    XCTAssertEqual(try b.query("SELECT body FROM capture").first?["body"], .text(body))
    XCTAssertEqual(try a.query("SELECT count(*) AS count FROM capture").first?["count"], .integer(1))
  }
  func testLegacyMigrations() throws {
    for version in [1, 2] {
      let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
      let url = root.appendingPathComponent("payping.db")
      var db: OpaquePointer?; XCTAssertEqual(sqlite3_open(url.path, &db), SQLITE_OK)
      let flag = version == 2 ? ", user_edited INTEGER NOT NULL DEFAULT 0" : ""
      let sql = """
        CREATE TABLE capture(id TEXT PRIMARY KEY,platform TEXT NOT NULL,source_app TEXT NOT NULL,bank TEXT,title TEXT NOT NULL,body TEXT NOT NULL,posted_at INTEGER NOT NULL,captured_at INTEGER NOT NULL,dedupe_key TEXT NOT NULL UNIQUE,rule_id TEXT,direction TEXT NOT NULL,amount_minor INTEGER,currency TEXT NOT NULL DEFAULT 'MYR',counterparty TEXT,reference TEXT,confidence TEXT NOT NULL,status TEXT NOT NULL,user_note TEXT\(flag),synced_at INTEGER);
        CREATE INDEX capture_posted_at ON capture(posted_at DESC);
        CREATE TABLE seen_app(package TEXT PRIMARY KEY,last_seen_at INTEGER NOT NULL);
        CREATE TABLE setting(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        INSERT INTO setting VALUES ('enabled_packages','["legacy.app"]');
        INSERT INTO capture(id,platform,source_app,bank,title,body,posted_at,captured_at,dedupe_key,direction,confidence,status,user_note) VALUES ('legacy','android','legacy.app','touchngo','Old','Body',1,1,'old-key','in','high','ignored','preserve');
        PRAGMA user_version=\(version);
        """
      XCTAssertEqual(sqlite3_exec(db, sql, nil, nil, nil), SQLITE_OK)
      if version == 2 { XCTAssertEqual(sqlite3_exec(db, "UPDATE capture SET user_edited=1,amount_minor=999", nil, nil, nil), SQLITE_OK) }
      sqlite3_close(db)
      let store = try CaptureStore(url: url, genericDefault: defaultGeneric())
      let row = try store.query("SELECT * FROM capture").first!
      XCTAssertEqual(row["parser_id"], .text("touchngo")); XCTAssertEqual(row["user_note"], .text("preserve"))
      XCTAssertEqual(row["user_edited"], .integer(version == 2 ? 1 : 0))
      XCTAssertEqual(try store.query("SELECT package FROM selected_app").first?["package"], .text("legacy.app"))
      XCTAssertNil(try store.setting("enabled_packages"))
      XCTAssertTrue(try store.query("SELECT name FROM sqlite_master WHERE name='seen_app'").isEmpty)
      _ = try store.reparse(); XCTAssertEqual(try store.query("SELECT status FROM capture").first?["status"], .text("ignored"))
    }
  }
  func testV3MigrationAndDurableRecovery() throws {
    let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
    let url = root.appendingPathComponent("payping.db")
    do {
      let store = try CaptureStore(url: url, genericDefault: defaultGeneric())
      let payment = try store.capture(sourceApp: "Other", title: "Money received", body: "Received RM 12.50 from Ali", postedAt: 60000)
      try store.execute("UPDATE capture SET parse_state='pending',confidence='none',amount_minor=NULL WHERE id=?", [.text(payment.id!)])
      let edited = try store.capture(sourceApp: "Other", title: "Money received", body: "Received RM 8.00", postedAt: 120000)
      try store.execute("UPDATE capture SET parse_state='pending',user_edited=1,amount_minor=999,user_note='keep' WHERE id=?", [.text(edited.id!)])
    }
    do {
      let store = try CaptureStore(url: url, genericDefault: defaultGeneric())
      let rows = try store.query("SELECT * FROM capture ORDER BY posted_at")
      XCTAssertEqual(rows[0]["parse_state"], .null); XCTAssertEqual(rows[0]["amount_minor"], .integer(1250))
      XCTAssertEqual(rows[1]["amount_minor"], .integer(999)); XCTAssertEqual(rows[1]["user_note"], .text("keep"))
      // Recreate the exact pre-v4 shape, then verify migration preserves completed captures.
      try store.execute("ALTER TABLE capture DROP COLUMN parse_state")
      try store.execute("PRAGMA user_version=3")
    }
    let migrated = try CaptureStore(url: url, genericDefault: defaultGeneric())
    XCTAssertEqual(try migrated.query("PRAGMA user_version").first?["user_version"], .integer(4))
    XCTAssertEqual(try migrated.query("SELECT count(*) AS n FROM capture").first?["n"], .integer(2))
    XCTAssertTrue(try migrated.query("SELECT parse_state FROM capture").allSatisfy { $0["parse_state"] == .null })
  }
  func testTimeoutRetryIsDurableAndOnce() throws {
    let root = try directory(); defer { try? FileManager.default.removeItem(at: root) }
    let store = try CaptureStore(url: root.appendingPathComponent("payping.db"), genericDefault: defaultGeneric())
    let result = try store.capture(sourceApp: "Other", title: "Money received", body: "Received RM 1.00", postedAt: 60000)
    let id = try XCTUnwrap(result.id)
    try store.execute("UPDATE capture SET parse_state='timeout',amount_minor=NULL,confidence='none' WHERE id=?", [.text(id)])
    try store.recoverPending()
    XCTAssertEqual(try store.setting("parse_retry:" + id), "1")
    XCTAssertEqual(try store.query("SELECT parse_state,amount_minor FROM capture").first?["amount_minor"], .integer(100))
    try store.execute("UPDATE capture SET parse_state='timeout',amount_minor=NULL,confidence='none' WHERE id=?", [.text(id)])
    try store.recoverPending() // A second timeout stays visible for manual review; no infinite retry loop.
    XCTAssertEqual(try store.query("SELECT parse_state FROM capture").first?["parse_state"], .text("timeout"))
    XCTAssertEqual(try store.query("SELECT amount_minor FROM capture").first?["amount_minor"], .null)
  }
  func testRegexDeadlineAndInputCap() throws {
    let parser = try Parser.decode(#"{"schemaVersion":1,"id":"slow","name":"Slow","version":1,"androidPackages":["test"],"iosAppNames":["Test"],"rules":[{"id":"slow.info.v1","priority":1,"match":{"title":"^a{0,3900}a{0,3900}a{0,3900}b$"},"direction":"info"}]}"#)
    let engine = RuleEngine(parsers: [parser], generic: .empty)
    let start = Date()
    XCTAssertEqual(engine.parse(title: String(repeating: "a", count: 3900) + "!", body: "", sourceApp: "Test").confidence, "none")
    XCTAssertLessThan(Date().timeIntervalSince(start), 2)
    XCTAssertEqual(RuleEngine.cap(String(repeating: "x", count: 5000)).utf16.count, 4000)
    XCTAssertThrowsError(try Validation.pattern("(a+)+"))
  }
}
