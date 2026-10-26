# Design B Hands-on QA Report (Emulator-5554)

Hands-on test execution of Design B (`feat/design-b` commit `de40107`) performed on Android emulator `emulator-5554` (API 36). Release APK built locally with `./gradlew assembleRelease` and verified with offline font bundling and listener permissions.

---

## 1. Executive Summary

| Test Area | Result | Notes |
|:---|:---:|:---|
| **1. First Run (Onboarding 5 Steps)** | PASS | All 5 steps functional; background battery permission dialog triggered and status refreshed on return. |
| **2. Capture → Today** | PASS | Payment direction, amount, payee parsed cleanly; daily totals & badge update immediately; TTS spoken output matches logcat; announcement replay works. |
| **3. Screen Off & Doze Announcement** | PASS | Tested under `deviceidle force-idle` with screen off (`keyevent 26`). Capture woke up and announced within <300ms. |
| **4. Payment Fixing & Deletion** | PASS | In-place flip works on Today and History; Edit screen updates amount & payee and recalculates totals immediately; Delete with confirmation clears record and updates totals. |
| **5. History Search, Filters & Export** | PASS | Search filters by payee/app/text; direction & date chips filter accurately; empty state shows helpful text; CSV export displays Android share sheet. |
| **6. Bank Rules & Teach Wizard** | PASS | Rule toggle works; Teach wizard groups tokens and generates matching rule; file picker & paste modal work; generic fallback keywords and reset work. |
| **7. Settings & Persistence** | PASS | Switches, speech rate chips, review retention chips, language, and custom TTS template survive complete app force-stop and restart. What to Say custom bracketed template speaks and previews accurately. |
| **8. Look & Feel (Dark, Malay, 200% Font)** | PASS | Opaque surfaces, high contrast, Manrope font embedded and verified in APK. Icon-only tabs and wrapping accommodate font scale 2.0 cleanly. |
| **9. Regression (`scripts/e2e.sh`)** | PASS | All 6 Maestro test flows passed green. |

---

## 2. Issues & Findings Table

| # | Screen | Severity | What you saw | How to reproduce | Screenshot path |
|---|---|---|---|---|---|
| 1 | Onboarding Step 3 / Connected Apps (`AppPicker`) | Major | App picker cannot find or select Android Shell (`com.android.shell`). Searching "Shell" returns "NO APPS MATCH YOUR SEARCH." because `InstalledApps.kt` only queries activities with `CATEGORY_LAUNCHER`. Since `PayPingListenerService` drops notifications from unselected packages, notifications sent via `adb shell cmd notification post` (which originate from `com.android.shell`) are silently ignored unless a launcher app (like `E2E Notifier`) is selected. | 1. Open Onboarding Step 3 or Settings → Connected Bank Apps.<br>2. Type "Shell" into the filter box.<br>3. Observe no app is found. | `design/qa-b/01-onboarding-step3.png` |
| 2 | Add Bank Rule / Teach Wizard (`ParserWizard`) | Minor | A no-amount notification cannot complete the teach wizard end-to-end. Tapping "Save and test parser" triggers validation "Tag an amount before saving the parser". If a non-numeric token is selected as amount, the wizard displays "The amount selection must contain a number." and preview fails with "No match found". Notifications without transaction amounts cannot produce valid bank rules. | 1. Capture notification with no amount (e.g. status/security alert).<br>2. Tap "Teach PayPing this format".<br>3. Attempt to save or select non-digit tokens as amount. | `design/qa-b/06-wizard-no-amount-validation.png`<br>`design/qa-b/06-wizard-save-error.png` |
| 3 | Bank Rules → Standard Fallback Pattern (`ParserGenericEditor`) | Minor | Multiline `TextInput` fields absorb vertical scroll gestures, making Save and Reset buttons difficult to reach. In Visual Form mode, the 6 multiline textareas occupy the full width (`[42, ...][1038, ...]`), intercepting drag touches and preventing the outer `ScrollView` from scrolling unless the user swipes on the narrow 15dp margins on the screen edge. | 1. Go to Bank Rules tab.<br>2. Tap "Standard Fallback Pattern" to expand.<br>3. Try scrolling down by swiping over the text input areas. | `design/qa-b/06-rules-generic-actions.png`<br>`design/qa-b/06-rules-generic-buttons.png` |
| 4 | Today & History (Generic Parser) | Minor | Heuristic payee parsing includes trailing grammatical words in certain English patterns. For the alert "Payment of RM 23.90 to ZUS Coffee is successful", the generic fallback parser extracted the payee as `ZUS Coffee is` rather than `ZUS Coffee`. | 1. Ensure no rule is installed for E2E Notifier.<br>2. Post alert "Payment of RM 23.90 to ZUS Coffee is successful".<br>3. Observe unconfirmed item payee displays as "ZUS Coffee is". | `design/qa-b/02-today-unconfirmed-items.png` |
| 5 | Teach Wizard Header (`ParserWizard`) | Minor | Header with "Back" button scrolls out of view when scrolling long notifications. In the single-scroll wizard, the header is not sticky, so users must scroll all the way back to the top or press the Android hardware back button to exit. | 1. Open Teach Wizard on any capture.<br>2. Scroll down to Section 4 / Live preview.<br>3. Observe header and Back button have scrolled off-screen. | `design/qa-b/06-wizard-step2-bottom.png` |

---

## 3. Detailed Verification Breakdown

### 3.1 First Run (Onboarding)
- **Step 1 (Privacy):** Clear statement that all data stays on-device; Next button navigates to Step 2. (`01-onboarding-step1.png`)
- **Step 2 (Notification Access):** Button triggers system notification listener settings; restricted settings guide visible for Android 13+. (`01-onboarding-step2.png`)
- **Step 3 (App Picker):** Tested search and selection with `E2E Notifier`. Switch toggles on and persists in database. (`01-onboarding-step3-selected.png`)
- **Step 4 (Run in Background):** When battery optimization is enabled, button "Allow background running" opens system dialog "Let app always run in background?". Tapping "Allow" immediately updates UI to "Allowed to run in the background". (`01-onboarding-step4-dialog.png`, `01-onboarding-step4-allowed.png`)
- **Step 5 (Voice Test):** "Test Voice Announcement" requests audio focus with ducking and speaks TTS test sentence ("Received 12 ringgit 50 sen from Ali, TNG eWallet"). Tapping "Get started" marks onboarding complete and navigates to Today. (`01-onboarding-step5.png`)

### 3.2 Capture → Today
- Tested with Malaysian payment formats:
  - `"You've received RM 45.00 from AHMAD BIN ALI"` → parsed as IN, RM 45.00, AHMAD BIN ALI.
  - `"Payment of RM 23.90 to ZUS Coffee is successful"` → parsed as OUT, RM 23.90.
  - `"RM -5.00 refunded"` → parsed as IN, RM 5.00.
  - `"Your transfer is processing without an amount"` → captured as unparsed, zero amount.
- Totals display received and paid amounts accurately (`+RM 0.00`, `−RM 5.00`, etc.).
- Badge counts on Today tab match unreviewed capture count.
- Tapping Replay icon triggers `PayPingTTS: Ducking focus granted`, `PayPingTTS: Announcing count=1 language=en`, and speaks the formatted text. (`02-today-payment1.png`, `04-flipped-to-out.png`)

### 3.3 Screen Off & Doze Mode
- Key event 26 sent to turn screen off, followed by `adb shell dumpsys deviceidle force-idle`.
- Payment posted at `19:22:45.950`; notification received and processed; `PayPingTTS: Ducking focus granted` and `Announcing count=1` logged at `19:22:46.207` (<300ms latency). Unforced idle cleanly.

### 3.4 Wrong Payment Fixing
- **Flip on Today:** Tapping "Flip to OUT" on unconfirmed item flips direction, converts it to LATEST CONFIRMED PAYMENT, updates daily total from RM 0.00 to −RM 5.00, and decrements review count. (`04-flipped-to-out.png`)
- **Edit Screen:** Tapping the payment card opens Edit payment with no UUID in header. Edited amount to `15.00` and payee to `Refund Desk`. Saved changes; Today counter card immediately updated to `−RM 15.00 PAID Refund Desk`. (`04-edit-payment-filled.png`, `04-today-updated-after-save.png`)
- **Delete Confirmation:** Scrolled to bottom of Edit payment, tapped "Delete payment". Confirmation dialog appeared ("Delete this payment? This removes the local record. This cannot be undone."). Confirmed deletion; Today totals immediately reset to `−RM 0.00 / 0 payments`. (`04-delete-confirmation.png`, `04-today-updated-after-delete.png`)

### 3.5 History
- **Search:** Typing "ZUS" filtered transactions in real-time. Typing "XYZNONEXISTENT" displayed empty state ("No transactions found. Try another date, app or search."). (`05-history-search-zus.png`, `05-history-empty-results.png`)
- **Filters:** Tested "In + out", "Money in", "Money out", "Needs check", "All dates", "Today", "Yesterday". (`05-history-filter-money-in.png`, `05-history-filter-money-out.png`, `05-history-filter-needs-check.png`, `05-history-filter-yesterday.png`)
- **In-place Flip:** Tapped swap icon button on AHMAD BIN ALI row. Direction flipped from `+RM 45.00 RECEIVED` to `−RM 45.00 PAID`; day group subtotal updated to `Paid RM 45.00`. (`05-history-flipped.png`)
- **CSV Export:** Tapped "Export All Transactions (CSV)"; Android share sheet opened with `payping-2026-10-25.csv`. (`05-history-share-sheet.png`)

### 3.6 Bank Rules
- **Rule Toggle:** Toggled rule switch off (`checked="false"`) and back on (`checked="true"`). (`06-rules-toggled-off.png`, `06-rules-list-active.png`)
- **Teach Wizard:** Tapped notification `Payment of RM 23.90 to ZUS Coffee is successful`. Selected direction `Paid`, amount `23.90`, counterparty `ZUS Coffee`. Adjacent tokens merged into a single highlight. Live preview confirmed match `com-paypingmy-e2e-notifier.out.v1`. Saved parser and confirmed re-parse; Today updated immediately with the confirmed transaction. (`06-wizard-zus-preview.png`, `06-rules-after-save.png`)
- **Import JSON:** Add modal options include "Paste Rule Code" and "Import Rule File (.json)". Tested Paste modal with JSON validation and file picker which launched system document provider. (`06-rules-paste-code.png`, `06-rules-file-picker.png`)
- **Generic Editor:** Tapped "Standard Fallback Pattern"; tested Visual Form and reset dialog. Reset to default confirmed and restored built-in pattern keywords. (`06-rules-generic-reset-dialog.png`)

### 3.7 Settings & Persistence
- **Persistence Across Restart:** Set Speech rate to `1.25x`, Auto-clean to `30 days`, Keep screen on to `ON`, and custom template to `Got {amount}[ from {payee}]`. Force-stopped app (`am force-stop com.paypingmy.app`) and restarted. Verified all four settings retained their modified values. (`07-settings-after-restart.png`)
- **What to Say:** Tested "Short", "Sentence", "Amount only", and "Custom" presets. Tested custom syntax `Got {amount}[ from {payee}]`:
  - With payee: spoke `“Got 12 ringgit 50 sen from Ali”`
  - Without payee: spoke `“Got 12 ringgit 50 sen”`
  - Audio focus ducking and speech logged in `PayPingTTS`. (`07-settings-what-to-say-preview.png`)

### 3.8 Look and Feel
- **Dark Mode:** Opaque dark surfaces (`#11130F` canvas, `#1C1F19` card), lime accent (`#D9FF57`), green for in (`#70E5B4`), red for out (`#FF9A91`). Verified on Today, History, Rules, and Settings. (`08-today-dark.png`, `08-history-dark.png`, `08-rules-dark.png`, `08-settings-dark.png`)
- **Malay Language:** Translated strings verified across navigation tabs, headers, summary labels, and troubleshooting text. (`08-today-malay.png`, `08-history-malay.png`, `08-rules-malay.png`, `08-settings-malay.png`)
- **Font Scale 2.0:** Verified under `font_scale 2.0`. Tab bar transitions to compact icon-only mode with accessibility labels intact. Headers, money readouts, and cards wrap without text clipping or overlapping. Reset to 1.0 after test. (`08-today-font-200.png`, `08-history-font-200.png`, `08-rules-font-200.png`, `08-settings-font-200.png`, `08-edit-font-200.png`)
- **Typography:** Verified 5 embedded Manrope binaries in release APK matching regular, medium, semi-bold, bold, and extra-bold weights. Letterforms (curved 'a', descender on 'y', open loop on 'g') match Manrope design specifications.

### 3.9 Regression Test Suite (`scripts/e2e.sh`)
```
Flow: 01-onboarding ................................. PASS
Flow: 02-paste-parser ............................... PASS
Flow: 03-capture-shows-on-today ..................... PASS
Flow: 04-needs-check ................................ PASS
Flow: 05-wizard ..................................... PASS
Flow: 06-malay ...................................... PASS
Overall: 6/6 flows passed (Exit code 0)
```

---

## 4. Screenshot Index (`design/qa-b/`)

- `01-onboarding-step1.png` — Onboarding Step 1 (Privacy)
- `01-onboarding-step2.png` — Onboarding Step 2 (Notification Access)
- `01-onboarding-step3.png` — Onboarding Step 3 (App Picker search)
- `01-onboarding-step3-selected.png` — Onboarding Step 3 (App selected)
- `01-onboarding-step4-before.png` — Onboarding Step 4 initial
- `01-onboarding-step4-unwhitelisted.png` — Onboarding Step 4 with battery optimization active
- `01-onboarding-step4-dialog.png` — System dialog: Let app always run in background?
- `01-onboarding-step4-allowed.png` — Onboarding Step 4 updated to Allowed after returning
- `01-onboarding-step5.png` — Onboarding Step 5 (Voice test)
- `02-today-empty.png` — Today screen empty state
- `02-today-payment1.png` — Today with first unconfirmed payment
- `02-today-unconfirmed-items.png` — Today with multiple unconfirmed captures (showing Review Queue)
- `04-flipped-to-out.png` — Today latest confirmed payment after in-place flip
- `04-edit-payment.png` — Edit payment screen top
- `04-edit-payment-filled.png` — Edit payment screen with modified amount and payee
- `04-edit-payment-bottom.png` — Edit payment screen bottom (Delete and Teach buttons)
- `04-today-updated-after-save.png` — Today updated immediately after saving edited payment
- `04-delete-confirmation.png` — Delete confirmation dialog
- `04-today-updated-after-delete.png` — Today updated immediately after deleting payment
- `05-history-screen.png` — History screen with transactions
- `05-history-flipped.png` — History screen after in-place flip
- `05-history-search-zus.png` — History real-time search filtering
- `05-history-empty-results.png` — History empty search state
- `05-history-filter-money-in.png` — History filtered by Money In
- `05-history-filter-money-out.png` — History filtered by Money Out
- `05-history-filter-needs-check.png` — History filtered by Needs Check
- `05-history-filter-yesterday.png` — History filtered by Yesterday (empty)
- `05-history-share-sheet.png` — Android Share Sheet on CSV export
- `06-rules-screen.png` — Bank Rules initial empty state
- `06-rules-add-modal.png` — Add Bank Rule modal choices
- `06-rules-pick-notification.png` — Notification selection sheet for wizard
- `06-rules-paste-code.png` — Paste Rule Code screen
- `06-rules-file-picker.png` — System document picker triggered from Import JSON
- `06-rules-list-active.png` — Bank Rules list with active custom rule
- `06-rules-toggled-off.png` — Bank Rule switch toggled off
- `06-rules-generic-editor.png` — Standard Fallback Pattern generic editor top
- `06-rules-generic-editor-bottom.png` — Standard Fallback Pattern generic editor middle
- `06-rules-generic-actions.png` — Standard Fallback Pattern Save and Reset buttons
- `06-rules-generic-reset-dialog.png` — Reset generic parser confirmation dialog
- `06-wizard-step1.png` — Teach Wizard Step 1 & 2
- `06-wizard-save-error.png` — Wizard validation: Tag an amount before saving
- `06-wizard-no-amount-validation.png` — Wizard validation: Amount selection must contain a number
- `06-wizard-zus.png` — Teach Wizard on ZUS Coffee notification
- `06-wizard-zus-selected.png` — Wizard with amount and counterparty highlighted
- `06-wizard-zus-preview.png` — Wizard live match preview
- `06-rules-after-save.png` — Re-parse previous notifications confirmation dialog
- `06-rules-with-rule.png` — Re-parse history completion dialog
- `07-settings-screen.png` — Settings screen top
- `07-settings-bottom.png` — Settings screen middle (Display & Background)
- `07-settings-data.png` — Settings screen bottom (Data & About)
- `07-settings-what-to-say.png` — What to Say screen
- `07-settings-what-to-say-custom.png` — What to Say custom template entered
- `07-settings-what-to-say-preview.png` — What to Say custom bracketed preview
- `07-settings-before-restart.png` — Settings with modified values before restart
- `07-settings-after-restart.png` — Settings with values preserved after force-stop restart
- `08-today-dark.png` — Today screen in Dark Mode
- `08-history-dark.png` — History screen in Dark Mode
- `08-rules-dark.png` — Bank Rules screen in Dark Mode
- `08-settings-dark.png` — Settings screen in Dark Mode
- `08-today-malay.png` — Today screen in Bahasa Melayu
- `08-history-malay.png` — History screen in Bahasa Melayu
- `08-rules-malay.png` — Bank Rules screen in Bahasa Melayu
- `08-settings-malay.png` — Settings screen in Bahasa Melayu
- `08-today-font-200.png` — Today screen at 200% font scale
- `08-history-font-200.png` — History screen at 200% font scale
- `08-rules-font-200.png` — Bank Rules screen at 200% font scale
- `08-settings-font-200.png` — Settings screen at 200% font scale
- `08-edit-font-200.png` — Edit payment screen at 200% font scale
