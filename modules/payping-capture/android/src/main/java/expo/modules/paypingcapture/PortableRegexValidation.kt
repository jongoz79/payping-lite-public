package expo.modules.paypingcapture

/** Static checks ported from src/parser/validate.ts; keep ordering aligned with VALIDATION.md. */
internal object PortableRegexValidation {
  private val brace = Regex("^\\{[0-9]+(?:,[0-9]*)?\\}")
  private val prefix = Regex("^\\?(?::|=|!|<[^>]+>)")
  private fun strip(p: String) = p.replaceFirst(prefix, "")
  private fun closing(p: String, start: Int, open: Char, close: Char): Int {
    var depth = 0; var inClass = false; var i = start
    while (i < p.length) {
      val c = p[i]
      if (c == '\\') { i += 2; continue }
      if (open == '(' && c == '[' && !inClass) { inClass = true; i++; continue }
      if (open == '(' && c == ']' && inClass) { inClass = false; i++; continue }
      if (!inClass) {
        if (c == open) depth++
        if (c == close && --depth == 0) return i + 1
      }
      i++
    }
    return p.length
  }
  private fun nested(p: String): Boolean {
    data class Group(var any: Boolean = false, var unbounded: Boolean = false)
    val groups = mutableListOf<Group>(); var closed: Group? = null; var inClass = false; var i = 0
    while (i < p.length) {
      val c = p[i]
      if (c == '\\') { i += 2; closed = null; continue }
      if (c == '[' && !inClass) { inClass = true; closed = null; i++; continue }
      if (c == ']' && inClass) { inClass = false; closed = null; i++; continue }
      if (inClass) { i++; continue }
      if (c == '(') { groups.add(Group()); closed = null; if (p.getOrNull(i+1) == '?') i += 2; i++; continue }
      if (c == ')') { closed = groups.removeLastOrNull(); i++; continue }
      val q = if (c == '{') brace.find(p.substring(i))?.value else null
      if (c in "*+?" || q != null) {
        val unbounded = c == '*' || c == '+'
        if (closed?.any == true && (closed.unbounded || unbounded)) return true
        groups.forEach { it.any = true; if (unbounded) it.unbounded = true }
        closed = null; if (q != null) i += q.length - 1
      } else closed = null
      i++
    }
    return false
  }
  private fun startsGreedy(p: String): Boolean {
    if (p.isEmpty()) return false
    val end = when (p[0]) { '\\' -> 2; '[' -> closing(p,0,'[',']'); else -> 1 }
    return p.getOrNull(end) in listOf('*','+')
  }
  private fun adjacent(p: String): String? {
    var previous = false; var whitespace = false; var i = 0
    while (i < p.length) {
      var content: String? = null; val c = p[i]
      if (c in "^$|") { previous = false; whitespace = false; i++; continue }
      val currentWhitespace = c == '\\' && p.getOrNull(i+1) == 's'
      when (c) {
        '(' -> { val end = closing(p,i,'(',')'); content = p.substring(i+1, maxOf(i+1,end-1)); i = end }
        '[' -> i = closing(p,i,'[',']')
        '\\' -> i += 2
        else -> i++
      }
      var unbounded = false
      when (p.getOrNull(i)) {
        '*','+' -> { unbounded = true; i++ }
        '?' -> i++
        '{' -> brace.find(p.substring(i))?.let { i += it.value.length }
      }
      if (p.getOrNull(i) == '?') i++
      val expression = content?.let(::strip)
      if (previous && unbounded) return "REGEX_ADJACENT_QUANTIFIER"
      if (previous && !whitespace && expression != null && startsGreedy(expression)) return "REGEX_GROUP_BOUNDARY_QUANTIFIER"
      previous = unbounded; whitespace = currentWhitespace
      expression?.let { adjacent(it)?.let { code -> return code } }
    }
    return null
  }
  private fun leading(p: String): Boolean {
    if (p.isEmpty() || p[0] == '^') return false
    var end = 1; var attack = p[0] == '.' || p[0].lowercaseChar() == 'a'
    if (p[0] == '\\') { end = 2; attack = p.getOrNull(1) == 'w' }
    else if (p[0] == '[') { end = closing(p,0,'[',']'); attack = Regex("A-Z|a-z|a|A").containsMatchIn(p.substring(1,maxOf(1,end-1))) }
    return attack && p.getOrNull(end) in listOf('*','+') && p.getOrNull(end+1) != '?' && end+1 != p.length && p.getOrNull(end+1) != '$'
  }
  private fun overlapping(content: String): Boolean {
    val p = strip(content); val branches = mutableListOf<String>(); var depth = 0; var start = 0; var inClass = false; var i = 0
    while (i < p.length) {
      val c = p[i]
      if (c == '\\') { i += 2; continue }
      if (c == '[' && !inClass) { inClass = true; i++; continue }
      if (c == ']' && inClass) { inClass = false; i++; continue }
      if (!inClass) {
        if (c == '(') depth++
        if (c == ')') depth--
        if (c == '|' && depth == 0) { branches.add(p.substring(start,i)); start = i+1 }
      }
      i++
    }
    if (branches.isEmpty()) return false
    branches.add(p.substring(start))
    val literals = branches.map { it.removePrefix("^").removeSuffix("$") }
    if (literals.any { !Regex("[A-Za-z0-9 ]+").matches(it) }) return false
    return literals.indices.any { a -> literals.indices.any { b -> a != b && literals[b].startsWith(literals[a]) } }
  }
  private fun ambiguous(p: String): Boolean {
    val groups = mutableListOf<Int>(); var inClass = false; var i = 0
    while (i < p.length) {
      val c = p[i]
      if (c == '\\') { i += 2; continue }
      if (c == '[' && !inClass) { inClass = true; i++; continue }
      if (c == ']' && inClass) { inClass = false; i++; continue }
      if (!inClass) {
        if (c == '(') groups.add(i+1)
        if (c == ')' && groups.isNotEmpty()) {
          val start = groups.removeAt(groups.lastIndex)
          if (p.getOrNull(i+1) in listOf('*','+') && overlapping(p.substring(start,i))) return true
        }
      }
      i++
    }
    return false
  }
  private fun possessive(p: String): Boolean {
    var i = 0; var inClass = false
    while (i < p.length) {
      val c = p[i]
      if (c == '\\') { i += 2; continue }
      if (c == '[' && !inClass) { inClass = true; i++; continue }
      if (c == ']' && inClass) { inClass = false; i++; continue }
      if (!inClass) {
        val q = if (c == '{') brace.find(p.substring(i))?.value else null
        if ((c in "*+?" && p.getOrNull(i+1) == '+') || (q != null && p.getOrNull(i+q.length) == '+')) return true
      }
      i++
    }
    return false
  }
  private fun compilePattern(p: String): String {
    val identity = p.replace(Regex("\\\\([pP])(?=[{<])"), "$1").replace("\\Q", "Q").replace("\\E", "E")
    val out = StringBuilder(); var i = 0; var inClass = false
    while (i < identity.length) {
      val c = identity[i]
      if (c == '\\') { out.append(c); i++; if (i < identity.length) out.append(identity[i++]); continue }
      if (c == '[') inClass = true
      if (c == ']') inClass = false
      if (!inClass && c == '{') {
        val q = brace.find(identity.substring(i))?.value
        if (q != null) { out.append(q); i += q.length; continue }
        out.append('\\')
      } else if (!inClass && c == '}') out.append('\\')
      out.append(c); i++
    }
    return out.toString()
  }
  fun codes(value: Any?, group: String? = null): List<String> {
    val p = value as? String ?: return listOf("REGEX_EMPTY")
    if (p.isEmpty()) return listOf("REGEX_EMPTY")
    if (p.length > 4000) return listOf("REGEX_TOO_LONG")
    val codes = mutableListOf<String>()
    if (group != null && !p.contains("(?<$group>")) codes.add("MISSING_GROUP")
    val inline = Regex("\\(\\?[imsuxdU-]").containsMatchIn(p)
    val atomic = p.contains("(?>")
    if (p.contains("(?<=") || p.contains("(?<!")) codes.add("REGEX_LOOKBEHIND")
    else if (inline || atomic || Regex("\\\\[kp]<|\\\\[pP]\\{").containsMatchIn(p) || p.contains("\\Q") || p.contains("\\E")) codes.add("REGEX_UNSUPPORTED_SYNTAX")
    try {
      if (nested(p)) codes.add("REGEX_NESTED_QUANTIFIER")
      adjacent(p)?.let(codes::add)
      if (leading(p)) codes.add("REGEX_LEADING_GREEDY")
      if (ambiguous(p)) codes.add("REGEX_AMBIGUOUS_ALTERNATIVES")
      // These compile in ICU/Java but not ECMAScript. Unsupported identity escapes have JS semantics here.
      var invalid = inline || atomic || possessive(p)
      val portable = compilePattern(p)
      try { Regex(portable, RegexOption.IGNORE_CASE) } catch (_: Exception) { invalid = true }
      if (invalid) codes.add("REGEX_INVALID")
    } catch (_: StackOverflowError) { codes.add("REGEX_INVALID") }
    return codes
  }
}
