package expo.modules.paypingcapture

/** Clock is worker CPU time: binding, compilation and time descheduled consume no budget. */
internal class EvaluationBudget(private val clock: () -> Long,
  private val regexMillis: Long = 50, private val notificationMillis: Long = 250) {
  private var spent = 0L
  private var started: Long? = null
  @Synchronized fun begin() {
    if (spent >= notificationMillis) throw RegexDeadlineExceeded()
    started = clock()
  }
  @Synchronized fun expired(): Boolean {
    val elapsed = started?.let { clock() - it } ?: 0
    return elapsed >= regexMillis || spent + elapsed >= notificationMillis
  }
  @Synchronized fun finish() {
    val elapsed = started?.let { clock() - it } ?: 0
    started = null; spent += elapsed
    if (elapsed >= regexMillis || spent >= notificationMillis) throw RegexDeadlineExceeded()
  }
}
