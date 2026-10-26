# Android capture v2 report

The later real-fixture/currency addition is documented in [CAPTURE_ANDROID_CURRENCY_REPORT.md](CAPTURE_ANDROID_CURRENCY_REPORT.md).

Completed `CODEX_TASK_capture_android_v2.md` on `feat/capture-android`. Merged main as requested, then merged Kimi's committed parser-library work. The parallel rules worktree was read only.

## Changes

- Native schema version 3 replaces `bank` with `parser_id`, adds `parser` and `selected_app`, removes `seen_app` / `enabled_packages`, preserves v1/v2 capture history, IDs, notes, user corrections and selected packages. Fresh installs have zero app-specific parsers and zero selections.
- App parsers load solely from enabled database rows. Cache refresh uses `parsers_rev` or `reloadParsers()`. The only bundled JSON is `assets/payping/generic.default.json`, copied to `setting.generic_config` once. `resetGenericConfig()` restores it. Malformed stored parsers/config are skipped or fall back safely, with `parser_error:<id>` diagnostics.
- MAIN/LAUNCHER discovery replaces all preset queries; no QUERY_ALL_PACKAGES. `getInstalledApps()` runs asynchronously and returns package, label and cached 96px PNG file URI. The emulator exposed 19 launchable apps. Toggling Calendar stored its real label/package; it was deselected after the test.
- Selected notifications store raw title/body, capped to 4,000 characters total, including unmatched samples. Parsing/deduplication normalize separately. A sample containing three spaces preserved them and entered `needs_review` with confidence `none`.
- Added typed selected-app APIs, `reloadParsers`, generic reset, explicit-JSON preview returning readable validation errors, and asynchronous `reparse(sourceApp?)`. Explicit JSON previews test that parser alone. Reparse counts actual changes, preserves notes/ignored status, and checks `user_edited=0` in the UPDATE, including a concurrent-status guard.
- Parser import validates strict JSON, schema fields and regex portability/compilation. JSON nesting is capped at 64 levels, parser JSON at 1 MB and each regex at 4,000 characters. Slow rules set `parser_slow:<id>`.
- TTS uses matching ASSISTANCE_SONIFICATION / SPEECH attributes and transient MAY_DUCK focus, default `tts_duck=true`. Focus releases on completion/error/loss/close. Offline voices remain mandatory. Capture/parse/store/announce lives in a reusable native CaptureProcessor; no automation entry point was added.
- The development screen now has searchable installed-app toggles, a development-only shell option, parser JSON validation/save, reparse/reset and the latest 20 rows. Parser saves use JS DML and bump the revision atomically; no JS DDL.

## Android regex finding and fix

The requested deadline-checking CharSequence wrapper worked on the JVM but the actual Android hostile-regex test exposed ICU matching that bypassed repeated charAt checks and stalled. The final implementation retains the wrapper and evaluates untrusted regexes in a non-exported `:paypingRegex` service process. A supervised Binder call has a 50 ms evaluation deadline; timeout kills only that worker, releases its IPC call and starts a replacement for subsequent parsing. No uninterruptible evaluation threads accumulate. Cold service binding has a separate three-second setup limit. There is no foreground service, JS runtime or networking in this path.

Native instrumentation now proves that a hostile regex is flagged and subsequent parsing recovers. Android platform SQLite remains in `:paypingCapture`, separate from expo-sqlite in the UI process.

## Validation

```sh
source ~/.bashrc
npx expo prebuild --platform android --no-install
npx expo run:android --device emulator-5554 --no-bundler
./android/gradlew -p android :payping-capture:testDebugUnitTest :payping-capture:connectedDebugAndroidTest :app:assembleDebug -PreactNativeArchitectures=x86_64
npx tsc --noEmit
npx expo lint
npm test -- --runInBand
```

All passed against the merged repository parser-library, without external path overrides:

- 54 shared fixtures plus 6 JSON/regex safety cases: 60 JVM tests.
- Native Android database instrumentation: 1/1 passed. Checks v1/v2 → v3, fresh empty parser/selection tables, WAL, UUIDv7, revision/cache reload, malformed config, persisted slow-regex flag and recovery, generic reset, reparse and corrected/ignored-row preservation.
- 79 TypeScript tests across 3 suites; clean typecheck and lint.
- Final Expo build/install and x86_64 Gradle assembly succeeded.
- APK ZIP inspection found only `assets/payping/generic.default.json` among parser/rule JSON assets.

## Pasted-parser force-stop proof

Pixel36 / emulator-5554, Android 16 / API 36. Notification Access was granted and shell was selected. Before import the database had no parsers; `Receipt v2` / `RM 3.21 from Before Import` stored with no amount and confidence `none`.

Entered this synthetic JSON in the dev screen's text box and pressed **Validate and save pasted parser**, rather than seeding it directly in SQLite:

```json
{"schemaVersion":1,"id":"shellproof","name":"Shell proof","version":1,"androidPackages":["com.android.shell"],"iosAppNames":[],"rules":[{"id":"shellproof.received.v1","priority":100,"match":{"title":"Receipt v2"},"direction":"in","extract":{"amount":"RM (?<amount>[0-9]+[.][0-9]{2})","counterparty":"from (?<counterparty>.+)$"}}]}
```

The screen reported `Saved Shell proof (shellproof)`. The row has `source='pasted'`, enabled=1, and `parsers_rev='1'`. Pressing Reparse changed the earlier RM 3.21 sample to `parser_id='shellproof'`, high confidence, logged.

Repeated proof on the final build, including the supervised regex worker:

```sh
adb shell 'am force-stop com.paypingmy.app; sleep 3; cmd notification post -t "Receipt v2" payping-v2-final-native "RM 43.21 from Final Native Test"; sleep 2; pidof com.paypingmy.app; pidof com.paypingmy.app:paypingCapture; pidof com.paypingmy.app:paypingRegex'
```

Output: `posting: Notification(...)`; UI PID absent; capture PID `13997`; regex PID `14018`.

Persisted while JS was absent:

```text
id            01a16edf-fd51-7559-8936-b35e97a63d16
parser_id     shellproof
rule_id       shellproof.received.v1
direction     in
amount_minor  4321
counterparty  Final Native Test
confidence    high
status        logged
```

Logcat from native capture PID 13997:

```text
01:05:37.272 PayPingTTS: Ducking focus granted
01:05:37.415 PayPingTTS: Started 9905dbbe-08a7-4c46-9846-a00e8d7208c6
01:05:41.487 PayPingTTS: Completed 9905dbbe-08a7-4c46-9846-a00e8d7208c6
01:05:41.489 PayPingTTS: Ducking focus released
```

Reopened the dev screen to confirm persisted rows through expo-sqlite. Database inspection copied **payping.db, payping.db-wal and payping.db-shm together**, not the main file alone. Inspected snapshots reported user_version=3 and journal_mode=wal.

## Limits and skipped work

The listener rebind delay still exists; proof waits three seconds after force-stop. OEM behavior, OTP redaction and real-device banking QA remain untested. Audio-focus grant/release and TTS engine completion were verified; actual music-volume attenuation and audible emulator output were not independently measured. Android 15+ can deny background focus outside its permitted conditions ([Android audio-focus documentation](https://developer.android.com/media/optimize/audio-focus)); denied focus preserves announcements without ducking.

The extra private regex process is intentional for Android timeout enforcement and adds cold-start/memory overhead. No production UI, real iOS implementation/build, automation receiver, networking or community parser authoring was added. Later corpus/parser-authoring briefs are separate work; conformance here uses the specified parser-library/fixtures directory.
