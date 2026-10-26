# KIMI TASK: end-to-end UI tests with Maestro (Android)

Work on `feat/rules`, or a new branch `test/e2e` from main, in your worktree (`git merge main` first).

1. **Install Maestro locally without sudo:** download the release zip from `https://github.com/mobile-dev-inc/maestro/releases/latest` (asset `maestro.zip`), unzip it to `~/.local/maestro`, and use `~/.local/maestro/bin/maestro`. **Don't** pipe a curl script into sh.
2. **Write flows in `e2e/`:**
   - `01-onboarding.yaml`: fresh install → privacy → Notification Access (grant it beforehand with `adb shell cmd notification allow_listener com.paypingmy.app/expo.modules.paypingcapture.PayPingListenerService`) → pick the Shell app → voice test → land on Today.
   - `02-paste-parser.yaml`: Parsers → + Add parser → Paste JSON (a parser for `com.android.shell` matching title "E2E Pay") → save → appears in the list.
   - `03-capture-shows-on-today.yaml`: post `adb shell cmd notification post -t "E2E Pay" e2e-1 "RM 12.50 from E2E Customer"` (Maestro `runScript` or a wrapper script), then assert that Today shows RM 12.50 and "E2E Customer".
   - `04-needs-check.yaml`: post an unparsed notification → it appears under Needs your check → tap Received → the total increases.
   - `05-wizard.yaml`: from a Needs-check row, Create parser from this → tag the amount and the name → save → the row re-parses as high confidence.
   - `06-malay.yaml`: switch the language to Bahasa Melayu → key labels appear in Malay.
   - Use `testID`s / accessibility labels, not coordinates. If the UI lacks the testIDs you need, **list them** in `e2e/README.md` for Kimi-UI to add; don't edit `src/` yourself, because Kimi-UI owns it and is working there now.
3. Add `scripts/e2e.sh`, which (re)installs the release APK from `android/app/build/outputs/apk/release/`, clears app data (`adb shell pm clear com.paypingmy.app`), and runs every flow.
4. **Don't run the flows on emulator-5554 yet:** Kimi-UI is using it. Write and lint them (`maestro check-syntax` if available), commit and push, then report. Claude will tell you when to run them.
