import Foundation

// Port of src/parser/validate.ts static checks; ordering is part of VALIDATION.md.
enum PortableRegexValidation {
  private struct P {
    let a: [Character]
    init(_ s: String) { a = Array(s) }
    var count: Int { a.count }
    subscript(_ i: Int) -> Character? { a.indices.contains(i) ? a[i] : nil }
    func slice(_ start: Int, _ end: Int? = nil) -> String {
      let lo = min(max(0, start), count), hi = min(max(lo, end ?? count), count)
      return String(a[lo..<hi])
    }
  }
  private static func found(_ p: String, _ s: String) -> Bool { s.range(of: p, options: .regularExpression) != nil }
  private static func stripped(_ s: String) -> String { s.replacingOccurrences(of: #"^\?(?::|=|!|<[^>]+>)"#, with: "", options: .regularExpression) }
  private static func brace(_ s: String) -> String? { s.range(of: #"^\{[0-9]+(?:,[0-9]*)?\}"#, options: .regularExpression).map { String(s[$0]) } }
  private static func closing(_ p: P, _ start: Int, _ opening: Character, _ closing: Character) -> Int {
    var depth = 0, inClass = false, i = start
    while i < p.count {
      let c = p[i]
      if c == "\\" { i += 2; continue }
      if opening == "(" && c == "[" && !inClass { inClass = true; i += 1; continue }
      if opening == "(" && c == "]" && inClass { inClass = false; i += 1; continue }
      if !inClass {
        if c == opening { depth += 1 }
        if c == closing { depth -= 1; if depth == 0 { return i + 1 } }
      }
      i += 1
    }
    return p.count
  }
  private static func nested(_ value: String) -> Bool {
    struct Group { var any = false; var unbounded = false }
    let p = P(value); var groups: [Group] = [], closed: Group?, inClass = false, i = 0
    while i < p.count {
      let c = p[i]
      if c == "\\" { i += 2; closed = nil; continue }
      if c == "[" && !inClass { inClass = true; closed = nil; i += 1; continue }
      if c == "]" && inClass { inClass = false; closed = nil; i += 1; continue }
      if inClass { i += 1; continue }
      if c == "(" { groups.append(Group()); closed = nil; if p[i+1] == "?" { i += 2 }; i += 1; continue }
      if c == ")" { closed = groups.popLast(); i += 1; continue }
      let q = c == "{" ? brace(p.slice(i)) : nil
      if c == "*" || c == "+" || c == "?" || q != nil {
        let unbounded = c == "*" || c == "+"
        if let closed, closed.any && (closed.unbounded || unbounded) { return true }
        for j in groups.indices { groups[j].any = true; if unbounded { groups[j].unbounded = true } }
        closed = nil; if let q { i += q.count - 1 }
      } else { closed = nil }
      i += 1
    }
    return false
  }
  private static func startsGreedy(_ value: String) -> Bool {
    let p = P(value); guard p.count > 0 else { return false }
    let end = p[0] == "\\" ? 2 : p[0] == "[" ? closing(p, 0, "[", "]") : 1
    return p[end] == "*" || p[end] == "+"
  }
  private static func adjacent(_ value: String) -> String? {
    let p = P(value); var previous = false, whitespace = false, i = 0
    while i < p.count {
      let c = p[i]; var content: String?
      if c == "^" || c == "$" || c == "|" { previous = false; whitespace = false; i += 1; continue }
      let currentWhitespace = c == "\\" && p[i+1] == "s"
      if c == "(" { let end = closing(p,i,"(",")"); content = p.slice(i+1,max(i+1,end-1)); i = end }
      else if c == "[" { i = closing(p,i,"[","]") }
      else if c == "\\" { i += 2 }
      else { i += 1 }
      var unbounded = false
      if p[i] == "*" || p[i] == "+" { unbounded = true; i += 1 }
      else if p[i] == "?" { i += 1 }
      else if p[i] == "{", let q = brace(p.slice(i)) { i += q.count }
      if p[i] == "?" { i += 1 }
      let expression = content.map(stripped)
      if previous && unbounded { return "REGEX_ADJACENT_QUANTIFIER" }
      if previous && !whitespace, let expression, startsGreedy(expression) { return "REGEX_GROUP_BOUNDARY_QUANTIFIER" }
      previous = unbounded; whitespace = currentWhitespace
      if let expression, let problem = adjacent(expression) { return problem }
    }
    return nil
  }
  private static func leading(_ value: String) -> Bool {
    let p = P(value); guard p.count > 0, p[0] != "^" else { return false }
    var end = 1, attack = p[0] == "." || p[0] == "a" || p[0] == "A"
    if p[0] == "\\" { end = 2; attack = p[1] == "w" }
    else if p[0] == "[" { end = closing(p,0,"[","]"); attack = found("A-Z|a-z|a|A",p.slice(1,max(1,end-1))) }
    return attack && (p[end] == "*" || p[end] == "+") && p[end+1] != "?" && end+1 != p.count && p[end+1] != "$"
  }
  private static func overlapping(_ value: String) -> Bool {
    let p = P(stripped(value)); var branches: [String] = [], depth = 0, start = 0, inClass = false, i = 0
    while i < p.count {
      let c = p[i]
      if c == "\\" { i += 2; continue }
      if c == "[" && !inClass { inClass = true; i += 1; continue }
      if c == "]" && inClass { inClass = false; i += 1; continue }
      if !inClass {
        if c == "(" { depth += 1 }; if c == ")" { depth -= 1 }
        if c == "|" && depth == 0 { branches.append(p.slice(start,i)); start = i+1 }
      }
      i += 1
    }
    guard !branches.isEmpty else { return false }; branches.append(p.slice(start))
    let literals = branches.map { $0.replacingOccurrences(of: #"^\^|\$$"#, with: "", options: .regularExpression) }
    guard literals.allSatisfy({ found("^[A-Za-z0-9 ]+$",$0) }) else { return false }
    return literals.indices.contains { a in literals.indices.contains { b in a != b && literals[b].hasPrefix(literals[a]) } }
  }
  private static func ambiguous(_ value: String) -> Bool {
    let p = P(value); var groups: [Int] = [], inClass = false, i = 0
    while i < p.count {
      let c = p[i]
      if c == "\\" { i += 2; continue }
      if c == "[" && !inClass { inClass = true; i += 1; continue }
      if c == "]" && inClass { inClass = false; i += 1; continue }
      if !inClass {
        if c == "(" { groups.append(i+1) }
        if c == ")", let start = groups.popLast(), (p[i+1] == "*" || p[i+1] == "+"), overlapping(p.slice(start,i)) { return true }
      }
      i += 1
    }
    return false
  }
  private static func possessive(_ value: String) -> Bool {
    let p = P(value); var i = 0, inClass = false
    while i < p.count {
      let c = p[i]
      if c == "\\" { i += 2; continue }
      if c == "[" && !inClass { inClass = true; i += 1; continue }
      if c == "]" && inClass { inClass = false; i += 1; continue }
      if !inClass {
        let q = c == "{" ? brace(p.slice(i)) : nil
        if (c == "*" || c == "+" || c == "?") && p[i+1] == "+" { return true }
        if let q, p[i+q.count] == "+" { return true }
      }
      i += 1
    }
    return false
  }
  private static func compilePattern(_ value: String) -> String {
    let identity = value.replacingOccurrences(of: #"\\([pP])(?=[{<])"#, with: "$1", options: .regularExpression).replacingOccurrences(of: "\\Q", with: "Q").replacingOccurrences(of: "\\E", with: "E")
    let p = P(identity); var out = "", i = 0, inClass = false
    while i < p.count {
      let c = p[i]!
      if c == "\\" { out.append(c); i += 1; if let next = p[i] { out.append(next); i += 1 }; continue }
      if c == "[" { inClass = true }; if c == "]" { inClass = false }
      if !inClass && c == "{" {
        if let q = brace(p.slice(i)) { out += q; i += q.count; continue }
        out += "\\"
      } else if !inClass && c == "}" { out += "\\" }
      out.append(c); i += 1
    }
    return out
  }
  static func codes(_ value: Any?, group: String? = nil) -> [String] {
    guard let p = value as? String, !p.isEmpty else { return ["REGEX_EMPTY"] }
    guard p.utf16.count <= 4000 else { return ["REGEX_TOO_LONG"] }
    var codes: [String] = []
    if let group, !p.contains("(?<\(group)>") { codes.append("MISSING_GROUP") }
    let inline = found(#"\(\?[imsuxdU-]"#,p), atomic = p.contains("(?>")
    if p.contains("(?<=") || p.contains("(?<!") { codes.append("REGEX_LOOKBEHIND") }
    else if inline || atomic || found(#"\\[kp]<|\\[pP]\{"#,p) || p.contains("\\Q") || p.contains("\\E") { codes.append("REGEX_UNSUPPORTED_SYNTAX") }
    if nested(p) { codes.append("REGEX_NESTED_QUANTIFIER") }
    if let problem = adjacent(p) { codes.append(problem) }
    if leading(p) { codes.append("REGEX_LEADING_GREEDY") }
    if ambiguous(p) { codes.append("REGEX_AMBIGUOUS_ALTERNATIVES") }
    let portable = compilePattern(p)
    if inline || atomic || possessive(p) || (try? NSRegularExpression(pattern: portable, options: [.caseInsensitive])) == nil { codes.append("REGEX_INVALID") }
    return codes
  }
}
