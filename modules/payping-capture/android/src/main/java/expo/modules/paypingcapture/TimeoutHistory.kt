package expo.modules.paypingcapture

/** Only warm evaluation failures count; startup/transport failures have no offender. */
internal class TimeoutHistory {
  private val streaks = mutableMapOf<String, Int>()
  fun record(candidates: List<String>, offender: String?, flag: (String) -> Unit) {
    candidates.filter { it != offender }.forEach { streaks.remove(it) }
    if (offender in candidates) {
      val id = requireNotNull(offender)
      val count = (streaks[id] ?: 0) + 1; streaks[id] = count
      if (count >= 3) flag(id)
    }
  }
}
