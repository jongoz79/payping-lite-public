# KIMI TASK: build the v1 screens (PLAN.md row 1d)

## Setup
Claude will create a worktree for you at `/home/afo/dev/payping-lite-wt/ui` on branch `feat/ui`. It's branched from `main` and has your rules v2, Codex's capture module and Agy's design merged in. Work only there. Read, in this order:
1. `AGENTS.md`
2. `PLAN.md`, especially the process-isolation note, the schema, and **Parsers: user-owned data**
3. `design/UX_SPEC.md` (Agy's v2 spec)
4. **this brief**, which overrides the spec wherever they differ

## Overrides to the UX spec (decided by Claude for the user: easy to see, easy to use)
1. **4 tabs, not 5:** Today · History · Parsers · Settings.
   - There's no Review tab. Rows with `status = 'needs_review'` show at the top of **Today** as a "Needs your check (n)" section.
   - Each such row has large one-tap **Received**, **Paid** and **Ignore** buttons, plus "Edit" and "Create parser from this".
   - History has a "Needs check" filter chip. A badge with the count sits on the Today tab icon.
2. **Onboarding has 4 steps:** Privacy → Notification Access (with the always-visible restricted-settings help) → Pick apps → Voice test.
   - No "add parsers" step. Instead, the first time a notification from a selected app has no parser, Today shows a one-line prompt: "Make PayPing understand <App> notifications → Create parser".
   - iOS onboarding: Privacy → "Set up Shortcuts automation" guide (placeholder steps, as no shortcut link exists yet) → Voice test.
3. **Glanceable:**
   - Today's total is at least **56sp**, bold, tabular numbers. The latest payment amount is at least 40sp.
   - Setting **"Keep screen on while Today is open"** (`expo-keep-awake`), off by default.
   - Respect the system font scale and never clamp it. Body text is at least 16sp, and touch targets are at least 48dp; use 56dp for app-picker rows and review buttons.
4. **Contrast:** money-in green is `#047857` (light) / `#34D399` (dark) at list sizes, and money-out is `#B91C1C` / `#F87171`. Always show the sign and a word ("Received" / "Paid"), never colour alone. All text must reach WCAG AA (4.5:1). Add a unit test that checks the token pairs.
5. **App picker rows:** icon + label only, no package name; package only in the row detail. Selected apps are pinned on top, with a search box.
6. **Icons:** `@expo/vector-icons` MaterialCommunityIcons (or `expo-symbols` on iOS). **No emoji anywhere in the UI.**
7. **Language:** English and Bahasa Melayu from day one. A small i18n module with `en.ts` and `ms.ts` holds every user-facing string; Settings → Language offers Auto, English and Bahasa Melayu. Take the Malay copy from the spec's §5 table where it has one, and write the rest in plain, natural Malay.
8. **Theme:** follow the system light/dark setting. Use the tokens from spec §4.1 except the money colours above. Don't use card borders as decoration; use hairline dividers only.

## Data layer
- `src/db/`: `expo-sqlite` reads of `capture`, plus writes **only** to the user-editable columns, `parser`, `selected_app` and `setting`, as PLAN.md defines. After any parser write, bump `setting.parsers_rev` and call the module's `reloadParsers()`.
- Live updates: subscribe to the module's `onCapture` event and re-query. Also re-query on app focus, because captures happen in another process.
- `src/native/capture.ts`: one typed wrapper over `modules/payping-capture`. Codex is changing that API now (see `CODEX_TASK_capture_android_v2.md`): `getInstalledApps`, `setSelectedApps`, `parsePreview(…, parserJson?)`, `reparse`, `reloadParsers`, `resetGenericConfig`.
  - Code against that brief's API.
  - Where a function isn't there yet, the wrapper returns a mock **only in `__DEV__`**, with a clear `TODO(codex-v2)`.
- Parser validation in the UI uses **your** `validateParser` / `validateGeneric` from `src/parser/validate.ts`.

## Screens
Follow spec §3 plus the overrides above:
- Today (health line, total, latest payment with replay, needs-check section, feed)
- History (date chips, search, app filter, expandable raw text, create parser)
- Parsers (list, import by paste or file via `expo-document-picker`, form + JSON editor, live test against recent captures, export/share via `expo-sharing`, re-parse with confirmation, generic config editor with reset)
- Create-parser-from-notification wizard (tap tokens to tag amount and counterparty, generate portable regex, live preview)
- Settings (apps, voice with rate/duck/test, review auto-clean, keep screen on, language, troubleshooting, CSV export, clear history, reset all, about with licence)
- Onboarding

Delete the template's `explore` screen and demo components. Keep `dev-capture.tsx`, but only reachable from Settings → About when you tap the version number 7 times.

## Tests
- Jest (`jest-expo`) unit tests: the regex generator in the create-parser wizard (tagged amount and counterparty → regex that the engine accepts and that matches the source text), CSV export (escaping commas, quotes and newlines; sen to RM), totals (only `logged` rows count, and `in` vs `out`), i18n completeness (every `en` key exists in `ms`), and the contrast tokens.
- Component tests with `@testing-library/react-native` for the Today states (empty, access revoked, no apps, normal, needs-check) and the parser import errors.

## Done when
- `npm test`, `npx tsc --noEmit` and `npx expo lint` are clean.
- `npx expo run:android --variant release -- -PreactNativeArchitectures=x86_64` installs on `emulator-5554` and every tab opens without a red screen.
- Commit and push `feat/ui`.
- Reply with a summary, screenshots of each tab (`adb exec-out screencap -p > design/screens/<name>.png`, committed), and anything you mocked.
