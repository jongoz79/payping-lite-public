package expo.modules.paypingcapture

import java.util.Locale

object AnnouncementText {
  fun language(setting: String?, locale: Locale = Locale.getDefault()): String =
    if (setting == "ms" || (setting != "en" && locale.language == "ms")) "ms" else "en"
  private fun amount(minor: Long, code: String, language: String): String {
    val major = kotlin.math.abs(minor) / 100
    val cents = kotlin.math.abs(minor) % 100
    val decimal = String.format(Locale.US, "%d.%02d", major, cents)
    return if (code == "MYR") when {
      cents == 0L -> "$major ringgit"
      major == 0L -> if (language == "ms") "$cents sen" else "$cents cents"
      else -> "$major ringgit $cents sen"
    } else (if (cents == 0L) major.toString() else decimal) + " $code"
  }
  /** Mirrors spokenName in src/parser/tts.ts. */
  fun spokenName(name: String): String = name
    .replace(Regex("(^|\\s)\\d{5,}(?=\\s|$)"), "")
    .replace(Regex("[A-Za-z]+")) { m ->
      val w = m.value
      if (w.length >= 4 && w == w.uppercase(Locale.ROOT)) w[0] + w.substring(1).lowercase(Locale.ROOT) else w
    }.trim()
  private fun sign(incoming: Boolean, language: String) =
    if (language == "ms") (if (incoming) "Tambah" else "Tolak") else (if (incoming) "Plus" else "Minus")
  fun batch(count: Int, parsed: Map<String, Any?>, language: String): String? {
    val value = parsed["amountMinor"] as? Long ?: return null
    if (count < 1 || fromParsed(parsed, language) == null) return null
    val amount = amount(value, parsed["currency"] as? String ?: "MYR", language)
    val incoming = parsed["direction"] == "in"
    return "${sign(incoming, language)} $amount, $count ${if (language == "ms") "bayaran" else "payments"}"
  }
  const val DEFAULT_TEMPLATE = "{sign} {amount}[, {app}][, {payee}]"
  const val TEMPLATE_MAX = 200
  private val token = Regex("\\{(sign|amount|app|payee)\\}")
  /** Mirrors renderTtsTemplate in src/parser/tts.ts. */
  fun render(template: String, values: Map<String, String>): String {
    fun fill(text: String) = token.replace(text) { values[it.groupValues[1]] ?: "" }
    return fill(Regex("\\[([^\\[\\]]*)\\]").replace(template) { group ->
      val inner = group.groupValues[1]
      if (token.findAll(inner).all { !values[it.groupValues[1]].isNullOrEmpty() }) fill(inner) else ""
    })
      .replace(Regex("\\s+"), " ")
      .replace(Regex("\\s+([,.!?])")) { it.groupValues[1] }
      .replace(Regex(",(\\s*,)+"), ",")
      .replace(Regex("^[\\s,]+|[\\s,]+$"), "")
  }
  /** Short announcement: sign + amount, app, payee, or the user's template. Shared with TS and Swift via tts-fixtures.json. */
  fun fromParsed(parsed: Map<String, Any?>, language: String = "en", templateIn: String? = null, templateOut: String? = null): String? {
    val minor = parsed["amountMinor"] as? Long ?: return null
    if (parsed["confidence"] == "none") return null
    val incoming = when (parsed["direction"]) { "in" -> true; "out" -> false; else -> return null }
    val values = mapOf(
      "sign" to sign(incoming, language),
      "amount" to amount(minor, parsed["currency"] as? String ?: "MYR", language),
      "app" to ((parsed["appName"] as? String)?.trim() ?: ""),
      "payee" to spokenName(parsed["counterparty"] as? String ?: ""),
    )
    val custom = (if (incoming) templateIn else templateOut)?.trim()
    return custom?.takeIf { it.isNotEmpty() }?.let { render(it, values) }?.takeIf { it.isNotEmpty() } ?: render(DEFAULT_TEMPLATE, values)
  }
}
