# iOS capture implementation report

Work is on `feat/capture-ios`, branched after merging main. Working increments were committed and pushed separately: Swift engine/conformance (`e98f4a0`), then SQLite/identity/store (`7319e8b`), followed by integration and documentation.

## Compiled and tested on Linux

`modules/payping-capture/ios/Engine` is the Foundation-only `PayPingEngine` SwiftPM package. Its only non-Foundation link is system SQLite through a small CSQLite system-library target. No package downloads or third-party parser/crypto dependencies.

```sh
~/.local/swift/bin/swift test --build-system native \
  --package-path modules/payping-capture/ios/Engine \
  --scratch-path /tmp/payping-swift-build
```

Swift 6.4.1 compiled the package in Swift 6 mode. All **7 XCTest methods passed**, including loops over **61 shared + 352 real fixtures (413 total)**. The fixture runner respects Android/iOS source matching, optional expected fields, default MYR, extraction-source objects, confidence:none and ISO currency mapping.

Other tested behavior: strict JSON/schema/portable-regex validation; nested-quantifier rejection; 4,000 UTF-16-unit input cap; cooperative regex cancellation (a hostile polynomial pattern returned in about 53 ms on Linux); ISO-code TTS; UUIDv7 and SHA-256 standard vectors; WAL; fresh schema version 3; v1/v2 migrations; legacy selection/notes/edits preservation; normalized dedupe and silent duplicates; parser revision reload; malformed parser/generic fallback; generic reset; reparse skipping corrected rows and preserving ignored status; multiple database connections; and raw Unicode/embedded-NUL round trips.

Regex evaluation uses NSRegularExpression with reportProgress cancellation and deadline checks around evaluations. This is cooperative, not a process-kill guarantee. Validation also rejects known nested repetition before execution. Slow stored rules record parser_slow:<id>.

## iOS integration written, not Apple-typechecked

- `LogBankNotificationIntent` accepts appName/title/body/date, has openAppWhenRun=false, and uses the native store off the main actor. Date is optional in Shortcuts metadata and resolves to Date() when omitted. It returns both a String result and dialog; info, none, duplicate and TTS-disabled results are empty. A shortcut speaks the returned value.
- `PayPingShortcutsProvider` supplies the discoverable action. A public AppIntentsPackage in the pod plus a generated app-target package marker includes its metadata. Structure follows actuali's MIT App Intents/Shortcuts examples, with attribution comments.
- Expo API implements granted permission status, no installed/selected-app list, working settings, preview, reload/reset, reparse, best-effort live onCapture events and AVSpeechSynthesizer speakTest.
- `getDatabaseDirectory()` plus `src/db/capture.ts` makes JS use exactly the native file. The development screen uses that helper on both platforms. Android received the same directory getter; its storage behavior is unchanged.
- The CocoaPod compiles the common engine sources directly, excludes Package.swift/tests, and copies only generic.default.json into a resource bundle. Community parsers stay out of the app. It depends on ExpoSQLite and uses its C API on Apple so JS and Swift share one SQLite implementation; Linux tests use system SQLite. This addresses the same multiple-library lock/WAL concern found during Android work.

`swiftc -frontend -parse` accepted the thin integration and generated AppDelegate syntax. That **does not resolve or typecheck AppIntents, ExpoModulesCore or AVFoundation**. No Mac, Xcode build, simulator run or EAS build was performed. Ruby/CocoaPods is not installed here, so podspec evaluation awaits EAS.

## Config and regression verification

SDK 58's installed `expo-sqlite/ios/SQLiteModule.swift:24–29` uses `appContext.config.documentDirectory/SQLite` by default; AppContextConfig falls back to FileManager's Documents directory. Native defaults to Documents/SQLite/payping.db. With a configured application group, it uses that container's SQLite/payping.db, and JS must continue using openCaptureDatabase() (plain SQLite.openDatabaseSync without its directory would point at Documents).

The config plugin sets the optional group Info.plist/entitlement together and adds the app-target AppIntentsPackage marker through withAppDelegate. No group is enabled by default and no background modes were added. Expo's SDK-compatible build-properties plugin sets deploymentTarget=18.0. `npx expo prebuild --platform ios --no-install` succeeded on Linux: generated app target settings and Podfile.properties.json specify 18.0, and the package marker/imports are present. Generated ios/ files remain ignored and were not edited manually.

`eas.json` development/preview/production profiles explicitly use ios.simulator=false, retaining fixed app identity. The user must authenticate before a later EAS build.

Android x86_64 assembly and its Kotlin conformance/safety tests still pass. TypeScript typecheck and Expo lint are clean. The setup guide is [docs/ios-shortcut-setup.md](docs/ios-shortcut-setup.md), including Run Immediately, the conditional Speak Text step, SMS alternative, limitations and screenshot TODOs.

## Check on the first EAS build and real iPhone

1. CocoaPods must expose the vendored sqlite3_* C declarations through ExpoSQLite, use the intended one SQLite implementation, and include PayPingCaptureResources.bundle with the generic starter. Validate linker behavior, the Swift 6 pod target and resource lookup on-device.
2. Typecheck the thin framework code against the selected Apple SDK: public AppIntent parameters (especially optional Date), ReturnsValue<String>/ProvidesDialog result, AppShortcut builder/phrases, AVSpeech APIs and Swift concurrency annotations.
3. Verify the app-target includedPackages marker causes Xcode to extract LogBankNotificationIntent and its shortcut metadata from the static pod. The action must appear after first launch and run without opening a React screen.
4. Compare getDatabaseDirectory() with the directory JS actually opens. No app group is currently requested. If one is enabled later, signing must authorize it and both processes must resolve the same container; unavailable declared groups fail explicitly instead of silently creating a second database. Moving existing history between Documents and a newly enabled group needs a separate file migration.
5. Verify iOS 27 actually offers the proposed notification trigger, exposes full title/body/date, supports Run Immediately and runs while locked. These Phase 0.5 assumptions remain unproven. Test the Message trigger independently on iOS 18+.
6. Confirm informational/duplicate captures stay silent, the dialog does not cause duplicate speech alongside Speak Text, native speakTest uses an installed voice, same-process events refresh a live UI, and reopening/resuming reads captures made while JS was absent. Local events are hints, not a cross-process durable queue.
7. Re-measure Foundation progress cancellation on the phone. The Linux timeout result is not a hard Apple-platform execution guarantee.

The first-release setup guide does not claim the notification trigger or lock-screen flow has been verified. Real UI screens, a share/automation extension, cloud services and EAS signing/submission are outside this implementation.
