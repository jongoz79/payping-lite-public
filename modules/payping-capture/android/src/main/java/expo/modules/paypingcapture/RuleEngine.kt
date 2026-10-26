package expo.modules.paypingcapture

import org.json.JSONObject
import java.text.Normalizer
import java.math.BigDecimal

class RuleEngine(val parsers: List<JSONObject>, val generic: JSONObject,
  private val evaluate: ((String, String, String?) -> String?)? = null,
  private val onActive: (String) -> Unit = {},
  private val onSlow: (String) -> Unit = {}) {
  private val regexes = java.util.concurrent.ConcurrentHashMap<String, Regex>()
  private fun regex(pattern: String) = regexes.getOrPut(pattern) { Regex(pattern, RegexOption.IGNORE_CASE) }
  companion object {
    fun normalize(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFKC)
      .replace("â€™", "'").replace("â€˜", "'")
      .replace("â€œ", "\"").replace("â€", "\"")
      .replace("â€“", "-").replace("â€”", "-").replace("â", "'")
      .replace(Regex("[\\s\\p{Z}\\uFEFF]+"), " ").trim()
  }
  private fun amount(value: String?): Long? = try {
    value?.replace(",", "")?.takeIf { Regex("[0-9]+(?:\\.[0-9]{0,2})?").matches(it) }
      ?.toBigDecimal()?.multiply(BigDecimal(100))?.longValueExact()?.takeIf { it <= 9007199254740991L }
  } catch (_: Exception) { null }
  private fun find(pattern: String, text: String, name: String? = null): String? {
    evaluate?.let { return it(pattern, text, name) }
    val match = regex(pattern).find(DeadlineSequence(text, System.nanoTime() + 50_000_000L)) ?: return null
    return if (name == null) match.value else try { match.groups[name]?.value } catch (_: IllegalArgumentException) { null }
  }
  private fun group(pattern: String, text: String, name: String): String? = find(pattern, text, name)?.trim()?.ifEmpty { null }
  private fun extract(extraction: Any?, title: String, body: String, name: String, clean: Boolean = false): String? {
    val pattern = when (extraction) { is String -> extraction; is JSONObject -> extraction.getString("pattern"); else -> return null }
    val source = (extraction as? JSONObject)?.optString("source")
    val values = when (source) { "title" -> listOf(title); "body" -> listOf(body); else -> listOf(body, title) }
    for (text in values) {
      if (find(pattern, text) == null) continue
      val value = find(pattern, text, name) ?: return null
      return if (clean) value.replace(Regex("[.]+$"), "").trim().ifEmpty { null } else value
    }
    return null
  }
  private val tieIn = listOf("received from", "transferred to you", "sent you", "refunded", "refund of", "credited to your", "credited into your", "diterima daripada")
  private val tieOut = listOf("paid to", "sent to", "transferred to", "payment to", "debited from", "dibayar kepada")
  /** Both keyword lists matched: the directional phrase wins (mirrors tieBreak in src/parser/engine.ts). */
  private fun tieBreak(text: String): String = when {
    tieIn.any { containsKeyword(text, it) } -> "in"
    tieOut.any { containsKeyword(text, it) } -> "out"
    text.contains("credited", true) || text.contains("dikreditkan", true) -> "in"
    text.contains("debited", true) || text.contains("didebitkan", true) -> "out"
    else -> "info"
  }
  private fun containsKeyword(text: String, keyword: String): Boolean {
    fun asciiWord(c: Char) = c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9'
    var start = text.indexOf(keyword, ignoreCase = true)
    while (start >= 0) {
      val end = start + keyword.length
      if ((start == 0 || !asciiWord(text[start - 1])) && (end == text.length || !asciiWord(text[end]))) return true
      start = text.indexOf(keyword, start + 1, ignoreCase = true)
    }
    return false
  }
  fun parse(title: String, body: String, source: String, platform: String = "android"): Map<String, Any?> {
    val cappedTitle = title.take(4000)
    val t = normalize(cappedTitle).take(4000); val b = normalize(body.take(4000 - cappedTitle.length)).take(4000 - t.length); val text = "$t $b"
    fun output(rule: String?, parser: String?, direction: String, minor: Long?, party: String?, ref: String?, confidence: String, currency: String = "MYR") =
      mapOf("ruleId" to rule, "parserId" to parser, "direction" to direction, "amountMinor" to minor,
        "currency" to currency, "counterparty" to party, "reference" to ref, "confidence" to confidence)
    val candidates = parsers.filter { parser ->
      val apps = parser.optJSONArray(if (platform == "ios") "iosAppNames" else "androidPackages")
      apps != null && (0 until apps.length()).any { apps.getString(it).equals(source, ignoreCase = platform == "ios") }
    }.flatMap { parser -> val rules = parser.getJSONArray("rules"); (0 until rules.length()).map { parser to rules.getJSONObject(it) } }
      .sortedByDescending { it.second.optDouble("priority") }
    for ((parser, rule) in candidates) {
      onActive(parser.getString("id"))
      try {
      val match = rule.getJSONObject("match")
      if (!match.keys().asSequence().all { field -> find(match.getString(field), when(field) { "title" -> t; "body" -> b; else -> text }) != null }) continue
      if (rule.getString("direction") == "info") return output(rule.getString("id"), parser.getString("id"), "info", null, null, null, rule.optString("confidence", "high"))
      val fields = rule.optJSONObject("extract") ?: JSONObject()
      fun extracted(name: String) = extract(fields.opt(name), t, b, name, clean = name != "amount")
      val direction = rule.getString("direction"); val minor = amount(extracted("amount"))
      if (direction != "info" && minor == null) continue
      return output(rule.getString("id"), parser.getString("id"), direction, minor, extracted("counterparty"), extracted("reference"), rule.optString("confidence", "high"),
        CurrencyCodes.fromGroup(extract(fields.opt("amount"), t, b, "currency")))
      } catch (_: RegexDeadlineExceeded) { onSlow(parser.getString("id")); continue }
        catch (_: StackOverflowError) { onSlow(parser.getString("id")); continue }
    }
    onActive("generic")
    try {
    val patterns = generic.getJSONArray("amountPatterns")
    val amountPatterns = (0 until patterns.length()).map { patterns.getString(it) }
    var negativeAmount = false
    val minor = amountPatterns.firstNotNullOfOrNull {
      val source = if (find(it, b, "amount") != null) b else t
      val value = amount(group(it, source, "amount"))
      if (value != null) {
        // "-RM8" / "RM -8" is a sign; "Payment - RM8" is just a separator.
        negativeAmount = Regex("^\\s*(?:-(?:RM|MYR)|(?:RM|MYR)\\s?-)", RegexOption.IGNORE_CASE)
          .containsMatchIn(find(it, source) ?: "")
      }
      value
    }
    if (minor == null || minor == 0L) return output(null, null, "info", null, null, null, "none")
    // Keyword fallback adapted from azimul-kabir/actua (GPL-3.0), via the shared TS engine.
    fun keywords(key: String): Boolean {
      val a = generic.getJSONArray(key)
      return (0 until a.length()).map { a.getString(it) }
        .any { !(key == "debitKeywords" && it == "transferred to" && text.contains("transferred to you", true)) &&
          containsKeyword(text, it) }
    }
    val credit = keywords("creditKeywords")
    var debit = keywords("debitKeywords")
    if (!credit && !debit && (t.equals("payment", true) || t.equals("transfer", true))) debit = true
    // Keywords decide; a minus sign only says "money out" when no keyword does (mirrors src/parser/engine.ts).
    val keywordDirection = when {
      credit && !debit -> "in"
      debit && !credit -> "out"
      credit && debit -> tieBreak(text)
      else -> "info"
    }.let { if (it == "info" && negativeAmount) "out" else it }
    if (keywordDirection == "info") return output(null, null, "info", null, null, null, "none")
    val direction = keywordDirection
    fun firstGroup(patterns: org.json.JSONArray?, name: String): String? = patterns?.let { a ->
      (0 until a.length()).firstNotNullOfOrNull { extract(a.getString(it), t, b, name, clean = true) }
    }
    val party = firstGroup(generic.optJSONObject("counterpartyPatterns")?.optJSONArray(keywordDirection), "counterparty")
      ?.replace(Regex("\\s+at\\s+\\d{1,2}:\\d{2}(?::\\d{2})?$", RegexOption.IGNORE_CASE), "")
      ?.replace(Regex("\\s+(?:on|at|via|ref|for|and|to)$", RegexOption.IGNORE_CASE), "")?.trim()
    val reference = firstGroup(generic.optJSONArray("referencePatterns"), "reference")
    return output(null, null, direction, minor, party, reference, "low")
    } catch (_: RegexDeadlineExceeded) { onSlow("generic") }
      catch (_: StackOverflowError) { onSlow("generic") }
    return output(null, null, "info", null, null, null, "none")
  }
}
