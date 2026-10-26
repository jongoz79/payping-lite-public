# Android capture report

Historical first-brief report. See [CAPTURE_ANDROID_V2_REPORT.md](CAPTURE_ANDROID_V2_REPORT.md) for the current module and v2 verification.

Implemented the local Expo SDK 58 `payping-capture` module, generated with `npx create-expo-module@latest --local`. Includes the system-bound listener, off-main capture worker, shared-data Kotlin parser, WAL SQLite migrations, UUIDv7/deduplication, package-only seen-app retention, offline TTS, typed JS API and live capture events. iOS and web expose inert stubs. The temporary Capture Dev tab displays permissions, TNG/shell toggles and the latest 20 rows through expo-sqlite.

Native SQLite and the listener run in the private `:paypingCapture` process; JS reaches native settings/parser operations through a non-exported provider and receives signature-protected capture broadcasts. Emulator testing found that Android SQLite and expo-sqlite's independent SQLite library in one process could leave native connections writing to deleted WAL files after the JS reader closed. Process isolation fixes that observed failure and allows normal cross-process SQLite locking. There is no foreground service, boot receiver, durable JS event queue or network code.

Schema version 2 includes `user_edited INTEGER NOT NULL DEFAULT 0` after `user_note` on fresh databases. Migration from version 1 adds the flag while preserving rows (SQLite appends an ALTER-added column physically). Native capture only uses INSERT OR IGNORE; it never replaces or updates existing captures, including corrected rows.

Rules are loaded directly from Kimi's worktree during validation, with no edits there. Gradle bundles the selected banks/generic data, JUnit enumerates every fixture, and the config plugin derives the six preset package queries. Rebased onto Kimi's committed rules branch; the initial three synthetic smoke fixtures were removed after integration. No QUERY_ALL_PACKAGES permission.

## Build and checks

```sh
source ~/.bashrc
PAYPING_RULES_DIR=/home/afo/dev/payping-lite-wt/rules/rules npx expo prebuild --platform android --no-install
ORG_GRADLE_PROJECT_paypingRulesDir=/home/afo/dev/payping-lite-wt/rules/rules npx expo run:android --device emulator-5554 --no-bundler
./android/gradlew -p android :payping-capture:testDebugUnitTest \
  -PpaypingRulesDir=/home/afo/dev/payping-lite-wt/rules/rules -PreactNativeArchitectures=x86_64
npx tsc --noEmit
npx expo lint
```

Expo builds succeeded using x86_64. The shared JUnit suite passed all 54 fixtures. Typecheck and lint passed. After rebasing, both TS suites also passed (66 tests), and the final native run against repository rules passed 54 fixtures plus the database instrumentation case (1/1, 0 failed). Native database instrumentation also passed against real emulator SQLite:

```text
PASS: v1->v2 migration preserves rows; fresh schema; WAL; UUIDv7; corrected-row dedupe; last 50 seen apps
```

Run with `./android/gradlew -p android :payping-capture:connectedDebugAndroidTest -PpaypingRulesDir=/home/afo/dev/payping-lite-wt/rules/rules -PreactNativeArchitectures=x86_64`. It uses isolated temporary databases, not the app's captured data.

## Emulator proof

Emulator: pixel36 / emulator-5554, Android 16 / API 36. Started Metro with `npx expo start --host lan --port 8081`; `--localhost` bound only IPv6 on this host. Granted notification access for the test:

```sh
adb shell cmd notification allow_listener com.paypingmy.app/expo.modules.paypingcapture.PayPingListenerService
adb shell am start -a android.intent.action.VIEW -d paypinglite://dev-capture com.paypingmy.app
```

Enabled `com.android.shell` through the screen. Posted this notification twice in the same minute:

```sh
adb shell 'cmd notification post -t "Money received" payping-live "Received RM 12.50 from Ali."'
```

Both commands returned `posting: Notification(...)`. One persisted row: UUID `01a16e98-4f1f-7e88-89e5-d53c801988e8`, direction `in`, amount_minor `1250`, counterparty `Ali`, confidence `low`, status `needs_review`. One TTS utterance completed. DB inspection confirmed `user_version=2`, `journal_mode=wal`, and a package/timestamp-only seen_app row.

Exact force-stop proof, allowing Android three seconds to reconnect its listener:

```sh
adb shell 'am force-stop com.paypingmy.app; sleep 3; cmd notification post -t "Money received" payping-stopped-bound "Received RM 23.45 from Force Stop Test."; pidof com.paypingmy.app; pidof com.paypingmy.app:paypingCapture'
```

Output: `posting: Notification(...)`; UI PID absent; capture PID `10241`.

Persisted without reopening JS: UUID `01a16e9a-c393-7782-8edd-5f178b9f24f7`, direction `in`, amount_minor `2345`, counterparty `Force Stop Test`, confidence `low`, status `needs_review`. Logcat from PID 10241:

```text
23:49:59.403 PayPingTTS: Started 19d9dc7c-f5b8-4ff9-937f-8b579580b806
23:50:03.454 PayPingTTS: Completed 19d9dc7c-f5b8-4ff9-937f-8b579580b806
```

Speech completion is engine-reported evidence; no claim of independently listening to emulator audio. Reopened the app and verified both rows through expo-sqlite. A subsequent RM 7.89 notification from “Live Event Test” appeared automatically via onCapture, without pressing Refresh.

## Limits and skipped work

A notification posted immediately after force-stop, before the listener rebound, was missed. The successful proof waited three seconds. This does not guarantee force-stop recovery on every Android/OEM build. OEM battery policies and real bank notifications require device QA. Android 15+ may redact OTP-like notification content ([Android behavior changes](https://developer.android.com/about/versions/15/behavior-changes-all)). TTS requires an installed offline voice and stays silent when none is available. No real iOS implementation/build, real UI screens, rule authoring or networking was added. This implements the original `CODEX_TASK_capture_android.md` plus the requested `user_edited` change; the later v2 brief is separate.
