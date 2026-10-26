package expo.modules.paypingcapture

import org.json.JSONObject
import org.json.JSONArray

/** Stable codes and ordered errors follow parser-library/VALIDATION.md and the TS reference. */
object ParserValidation {
  data class Issue(val code: String, val message: String)
  class Failure(val errors: List<Issue>) : IllegalArgumentException(errors.joinToString("\n") { "${it.code}: ${it.message}" })
  private class Check {
    val errors = mutableListOf<Issue>()
    fun add(code: String, path: String, reason: String) { errors.add(Issue(code, "$path: $reason")) }
    fun keys(o: JSONObject, allowed: Set<String>, path: String) {
      o.keys().forEach { if (it !in allowed) add("UNKNOWN_FIELD", path, "unknown field '$it'") }
    }
    fun pattern(value: Any?, path: String, group: String? = null) {
      PortableRegexValidation.codes(value, group).forEach { original ->
        val code = if (original == "MISSING_GROUP" && group == "amount" && path.startsWith("rules[")) "MISSING_AMOUNT_GROUP" else original
        add(code, path, when (code) {
          "MISSING_GROUP", "MISSING_AMOUNT_GROUP" -> "requires named group (?<$group>…)"
          "REGEX_EMPTY" -> "must be non-empty text"
          "REGEX_TOO_LONG" -> "regex exceeds 4,000 characters"
          "REGEX_INVALID" -> "invalid regex; check brackets, groups and escapes"
          else -> "regex is not portable or has unsafe repetition; simplify it"
        })
      }
    }
    fun apps(value: Any?, path: String) {
      val a = value as? JSONArray ?: return add("BAD_APP_LIST", path, "must be a list of app names")
      val seen = mutableSetOf<String>()
      for (i in 0 until a.length()) {
        val s = a.opt(i)
        if (!text(s)) add("BAD_APP_LIST_ENTRY", "$path[$i]", "must be non-empty text")
        else if (!seen.add(s as String)) add("DUPLICATE_APP", path, "duplicate app '$s'")
      }
    }
    fun extraction(value: Any?, path: String, group: String) {
      if (value is JSONObject) {
        keys(value, setOf("pattern", "source"), path)
        if (value.has("source") && value.opt("source") !in setOf("body", "title", "bodyThenTitle")) add("BAD_EXTRACTION_SOURCE", "$path.source", "use body, title or bodyThenTitle")
        pattern(value.opt("pattern"), path, group)
      } else pattern(value, path, group)
    }
    fun rule(value: Any?, i: Int) {
      val path = "rules[$i]"
      val r = value as? JSONObject ?: return add("BAD_RULE", path, "must be an object")
      keys(r, setOf("id", "priority", "match", "direction", "confidence", "extract"), path)
      if (r.opt("id") !is String || !Regex("[a-z][a-z0-9_-]*\\.[a-z0-9-]+\\.v[0-9]+").matches(r.optString("id"))) add("BAD_RULE_ID", "$path.id", "use parser.name.v1")
      if (!integer(r.opt("priority"))) add("BAD_PRIORITY", "$path.priority", "must be an integer")
      if (r.opt("direction") !in setOf("in", "out", "info")) add("BAD_DIRECTION", "$path.direction", "use in, out or info")
      if (r.has("confidence") && r.opt("confidence") !in setOf("high", "none")) add("BAD_CONFIDENCE", "$path.confidence", "use high or none")
      val match = r.optJSONObject("match")
      if (match == null || match.length() == 0) add("MATCH_REQUIRED", "$path.match", "add a title or body match")
      else {
        keys(match, setOf("title", "body"), "$path.match")
        for (field in listOf("title", "body")) if (match.has(field)) pattern(match.opt(field), "$path.match.$field")
      }
      val needsAmount = r.opt("direction") in setOf("in", "out")
      val extract = r.optJSONObject("extract")
      if (extract == null) { if (needsAmount) add("MISSING_AMOUNT", "$path.extract", "add an amount extraction pattern"); return }
      keys(extract, setOf("amount", "counterparty", "reference"), "$path.extract")
      if (needsAmount && !extract.has("amount")) add("MISSING_AMOUNT_GROUP", "$path.extract.amount", "requires named group (?<amount>…)")
      for (field in listOf("amount", "counterparty", "reference")) if (extract.has(field)) extraction(extract.opt(field), "$path.extract.$field", field)
    }
    fun parser(p: JSONObject) {
      keys(p, setOf("schemaVersion", "id", "name", "version", "author", "description", "androidPackages", "iosAppNames", "rules"), "parser")
      if (p.opt("schemaVersion") !is Number || (p.opt("schemaVersion") as Number).toDouble() != 1.0) add("BAD_SCHEMA_VERSION", "schemaVersion", "must be 1")
      if (p.opt("id") !is String || !Regex("[a-z][a-z0-9_-]*").matches(p.optString("id"))) add("BAD_ID", "id", "use a lowercase id")
      if (!text(p.opt("name"))) add("BAD_NAME", "name", "must be non-empty text")
      if (!integer(p.opt("version")) || (p.opt("version") as Number).toDouble() < 1) add("BAD_VERSION", "version", "must be a positive integer")
      for (field in listOf("author", "description")) if (p.has(field) && !text(p.opt(field))) add("BAD_OPTIONAL_TEXT", field, "must be non-empty text when included")
      for (field in listOf("androidPackages", "iosAppNames")) apps(p.opt(field), field)
      val rules = p.optJSONArray("rules")
      if (rules == null || rules.length() == 0) add("RULES_REQUIRED", "rules", "add at least one rule")
      else for (i in 0 until rules.length()) rule(rules.opt(i), i)
    }
    fun patterns(value: Any?, path: String, group: String, requireOne: Boolean = false) {
      val a = value as? JSONArray ?: return add("BAD_PATTERN_LIST", path, "must be a list")
      if (requireOne && a.length() == 0) { add("AMOUNT_PATTERNS_REQUIRED", path, "add at least one amount pattern"); return }
      for (i in 0 until a.length()) pattern(a.opt(i), "$path[$i]", group)
    }
    fun generic(g: JSONObject) {
      keys(g, setOf("amountPatterns", "debitKeywords", "creditKeywords", "referencePatterns", "counterpartyPatterns"), "generic_config")
      patterns(g.opt("amountPatterns"), "amountPatterns", "amount", true)
      for (field in listOf("debitKeywords", "creditKeywords")) {
        val a = g.optJSONArray(field)
        if (a == null) add("BAD_KEYWORD_LIST", field, "must be a list")
        else for (i in 0 until a.length()) if (!text(a.opt(i))) add("BAD_KEYWORD", "$field[$i]", "must be non-empty text")
      }
      patterns(g.opt("referencePatterns"), "referencePatterns", "reference")
      val parties = g.optJSONObject("counterpartyPatterns")
      if (parties == null) add("BAD_COUNTERPARTY_PATTERNS", "counterpartyPatterns", "add incoming and outgoing lists")
      else { keys(parties, setOf("in", "out"), "counterpartyPatterns"); for (d in listOf("in", "out")) patterns(parties.opt(d), "counterpartyPatterns.$d", "counterparty") }
    }
  }
  private fun text(value: Any?) = value is String && value.isNotEmpty()
  private fun integer(value: Any?): Boolean = value is Number && value.toDouble().isFinite() && value.toDouble() % 1 == 0.0
  private fun tooDeep(value: Any?, depth: Int = 0): Boolean {
    if (depth > 64) return true
    return when (value) {
      is JSONObject -> value.keys().asSequence().any { tooDeep(value.opt(it), depth + 1) }
      is JSONArray -> (0 until value.length()).any { tooDeep(value.opt(it), depth + 1) }
      else -> false
    }
  }
  fun validate(kind: String, value: Any?): List<Issue> {
    if (kind == "regex") return Check().apply { pattern(value, "regex") }.errors
    if (value !is JSONObject) return listOf(Issue(if (kind == "generic") "GENERIC_NOT_OBJECT" else "PARSER_NOT_OBJECT", "Expected a JSON object"))
    if (tooDeep(value)) return listOf(Issue("JSON_DEPTH_EXCEEDED", "JSON nesting exceeds 64 levels"))
    if (value.toString().length > 1_000_000) return listOf(Issue("JSON_TOO_LARGE", "JSON exceeds 1 MB"))
    return Check().apply { if (kind == "generic") generic(value) else parser(value) }.errors
  }
  fun result(kind: String, value: Any?): Map<String, Any?> {
    val errors = validate(kind, value)
    return if (errors.isEmpty()) mapOf("ok" to true, "value" to value)
      else mapOf("ok" to false, "errors" to errors.map { mapOf("code" to it.code, "message" to it.message) })
  }
  fun pattern(value: String, path: String, group: String? = null) {
    val errors = Check().apply { pattern(value, path, group) }.errors
    if (errors.isNotEmpty()) throw Failure(errors)
  }
  private fun read(raw: String, kind: String): JSONObject {
    try { StrictJson(raw).check() } catch (e: IllegalArgumentException) {
      val code = when { e.message?.contains("64 levels") == true -> "JSON_DEPTH_EXCEEDED"; e.message?.contains("1 MB") == true -> "JSON_TOO_LARGE"; else -> "VALIDATION_ERROR" }
      throw Failure(listOf(Issue(code, e.message ?: "Invalid JSON")))
    }
    val value = org.json.JSONTokener(raw).nextValue()
    val errors = validate(kind, value)
    if (errors.isNotEmpty()) throw Failure(errors)
    return value as JSONObject
  }
  fun parser(raw: String): JSONObject = read(raw, "parser")
  fun generic(raw: String): JSONObject = read(raw, "generic")
}
