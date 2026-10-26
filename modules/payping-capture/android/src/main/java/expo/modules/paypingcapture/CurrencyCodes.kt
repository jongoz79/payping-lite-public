package expo.modules.paypingcapture

import java.util.Locale

object CurrencyCodes {
  private val aliases = mapOf("RM" to "MYR", "JP¥" to "JPY", "¥" to "JPY", "NZ$" to "NZD",
    "S$" to "SGD", "US$" to "USD", "A$" to "AUD", "$" to "USD", "£" to "GBP", "€" to "EUR")
  fun fromGroup(value: String?): String {
    val code = value?.uppercase(Locale.ROOT) ?: return "MYR"
    return aliases[code] ?: code.takeIf { Regex("[A-Z]{3}").matches(it) } ?: "MYR"
  }
}
