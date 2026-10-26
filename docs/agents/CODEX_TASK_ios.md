# CODEX TASK: `payping-capture` iOS (PLAN.md row 1e)

Do this **after** `CODEX_TASK_capture_android_v2.md` is committed. Stay on `feat/capture-android` in your worktree, or branch `feat/capture-ios` from it.

## Constraints
- There's **no Mac** here. iOS builds happen on EAS (cloud) later, once the user logs in.
- A Linux Swift 6.4.1 toolchain is installed. **Use the wrappers in `~/.local/swift/bin/`** (`swift`, `swift-build`, `swift-test`); they set `LD_LIBRARY_PATH` for the compat libs Arch lacks. **Always pass `--build-system native`** (e.g. `~/.local/swift/bin/swift test --build-system native`), because the default swiftbuild backend fails at the archive step on this machine. Verified: Foundation `NSRegularExpression` with named groups works. Use it to compile and **test the pure-Swift parts on Linux**.
- Anything that imports UIKit, AppIntents or AVFoundation can't be compiled here. Keep those files thin, and check them carefully by reading against Apple's docs.

## Design
Base it on actuali, which is MIT, so code can be adapted with attribution:
- `~/dev/payping-ref/actuali/Actuali/Actuali/AppIntents/ParseAndQueueTransactionIntent.swift` (text in → parse → queue, with `openAppWhenRun = false`)
- `LogTransactionIntent.swift` (parameters, dialog result)
- `ActualiShortcutsProvider.swift` (an `AppShortcutsProvider`, so the action shows up in Shortcuts without setup)
- the guide `~/dev/payping-ref/actuali/website/src/pages/guides/sms-automation.astro`

## Deliverables
1. **`modules/payping-capture/ios/Engine/`**, a SwiftPM package (`PayPingEngine`) with **Foundation only**:
   - The rule engine: `NSRegularExpression` with named groups, NFKC normalisation, the same mojibake fix, the 4,000-character cap, and a time budget. `NSRegularExpression` has no timeout, so check the deadline between rule evaluations, and reject patterns known to be catastrophic at validation time (nested quantifiers such as `(a+)+`).
   - Parser and generic-config decoding.
   - TTS text.
   - The DB layer with migrations identical to the Kotlin `PRAGMA user_version` set. Use the system `SQLite3` module. On Linux, link `sqlite3` through a system-library target or use a small `#if canImport(SQLite3)` shim.
   - `Tests/`: a **conformance test that runs every case in `parser-library/fixtures` against `parser-library/parsers`**, plus migration tests on a temp DB. It must pass with `swift test` on Linux.
2. **`modules/payping-capture/ios/`**, the Expo module side:
   - **`LogBankNotificationIntent: AppIntent`**
     - Parameters: `appName` (String), `title` (String), `body` (String), and `date` (Date, defaulting to now). `openAppWhenRun = false`.
     - It normalises, parses, stores with `INSERT OR IGNORE`, and returns a dialog/string result with the TTS text, so the shortcut can pipe it into **Speak Text**. For `info` or `none` it returns an empty string.
   - A **`PayPingShortcutsProvider`** listing that intent with phrases.
   - The DB lives in the app group container if one exists, otherwise in the app's Documents folder. It must be the same file expo-sqlite opens. Check the SDK 58 expo-sqlite iOS default path and match it.
   - The JS API matches the Android one where it makes sense:
     - `getPermissionStatus` returns `'granted'`, since iOS has no listener permission.
     - `getInstalledApps` returns `[]`; iOS can't list apps.
     - parsers, settings, `parsePreview`, `reparse` and `reloadParsers` work the same as on Android.
3. **Config:**
   - `app.json` `ios` section: `bundleIdentifier` `com.paypingmy.app` (already set) and `deploymentTarget` 18.0. App Intents work from 16, and the notification trigger needs 27 on the user side.
   - Any entitlements or Info.plist keys, via the module's config plugin.
   - **No** background modes. App Intents run without them.
4. **`docs/ios-shortcut-setup.md`:** the step-by-step user guide for "When I receive a notification from <App>" → Log Bank Notification → Speak Text, with Run Immediately on. Also cover the SMS **Message** trigger as an alternative. Mark the screenshots TODO, since we'll make them on a real iPhone.
5. **`eas.json`:** check that the `preview` and `production` profiles work for iOS (`"ios": { "simulator": false }` where needed). Don't run `eas build`; that needs the user's login.

## Done when
- `swift test` passes on Linux for `PayPingEngine`, using all fixtures.
- The Android build still passes, with no regressions.
- `npx tsc --noEmit` and `npx expo lint` are clean.
- Commit and push.
- Report: what was compiled and tested on Linux vs only written (unverified until EAS), and every assumption about iOS paths and APIs that needs checking on the first EAS build.
