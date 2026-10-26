package expo.modules.paypingcapture

class RegexDeadlineExceeded : RuntimeException("Regex exceeded its 50 ms evaluation budget")

/** Shared deadline across subsequences; no worker thread is leaked by a hostile regex. */
class DeadlineSequence(private val value: CharSequence, private val deadline: Long) : CharSequence {
  private fun checkDeadline() { if (System.nanoTime() >= deadline) throw RegexDeadlineExceeded() }
  override val length: Int get() { checkDeadline(); return value.length }
  override fun get(index: Int): Char { checkDeadline(); return value[index] }
  override fun subSequence(startIndex: Int, endIndex: Int): CharSequence {
    checkDeadline(); return DeadlineSequence(value.subSequence(startIndex, endIndex), deadline)
  }
  override fun toString(): String { checkDeadline(); return value.toString() }
}
