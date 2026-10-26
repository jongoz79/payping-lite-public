package expo.modules.paypingcapture

/** Small RFC 8259 syntax/depth guard before org.json's more permissive object reader. */
internal class StrictJson(private val raw: String) {
  private var at = 0
  private fun invalid(): Nothing = throw IllegalArgumentException("Invalid JSON at character $at")
  private fun whitespace() { while (at < raw.length && raw[at] in " \r\n\t") at++ }
  private fun take(c: Char): Boolean { whitespace(); return if (at < raw.length && raw[at] == c) { at++; true } else false }
  private fun expect(c: Char) { if (!take(c)) invalid() }
  fun check() {
    require(raw.length <= 1_000_000) { "JSON exceeds 1 MB" }
    value(0); whitespace(); if (at != raw.length) invalid()
  }
  private fun value(depth: Int) {
    require(depth <= 64) { "JSON nesting exceeds 64 levels" }
    whitespace(); if (at >= raw.length) invalid()
    when (raw[at]) {
      '{' -> {
        at++; if (take('}')) return
        do { whitespace(); string(); expect(':'); value(depth + 1) } while (take(','))
        expect('}')
      }
      '[' -> {
        at++; if (take(']')) return
        do { value(depth + 1) } while (take(','))
        expect(']')
      }
      '"' -> string()
      't' -> literal("true")
      'f' -> literal("false")
      'n' -> literal("null")
      else -> {
        val number = NUMBER.matchAt(raw, at) ?: invalid()
        at += number.value.length
      }
    }
  }
  private fun literal(value: String) {
    if (!raw.startsWith(value, at)) invalid()
    at += value.length
  }
  private fun string() {
    if (at >= raw.length || raw[at++] != '"') invalid()
    while (at < raw.length) {
      val c = raw[at++]
      if (c == '"') return
      if (c < ' ') invalid()
      if (c == '\\') {
        if (at >= raw.length) invalid()
        when (raw[at++]) {
          '"', '\\', '/', 'b', 'f', 'n', 'r', 't' -> Unit
          'u' -> repeat(4) { if (at >= raw.length || raw[at++].digitToIntOrNull(16) == null) invalid() }
          else -> invalid()
        }
      }
    }
    invalid()
  }
  companion object { private val NUMBER = Regex("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?") }
}
