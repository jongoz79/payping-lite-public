import Foundation
import CoreFoundation

public struct ValidationIssue: Codable, Sendable, Equatable {
  public let code: String
  public let message: String
}
public struct ValidationFailure: Error, LocalizedError, Sendable {
  public let errors: [ValidationIssue]
  public var errorDescription: String? { errors.map { "\($0.code): \($0.message)" }.joined(separator: "\n") }
}

/// Ordered stable codes shared with TypeScript and Kotlin (parser-library/VALIDATION.md).
public enum Validation {
  private static func text(_ value: Any?) -> Bool { (value as? String).map { !$0.isEmpty } ?? false }
  private static func integer(_ value: Any?) -> Bool {
    guard let n = value as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return false }
    return n.doubleValue.isFinite && n.doubleValue.rounded() == n.doubleValue
  }
  private static func tooDeep(_ value: Any, depth: Int = 0) -> Bool {
    if depth > 64 { return true }
    if let object = value as? [String: Any] { return object.values.contains { tooDeep($0, depth: depth+1) } }
    if let array = value as? [Any] { return array.contains { tooDeep($0, depth: depth+1) } }
    return false
  }
  private final class Check {
    var errors: [ValidationIssue] = []
    func add(_ code: String, _ path: String, _ reason: String) { errors.append(ValidationIssue(code: code, message: "\(path): \(reason)")) }
    func keys(_ object: [String: Any], _ allowed: Set<String>, _ path: String) {
      for key in object.keys.sorted() where !allowed.contains(key) { add("UNKNOWN_FIELD",path,"unknown field '\(key)'") }
    }
    func pattern(_ value: Any?, _ path: String, _ group: String? = nil) {
      for original in PortableRegexValidation.codes(value, group: group) {
        let code = original == "MISSING_GROUP" && group == "amount" && path.hasPrefix("rules[") ? "MISSING_AMOUNT_GROUP" : original
        let message: String
        switch code {
        case "MISSING_GROUP", "MISSING_AMOUNT_GROUP": message = "requires named group (?<\(group ?? "value")>…)"
        case "REGEX_EMPTY": message = "must be non-empty text"
        case "REGEX_TOO_LONG": message = "regex exceeds 4,000 characters"
        case "REGEX_INVALID": message = "invalid regex; check brackets, groups and escapes"
        default: message = "regex is not portable or has unsafe repetition; simplify it"
        }
        add(code,path,message)
      }
    }
    func apps(_ value: Any?, _ path: String) {
      guard let array = value as? [Any] else { add("BAD_APP_LIST",path,"must be a list of app names"); return }
      var seen: Set<String> = []
      for (i, value) in array.enumerated() {
        guard let s = value as? String, !s.isEmpty else { add("BAD_APP_LIST_ENTRY","\(path)[\(i)]","must be non-empty text"); continue }
        if !seen.insert(s).inserted { add("DUPLICATE_APP",path,"duplicate app '\(s)'") }
      }
    }
    func extraction(_ value: Any, _ path: String, _ group: String) {
      if let spec = value as? [String: Any] {
        keys(spec,["pattern","source"],path)
        if let source = spec["source"], !((source as? String).map { ["body","title","bodyThenTitle"].contains($0) } ?? false) {
          add("BAD_EXTRACTION_SOURCE",path+".source","use body, title or bodyThenTitle")
        }
        pattern(spec["pattern"],path,group)
      } else { pattern(value,path,group) }
    }
    func rule(_ value: Any, _ i: Int) {
      let path = "rules[\(i)]"
      guard let r = value as? [String: Any] else { add("BAD_RULE",path,"must be an object"); return }
      keys(r,["id","priority","match","direction","confidence","extract"],path)
      if (r["id"] as? String)?.range(of: #"^[a-z][a-z0-9_-]*\.[a-z0-9-]+\.v[0-9]+$"#, options: .regularExpression) == nil { add("BAD_RULE_ID",path+".id","use parser.name.v1") }
      if !integer(r["priority"]) { add("BAD_PRIORITY",path+".priority","must be an integer") }
      let direction = r["direction"] as? String
      if direction == nil || !["in","out","info"].contains(direction!) { add("BAD_DIRECTION",path+".direction","use in, out or info") }
      if let confidence = r["confidence"], !((confidence as? String).map { ["high","none"].contains($0) } ?? false) { add("BAD_CONFIDENCE",path+".confidence","use high or none") }
      if let match = r["match"] as? [String: Any], !match.isEmpty {
        keys(match,["title","body"],path+".match")
        for field in ["title","body"] { if let value = match[field] { pattern(value,path+".match."+field) } }
      } else { add("MATCH_REQUIRED",path+".match","add a title or body match") }
      let needsAmount = direction == "in" || direction == "out"
      guard let extract = r["extract"] as? [String: Any] else { if needsAmount { add("MISSING_AMOUNT",path+".extract","add an amount extraction pattern") }; return }
      keys(extract,["amount","counterparty","reference"],path+".extract")
      if needsAmount && extract["amount"] == nil { add("MISSING_AMOUNT_GROUP",path+".extract.amount","requires named group (?<amount>…)") }
      for field in ["amount","counterparty","reference"] { if let value = extract[field] { extraction(value,path+".extract."+field,field) } }
    }
    func parser(_ p: [String: Any]) {
      keys(p,["schemaVersion","id","name","version","author","description","androidPackages","iosAppNames","rules"],"parser")
      if !integer(p["schemaVersion"]) || (p["schemaVersion"] as? NSNumber)?.doubleValue != 1 { add("BAD_SCHEMA_VERSION","schemaVersion","must be 1") }
      if (p["id"] as? String)?.range(of: #"^[a-z][a-z0-9_-]*$"#, options: .regularExpression) == nil { add("BAD_ID","id","use a lowercase id") }
      if !text(p["name"]) { add("BAD_NAME","name","must be non-empty text") }
      if !integer(p["version"]) || ((p["version"] as? NSNumber)?.doubleValue ?? 0) < 1 { add("BAD_VERSION","version","must be a positive integer") }
      for field in ["author","description"] where p[field] != nil { if !text(p[field]) { add("BAD_OPTIONAL_TEXT",field,"must be non-empty text when included") } }
      for field in ["androidPackages","iosAppNames"] { apps(p[field],field) }
      guard let rules = p["rules"] as? [Any], !rules.isEmpty else { add("RULES_REQUIRED","rules","add at least one rule"); return }
      for (i,r) in rules.enumerated() { rule(r,i) }
    }
    func patterns(_ value: Any?, _ path: String, _ group: String, requireOne: Bool = false) {
      guard let array = value as? [Any] else { add("BAD_PATTERN_LIST",path,"must be a list"); return }
      if requireOne && array.isEmpty { add("AMOUNT_PATTERNS_REQUIRED",path,"add at least one amount pattern"); return }
      for (i, value) in array.enumerated() { pattern(value,"\(path)[\(i)]",group) }
    }
    func generic(_ g: [String: Any]) {
      keys(g,["amountPatterns","debitKeywords","creditKeywords","referencePatterns","counterpartyPatterns"],"generic_config")
      patterns(g["amountPatterns"],"amountPatterns","amount",requireOne:true)
      for field in ["debitKeywords","creditKeywords"] {
        if let array = g[field] as? [Any] { for (i,value) in array.enumerated() where !text(value) { add("BAD_KEYWORD","\(field)[\(i)]","must be non-empty text") } }
        else { add("BAD_KEYWORD_LIST",field,"must be a list") }
      }
      patterns(g["referencePatterns"],"referencePatterns","reference")
      guard let parties = g["counterpartyPatterns"] as? [String: Any] else { add("BAD_COUNTERPARTY_PATTERNS","counterpartyPatterns","add incoming and outgoing lists"); return }
      keys(parties,["in","out"],"counterpartyPatterns")
      for direction in ["in","out"] { patterns(parties[direction],"counterpartyPatterns."+direction,"counterparty") }
    }
  }
  public static func validate(kind: String, value: Any) -> [ValidationIssue] {
    let check = Check()
    if kind == "regex" { check.pattern(value,"regex"); return check.errors }
    guard let object = value as? [String: Any] else { return [ValidationIssue(code: kind == "generic" ? "GENERIC_NOT_OBJECT" : "PARSER_NOT_OBJECT", message: "Expected a JSON object")] }
    if tooDeep(value) { return [ValidationIssue(code: "JSON_DEPTH_EXCEEDED", message: "JSON nesting exceeds 64 levels")] }
    guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.fragmentsAllowed,.withoutEscapingSlashes]), let json = String(data:data,encoding:.utf8) else { return [ValidationIssue(code:"VALIDATION_ERROR",message:"Expected finite JSON")] }
    if json.utf16.count > 1_000_000 { return [ValidationIssue(code:"JSON_TOO_LARGE",message:"JSON exceeds 1 MB")] }
    if kind == "generic" { check.generic(object) } else { check.parser(object) }
    return check.errors
  }
  public static func result(kind: String, value: Any) -> [String: Any] {
    let errors = validate(kind: kind, value: value)
    return errors.isEmpty ? ["ok": true, "value": value] : ["ok": false, "errors": errors.map { ["code": $0.code, "message": $0.message] }]
  }
  private static func object(_ raw: String, kind: String) throws {
    if raw.utf16.count > 1_000_000 { throw ValidationFailure(errors:[ValidationIssue(code:"JSON_TOO_LARGE",message:"JSON exceeds 1 MB")]) }
    var depth = 0, quoted = false, escaped = false
    for c in raw {
      if escaped { escaped = false; continue }
      if quoted && c == "\\" { escaped = true; continue }
      if c == "\"" { quoted.toggle() }
      if !quoted {
        if c == "{" || c == "[" { depth += 1 }; if c == "}" || c == "]" { depth -= 1 }
        if depth > 65 { throw ValidationFailure(errors:[ValidationIssue(code:"JSON_DEPTH_EXCEEDED",message:"JSON nesting exceeds 64 levels")]) }
      }
    }
    let value: Any
    do { value = try JSONSerialization.jsonObject(with: Data(raw.utf8), options: [.fragmentsAllowed]) }
    catch { throw ValidationFailure(errors:[ValidationIssue(code:"VALIDATION_ERROR",message:"Invalid JSON: \(error.localizedDescription)")]) }
    let errors = validate(kind:kind,value:value)
    if !errors.isEmpty { throw ValidationFailure(errors:errors) }
  }
  public static func parser(_ raw: String) throws { try object(raw,kind:"parser") }
  public static func generic(_ raw: String) throws { try object(raw,kind:"generic") }
  public static func pattern(_ value: String, group: String? = nil) throws {
    let check = Check(); check.pattern(value,"regex",group)
    if !check.errors.isEmpty { throw ValidationFailure(errors:check.errors) }
  }
}
