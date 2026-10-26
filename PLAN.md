# PayPing Lite — Plan

PayPing Lite is a from-scratch rewrite of PayPing MY. It reads payment notifications from Malaysian bank and e-wallet apps, logs them **on the device only**, and reads them aloud. It's free and GPL-3.0-or-later.

It ships as an **in-place update** of the existing Play Store app: same package `com.paypingmy.app`, same EAS project (`apau96/paypingmy`, id `201a823a-…`), so EAS reuses the existing signing keystore. The version starts at 3.0.0.

The old codebase lives at `~/dev/payping` (GitHub `jongoz79/PayPingMY`). Use it as **reference only**: its parsers and sample notifications are worth reusing, but nothing else gets copied.

Design references, cloned under `~/dev/payping-ref/`:
- `actua` (Android, GPL-3): a minimal `NotificationListenerService`, user-chosen app allow-list, keyword parser, review queue. We're GPL too, so code can be adapted with attribution.
- `actuali` (iOS, MIT): App Intents (`ParseAndQueueTransactionIntent`) run from Shortcuts automations with "Run Immediately", plus Foundation Models parsing with a regex fallback.

---

## Scope

**v1 (this plan):** capture, parse, log, TTS, review, export. All on-device.
**Not in v1:** accounts or login, any backend, forwarding to other devices, quotas, in-app purchases, analytics or crash SDKs. v1 makes **no network calls at all**.
**v2 (later, separate plan):** login and multi-device forwarding through a **self-hosted** backend (likely Docker on the bigga NAS). No AWS, Supabase or Firebase. Push delivery still has to go through FCM on Android and APNs on iOS.

---

## Platforms and capture

| | Android | iOS |
|---|---|---|
| Source | `NotificationListenerService` (Kotlin) | iOS 27 Shortcuts automation "When I receive a notification from <app>", or the **Message** trigger for banks that send SMS |
| Entry into the app | System binds the service; no foreground service needed | Our **App Intent** `LogBankNotificationIntent(appName, title, body, date)`, `openAppWhenRun = false` |
| User setup | Grant Notification Access, then pick apps | Install our shared iCloud shortcut, then create one automation per bank app with Run Immediately on |
| TTS | Android `TextToSpeech` in the service | The intent returns a spoken string, which the shortcut passes to the built-in **Speak Text** action |
| Known limits | Android 15+ hides OTP-like notifications from listeners | User setup each time; still to be checked on a real iPhone (see **Phase 0.5**) |

**Capture must never depend on JavaScript being alive.** Native code (Kotlin on Android, Swift on iOS) normalises, de-duplicates, parses, stores and speaks each notification by itself. The React Native UI only reads the database and edits it. That alone removes most of the old app's bugs: the event queues, missed notifications and duplicate TTS.

### Choosing which apps to capture (Android)
- By default nothing is captured. **The user picks apps manually from a list of the apps installed on their phone** (label + icon, searchable). There are no preset or hard-coded bank apps.
- How we list installed apps: a manifest `<queries>` entry for the `MAIN`/`LAUNCHER` intent. That makes every launchable app visible without `QUERY_ALL_PACKAGES`, which Play restricts. Don't add `QUERY_ALL_PACKAGES`.
- Every notification from a selected app is stored with its raw title and body, **even if no parser matches**. That gives the user real samples to write or test parsers against.
- On iOS the user chooses the app inside the Shortcuts automation itself, so there's no app list in our UI.

---

## Architecture

```
src/                         Expo Router UI (TypeScript)
  app/                       screens
  db/                        typed queries over expo-sqlite (no DDL here)
  parser/                    TS reference rule engine (used in tests and the "test a notification" screen)
modules/payping-capture/     local Expo module (npx create-expo-module --local)
  android/                   Kotlin: listener service, DB + migrations, rule engine, TTS, events
  ios/                       Swift: App Intent, DB + migrations, rule engine
  src/                       JS API: permission status, open settings, app list, events
parser-library/              NOT bundled in the app. Source for the future parser website.
  parsers/*.json             community/starter parsers, one per app (e.g. touchngo.json)
  fixtures/*.json            sample notifications + expected results (engine conformance tests)
  schema.json                JSON Schema for a parser file
  generic.default.json       starter config for the generic parser
```

### One database, owned by native code
- One SQLite file, `payping.db`, in WAL mode.
- **The listener and native DB access run in a separate process, `:paypingCapture`.** Codex found that Android's SQLite and expo-sqlite's bundled SQLite in the same process could leave the native connection writing to a deleted WAL file. Separate processes use normal cross-process SQLite locking. JS reaches native settings and parser operations through a non-exported ContentProvider, and gets `onCapture` through signature-protected broadcasts. UI code must not assume native singletons are shared with the JS process.
- **The native module owns the schema**: migrations in Kotlin and Swift, versioned with `PRAGMA user_version`, kept identical on both platforms.
- JS opens the same file with `expo-sqlite`. It reads freely and only ever writes to user-editable columns: `status`, `user_note`, and, when the user corrects a row in Review, `direction`, `amount_minor`, `counterparty` (which also sets `user_edited = 1`). JS never runs DDL and never inserts `capture` rows. JS **does** write `parser`, `selected_app` and `setting` rows, because those are user configuration. Native code reloads parsers when told to (`reloadParsers()`) or when it sees `setting.parsers_rev` change.

```sql
CREATE TABLE capture (
  id            TEXT PRIMARY KEY,        -- UUIDv7 (sortable, stable; forwarding id in v2)
  platform      TEXT NOT NULL,           -- 'android' | 'ios'
  source_app    TEXT NOT NULL,           -- android package, or iOS app name
  parser_id     TEXT,                    -- parser file id that matched, or NULL (generic / none)
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  posted_at     INTEGER NOT NULL,        -- ms epoch, from the notification
  captured_at   INTEGER NOT NULL,
  dedupe_key    TEXT NOT NULL UNIQUE,    -- sha256(source_app|normalised title|normalised body|posted_at minute)
  rule_id       TEXT,                    -- e.g. 'touchngo.received.v1'; NULL = generic
  direction     TEXT NOT NULL,           -- 'in' | 'out' | 'info' (info = not money, e.g. "Cash In Successful" duplicate)
  amount_minor  INTEGER,                 -- sen; NULL if no amount found
  currency      TEXT NOT NULL DEFAULT 'MYR',
  counterparty  TEXT,
  reference     TEXT,
  confidence    TEXT NOT NULL,           -- 'high' (app parser) | 'low' (generic) | 'none'
  status        TEXT NOT NULL,           -- 'logged' | 'needs_review' | 'ignored'   (user-editable)
  user_note     TEXT,                    -- user-editable
  user_edited   INTEGER NOT NULL DEFAULT 0, -- 1 once the user corrected direction/amount/counterparty
  synced_at     INTEGER,                 -- reserved for v2 forwarding; always NULL in v1
  parse_state   TEXT                     -- v4: pending | timeout; NULL once parsing completed
);
CREATE INDEX capture_posted_at ON capture(posted_at DESC);
CREATE TABLE parser (
  id            TEXT PRIMARY KEY,        -- the parser file's "id", e.g. 'touchngo'
  json          TEXT NOT NULL,           -- the full parser file, as imported or edited (validated against schema.json)
  enabled       INTEGER NOT NULL DEFAULT 1,
  source        TEXT NOT NULL,           -- 'pasted' | 'file' | 'created'
  updated_at    INTEGER NOT NULL
);
CREATE TABLE selected_app (             -- Android: apps the user picked from the installed-apps list
  package       TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  added_at      INTEGER NOT NULL
);
CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

Schema v4 adds nullable `parse_state` after `synced_at` on both platforms. Capture commits a raw row (`direction='info'`, `confidence='none'`, `status='needs_review'`, `parse_state='pending'`) before parsing. Completed parses update that row with a `user_edited=0` guard and clear `parse_state`. Android resumes pending rows when its listener starts; Swift resumes them when its store opens. Timeouts retain the raw row with `parse_state='timeout'` and get one durable retry, tracked by `setting.parse_retry:<capture-id>`. Swift pending recovery never announces old payments. Android resumes announcements for recovered pending captures, once parsing completes.

High confidence goes in as `logged`. Low or no confidence goes in as `needs_review`, and only `logged` rows count towards totals.

---

## Parsers: user-owned data, three engines

**The app hard-codes no parsers.** A fresh install has **zero app-specific parsers**. The generic parser runs with an editable starter config (`generic.default.json`, copied into `setting` on first run; "Reset to default" restores it). Users are responsible for their parsers, and we help them:
- **Get parsers:** paste JSON, open a `.json` file (document picker, or share-to-app), and later download from our parser website (the files in `parser-library/`). v1 makes no network calls, so the website is "download or copy, then import".
- **Make and fix parsers:** an in-app editor (form for the common fields plus raw JSON), "Create parser from this notification" starting from a captured row, a live test against recent captures from that app, and validation errors in plain language.
- **Share parsers:** export or share a parser as a `.json` file.
- **Re-parse:** after a parser changes, offer to re-parse past captures from that app. Rows with `user_edited = 1` are skipped.

Kotlin, Swift and TypeScript each implement the same small engine. **All three must pass `parser-library/fixtures`**; that conformance test keeps them in sync.

**Safety, because the regexes are user-supplied:**
- Reject invalid JSON or schema violations at import or save, with readable errors.
- Cap input at 4,000 characters per notification.
- Each regex evaluation has a budget of about 50 ms, plus 250 ms of evaluation per notification. Android keeps a private regex worker bound and sends a whole parse in one Binder call; its CPU watchdog excludes binding, compilation and scheduling delays. ICU does not reliably honour deadline CharSequences, so no user regex runs in the capture process. Three consecutive evaluation timeouts flag only the offending parser; IPC/startup failures retain raw data without blaming a parser. Swift uses cooperative Foundation progress cancellation and the same evaluation budgets.
- Never execute anything but regex.

```jsonc
// parser-library/parsers/touchngo.json
{
  "schemaVersion": 1,
  "id": "touchngo",
  "name": "Touch 'n Go eWallet",
  "version": 3,
  "author": "PayPing community",
  "description": "Incoming and outgoing DuitNow/TNG transfers.",
  "androidPackages": ["my.com.tngdigital.ewallet"],
  "iosAppNames": ["TNG eWallet", "Touch 'n Go eWallet"],
  "rules": [
    {
      "id": "touchngo.cashin-dup.v1",
      "priority": 200,
      "match": { "title": "Cash In Successful" },
      "direction": "info"
    },
    {
      "id": "touchngo.received.v1",
      "priority": 100,
      "match": { "title": "(You've received money!|Ka-ching! Incoming Money)" },
      "direction": "in",
      "extract": {
        "amount": "RM\\s?(?<amount>[\\d,]+\\.\\d{2})",
        "counterparty": "from (?<counterparty>.+?)(?:\\.|$)"
      }
    }
  ]
}
```

**Real fixtures (`parser-library/fixtures-real/`)**: 352 anonymised cases from the maintainer's real notification history (Maybank2u, TNG, HSBC, Google Wallet). **All three engines must pass them** with the starter parsers in `parser-library/parsers/`. Real cases override invented ones wherever they disagree.

**Currency:** a rule may extract an optional `currency` named group. The engine maps symbols and codes to ISO 4217: `RM`/`MYR`→MYR, `JP¥`/`¥`→JPY, `NZ$`→NZD, `S$`/`SGD`→SGD, `US$`/`$`→USD, `IDR`, `£`→GBP, `€`→EUR, and passes any other 3-letter code through. With no group, the currency is MYR. `amountMinor` is in minor units of that currency; JPY and IDR are treated as 2-decimal for simplicity. **Totals on Today count MYR only**; other currencies show their own sign and code in the lists. TTS speaks the code, e.g. "Paid 790 JPY to …".

**Engine behaviour**
1. **Normalise** title and body: NFKC, fix mojibake such as `â` → `'` (seen in old TNG data), collapse whitespace.
2. **Pick rules** from enabled parsers whose `androidPackages` or `iosAppNames` match the notification's app, highest `priority` first. A rule matches when every `match` regex it lists matches (case-insensitive).
3. **Take the first matching rule** and run its `extract` regexes with named groups. `amount` is required unless `direction` is `info`; if it's missing, try the next rule.
4. **Fall back to the generic parser** when no rule matches: user-editable amount regexes plus debit and credit keyword lists (actua's approach). This gives `confidence = 'low'`. With no amount it gives `confidence = 'none'`.
5. **Output:** `{ ruleId, direction, amountMinor, currency, counterparty, reference, confidence }`.

**Fixtures** (`parser-library/fixtures/<id>.json`): an array of `{ name, platform, sourceApp, title, body, expect: {...} }`. Seed them from the old repo: `lib/parsers/*.ts` (patterns and comments) and `lib/parsers/__tests__/*.test.ts`. Every rule needs at least one positive fixture, plus a negative one where relevant.

**TTS text**, built from the parse:
- `in`: "Received 12 ringgit 50 sen from Ali"
- `out`: "Paid 8 ringgit to Grab"
- `info` and `none`: silent

Announcements follow `setting.language` (`auto`, `en`, `ms`); auto resolves the device language. Shared `parser-library/tts-fixtures.json` specifies English/Malay and spoken amounts for TS, Kotlin and Swift. MYR amounts use ringgit/sen (English cents for sub-ringgit values); foreign amounts speak the ISO code. Android selects an offline ms-MY voice for Malay, falling back to the default offline voice. Queued payments collapse by direction, currency and language while capture continues.

---

## UI (v1 screens)

1. **Onboarding:** what PayPing Lite does, the privacy promise ("nothing leaves your phone"), then the platform-specific setup.
   - Android: Notification Access, then pick apps from the installed-apps list, then (optional) import parsers.
   - iOS: install the shortcut, then create the automations, with a guide and screenshots.
2. **Today / Live:** the newest captures, today's money in and out, and the listener's health ("Listening to 3 apps", or a warning if access was revoked).
3. **History:** filter by app, direction and date, plus search. Rows can be expanded to show the raw text.
4. **Review:** the `needs_review` queue. Each row can be confirmed, edited (amount, direction, counterparty) or ignored.
5. **Parsers:** list (enabled, which apps, last matched), import (paste or file), edit (form + JSON), test against captures, create from a notification, export or share, delete, and the generic-parser config editor. This is a first-class tab, not buried in settings.
6. **Settings:** apps (installed-apps picker), TTS (on/off, rate, language), CSV export, review clean-up, troubleshooting, and delete all data.

**Decisions (user, 2026-10-24), answering Agy's open questions:**
- **TTS ducks other audio.** Announcements request transient audio focus with ducking (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`, usage `ASSISTANCE_SONIFICATION`), so music or radio dips and then comes back. On by default; setting `tts_duck` lets the user turn it off.
- **Review clean-up exists and is optional.** Setting `review_autoclean_days`: off by default, options 7/30/90. When on, `needs_review` rows older than N days become `ignored`. They're never deleted.
- **Restricted-settings help is always in Troubleshooting.** The Android 13+ "Allow restricted settings" steps are permanently visible in the Troubleshooting section (Settings and the onboarding help), not only shown after a failure.

Agy designed these (`docs/agents/AGY_TASK_ux*.md`, `design/UX_SPEC.md`); Kimi built them (`docs/agents/KIMI_TASK_ui*.md`).

---

## Phases and owners

| # | Work | Owner | Status (2026-10-25) |
|---|---|---|---|
| 0 | Android env, Expo SDK 58 scaffold, identity, GPL, repo | Claude | done |
| 0.5 | iOS 27 test: does the notification trigger fire for TNG with Run Immediately, pass the full title and body, and run while locked? | User + Claude (borrowed iPhone) | **open**: needs the borrowed iPhone |
| 1a | Parser schema + TS engine + parser-library (port the old parsers as starter files) + fixtures + tests | Kimi | done (also fuzz, conformance, real fixtures) |
| 1b | `payping-capture` Android: listener, DB, Kotlin engine (passes fixtures), TTS, events, JS API | Codex | done (v2 + perf: raw-first, warm regex worker) |
| 1c | UX spec + mockups (revised: Parsers tab, installed-apps picker, new visual direction) | Agy | done (v2, brand, store, site, a11y audit) |
| 1d | Build the screens over the DB | Kimi | done (polish + a11y applied) |
| 1e | `payping-capture` iOS: Swift App Intent, DB, Swift engine; EAS iOS build; shortcut + guide. Base it on actuali: `AppIntents/ParseAndQueueTransactionIntent.swift`, `LogTransactionIntent.swift`, `ActualiShortcutsProvider.swift`, and the guide `website/src/pages/guides/sms-automation.astro` | Codex | code done, Linux-tested; **open**: first EAS build + device |
| 1f | Device QA on the emulator and a real phone with real TNG/MAE notifications | Agy + Claude | emulator done (stress, 6/6 E2E); **open**: real phone |
| 1g | Optional: one-time import of old PayPing history (AsyncStorage key `notification-storage`, still on the device after the in-place update) | Kimi | not started (optional) |
| 1h | Play release: new Notification Listener declaration text, data safety form ("no data collected"), versionCode above the old app's | User + Claude | store copy ready; **open**: user uploads + versionCode |

Claude writes a `docs/agents/*_TASK_*.md` brief for each row and reviews the result against this plan.

---

## Conventions

- Expo SDK 58. Read `AGENTS.md`: use `npx expo install`, never edit `android/` or `ios/` by hand, and put native config in the module or config plugins.
- TypeScript strict. Run `npx tsc --noEmit` and `npx expo lint` before saying a task is done.
- Native tests: JUnit for the Kotlin engine, XCTest for Swift, both against `parser-library/fixtures`.
- Local Android build: `npx expo run:android` (emulator `pixel36`). iOS only through EAS.
- No secrets in the repo. v1 has none anyway.

## Open items
- Play Console: find the highest versionCode already published, then `eas build:version:set` above it.
- The old app's Play listing says it requires an account and offers a subscription; update the listing text for v3.
- iOS bundle id `com.paypingmy.app`: check whether it's already registered on an Apple Developer account. An account is needed for EAS iOS builds ($99 a year).
