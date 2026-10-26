import Foundation

public enum EngineError: Error, LocalizedError {
  case invalid(String), timeout
  public var errorDescription: String? { switch self { case .invalid(let message): return message; case .timeout: return "Regex exceeded its time budget" } }
}
public enum Extraction: Codable, Sendable {
  case pattern(String), sourced(String, String)
  public init(from decoder: Decoder) throws {
    let c = try decoder.singleValueContainer()
    if let value = try? c.decode(String.self) { self = .pattern(value); return }
    struct Spec: Decodable { let pattern: String; let source: String? }
    let spec = try c.decode(Spec.self); self = .sourced(spec.pattern, spec.source ?? "bodyThenTitle")
  }
  public func encode(to encoder: Encoder) throws {
    var c = encoder.singleValueContainer()
    switch self { case .pattern(let p): try c.encode(p)
    case .sourced(let p, let s): try c.encode(["pattern": p, "source": s]) }
  }
  public var pattern: String { switch self { case .pattern(let p), .sourced(let p, _): return p } }
  public var source: String { switch self { case .pattern: return "bodyThenTitle"; case .sourced(_, let s): return s } }
}
public struct ParserRule: Codable, Sendable {
  public let id: String
  public let priority: Double
  public let match: [String: String]
  public let direction: String
  public let confidence: String?
  public let extract: [String: Extraction]?
  private enum CodingKeys: String, CodingKey { case id, priority, match, direction, confidence, extract }
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(String.self, forKey: .id); priority = try c.decode(Double.self, forKey: .priority)
    match = try c.decode([String:String].self, forKey: .match)
    direction = try c.decode(String.self, forKey: .direction)
    confidence = try c.decodeIfPresent(String.self, forKey: .confidence)
    // TS ignores a non-object extract on informational rules. Money rules are checked before decoding.
    extract = try? c.decode([String:Extraction].self, forKey: .extract)
  }

}
public struct Parser: Codable, Sendable {
  public let schemaVersion: Int
  public let id: String
  public let name: String
  public let version: Double
  public let author: String?
  public let description: String?
  public let androidPackages: [String]
  public let iosAppNames: [String]
  public let rules: [ParserRule]
  public static func decode(_ raw: String) throws -> Parser {
    try Validation.parser(raw)
    return try JSONDecoder().decode(Parser.self, from: Data(raw.utf8))
  }
}
public struct GenericConfig: Codable, Sendable {
  public var amountPatterns: [String]
  public var debitKeywords: [String]
  public var creditKeywords: [String]
  public var counterpartyPatterns: [String: [String]]
  public var referencePatterns: [String]
  public static let empty = GenericConfig(amountPatterns: [], debitKeywords: [], creditKeywords: [], counterpartyPatterns: ["in": [], "out": []], referencePatterns: [])
  public static func decode(_ raw: String) throws -> GenericConfig {
    try Validation.generic(raw)
    return try JSONDecoder().decode(GenericConfig.self, from: Data(raw.utf8))
  }
}
public struct ParseResult: Codable, Sendable, Equatable {
  public var ruleId: String? = nil
  public var parserId: String? = nil
  public var direction = "info"
  public var amountMinor: Int64? = nil
  public var currency = "MYR"
  public var counterparty: String? = nil
  public var reference: String? = nil
  public var confidence = "none"
  public init() {}
  public var dictionary: [String: Any] {
    ["ruleId": ruleId as Any? ?? NSNull(), "parserId": parserId as Any? ?? NSNull(), "direction": direction,
     "amountMinor": amountMinor as Any? ?? NSNull(), "currency": currency, "counterparty": counterparty as Any? ?? NSNull(),
     "reference": reference as Any? ?? NSNull(), "confidence": confidence]
  }
  public var spokenText: String { spokenText(language: "en") }
  /** Mirrors spokenName in src/parser/tts.ts. */
  public static func spokenName(_ name: String) -> String {
    var text = name.replacingOccurrences(of: #"(^|\s)\d{5,}(?=\s|$)"#, with: "", options: .regularExpression)
    let words = try! NSRegularExpression(pattern: "[A-Za-z]+")
    for match in words.matches(in: text, range: NSRange(text.startIndex..., in: text)).reversed() {
      guard let range = Range(match.range, in: text) else { continue }
      let word = String(text[range])
      if word.count >= 4 && word == word.uppercased() { text.replaceSubrange(range, with: word.prefix(1) + word.dropFirst().lowercased()) }
    }
    return text.trimmingCharacters(in: .whitespaces)
  }
  public static let defaultTemplate = "{sign} {amount}[, {app}][, {payee}]"
  public static let templateMax = 200
  /** Mirrors renderTtsTemplate in src/parser/tts.ts. */
  public static func render(_ template: String, _ values: [String: String]) -> String {
    let token = try! NSRegularExpression(pattern: #"\{(sign|amount|app|payee)\}"#)
    func keys(_ text: String) -> [String] {
      token.matches(in: text, range: NSRange(text.startIndex..., in: text)).compactMap { Range($0.range(at: 1), in: text).map { String(text[$0]) } }
    }
    func fill(_ text: String) -> String {
      var out = text
      for match in token.matches(in: text, range: NSRange(text.startIndex..., in: text)).reversed() {
        guard let whole = Range(match.range, in: out), let key = Range(match.range(at: 1), in: text) else { continue }
        out.replaceSubrange(whole, with: values[String(text[key])] ?? "")
      }
      return out
    }
    var text = template
    let group = try! NSRegularExpression(pattern: #"\[([^\[\]]*)\]"#)
    for match in group.matches(in: template, range: NSRange(template.startIndex..., in: template)).reversed() {
      guard let whole = Range(match.range, in: text), let innerRange = Range(match.range(at: 1), in: template) else { continue }
      let inner = String(template[innerRange])
      text.replaceSubrange(whole, with: keys(inner).allSatisfy { !(values[$0] ?? "").isEmpty } ? fill(inner) : "")
    }
    return fill(text)
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .replacingOccurrences(of: #"\s+([,.!?])"#, with: "$1", options: .regularExpression)
      .replacingOccurrences(of: #",(\s*,)+"#, with: ",", options: .regularExpression)
      .replacingOccurrences(of: #"^[\s,]+|[\s,]+$"#, with: "", options: .regularExpression)
  }
  /** Short announcement: sign + amount, app, payee, or the user's template. Shared with TS and Kotlin via tts-fixtures.json. */
  public func spokenText(language: String, app: String? = nil, templateIn: String? = nil, templateOut: String? = nil) -> String {
    guard direction != "info", confidence != "none", let value = amountMinor else { return "" }
    let major = abs(value) / 100, minor = abs(value) % 100
    let decimal = "\(major)." + String(format: "%02lld", minor)
    let myrAmount = minor == 0 ? "\(major) ringgit" : major == 0 ? "\(minor) \(language == "ms" ? "sen" : "cents")" : "\(major) ringgit \(minor) sen"
    let amount = currency == "MYR" ? myrAmount : "\(minor == 0 ? String(major) : decimal) \(currency)"
    let incoming = direction == "in"
    let values = [
      "sign": language == "ms" ? (incoming ? "Tambah" : "Tolak") : (incoming ? "Plus" : "Minus"),
      "amount": amount,
      "app": app?.trimmingCharacters(in: .whitespaces) ?? "",
      "payee": Self.spokenName(counterparty ?? ""),
    ]
    if let custom = (incoming ? templateIn : templateOut)?.trimmingCharacters(in: .whitespacesAndNewlines), !custom.isEmpty {
      let text = Self.render(custom, values)
      if !text.isEmpty { return text }
    }
    return Self.render(Self.defaultTemplate, values)
  }
}
