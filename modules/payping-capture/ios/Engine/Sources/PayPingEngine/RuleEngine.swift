import Foundation

public final class RuleEngine: @unchecked Sendable {
  public let parsers: [Parser]
  public let generic: GenericConfig
  private let lock = NSLock()
  private let parseLock = NSRecursiveLock()
  private var remaining: UInt64 = 250_000_000
  private var cache: [String: NSRegularExpression] = [:]
  private let onSlow: @Sendable (String) -> Void
  public init(parsers: [Parser], generic: GenericConfig, onSlow: @escaping @Sendable (String) -> Void = { _ in }) {
    self.parsers = parsers; self.generic = generic; self.onSlow = onSlow
  }
  public static func normalize(_ value: String) -> String {
    var s = value.precomposedStringWithCompatibilityMapping
    for (bad, good) in [("â€™", "'"), ("â€˜", "'"), ("â€œ", "\""), ("â€", "\""), ("â€“", "-"), ("â€”", "-"), ("â", "'")] {
      s = s.replacingOccurrences(of: bad, with: good)
    }
    return s.replacingOccurrences(of: #"[\s\uFEFF]+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
  }
  public static func cap(_ value: String, count: Int = 4000) -> String { String(decoding: value.utf16.prefix(max(0, count)), as: UTF16.self) }
  public static func currency(_ value: String?) -> String {
    guard let code = value?.uppercased(with: Locale(identifier: "en_US_POSIX")), !code.isEmpty else { return "MYR" }
    let aliases = ["RM": "MYR", "JP¥": "JPY", "¥": "JPY", "NZ$": "NZD", "S$": "SGD", "US$": "USD", "A$": "AUD", "$": "USD", "£": "GBP", "€": "EUR"]
    return aliases[code] ?? (code.range(of: "^[A-Z]{3}$", options: .regularExpression) != nil ? code : "MYR")
  }
  private func regex(_ pattern: String) throws -> NSRegularExpression {
    lock.lock(); defer { lock.unlock() }
    if let cached = cache[pattern] { return cached }
    let r = try NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
    if cache.count >= 512 { cache.removeAll(keepingCapacity: true) }
    cache[pattern] = r; return r
  }
  private func match(_ pattern: String, _ text: String) throws -> NSTextCheckingResult? {
    let r = try regex(pattern)
    let start = DispatchTime.now().uptimeNanoseconds
    let deadline = start + min(50_000_000, remaining)
    defer { let spent = DispatchTime.now().uptimeNanoseconds - start; remaining = spent >= remaining ? 0 : remaining - spent }
    var result: NSTextCheckingResult?, expired = false
    // reportProgress permits cooperative cancellation during ICU searches as well as checks between rules.
    r.enumerateMatches(in: text, options: [.reportProgress], range: NSRange(text.startIndex..., in: text)) { match, _, stop in
      if DispatchTime.now().uptimeNanoseconds >= deadline { expired = true; stop.pointee = true }
      else if let match { result = match; stop.pointee = true }
    }
    if expired || DispatchTime.now().uptimeNanoseconds >= deadline { throw EngineError.timeout }
    return result
  }
  private func group(_ match: NSTextCheckingResult, _ name: String, _ text: String) -> String? {
    let range = match.range(withName: name)
    guard range.location != NSNotFound, let swiftRange = Range(range, in: text) else { return nil }
    return String(text[swiftRange])
  }
  private func extract(_ spec: Extraction?, _ name: String, _ title: String, _ body: String, clean: Bool = false) throws -> String? {
    guard let spec else { return nil }
    let values = spec.source == "title" ? [title] : spec.source == "body" ? [body] : [body, title]
    for value in values {
      if let found = try match(spec.pattern, value) {
        guard var result = group(found, name, value) else { return nil }
        if clean { result = result.replacingOccurrences(of: "[.]+$", with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines) }
        return result.isEmpty ? nil : result
      }
    }
    return nil
  }
  private func amount(_ raw: String?) -> Int64? {
    guard let raw else { return nil }
    let s = raw.replacingOccurrences(of: ",", with: "")
    guard s.range(of: #"^[0-9]+(?:\.[0-9]{0,2})?$"#, options: .regularExpression) != nil else { return nil }
    let parts = s.split(separator: ".", omittingEmptySubsequences: false)
    guard let major = Int64(parts[0]), major <= 90_071_992_547_409 else { return nil }
    let fraction = parts.count > 1 ? String(parts[1]) : ""
    guard let minor = Int64(fraction.padding(toLength: 2, withPad: "0", startingAt: 0)) else { return nil }
    let value = major * 100 + minor
    return value <= 9_007_199_254_740_991 ? value : nil
  }
  public func parse(title rawTitle: String, body rawBody: String, sourceApp: String, platform: String = "ios") -> ParseResult {
    parseLock.lock(); defer { parseLock.unlock() }; remaining = 250_000_000
    let cappedTitle = Self.cap(rawTitle)
    let title = Self.cap(Self.normalize(cappedTitle))
    let body = Self.cap(Self.normalize(Self.cap(rawBody, count: 4000 - cappedTitle.utf16.count)), count: 4000 - title.utf16.count)
    let candidates = parsers.filter { platform == "android" ? $0.androidPackages.contains(sourceApp) : $0.iosAppNames.contains(where: { $0.caseInsensitiveCompare(sourceApp) == .orderedSame }) }
      .flatMap { p in p.rules.map { (p.id, $0) } }.enumerated().sorted { a, b in a.element.1.priority == b.element.1.priority ? a.offset < b.offset : a.element.1.priority > b.element.1.priority }
    for candidate in candidates {
      let (id, rule) = candidate.element
      do {
        if try !rule.match.allSatisfy({ try match($0.value, $0.key == "title" ? title : body) != nil }) { continue }
        var result = ParseResult(); result.parserId = id; result.ruleId = rule.id; result.direction = rule.direction; result.confidence = rule.confidence ?? "high"
        if rule.direction == "info" { return result }
        guard let minor = try amount(extract(rule.extract?["amount"], "amount", title, body)) else { continue }
        result.amountMinor = minor
        result.currency = try Self.currency(extract(rule.extract?["amount"], "currency", title, body))
        result.counterparty = try extract(rule.extract?["counterparty"], "counterparty", title, body, clean: true)
        result.reference = try extract(rule.extract?["reference"], "reference", title, body, clean: true)
        return result
      } catch { onSlow(id) }
    }
    do { return try parseGeneric(title, body) } catch { onSlow("generic"); return ParseResult() }
  }
  private static let tieIn = ["received from", "transferred to you", "sent you", "refunded", "refund of", "credited to your", "credited into your", "diterima daripada"]
  private static let tieOut = ["paid to", "sent to", "transferred to", "payment to", "debited from", "dibayar kepada"]
  /// Both keyword lists matched: the directional phrase wins (mirrors tieBreak in src/parser/engine.ts).
  private func tieBreak(_ text: String) -> String {
    if Self.tieIn.contains(where: { keyword(text, $0) }) { return "in" }
    if Self.tieOut.contains(where: { keyword(text, $0) }) { return "out" }
    let lower = text.lowercased()
    if lower.contains("credited") || lower.contains("dikreditkan") { return "in" }
    if lower.contains("debited") || lower.contains("didebitkan") { return "out" }
    return "info"
  }
  private func keyword(_ text: String, _ word: String) -> Bool {
    // Literal keyword fallback, matching the actua-derived shared reference engine (GPL-3.0).
    let text = Array(text.lowercased()), word = Array(word.lowercased())
    guard !word.isEmpty, word.count <= text.count else { return false }
    func ascii(_ c: Character) -> Bool { c.isASCII && (c.isLetter || c.isNumber) }
    for i in 0...(text.count - word.count) where Array(text[i..<(i + word.count)]) == word {
      if (i == 0 || !ascii(text[i - 1])) && (i + word.count == text.count || !ascii(text[i + word.count])) { return true }
    }
    return false
  }
  private func parseGeneric(_ title: String, _ body: String) throws -> ParseResult {
    var minor: Int64?, negativeAmount = false
    amountLoop: for p in generic.amountPatterns {
      for value in [body, title] {
        if let found = try match(p, value), let raw = group(found, "amount", value), let parsed = amount(raw) {
          minor = parsed
          if let range = Range(found.range, in: value) {
            negativeAmount = String(value[range]).range(of: #"^\s*(?:-(?:RM|MYR)|(?:RM|MYR)\s?-)"#, options: [.regularExpression, .caseInsensitive]) != nil
          }
          break amountLoop
        }
      }
    }
    guard let minor, minor != 0 else { return ParseResult() }
    let text = title + " " + body
    let credit = generic.creditKeywords.contains { keyword(text, $0) }
    var debit = generic.debitKeywords.contains { !($0 == "transferred to" && text.lowercased().contains("transferred to you")) && keyword(text, $0) }
    if !credit && !debit && ["payment", "transfer"].contains(title.lowercased()) { debit = true }
    // Keywords decide; a minus sign only says "money out" when no keyword does (mirrors src/parser/engine.ts).
    var keywordDirection = "info"
    if credit && !debit { keywordDirection = "in" }; if debit && !credit { keywordDirection = "out" }
    if credit && debit { keywordDirection = tieBreak(text) }
    if keywordDirection == "info" && negativeAmount { keywordDirection = "out" }
    guard keywordDirection != "info" else { return ParseResult() }
    var result = ParseResult(); result.direction = keywordDirection; result.amountMinor = minor; result.confidence = "low"
    for p in generic.counterpartyPatterns[keywordDirection] ?? [] {
      if let value = try extract(.pattern(p), "counterparty", title, body, clean: true) {
        result.counterparty = value.replacingOccurrences(of: #"\s+at\s+\d{1,2}:\d{2}(?::\d{2})?$"#, with: "", options: [.regularExpression, .caseInsensitive])
          .replacingOccurrences(of: #"\s+(?:on|at|via|ref|for|and|to)$"#, with: "", options: [.regularExpression, .caseInsensitive]).trimmingCharacters(in: .whitespacesAndNewlines)
        break
      }
    }
    for p in generic.referencePatterns { if let value = try extract(.pattern(p), "reference", title, body, clean: true) { result.reference = value; break } }
    return result
  }
}
