package expo.modules.paypingcapture

import org.junit.Assert.*
import org.junit.Test

class TimeoutHistoryTest {
  @Test fun flagsOnlyTheOffenderAfterThreeConsecutiveEvaluations() {
    val history = TimeoutHistory(); val flagged = mutableListOf<String>()
    val candidates = listOf("slow", "innocent", "generic")
    repeat(2) { history.record(candidates, "slow", flagged::add) }
    assertTrue(flagged.isEmpty())
    history.record(candidates, "slow", flagged::add)
    assertEquals(listOf("slow"), flagged)
    history.record(candidates, null, flagged::add) // successful parse or IPC/startup failure breaks the streak
    repeat(2) { history.record(candidates, "slow", flagged::add) }
    assertEquals(listOf("slow"), flagged)
    history.record(candidates, "generic", flagged::add)
    history.record(candidates, "slow", flagged::add)
    assertEquals(listOf("slow"), flagged)
  }
}
