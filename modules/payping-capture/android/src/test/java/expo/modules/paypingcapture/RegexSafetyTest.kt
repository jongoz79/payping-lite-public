package expo.modules.paypingcapture

import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
import org.json.JSONArray
import java.io.File

class RegexSafetyTest {
  @Test fun wizardRuleMatchesItsSourceNotification() {
    val body = "You received RM 7.25 from E2E Customer"
    val amount = "[\\d,]+(?:\\.\\d{1,2})?"
    val parser = JSONObject().put("schemaVersion", 1).put("id", "com-paypingmy-e2e-notifier")
      .put("name", "E2E Notifier").put("version", 1)
      .put("androidPackages", JSONArray().put("com.paypingmy.e2e.notifier")).put("iosAppNames", JSONArray())
      .put("rules", JSONArray().put(JSONObject().put("id", "com-paypingmy-e2e-notifier.in.v1").put("priority", 100)
        .put("match", JSONObject().put("body", "You received RM (?:$amount) from (?:[^,;]+?)$"))
        .put("direction", "in").put("extract", JSONObject()
          .put("amount", "You received RM (?<amount>$amount) from (?:[^,;]+?)$")
          .put("counterparty", "You received RM (?:$amount) from (?<counterparty>[^,;]+?)$"))))
    val generic = JSONObject().put("amountPatterns", JSONArray()).put("debitKeywords", JSONArray())
      .put("creditKeywords", JSONArray()).put("counterpartyPatterns", JSONObject().put("in", JSONArray()).put("out", JSONArray()))
      .put("referencePatterns", JSONArray())
    val actual = RuleEngine(listOf(ParserValidation.parser(parser.toString())), generic)
      .parse("E2E Wizard", body, "com.paypingmy.e2e.notifier")
    assertEquals("com-paypingmy-e2e-notifier.in.v1", actual["ruleId"])
    assertEquals(725L, actual["amountMinor"])
    assertEquals("E2E Customer", actual["counterparty"])
  }

  private fun parser(match: String = "Receipt") = JSONObject("""{
    "schemaVersion":1,"id":"test","name":"Test","version":1,
    "androidPackages":["test.app"],"iosAppNames":[],
    "rules":[{"id":"test.received.v1","priority":1,"match":{"title":"Receipt"},"direction":"in",
      "extract":{"amount":"RM (?<amount>[0-9]+)"}}] }""").apply {
        getJSONArray("rules").getJSONObject(0).getJSONObject("match").put("body", match)
      }
  private fun generic() = ParserValidation.generic(File(System.getProperty("payping.rules"), "generic.default.json").readText())
  @Test fun invalidAndNonPortableRegexesHaveReadableErrors() {
    for (bad in listOf("[", "(?<=x)y", "(?i)x", "(?>x)", "a++", "\\Qx\\E", "\\p{L}")) {
      try { ParserValidation.parser(parser(bad).toString()); fail("Accepted $bad") }
      catch (e: IllegalArgumentException) { assertTrue(e.message!!.contains("rules[0].match.body")) }
    }
  }
  @Test fun rejectsNonStandardAndDeepJson() {
    for (raw in listOf("{'id':'x'}", "{id:1}", "{\"id\":1,}", "{\"id\":NaN}", "[".repeat(1000) + "0" + "]".repeat(1000))) {
      try { StrictJson(raw).check(); fail("Accepted invalid/deep JSON") }
      catch (_: IllegalArgumentException) { }
    }
    StrictJson(parser().toString()).check()
  }
  @Test fun rejectsSharedInvalidFiles() {
    val files = File(System.getProperty("payping.rules"), "invalid").listFiles()!!.filter { it.extension == "json" }
    assertTrue(files.isNotEmpty())
    files.forEach { file ->
      try {
        if (file.name.contains("generic")) ParserValidation.generic(file.readText()) else ParserValidation.parser(file.readText())
        fail("Accepted ${file.name}")
      } catch (e: IllegalArgumentException) { assertTrue(e.message!!.isNotEmpty()) }
    }
  }
  @Test fun expiredDeadlineIsCheckedByCharAtAndSubsequence() {
    val s = DeadlineSequence("hello", System.nanoTime() - 1)
    try { s[0]; fail("No deadline check") } catch (_: RegexDeadlineExceeded) { }
    try { s.subSequence(0, 1); fail("No deadline check") } catch (_: RegexDeadlineExceeded) { }
  }
  @Test fun hostilePatternStopsAndFlagsItsParser() {
    val p = ParserValidation.parser(parser("^a{0,3900}a{0,3900}a{0,3900}b$").toString())
    val flagged = mutableListOf<String>()
    val engine = RuleEngine(listOf(p), generic()) { flagged.add(it) }
    val start = System.nanoTime()
    val result = engine.parse("Receipt", "a".repeat(3900) + "!", "test.app")
    assertEquals("none", result["confidence"])
    assertEquals(listOf("test"), flagged)
    assertTrue("Evaluation did not stop promptly", (System.nanoTime() - start) / 1_000_000 < 1500)
  }
  @Test fun contentBeyondInputCapCannotMatch() {
    val engine = RuleEngine(listOf(ParserValidation.parser(parser("RM").toString())), generic())
    val result = engine.parse("Receipt", "a".repeat(4000) + " RM 99", "test.app")
    assertNull(result["amountMinor"])
  }
}
