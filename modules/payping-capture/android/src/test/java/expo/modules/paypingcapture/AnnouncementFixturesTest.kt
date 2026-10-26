package expo.modules.paypingcapture

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.Locale

class AnnouncementFixturesTest {
  @Test fun sharedAnnouncements() {
    val fixtures = JSONArray(File(System.getProperty("payping.rules"), "tts-fixtures.json").readText())
    for (i in 0 until fixtures.length()) {
      val f = fixtures.getJSONObject(i); val r = f.getJSONObject("result")
      val parsed = r.keys().asSequence().associateWith { key ->
        if (r.isNull(key)) null else if (key == "amountMinor") r.getLong(key) else r.get(key)
      }
      val expected = if (f.isNull("expected")) null else f.getString("expected")
      val app = if (f.has("app")) f.getString("app") else null
      val template = if (f.has("template")) f.getString("template") else null
      assertEquals("fixture $i", expected, AnnouncementText.fromParsed(parsed + ("appName" to app), f.getString("language"), template, template))
    }
  }
  @Test fun burstSummariesPreserveCountsCurrencyAndLanguage() {
    val received = mapOf<String, Any?>("amountMinor" to 6300L, "currency" to "MYR", "direction" to "in", "confidence" to "high")
    assertEquals("Plus 63 ringgit, 5 payments", AnnouncementText.batch(5, received, "en"))
    assertEquals("Tambah 63 ringgit, 5 bayaran", AnnouncementText.batch(5, received, "ms"))
    assertEquals("Minus 63 USD, 5 payments", AnnouncementText.batch(5, received + mapOf("currency" to "USD", "direction" to "out"), "en"))
    assertNull(AnnouncementText.batch(5, received + ("confidence" to "none"), "en"))
  }
  @Test fun languageResolution() {
    assertEquals("ms", AnnouncementText.language("auto", Locale.forLanguageTag("ms-MY")))
    assertEquals("en", AnnouncementText.language("en", Locale.forLanguageTag("ms-MY")))
    assertEquals("ms", AnnouncementText.language("ms", Locale.US))
    assertEquals("en", AnnouncementText.language("auto", Locale.JAPAN))
  }
}
