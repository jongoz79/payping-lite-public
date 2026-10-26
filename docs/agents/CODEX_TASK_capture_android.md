# CODEX TASK: `payping-capture` native module, Android (PLAN.md row 1b)

Read `PLAN.md` (all of it) and `AGENTS.md` first. Expo SDK 58: check the versioned docs for the Expo Modules API, and don't rely on memory.

## Goal
Write a local Expo module, `modules/payping-capture`, created with `npx create-expo-module@latest --local`. On **Android** it captures notifications from user-enabled apps, parses them, stores them in SQLite and speaks them, all **without JS running**. It also exposes a small JS API.

## Design references
- Minimal listener: `~/dev/payping-ref/actua/app/src/main/java/com/azimulkabir/actua/data/importing/NotificationImport.kt`. It's GPL-3 and so are we, so you can adapt it with an attribution comment.
- What **not** to do: `~/dev/payping/modules/notification-listener/` (the old app's 2,500 lines of Java, with a foreground service, event queues, boot receiver and AWS sender). None of that is needed; the system binds a `NotificationListenerService` by itself.

## Android requirements
1. **`PayPingListenerService : NotificationListenerService`**, declared through the module's AndroidManifest with `BIND_NOTIFICATION_LISTENER_SERVICE`.
   - On `onNotificationPosted`:
     - always upsert `seen_app(package, last_seen_at)`, package name only
     - if the package is enabled (setting `enabled_packages`, a JSON array), extract the title, plus `EXTRA_BIG_TEXT` or else `EXTRA_TEXT`
     - skip notifications that are group summaries, ongoing, or our own package
     - normalise, parse, insert with `INSERT OR IGNORE` on `dedupe_key`, and speak if the row is new and TTS is on
   - Do all of this off the main thread, and keep it short.
   - Override `onListenerDisconnected` to call `requestRebind`.
2. **DB**:
   - `payping.db` in the location `expo-sqlite` uses by default, so JS can open the same file with `SQLite.openDatabaseSync('payping.db')`. Verify the path for SDK 58.
   - WAL mode. Schema exactly as in PLAN.md, applied by migrations versioned with `PRAGMA user_version`.
   - Migrations run on first open from **either** the service or the module.
   - `id` is a UUIDv7. `dedupe_key` is as defined in PLAN.md.
3. **Rule engine (Kotlin)**:
   - Loads `rules/banks/*.json` and `rules/generic.json`, bundled into the APK. Use a config plugin or Gradle copy task that reads from the repo `rules/` directory, so there's one source of truth.
   - Behaviour is identical to PLAN.md. **A JUnit test must run every `rules/fixtures/*.json` case** and pass.
   - Kimi is writing the rules and fixtures in parallel on branch `feat/rules`. Until that's merged, build against 2–3 fixtures of your own in the same format, then rebase.
4. **TTS**:
   - Android `TextToSpeech`, initialised lazily in the service.
   - Text follows PLAN.md's TTS rules.
   - Settings `tts_enabled` (default true), `tts_rate`, `tts_language` (default `en-MY`, falling back to `en`).
5. **JS API** (`modules/payping-capture/src/index.ts`), all typed:
   - `getPermissionStatus(): 'granted' | 'denied'` and `openNotificationAccessSettings()`
   - `isListenerConnected(): boolean`
   - `getPresetApps()`, from the rule files, plus `getSeenApps()`, each with label and installed flag
   - `setEnabledPackages(pkgs: string[])` and `getEnabledPackages()`
   - `setSetting(key, value)` and `getSetting(key)`
   - `parsePreview(title, body, sourceApp)`, which runs the Kotlin engine for the "Test a notification" screen
   - event `onCapture({ id })`, emitted when a row is inserted while JS is alive
   - `speakTest(text)`
6. **Manifest `<queries>`** for the preset packages only. **Do not** use `QUERY_ALL_PACKAGES`.
7. **iOS side:** create the module so it builds on iOS, with stub functions returning `'denied'` or empty values. The real iOS work is a later task.

## Proof
- Add a temporary dev screen at `src/app/dev-capture.tsx` that shows the permission status, a toggle for the TNG package, and the last 20 rows from `capture` read with `expo-sqlite`.
- On the emulator (`pixel36`, started with `emulator -avd pixel36`), post test notifications with `adb shell cmd notification post -t "<title>" <tag> "<body>"`. Those come from package `com.android.shell`, so enable that package for the test.
- Show that rows appear and TTS speaks with the JS app **force-stopped** (`adb shell am force-stop com.paypingmy.app`), then reopen the app and confirm the rows are there.

## Out of scope
Real UI screens (Kimi), the rules content (Kimi), iOS implementation, any networking.

## Done when
- `npx expo run:android` builds.
- The JUnit fixture test passes.
- The force-stop proof above works.
- `npx tsc --noEmit` and `npx expo lint` are clean.
- Commit on branch `feat/capture-android`, and push.
- Report what you built, how you ran the proof (commands and output), and any Android limits you hit, such as OEM battery killers or Android 15 OTP redaction.
