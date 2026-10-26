# PayPing Capture

Local Expo SDK 58 module. Android's system-bound listener captures, parses, deduplicates, stores and speaks without JavaScript. iOS now implements the Swift engine/store and App Intent integration; see `docs/agents/IOS_CAPTURE_REPORT.md` for Linux verification and the remaining EAS/device checks. Web exports inert stubs. No network code or foreground service.

The listener and non-exported provider run in `:paypingCapture`. All Android SQLite handles stay there; expo-sqlite runs in the UI process. This prevents independent SQLite libraries in one process from unlinking each other's live WAL files when a JS connection closes. The module uses private provider calls and signature-protected `onCapture({id})` broadcasts. Events are live hints; reload rows when the app resumes.

## Database and parsers

Native migrations own `filesDir/SQLite/payping.db`, matching SDK 58's expo-sqlite default. Schema version 3 follows PLAN.md: `parser_id`, `user_edited`, `parser`, `selected_app` and `setting`. v1/v2 upgrades preserve capture IDs, notes, corrections and selected packages; they rename legacy bank metadata, remove `seen_app` and `enabled_packages`, and import no app parsers. New installs have zero app-specific parsers and selections. Native capture inserts with IGNORE; reparse checks `user_edited=0` in the UPDATE itself and preserves ignored status and user notes.

Only `parser-library/generic.default.json` is bundled. It is copied once to `setting.generic_config`. App-specific parsers load solely from enabled `parser` rows. JS owns configuration DML: after edits, bump `setting.parsers_rev` in the same transaction, or call `reloadParsers()`. Native caches parsed config until the revision/config changes or an explicit reload. Malformed parsers are skipped with readable `parser_error:<id>` settings. Invalid generic config uses the bundled default and records `parser_error:generic`.

Notification title + body are capped to 4,000 characters total and stored as received within that limit. Parsing and dedupe normalize independently. Regex evaluation uses a 50 ms CharSequence deadline wrapper, including subsequences. Android ICU can copy that sequence, so actual Android evaluations also run in a private `:paypingRegex` service process: a supervised Binder call kills only that worker at the deadline and starts a replacement for subsequent rules. This bounds native backtracking without leaking an uninterruptible thread or blocking capture permanently. The worker is non-exported, has no foreground service or JS runtime, and cold binding has a separate three-second setup limit. Timeout/stack exhaustion skips the rule and records `parser_slow:<id>` (or `parser_slow:generic`). Strict JSON validation rejects permissive Android-only syntax and nesting beyond 64 levels. Regex validation rejects invalid/nonportable regexes, requires extraction groups, caps regex length to 4,000 and parser JSON to 1 MB.

App rules support string extractions or `{pattern, source}` objects (`body`, `title`, `bodyThenTitle`), and optional `confidence: "none"` for explicit non-transaction rules. An optional named `currency` group inside the amount regex maps symbols/codes to ISO codes; absent/unknown symbols default to MYR, while other three-letter codes pass through. JPY and IDR retain the plan's simplified two-decimal minor units. TTS uses `RM 12.50` for MYR and `790 JPY` / `12.05 USD` for other currencies. Amount and currency come from the same text match, including source-restricted extractions.

## API

Use `openCaptureDatabase()` from `src/db/capture.ts` for JS database access; it initializes native state and honors an optional iOS app-group directory.

Import the default module or named wrappers from `modules/payping-capture/src`:

- Permission status/settings and listener connection status remain synchronous.
- `getInstalledApps(): Promise<{package,label,iconUri}[]>` queries MAIN/LAUNCHER, excluding this app, with no QUERY_ALL_PACKAGES. Icons are cached 96px PNG file URIs keyed by package/update time. It runs off the JS thread.
- `getSelectedApps()` returns `{package,label,addedAt}[]`; `setSelectedApps({package,label}[])` updates the native-owned table.
- `getSetting` / `setSetting` use string values. TTS keys: `tts_enabled` (default true), `tts_rate` (default 1), `tts_language` (default en-MY then en), `tts_duck` (default true). `generic_config` is validated JSON.
- `reloadParsers()` invalidates the parser cache; `resetGenericConfig()` restores the starter config.
- `parsePreview(title,body,sourceApp,parserJson?)` returns `ParseResult | {error:string}`. Without JSON it uses enabled DB parsers and generic config; with JSON it validates/tests that parser alone, with no generic fallback or other stored parsers.
- `reparse(sourceApp?): Promise<number>` updates eligible captures and returns the number actually changed. It never speaks old rows.
- `speakTest(text)` uses offline voices. Subscribe with `capture.addListener('onCapture', handler)` and remove the subscription on cleanup.

Announcements request transient ducking focus with ASSISTANCE_SONIFICATION / SPEECH attributes, also passed to TextToSpeech. Each utterance releases focus on completion/error, close or focus loss. If Android denies focus, capture and offline speech still proceed without ducking; API 35+ restricts background focus requests. Speech is serialized so an earlier completion cannot release a later utterance's focus.

## Validation and proof screen

`src/app/dev-capture.tsx` contains a searchable installed-app toggle list, a development-only shell option, parser JSON validation/save, reparse/reset controls and the latest 20 captures. Parser saves use JS DML and bump the revision atomically; JS never runs DDL.

```sh
npx expo prebuild --platform android --no-install
npx expo run:android --device emulator-5554 --no-bundler
./android/gradlew -p android :payping-capture:testDebugUnitTest :payping-capture:connectedDebugAndroidTest -PreactNativeArchitectures=x86_64
npx tsc --noEmit
npx expo lint
```

For an external read-only parser library, add `-PpaypingRulesDir=/path/to/parser-library` (or `ORG_GRADLE_PROJECT_paypingRulesDir` when using Expo CLI). JUnit loads `parsers` and runs both `fixtures` and `fixtures-real`, comparing supplied expected fields and defaulting missing expected currency to MYR. Real fixtures do not pin rule IDs. It also checks invalid samples; those files are test inputs, not APK assets. Android instrumentation uses isolated temporary databases to check migrations, cache refresh, malformed config, reparse and corrected-row preservation.

## License

GPL-3.0-or-later under the repository LICENSE. Generated Expo template portions retain the module MIT notice. Launcher discovery and the generic keyword approach credit azimul-kabir/actua (GPL-3.0) in code. No old PayPing network/runtime code was copied.
