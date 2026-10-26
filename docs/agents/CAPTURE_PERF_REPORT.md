# Capture performance and native validator parity

## Status

Implementation, validator parity, host tests and emulator proof are complete. Emulator operations began only after `/tmp/payping-emulator-free` appeared. All measured capture targets passed on emulator-5554 (Android API 36, x86_64).

Branch: `feat/capture-perf`, based on `main`, with subsequent merges through `d0239b2` (including Kimi’s wizard-preview/reparse fixes). Conflicts retained the full shared validator implementation and both sets of regression tests.

## Implemented

- Kotlin and Swift schema v4: nullable `capture.parse_state`, appended after `synced_at`. Existing completed captures retain NULL. v1/v2/v3 migrations preserve capture IDs, notes, corrections and configuration.
- Android commits the selected app's capped raw notification synchronously in `onNotificationPosted`, before adding its ID to the parsing executor. Inserts remain `INSERT OR IGNORE` with the existing normalized dedupe key. Raw rows begin as info/none/needs_review/pending.
- Parsing updates the saved row with `user_edited=0` and previous-status guards. A successful parse clears parse_state; a timeout retains the unparsed raw row as needs_review/timeout. Ignored rows remain ignored. Listener startup recovers pending rows.
- Timeout retries use a persistent `setting.parse_retry:<id>` claim, atomically returning the row to pending before attempting the one retry. A crash during that retry leaves recoverable pending work; repeated failures remain visible rather than looping forever. Swift commits raw rows before parsing, recovers on opening its store, and mirrors this retry policy.
- One regex Binder call carries an entire notification parse and candidate parser/config data. The private worker stays bound and caches compiled patterns. The PID/readiness handshake occurs only when binding a worker, outside evaluation budgets.
- A worker CPU watchdog enforces about 50 ms per regex and 250 ms cumulative regex evaluation. Binding, class startup, compilation and descheduled time do not consume those budgets. A three-second wall timeout supervises broken IPC. Worker death releases the blocked Binder thread.
- Only evaluation timeouts identify an offending parser through a private diagnostic breadcrumb/result. Three consecutive failures flag that parser; successful evaluations break the streak, and transport failures do not blame unrelated parsers.
- No in-process user-regex fast path: prior device testing showed Android ICU copies CharSequence inputs, defeating that cancellation mechanism. The killable, warm worker remains the safety boundary.
- Speech is queued asynchronously. Waiting payments collapse by direction, currency and language, preserving their count and sum (for example, `5 payments received, total 63 ringgit`). Capture never waits for an utterance to finish.
- Native announcements match TS English/Malay templates and spoken amount formatting. `setting.language` resolves auto/en/ms; Android requests an offline ms-MY voice for Malay and falls back to the default offline voice. Swift's native speech preview requests ms-MY; Shortcuts owns its separate Speak Text voice setting, documented in the setup guide.
- All three engines test the same 34 entries in `parser-library/tts-fixtures.json`, including silent none/info results, sen/cents, whole/fractional MYR, foreign ISO codes, absent counterparties and negative display amounts.

## Validator follow-up

Kotlin `ParserValidation` and Swift `Validation` implement the shared contract in `parser-library/VALIDATION.md`. Structured results contain `{ok:true,value}` or `{ok:false,errors:[{code,message}]}`; the existing throwing import APIs retain readable coded errors. Validation accumulates errors in TS order.

The file now contains **99 validation cases**, including ten wizard patterns added after the queued task described 89. JVM and Swift conformance tests compare the entire ordered code list and acceptance result for every case. Every accepted regex fixture also passes through real parser JSON import/decoding. Native safety checks now distinguish bounded-inside-bounded repetition from unsafe nesting and implement the TS adjacent/group-boundary/leading-greedy/ambiguous-alternative checks. Numeric priorities retain TS number ordering; Swift decoding no longer rejects informational rules whose unused extraction is not an object.

## Host validation

- Android JVM: **437 tests passed**, including 419 shared/real parser cases (67 synthetic + 352 real), all 99 validation cases, all 34 speech cases, budget/streak tests and speech-summary checks.
- Linux Swift: **13 XCTest methods passed**, including the same parser/validation/speech fixtures, legacy/v3 migrations, close/reopen pending recovery, user-edit preservation, persistent one-time timeout retries, dedupe, Unicode/NUL storage and bounded-polynomial runtime deadline checks. Command: `~/.local/swift/bin/swift test --build-system native --package-path modules/payping-capture/ios/Engine --scratch-path /tmp/payping-swift-perf`.
- TypeScript: **923 tests / 17 suites passed**.
- `npx tsc --noEmit`, `npx expo lint`, and `git diff --check` passed.
- x86_64 debug application and isolated instrumentation APKs build successfully. Native instrumentation adds raw-row reopen/recovery, retry claims, v4 migration and three-timeout flagging assertions; the isolated on-device instrumentation passed all these assertions.

## Emulator measurements

The UI process was absent during both measured steady-state runs and restart recovery. TTS was enabled. The TNG community starter was copied to a temporary `perf-shell` parser for `com.android.shell`; the existing E2E parser and app selection remained intact.

| Proof | Delivered / saved / parsed | Mean | p95 | Max | Timeouts / worker deaths |
| --- | --- | --- | --- | --- | --- |
| `scripts/qa/simulate.sh burst 300` | **300 / 300 / 300** | 251.15 ms | **322 ms** | 425 ms | **0 / 0** |
| Fixed 5/s, 100 posts in 19.829 s | **100 / 100 / 100** | 234.71 ms | **256 ms** | 305 ms | **0 / 0** |

The burst posted 300 notifications in **13 seconds** (about 23/s). Its full command took 62.742 s because the simulator snoozes active notifications after posting. Both runs logged **zero Android `Shedding` warnings**, zero worker failures, and retained regex-worker PID **11044** throughout. A metadata-only delivery log independently counted callbacks; every delivered callback became a stored, completed row. Latency is notification `posted_at` to native parse completion; p95 uses nearest rank over all newly inserted IDs (300 and 100 samples).

**OS limiter and harness details:** Android’s default enqueue limiter sheds bursts, and even host scheduling jitter around exactly 5/s can cross it. Initial default-setting runs stored 86/300 unpaced posts and 95/100 paced posts, with three `Shedding` warning lines in each run; warning-line counts cannot be treated as exact drop counts. The initial cold unpaced run reached 1,758 ms while the worker bound. For the all-deliveries and fixed-rate proofs above, the worker was warmed and `global.max_notification_enqueue_rate` was temporarily set to 1000 to prevent Android-side throttling. It was restored to its original **unset/default** value afterward. The steady-state results above do not claim a cold-start latency bound.

The simulator also snoozed its fixed tags for 24 hours, silently suppressing repeat runs. `scripts/qa/simulate.sh` now uses a fresh prefix per run while rotating 40 tags, so repeated proofs reach Android’s listener. Runs with a stopped listener immediately after APK replacement or previously snoozed tags were discarded; a processed pilot and live worker PID were checked before the final measurements.

### Mid-burst process death

During a 60-post burst (20/s), the regex worker was temporarily paused to create real pending work. After post **21**, the capture process was SIGKILLed under the app UID:

- Capture PID **9347 → 15362**, without starting JavaScript.
- **15 committed pending IDs** were recorded before the kill; **all 15 same IDs** were parsed on automatic listener/store restart.
- Across the run, **16 callbacks were delivered, 16 rows were saved, and all 16 completed**. No pending rows remained. The remaining posts occurred while Android had no connected listener; this test proves committed-backlog recovery, not redelivery of notifications Android never delivered.
- The paused worker was resumed; no regex timeout or worker failure occurred during recovery.

### Speech and cleanup

The 300 captures produced **four completed TTS utterances**, representing **1 + 58 + 146 + 95 = 300 payments**, with no speech failures. The 5/s run started six utterances representing all 100 payments; capture completed while speech continued. This verifies queued speech collapse without dropping capture work.

Every database snapshot copied `payping.db`, `payping.db-wal` and `payping.db-shm` together and passed `PRAGMA quick_check`. Final DB: **599 captures, zero non-NULL parse states**. Original E2E app/parser configuration was preserved; temporary Shell selection/parser and helper binaries were removed, the parser revision advanced for cache invalidation, and the OS rate limit was restored. Synthetic proof rows remain. The installed APK is the tested debug v4 build.

Machine-readable measurements, including recovered pending IDs and utterance counts: [docs/qa/capture-perf-results.json](docs/qa/capture-perf-results.json). Full local logs: `/tmp/payping-perf-proof/{burst,paced,restart}.log`; native instrumentation output: `/tmp/payping-perf-instrument.log`.

## Platform limits

Apple-only Expo/AppIntents/AVFoundation integration still needs an EAS iOS build and real-device testing; Linux tests compile and execute the Swift core. No EAS build was run. Foundation regex cancellation remains cooperative. No Android raw notification can be persisted before Android delivers its listener callback; Android shedding and listener downtime must be distinguished from captured pending rows during the restart proof.
