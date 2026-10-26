package expo.modules.paypingcapture

import org.junit.Assert.*
import org.junit.Test

class EvaluationBudgetTest {
  @Test fun startupCompilationAndIdleTimeAreExcluded() {
    var cpu = 10000L
    val budget = EvaluationBudget({ cpu })
    cpu += 3000 // worker startup / regex compilation, before evaluation
    budget.begin(); cpu += 10; budget.finish()
    cpu += 3000 // idle / compilation between regexes
    assertFalse(budget.expired())
    budget.begin(); cpu += 10; budget.finish()
    assertFalse(budget.expired())
  }
  @Test fun perRegexAndCumulativeCaps() {
    var cpu = 0L
    val single = EvaluationBudget({ cpu })
    single.begin(); cpu += 49; assertFalse(single.expired())
    cpu++; assertTrue(single.expired())
    try { single.finish(); fail("expected regex deadline") } catch (_: RegexDeadlineExceeded) { }
    val batch = EvaluationBudget({ cpu })
    repeat(6) { batch.begin(); cpu += 40; batch.finish() }
    batch.begin(); cpu += 10; assertTrue(batch.expired())
    try { batch.finish(); fail("expected notification deadline") } catch (_: RegexDeadlineExceeded) { }
  }
}
