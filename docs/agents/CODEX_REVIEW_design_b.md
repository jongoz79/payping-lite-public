# Design B correctness review

Reviewed 2026-10-25. Comparison: `main...origin/feat/design-b`, main `90d7615`, design B / initial review HEAD `de40107`. Report only; no application changes. No emulator, device commands, installation, or E2E execution.

## Findings

No blockers found. Two major findings and one minor finding.

### Major — review no longer offers confirmation without reversing direction

`src/components/review-card.tsx:77–93`

Main offered both Received and Paid, each calling `onReview` with the selected direction. B offers only the opposite direction for signed captures, alongside Fix and Ignore. For an already correct incoming RM9.50 capture awaiting review, the only direct approval now reverses it to outgoing and logs it. Keeping the correct direction requires entering the editor and saving. Unsigned captures lose both direct direction actions. This removes an existing action from the primary review workflow; the existing `onReview` handler still supports it.

Concrete fix: restore a confirm-current-direction action for signed captures, retain the flip action, and preserve explicit direction/edit choices for unsigned captures. Test confirmation and reversal independently, including the resulting incoming/outgoing totals.

### Major — wizard token targets lost their 48 dp minimum

`src/components/parser-wizard.tsx:203–225` and `src/components/parser-wizard.tsx:381–382`

Main guaranteed `minWidth: 48, minHeight: 48` for selectable words. B uses only 4 dp horizontal / 2 dp vertical padding around 16 sp text with a 24 sp line height. A short token has a visual height of about 28 dp and can be much narrower than 48 dp. `hitSlop={10}` cannot guarantee a 48 dp width for a one-character token, and adjacent inline targets have overlapping expanded hit regions. Precisely selecting amounts or names is a core wizard interaction.

Concrete fix: restore non-overlapping 48 by 48 dp minimum targets, retaining merged highlights if desired. Assert the target minimums in the accessibility test and check adjacent short tokens on a device.

### Minor — History advertises app-name search that the query does not implement

`src/i18n/en.ts:115` (and the corresponding Malay entry), used by `src/components/history-view.tsx:122`

The new placeholder promises “Search payee, app or raw text”. History passes the query directly to `getCaptures`; `src/db/captures.ts:41–47` searches title, body, counterparty, reference and note, but neither source package nor installed app label. Searching an app name fails unless that name happens to occur in notification content. The separate app chips work.

Concrete fix: describe the existing searchable fields in both locales and leave app selection to the chips, or deliberately implement label/package search with matching tests.

## Behavior and boundary audit

- Capture correction/edit retains `correctCapture`, `updateCaptureNote` and `updateCaptureStatus`; detail now also exposes confirmed `deleteCapture` and calls `notifyCapturesChanged`. Today/History add direction flips through the existing correction function. Review exception is documented above.
- Parser create, paste/file import, form/raw edit, enable/disable, share, delete, native preview, save and reparse remain connected to the existing DB/native functions. Generic configuration and reset remain present.
- Settings retains CSV export, clear history, full reset, What to Say, background access, permanent restricted-settings guidance and voice testing. Existing setting paths remain: `tts_enabled`, `tts_duck`, `tts_rate`, `review_autoclean_days`, `keep_screen_on`, language preference, inbound/outbound template keys and generic-parser configuration. No setting-key removal found.
- No diff under `src/parser`, `src/db`, `modules/`, `parser-library/` or `app.config.js`. No parsing, native TTS text or schema changes. `src/utils/format.ts` only changes the displayed outgoing minus from ASCII to U+2212. The latest-payment selection now chooses the newest logged incoming/outgoing row instead of preferring incoming; logged info rows are excluded.
- Today and History keep FlashList, cursor pagination (`beforePostedAt`, `beforeId`, 50-row pages) and `onEndReached`. AppPicker keeps its existing FlatList. No new state-during-render or effect dependency loop found. New preview text calculation reads the TTS templates during Today render, but does not parse notification history.
- English/Malay dictionaries both have 320 keys with identical key sets. Static literal translation-call scan found no missing keys. No newly introduced hard-coded English UI prose found; existing raw `info`, date-format placeholders and developer voice sample remain baseline limitations.
- Icon-only back, overflow, detail, replay and flip controls inspected have labels/roles and 48 dp styles. Important capture names/amounts generally now wrap rather than truncate. Wizard targets are the accessibility regression above. The new wizard step-number circles also use fixed 28 dp dimensions around scalable text; physical large-font rendering was not verified.
- History adds filtered CSV export while reusing the “Export All Transactions” label. Its export uses the active filters, whereas Settings still exports all captures. Consider a distinct localized label to make the scope clear.

## Tests and coverage changes

Executed in the review worktree:

- `npx jest --runInBand`: **17 suites, 960 tests passed**, no snapshots.
- `npx tsc --noEmit`: **passed**, exit 0.
- `npm run lint`: **passed**, exit 0.
- `git diff --check`: **passed**.

Tests weakened or coverage removed:

- `src/components/__tests__/parser-accessibility.test.tsx:67–72`: removed the 48 dp width/height assertion, replaced it with exact padding and hit-slop assertions. This permits the target regression above. Selected-field assertions changed to regular-expression matching to accommodate merged inline labels.
- `src/components/__tests__/today-view.test.tsx`: removed assertions that both Received and Paid are available in review. Added a flip callback assertion and Fix presence, leaving same-direction approval untested. The long-name/amount test now checks wrapping rather than truncation, which fits the new behavior.
- `e2e/04-needs-check.yaml`: replaced incoming confirmation and the RM9.50 received-total assertion with reversal and an unchanged zero received total. It no longer covers confirming an already correct incoming payment and does not assert the outgoing total after reversal.
- `e2e/00-setup-shell.yaml` and `e2e/01-onboarding.yaml`: removed search/input coverage in favor of scrolling to the app; background-step assertions were added.
- `scripts/e2e.sh`: setup now whitelists battery optimization before the flows, so these flows cannot validate the unexempted background-warning/request path.
- Contrast tests replace old accent/danger pairings with pairings for the new palette and add counter-card coverage; this is an update to actual surfaces. Amount tests add Unicode-minus coverage. No Jest test files deleted and no new skip/only markers in the diff.

## Offline and native verification

Read the SDK 58 reference, Expo docs index, SDK 58 font docs and prebuild documentation before examining generated configuration. Sources: [SDK 58](https://docs.expo.dev/versions/v58.0.0/), [font config plugin](https://docs.expo.dev/versions/v58.0.0/sdk/font/), [CNG](https://docs.expo.dev/workflow/continuous-native-generation/).

Exported both reviewed revisions into temporary directories under `/tmp/payping-review-b.AfymKK`, using the already installed dependency tree. Ran `PAYPING_OFFLINE=1 npx expo prebuild --platform android --no-install` for both: **passed**. Generated projects were not written into this worktree.

Generated app manifests are byte-identical between main and B. INTERNET, external-storage and overlay permissions are removal directives in the offline manifest; VIBRATE remains unchanged. The native capture manifest/config plugin are unchanged. B's generated font resources contain the Manrope family XML and all five local TTF files (400/500/600/700/800). No runtime font loader or new network request found in changed screens/components. App identity remains `com.paypingmy.app`, owner `apau96`, slug `paypingmy`.

Ran `ANDROID_HOME=/home/afo/Android/Sdk ./gradlew :app:processReleaseMainManifest --offline --no-daemon` in each temporary Android project: **both passed** (main 2m28s; B 2m57s). Inspected `app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` for both. Permission sets are identical: VIBRATE, ACCESS_NETWORK_STATE, the app's signature CAPTURE_EVENT permission, WAKE_LOCK, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, and DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION. Neither merged manifest contains INTERNET. No new Android permission introduced by B. Gradle emitted existing obsolete-API and manifest replacement warnings; these did not fail either merge.

## Limits / skipped work

No app fixes were made, as requested. Device/emulator testing, Maestro, TalkBack interaction, physical hit-area measurement, iOS prebuild/build and large-font visual verification were skipped. Findings are based on source comparison and host checks; the green Jest suite does not establish physical layout correctness. Dependency installation was not repeated: checks used the supplied node_modules symlink. Temporary generated native projects and logs remain outside the repository. Only this report is included in the review commit; the supplied task briefs and node_modules symlink remain untracked.
