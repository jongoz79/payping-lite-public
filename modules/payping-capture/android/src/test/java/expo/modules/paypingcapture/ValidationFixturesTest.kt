package expo.modules.paypingcapture

import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class ValidationFixturesTest {
  @Test fun regexSizeAndEscapedLiteralQuantifiers() {
    assertEquals(listOf("REGEX_TOO_LONG"), ParserValidation.validate("regex", "x".repeat(4001)).map { it.code })
    assertTrue(ParserValidation.validate("regex", "\\++").isEmpty())
    val p = org.json.JSONObject("""{"schemaVersion":1,"id":"size","name":"Size","version":1,"androidPackages":[],"iosAppNames":[],"rules":[]}""").put("description", "x".repeat(1000001))
    assertEquals(listOf("JSON_TOO_LARGE"), ParserValidation.validate("parser", p).map { it.code })
  }
  @Test fun sharedStableCodes() {
    val fixtures = JSONArray(File(System.getProperty("payping.rules"), "validation-fixtures.json").readText())
    assertTrue(fixtures.length() >= 89)
    for (i in 0 until fixtures.length()) {
      val f = fixtures.getJSONObject(i); val expected = f.getJSONObject("expect")
      val result = ParserValidation.result(f.getString("kind"), f.opt("input"))
      @Suppress("UNCHECKED_CAST") val errors = result["errors"] as? List<Map<String, String>> ?: emptyList()
      val codes = expected.getJSONArray("codes").let { a -> (0 until a.length()).map { a.getString(it) } }
      assertEquals(f.getString("name"), codes, errors.map { it["code"] })
      assertEquals(f.getString("name"), expected.getBoolean("ok"), result["ok"])
      if (expected.getBoolean("ok") && f.getString("kind") == "regex") {
        val parser = org.json.JSONObject("""{"schemaVersion":1,"id":"conformance","name":"Conformance","version":1,"androidPackages":[],"iosAppNames":[],"rules":[{"id":"conformance.info.v1","priority":1,"direction":"info","match":{}}]}""")
        parser.getJSONArray("rules").getJSONObject(0).getJSONObject("match").put("title", f.get("input"))
        assertEquals("conformance", ParserValidation.parser(parser.toString()).getString("id"))
      }
    }
  }
}
