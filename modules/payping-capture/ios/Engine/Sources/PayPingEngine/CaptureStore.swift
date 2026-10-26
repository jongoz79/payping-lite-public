import Foundation
#if canImport(ExpoSQLite)
// Use the same SQLite implementation as JS on Apple; separate copies can invalidate POSIX locks.
import ExpoSQLite
#elseif canImport(SQLite3)
import SQLite3
#else
import CSQLite
#endif

public enum SQLValue: Equatable, Sendable {
  case text(String), integer(Int64), null
  public var string: String? { if case .text(let s) = self { return s }; return nil }
  public var integer: Int64? { if case .integer(let n) = self { return n }; return nil }
}
public struct CaptureOutcome: Sendable {
  public let id: String?
  public let result: ParseResult
  public let spokenText: String
}
public final class CaptureStore: @unchecked Sendable {
  public let url: URL
  private var db: OpaquePointer?
  private let lock = NSRecursiveLock()
  private let defaultJSON: String
  private var slowParsers: Set<String> = []
  private var timedOut: Bool { !slowParsers.isEmpty }
  private var timeoutStreaks: [String: Int] = [:]
  private var cached: (String, String, RuleEngine)?
  public init(url: URL, genericDefault: String) throws {
    _ = try GenericConfig.decode(genericDefault)
    self.url = url; self.defaultJSON = genericDefault
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard sqlite3_open_v2(url.path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
      if db != nil { sqlite3_close(db); db = nil }; throw EngineError.invalid("Cannot open capture database")
    }
    do {
      sqlite3_busy_timeout(db, 5000)
      _ = try query("PRAGMA journal_mode=WAL")
      try execute("BEGIN IMMEDIATE")
      do { try migrate(); try syncGenericDefault(); try execute("COMMIT"); try recoverPending() } catch { try? execute("ROLLBACK"); throw error }
    } catch { sqlite3_close(db); db = nil; throw error }
  }
  deinit { sqlite3_close(db) }
  private func locked<T>(_ body: () throws -> T) rethrows -> T { lock.lock(); defer { lock.unlock() }; return try body() }
  @discardableResult public func execute(_ sql: String, _ values: [SQLValue] = []) throws -> Int {
    try locked { _ = try query(sql, values); return Int(sqlite3_changes(db)) }
  }
  public func query(_ sql: String, _ values: [SQLValue] = []) throws -> [[String: SQLValue]] {
    try locked {
      var statement: OpaquePointer?
      guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw failure() }
      defer { sqlite3_finalize(statement) }
      for (offset, value) in values.enumerated() {
        let i = Int32(offset + 1), code: Int32
        switch value {
        case .text(let s): code = s.utf8CString.withUnsafeBufferPointer { sqlite3_bind_text(statement, i, $0.baseAddress, Int32($0.count - 1), unsafeBitCast(-1, to: sqlite3_destructor_type.self)) }
        case .integer(let n): code = sqlite3_bind_int64(statement, i, n)
        case .null: code = sqlite3_bind_null(statement, i)
        }
        guard code == SQLITE_OK else { throw failure() }
      }
      var rows: [[String: SQLValue]] = []
      while true {
        let status = sqlite3_step(statement)
        if status == SQLITE_DONE { return rows }; guard status == SQLITE_ROW else { throw failure() }
        var row: [String: SQLValue] = [:]
        for i in 0..<sqlite3_column_count(statement) {
          let key = String(cString: sqlite3_column_name(statement, i))
          if sqlite3_column_type(statement, i) == SQLITE_NULL { row[key] = .null }
          else if sqlite3_column_type(statement, i) == SQLITE_INTEGER { row[key] = .integer(sqlite3_column_int64(statement, i)) }
          else { row[key] = .text(String(decoding: UnsafeBufferPointer(start: sqlite3_column_text(statement, i), count: Int(sqlite3_column_bytes(statement, i))), as: UTF8.self)) }
        }
        rows.append(row)
      }
    }
  }
  private func failure() -> EngineError { .invalid("SQLite: " + String(cString: sqlite3_errmsg(db))) }
  private func createCapture() throws {
    try execute("""
      CREATE TABLE capture (id TEXT PRIMARY KEY, platform TEXT NOT NULL, source_app TEXT NOT NULL, parser_id TEXT,
        title TEXT NOT NULL, body TEXT NOT NULL, posted_at INTEGER NOT NULL, captured_at INTEGER NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE, rule_id TEXT, direction TEXT NOT NULL, amount_minor INTEGER,
        currency TEXT NOT NULL DEFAULT 'MYR', counterparty TEXT, reference TEXT, confidence TEXT NOT NULL,
        status TEXT NOT NULL, user_note TEXT, user_edited INTEGER NOT NULL DEFAULT 0, synced_at INTEGER)
      """)
  }
  private func createConfiguration() throws {
    try execute("CREATE TABLE parser (id TEXT PRIMARY KEY, json TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL, updated_at INTEGER NOT NULL)")
    try execute("CREATE TABLE selected_app (package TEXT PRIMARY KEY, label TEXT NOT NULL, added_at INTEGER NOT NULL)")
    try execute("INSERT OR IGNORE INTO setting(key,value) VALUES ('generic_config',?)", [.text(defaultJSON)])
  }
  private func migrate() throws {
    let version = try query("PRAGMA user_version").first?["user_version"]?.integer ?? 0
    guard version <= 4 else { throw EngineError.invalid("Unsupported schema version \(version)") }
    if version == 0 {
      try createCapture(); try execute("CREATE INDEX capture_posted_at ON capture(posted_at DESC)")
      try execute("CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)"); try createConfiguration()
    } else if version < 3 {
      if version < 2 { try execute("ALTER TABLE capture ADD COLUMN user_edited INTEGER NOT NULL DEFAULT 0") }
      try execute("ALTER TABLE capture RENAME TO capture_legacy"); try createCapture()
      try execute("""
        INSERT INTO capture SELECT id,platform,source_app,bank,title,body,posted_at,captured_at,dedupe_key,
          rule_id,direction,amount_minor,currency,counterparty,reference,confidence,status,user_note,user_edited,synced_at FROM capture_legacy
        """)
      try execute("DROP TABLE capture_legacy"); try execute("CREATE INDEX capture_posted_at ON capture(posted_at DESC)")
      try createConfiguration()
      if let raw = try setting("enabled_packages"), let packages = try? JSONDecoder().decode([String].self, from: Data(raw.utf8)) {
        for pkg in packages { try execute("INSERT OR IGNORE INTO selected_app VALUES (?,?,?)", [.text(pkg), .text(pkg), .integer(Self.now)]) }
      }
      try execute("DELETE FROM setting WHERE key='enabled_packages'"); try execute("DROP TABLE IF EXISTS seen_app")
    }
    if version < 4 { try execute("ALTER TABLE capture ADD COLUMN parse_state TEXT") }
    try execute("PRAGMA user_version=4")
  }
  private static var now: Int64 { Int64(Date().timeIntervalSince1970 * 1000) }
  public func setting(_ key: String) throws -> String? { try query("SELECT value FROM setting WHERE key=?", [.text(key)]).first?["value"]?.string }
  public func setSetting(_ key: String, _ value: String) throws {
    if key == "generic_config" { _ = try GenericConfig.decode(value) }
    if ["tts_enabled", "tts_duck"].contains(key) && !["true", "false"].contains(value) { throw EngineError.invalid("Expected true or false") }
    if ["tts_template_in", "tts_template_out"].contains(key) && value.count > ParseResult.templateMax { throw EngineError.invalid("Announcement is too long") }
    if key == "tts_rate", !(Double(value).map { $0.isFinite && (0.1...3).contains($0) } ?? false) { throw EngineError.invalid("Speech rate must be 0.1–3") }
    try execute("INSERT INTO setting(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [.text(key), .text(value)])
  }
  public func resetGenericConfig() throws { try setSetting("generic_config", defaultJSON); try setSetting("generic_edited", "0"); reloadParsers() }
  /// An unedited generic rule follows the bundled default, so app updates deliver keyword fixes. JS sets generic_edited=1 on save.
  private func syncGenericDefault() throws {
    guard try setting("generic_edited") != "1" else { return }
    if try setting("generic_config") != defaultJSON {
      try execute("INSERT INTO setting(key,value) VALUES ('generic_config',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [.text(defaultJSON)])
    }
  }
  public func reloadParsers() { locked { cached = nil } }
  private func engine() throws -> RuleEngine {
    try locked {
      let revision = try setting("parsers_rev") ?? "0", raw = try setting("generic_config") ?? defaultJSON
      if let cached, cached.0 == revision && cached.1 == raw { return cached.2 }
      var parsers: [Parser] = []
      for row in try query("SELECT id,json FROM parser WHERE enabled=1 ORDER BY id") {
        let id = row["id"]?.string ?? "unknown"
        do {
          let p = try Parser.decode(row["json"]?.string ?? "")
          guard p.id == id else { throw EngineError.invalid("Parser id differs from database id") }; parsers.append(p)
        } catch { try setSetting("parser_error:" + id, error.localizedDescription); NSLog("PayPing skipped invalid parser %@", id) }
      }
      let generic: GenericConfig
      do { generic = try GenericConfig.decode(raw) }
      catch { try setSetting("parser_error:generic", error.localizedDescription); generic = try GenericConfig.decode(defaultJSON) }
      let engine = RuleEngine(parsers: parsers, generic: generic) { [weak self] id in
        self?.slowParsers.insert(id)
      }
      cached = (revision, raw, engine); return engine
    }
  }
  public func preview(title: String, body: String, sourceApp: String, parserJSON: String? = nil) throws -> [String: Any] {
    try locked {
    if let parserJSON {
      do { return RuleEngine(parsers: [try Parser.decode(parserJSON)], generic: .empty).parse(title: title, body: body, sourceApp: sourceApp).dictionary }
      catch { return ["error": error.localizedDescription] }
    }
    slowParsers.removeAll()
    let result = try engine().parse(title: title, body: body, sourceApp: sourceApp)
    recordTimeouts()
    return result.dictionary
    }
  }
  private func fields(_ result: ParseResult, status: String? = nil) -> [String: SQLValue] {
    ["parser_id": result.parserId.map(SQLValue.text) ?? .null, "rule_id": result.ruleId.map(SQLValue.text) ?? .null,
     "direction": .text(result.direction), "amount_minor": result.amountMinor.map(SQLValue.integer) ?? .null,
     "currency": .text(result.currency), "counterparty": result.counterparty.map(SQLValue.text) ?? .null,
     "reference": result.reference.map(SQLValue.text) ?? .null, "confidence": .text(result.confidence),
     "status": .text(status == "ignored" ? "ignored" : result.confidence == "high" ? "logged" : "needs_review")]
  }
  public func capture(sourceApp: String, title: String, body: String, postedAt: Int64) throws -> CaptureOutcome {
    try locked {
      let title = RuleEngine.cap(title), body = RuleEngine.cap(body, count: 4000 - RuleEngine.cap(title).utf16.count)
      let id = Identity.uuidV7(), key = Identity.sha256("\(sourceApp)|\(RuleEngine.normalize(title))|\(RuleEngine.normalize(body))|\(postedAt / 60000)")
      var data = fields(ParseResult())
      data["parse_state"] = .text("pending")
      data.merge(["id": .text(id), "platform": .text("ios"), "source_app": .text(sourceApp), "title": .text(title), "body": .text(body), "posted_at": .integer(postedAt), "captured_at": .integer(Self.now), "dedupe_key": .text(key)]) { _, new in new }
      let columns = data.keys.sorted()
      let inserted = try execute("INSERT OR IGNORE INTO capture(\(columns.joined(separator: ","))) VALUES (\(columns.map { _ in "?" }.joined(separator: ",")))", columns.map { data[$0]! }) > 0
      guard inserted else { return CaptureOutcome(id: nil, result: ParseResult(), spokenText: "") }
      let result = try finishPending(id: id)
      if timedOut { DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 2) { [weak self] in try? self?.recoverPending() } }
      let languageSetting = try setting("language") ?? "auto"
      let language = languageSetting == "ms" || (languageSetting == "auto" && Locale.current.language.languageCode?.identifier == "ms") ? "ms" : "en"
      let speech = try setting("tts_enabled") != "false" ? result.spokenText(language: language, app: sourceApp, templateIn: try setting("tts_template_in"), templateOut: try setting("tts_template_out")) : ""
      return CaptureOutcome(id: id, result: result, spokenText: speech)
    }
  }
  private func recordTimeouts() {
    for id in timeoutStreaks.keys where !slowParsers.contains(id) { timeoutStreaks.removeValue(forKey: id) }
    for id in slowParsers {
      timeoutStreaks[id, default: 0] += 1
      if timeoutStreaks[id, default: 0] >= 3 { try? setSetting("parser_slow:" + id, String(Self.now)) }
    }
  }
  @discardableResult private func finishPending(id: String) throws -> ParseResult {
    guard let row = try query("SELECT * FROM capture WHERE id=? AND user_edited=0", [.text(id)]).first else { return ParseResult() }
    slowParsers.removeAll()
    let parsed = try engine().parse(title: row["title"]?.string ?? "", body: row["body"]?.string ?? "", sourceApp: row["source_app"]?.string ?? "", platform: row["platform"]?.string ?? "ios")
    let result = timedOut ? ParseResult() : parsed
    recordTimeouts()
    var data = fields(result, status: row["status"]?.string)
    data["parse_state"] = timedOut ? .text("timeout") : .null
    let columns = data.keys.sorted()
    let changed = try execute("UPDATE capture SET \(columns.map { $0 + "=?" }.joined(separator: ",")) WHERE id=? AND user_edited=0 AND status=?", columns.map { data[$0]! } + [.text(id), row["status"]!])
    return changed > 0 && row["status"]?.string != "ignored" ? result : ParseResult()
  }
  public func recoverPending() throws {
    try locked {
      for row in try query("SELECT id FROM capture WHERE parse_state='pending' AND user_edited=0 ORDER BY captured_at") {
        if let id = row["id"]?.string { try finishPending(id: id) }
      }
      for row in try query("SELECT id FROM capture WHERE parse_state='timeout' AND user_edited=0 AND NOT EXISTS (SELECT 1 FROM setting WHERE key='parse_retry:' || capture.id)") {
        if let id = row["id"]?.string {
          try execute("BEGIN IMMEDIATE")
          do {
            try execute("INSERT OR IGNORE INTO setting VALUES (?, '1')", [.text("parse_retry:" + id)])
            try execute("UPDATE capture SET parse_state='pending' WHERE id=? AND user_edited=0", [.text(id)])
            try execute("COMMIT")
          } catch { try? execute("ROLLBACK"); throw error }
          try finishPending(id: id)
        }
      }
    }
  }
  public func reparse(sourceApp: String? = nil) throws -> Int {
    try locked {
      let engine = try engine()
      let rows = try query("SELECT * FROM capture WHERE user_edited=0" + (sourceApp == nil ? "" : " AND source_app=?"), sourceApp.map { [.text($0)] } ?? [])
      var changed = 0
      for row in rows {
        slowParsers.removeAll()
        let parsed = engine.parse(title: row["title"]?.string ?? "", body: row["body"]?.string ?? "", sourceApp: row["source_app"]?.string ?? "", platform: row["platform"]?.string ?? "ios")
        recordTimeouts()
        var data = fields(timedOut ? ParseResult() : parsed, status: row["status"]?.string)
        data["parse_state"] = timedOut ? .text("timeout") : .null
        let columns = data.keys.sorted()
        if data.contains(where: { row[$0.key] != $0.value }) {
          changed += try execute("UPDATE capture SET \(columns.map { $0 + "=?" }.joined(separator: ",")) WHERE id=? AND user_edited=0 AND status=?", columns.map { data[$0]! } + [row["id"]!, row["status"]!])
        }
      }
      return changed
    }
  }
}
