package expo.modules.paypingcapture

import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject

class CurrencyTest {
  @Test fun mapsSymbolsCodesAndDefaults() {
    val cases = mapOf("RM" to "MYR", "MYR" to "MYR", "JP¥" to "JPY", "¥" to "JPY", "NZ$" to "NZD",
      "S$" to "SGD", "sgd" to "SGD", "US$" to "USD", "$" to "USD", "A$" to "AUD",
      "IDR" to "IDR", "£" to "GBP", "€" to "EUR", "hkd" to "HKD", "???" to "MYR", "" to "MYR")
    cases.forEach { (input, expected) -> assertEquals(input, expected, CurrencyCodes.fromGroup(input)) }
    assertEquals("MYR", CurrencyCodes.fromGroup(null))
  }
  private fun payment(code: String = "MYR", minor: Long = 1250L) = mapOf<String, Any?>(
    "direction" to "out", "confidence" to "high", "currency" to code, "amountMinor" to minor, "counterparty" to "Cafe")
  @Test fun speaksIsoCodeAfterNonMyrAmounts() {
    assertEquals("Minus 12 ringgit 50 sen, Cafe", AnnouncementText.fromParsed(payment()))
    assertEquals("Minus 12 ringgit, Cafe", AnnouncementText.fromParsed(payment(minor = 1200)))
    assertEquals("Minus 50 cents, Cafe", AnnouncementText.fromParsed(payment(minor = 50)))
    assertEquals("Minus 790 JPY, Cafe", AnnouncementText.fromParsed(payment("JPY", 79000)))
    assertEquals("Minus 12.05 USD, Cafe", AnnouncementText.fromParsed(payment("USD", 1205)))
    assertEquals("Minus 0 SGD, Cafe", AnnouncementText.fromParsed(payment("SGD", 0)))
    assertEquals("Plus 12.50 EUR, Cafe", AnnouncementText.fromParsed(payment("EUR") + ("direction" to "in")))
    assertNull(AnnouncementText.fromParsed(payment() + ("confidence" to "none")))
    assertNull(AnnouncementText.fromParsed(payment() + ("direction" to "info")))
  }
  @Test fun currencyUsesTheSameMatchAndSourceAsAmount() {
    val parser = ParserValidation.parser("""{
      "schemaVersion":1,"id":"currency","name":"Currency","version":1,"androidPackages":["test"],"iosAppNames":[],
      "rules":[{"id":"currency.paid.v1","priority":1,"match":{"body":"with"},"direction":"out",
        "extract":{"amount":{"pattern":"(?<currency>USD|JP¥) (?<amount>[0-9]+[.][0-9]{2})","source":"body"},
          "counterparty":{"pattern":"^(?<counterparty>.+)$","source":"title"}}}]}""")
    val generic = JSONObject().put("amountPatterns", org.json.JSONArray()).put("debitKeywords", org.json.JSONArray()).put("creditKeywords", org.json.JSONArray())
    val result = RuleEngine(listOf(parser), generic).parse("USD 99.00 Cafe", "JP¥ 790.00 with Card", "test")
    assertEquals("JPY", result["currency"])
    assertEquals(79000L, result["amountMinor"])
    assertEquals("USD 99.00 Cafe", result["counterparty"])
  }
}
