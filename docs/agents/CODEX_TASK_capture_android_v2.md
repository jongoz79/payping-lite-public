# CODEX TASK v2: changes to `payping-capture` Android (revises CODEX_TASK_capture_android.md)

The product direction changed. In your worktree run `git merge main`, then re-read `PLAN.md` § **Choosing which apps to capture**, § **Parsers: user-owned data** and the schema (new `parser` and `selected_app` tables, and `parser_id` replacing `bank`). Kimi is moving `rules/` to `parser-library/` and renaming `bank`/`label` to `id`/`name` in parser files; see `KIMI_TASK_rules_v2.md`.

## Changes
1. **No bundled parsers.** Remove the Gradle/config-plugin step that copies `rules/` into the APK. The one exception is `parser-library/generic.default.json`: bundle it as the **starter generic config**, copy it into `setting` key `generic_config` on first run, and add a `resetGenericConfig()` function.
2. **Parsers come from the DB.**
   - The engine loads the enabled rows from the `parser` table (`json` column) plus `setting.generic_config`.
   - Cache them in memory, and reload on `reloadParsers()` or when `setting.parsers_rev` changes. JS bumps that value after any parser edit.
   - Malformed stored JSON → skip that parser and log it; never crash the listener.
3. **User regexes need guarding.**
   - Cap the input at 4,000 characters.
   - Give each regex evaluation about a 50 ms budget. Evaluate against a `CharSequence` wrapper that checks a deadline in `charAt()`, a common Java pattern for regex timeouts.
   - If the budget runs out, count it as no match and record `parser_slow:<id>` in `setting` so the UI can flag it.
4. **Picking apps:**
   - Add `<queries><intent><action MAIN/><category LAUNCHER/></intent></queries>` to the manifest. Remove the preset-package `<queries>` and do **not** add `QUERY_ALL_PACKAGES`.
   - Add `getInstalledApps(): { package, label, iconUri }[]`. Icons should be a cached PNG `file://` URI or base64, whichever performs better for a list of 200 apps.
   - Add `setSelectedApps` / `getSelectedApps` backed by the `selected_app` table. Remove `getPresetApps`, `getSeenApps`, the `seen_app` table and `enabled_packages`.
5. **Store every notification from a selected app**, even when nothing matches (`parser_id` NULL, `confidence 'none'`, `status 'needs_review'`). Users need those raw samples to write parsers.
6. **New JS API:**
   - `parsePreview(title, body, sourceApp, parserJson?)`: if `parserJson` is given, test with **only** that parser (for the editor's live test). Return the validation error if it doesn't compile.
   - `reparse(sourceApp?)`: re-runs the parsers over stored captures and skips `user_edited = 1` rows. It returns the number of rows changed.
7. **Kotlin conformance test:** load parsers from `parser-library/parsers` and fixtures from `parser-library/fixtures`. Until Kimi's rename lands, read them from `/home/afo/dev/payping-lite-wt/rules/parser-library`, and keep the path configurable as you do now.
8. **TTS ducking** (decided by the user):
   - Before speaking, request transient audio focus with `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`, using `AudioAttributes` usage `USAGE_ASSISTANCE_SONIFICATION` (pass the same attributes to `TextToSpeech.setAudioAttributes`).
   - Abandon focus in `UtteranceProgressListener.onDone` / `onError`.
   - Setting `tts_duck`, default true.
9. **Dev screen:** update `dev-capture.tsx` with an installed-apps toggle list, a "paste parser JSON" box that inserts into `parser`, and the last 20 captures.

## Inspiration (read before changing code)
- **Installed-apps list:** actua does exactly what's described above. See the manifest `<queries>` block in `~/dev/payping-ref/actua/app/src/main/AndroidManifest.xml` (lines ~15–20) and `ImportTransactionsScreen.kt:203` (`queryIntentActivities(ACTION_MAIN + CATEGORY_LAUNCHER)` → package + label, then distinct and sorted).
- **Listener:** `FinancialNotificationListenerService` and `shouldCaptureNotification()` in `~/dev/payping-ref/actua/app/src/main/java/com/azimulkabir/actua/data/importing/NotificationImport.kt`. Note its guards: skip our own package, allow-list only, and title + text joined.
- **Capture notifications and review flow:** `~/dev/payping-ref/actua/app/src/main/java/com/azimulkabir/actua/data/notifications/CapturedTransactionNotifications.kt`
- **Automation entry point (an Android equivalent of an App Intent):** `AutomationIntentReceiver.kt` and `TaskerPlugin.kt` in the same `importing/` folder. Don't build this now, but structure the capture code so a second entry point ("log this text") can call the same parse → store → speak path. The iOS App Intent will use the same path later.

All of actua is GPL-3, like us, so code can be adapted with an attribution comment.

**Done when:** everything from the original brief's "done when" list still holds, using DB-loaded parsers, and the force-stop test passes with a parser **pasted in through the dev screen** (not bundled). Commit and push `feat/capture-android`, and reply with the report.
