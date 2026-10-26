# CODEX TASK: capture throughput + regex-worker robustness (after iOS)

Claude's stress tests on emulator-5554 (debug build of main a9d91bf), using `scripts/qa/simulate.sh`:

- **Throughput:** at 2 notifications/s, 60 of 60 were captured, latency avg 372 ms, max 764 ms per notification. At about 5.8/s the queue backed up and latency reached 13.8 s.
- **Regex worker deaths:** the `:paypingRegex` worker was killed **9+ times** during bursts ("Regex worker exceeded its deadline or failed; rule skipped"), with only the plain starter/shell parsers loaded. In other words, legit simple regexes hit the 50 ms deadline under load. On a slow phone, real payments would be skipped or flagged slow.
- **Durability:** the queue in the single-thread executor lives only in memory. If the capture process dies with a backlog, those notifications are lost.

## Changes
1. **Persist raw first.** In `onNotificationPosted`, insert the raw row immediately (`INSERT OR IGNORE`, with the dedupe key, `confidence='none'`, `status='needs_review'`, plus a new nullable `parse_state` column = `'pending'`). Then parse and UPDATE that row (skip it if `user_edited = 1`). On service start, re-parse any rows still `pending`. That needs a migration to v4, and Swift must mirror it (coordinate with your iOS work).
2. **One Binder round-trip per notification:** send all candidate rules' regexes for one notification in a single call, not one call per regex.
3. **Deadline policy:**
   - Measure only evaluation time, not binding or cold start, with a per-notification budget (about 250 ms) as well as a per-regex cap.
   - Only flag a parser slow (`parser_slow:<id>`) after **3 consecutive** timeouts on warm workers.
   - A timeout must never silently drop the row: the raw row is already saved, so mark it `parse_state='timeout'`, leave it `needs_review`, and retry once later.
4. **Fast path:** regexes that passed the validator's nested-quantifier check and are short (< 200 chars) may run in-process, via the existing deadline `CharSequence`, as long as Android ICU honours it for those. If you can't make that safe, keep everything in the worker but keep the worker warm (bind once and hold it).
5. **TTS must not block capture:** if announcements are queued behind each other, capture still proceeds. During a burst, collapse queued announcements, e.g. "5 payments received, total RM 63.00".

## Proof
- `scripts/qa/simulate.sh burst 300` (it rotates tags to stay under Android's 50-notification cap and snoozes them afterwards) captures **every notification Android delivers**. Count the ones Android shed via `logcat | grep Shedding`.
- p95 latency < 1 s at 5/s on the emulator.
- Zero regex-worker deaths with the starter parsers.
- Kill `:paypingCapture` mid-burst (`adb shell kill <pid>`) and show that the pending rows are re-parsed on restart.
- Report the numbers.

## Also: announcement-text parity (added by Claude)
Kimi-UI added Malay announcements and spoken-style amounts to the TS preview: `src/parser/tts.ts` + `formatSpokenAmount` in `src/utils/format.ts`, on feat/ui and soon on main. The **native** announcement (Kotlin `AnnouncementText.kt`, Swift equivalent) is what users actually hear, and it must produce identical text.
- Use the app language setting (`setting.language`: `auto` | `en` | `ms`; for `auto`, use the device locale).
- Use the same Malay templates ("Diterima … daripada …", "Dibayar … kepada …") and the same spoken amount wording.
- Add a shared fixture file `parser-library/tts-fixtures.json` (`{ result, language, expected }`) that TS, Kotlin and Swift all test against.
- Pick a Malay TTS voice (`ms-MY`) when the language is Malay, falling back to the default voice.
