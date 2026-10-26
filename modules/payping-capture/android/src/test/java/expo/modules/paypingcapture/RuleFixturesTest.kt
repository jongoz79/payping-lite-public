package expo.modules.paypingcapture

import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import org.json.JSONObject
import org.json.JSONArray
import java.io.File

@RunWith(Parameterized::class)
class RuleFixturesTest(private val name: String, private val fixture: JSONObject) {
  @Test fun matchesSharedExpectation() {
    val actual = engine.parse(fixture.getString("title"), fixture.getString("body"),
      fixture.getString("sourceApp"), fixture.getString("platform"))
    val expected = JSONObject(fixture.getJSONObject("expect").toString()).apply { if (!has("currency")) put("currency", "MYR") }
    expected.keys().forEach { key ->
      val e = expected.get(key).let { if (it == JSONObject.NULL) null else it }
      val a = actual[key]
      if (e is Number) assertEquals("$name $key", e.toLong(), (a as? Number)?.toLong())
      else assertEquals("$name $key", e, a)
    }
  }
  companion object {
    private val root = File(requireNotNull(System.getProperty("payping.rules")))
    private val engine = RuleEngine(File(root, "parsers").listFiles()!!.filter { it.extension == "json" }
      .sortedBy { it.name }.map { ParserValidation.parser(it.readText()) }, JSONObject(File(root, "generic.default.json").readText()))
    @JvmStatic @Parameterized.Parameters(name = "{0}") fun fixtures(): List<Array<Any>> {
      val cases = listOf("fixtures", "fixtures-real").flatMap { directory ->
        val files = requireNotNull(File(root, directory).listFiles()) { "Missing $directory in $root" }.filter { it.extension == "json" }.sortedBy { it.name }
        require(files.isNotEmpty()) { "No cases in $directory" }
        files.flatMap { file -> val a = JSONArray(file.readText()); (0 until a.length()).map { i ->
          val f = a.getJSONObject(i); arrayOf<Any>("$directory/${file.name}: ${f.getString("name")}", f)
        } }
      }
      require(cases.isNotEmpty()) { "No shared fixtures found" }
      println("Running ${cases.size} shared fixtures from ${root.absolutePath}")
      return cases
    }
  }
}
