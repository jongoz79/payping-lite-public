# Design B implementation report

## What changed

- Rebuilt the app around B's quiet canvas/surface palette, dark counter card, compact payment rows, grouped settings, step-based onboarding, and functional lime accents. Added complete light/dark tokens while preserving the existing theme keys.
- Today now keeps health warnings first, then the latest confirmed payment, real `ttsText(..., getTtsTemplates())` output and replay, per-direction totals and counts, up to three review items, and the paginated FlashList feed. Info rows cannot become the latest payment.
- Today and History signed rows have a 48 dp flip action using `correctCapture`. History retains grouping, expansion, raw evidence, and pagination; it also has direction/date/app filters and CSV export.
- Edit payment has the B amount/direction editor, fields, raw evidence, save, teach action, and confirmed deletion. Save/delete notify mounted lists to refresh. The header no longer exposes the capture UUID.
- Bank Rules, import, generic editor, parser editor, and teach wizard retain their existing validation and native behavior. Wizard tokens stay inline, adjacent selections render as one highlight, and the parser name defaults to the installed app label.
- Settings keeps every existing option, including What to Say, background access, ducking, speech rate, review auto-clean, keep-awake, language, export, clear, and reset. Android onboarding keeps all five steps.
- Manrope 400/500/600/700/800 is embedded at build time with the `expo-font` config plugin. Android registers one weight-aware `Manrope` family through generated XML. Shared `AppText` and input/tab styles apply the family explicitly; there is no runtime font request, `useFonts`, or `defaultProps` mutation.
- Added English and Malay strings, true minus signs, muted unparsed labels, AA contrast checks, wrapping/stacking at large text sizes, and icon-only tabs at very large scales to prevent truncation.

## QA round 1

Addressed every item in `docs/agents/CLAUDE_QA_design_b.md`:

1. Replaced runtime font loading with the native config plugin and explicit shared font styles. Verified all five font binaries in the APK and visually verified Manrope in the retaken screenshots.
2. Removed the capture UUID from Edit payment.
3. Reduced History to two horizontally scrollable filter rows, with app filtering beside dates; payment rows are visible immediately at 1.0 scale.
4. Resolved the parser's default name from the capture's source package to the installed app label.
5. Grouped adjacent same-field wizard tokens into one Pressable, highlight, and accessibility label.
6. Retaken light/dark screenshots with consistent, unclipped button labels.
7. Made Fix and Ignore use the same secondary-button treatment.

## QA round 2

Addressed all three findings in `docs/agents/CODEX_REVIEW_design_b.md`:

1. Restored one-tap confirmation of the current direction alongside Flip, Fix, and Ignore. Unsigned captures again offer explicit Received and Paid actions. Jest covers confirmation, reversal, and unsigned actions independently. The E2E suite now confirms incoming RM9.50 into the received total and separately flips another capture into the outgoing total.
2. Restored actual 48×48 dp minimum wizard token targets while retaining merged inline highlights. Removed expanded hit regions so adjacent targets do not overlap, and restored the 48 dp Jest assertion.
3. Corrected History search copy in English and Malay to describe payee, reference, note, and raw-text search rather than app-label search. History CSV export now has a distinct localized "filtered transactions" label, while Settings still exports all transactions.

No emulator, APK installation, build, or device checks were run for round 2, as requested while Agy is testing. Device verification of the new confirmation and adjacent-token hit areas remains pending Agy's report.

## QA round 3

Addressed the requested findings from `docs/agents/AGY_QA_design_b.md` and the related large-text review:

1. Disabled inner scrolling on the six visual generic-editor inputs so vertical gestures reach the outer ScrollView and Save/Reset remain reachable. Raw JSON editing keeps its own scrolling behavior.
2. Added a full-width Back action after the wizard content, so exiting no longer requires scrolling back to the top.
3. Shared `Screen` headers now stack their action below the title at font scale ≥1.6 or narrow widths, with full-width non-collapsing titles. This covers Bank Rules, Apps, Announcement, parser creation, and developer screens. Added localized accessibility labels to every icon-only tab.
4. Made the root navigator's content background explicitly opaque with the active theme. The retaken large-text Edit screenshot shows no Today content underneath.

Retook and visually checked `rules-ms-large.png`, `edit-large.png`, `wizard-bottom.png`, and `rules-generic.png`. Device flows confirmed the stacked Malay header, opaque Edit screen, bottom wizard Back, and reachable generic Save/Reset controls. Font scale was reset to 1.0 afterwards. Agy #1, #2, and #4 were intentionally left out as requested.

## Intentional differences / open questions

- The prototype's "Apply to future notifications like this" checkbox was not added because the app has no automatic draft-rule behavior behind it. Teaching remains an explicit flow through the existing wizard.
- The wizard keeps its stateful single-scroll implementation, presented as four numbered parts, rather than four separate navigation screens. Amount/payee offsets, expansion, native preview, save, and reparse behavior are unchanged.
- No open questions remain.

## Verification

- `npx jest --runInBand`: 17 suites, 962 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `PAYPING_OFFLINE=1 npx expo prebuild --platform android`: passed; generated the weight-aware Manrope XML and native registration.
- `cd android && ./gradlew assembleRelease`: passed on the final sources.
- Release installed with `adb install -r` on `emulator-5554`; listener granted and real test notifications posted through the local E2E notifier.
- `scripts/e2e.sh`: all flows passed on the final APK: onboarding, parser paste/import, high-confidence capture, independent review confirmation and flip, wizard/reparse, and Malay.
- APK permission dump contains no `android.permission.INTERNET`. Five weighted Manrope binaries were hash-verified in the APK.
- Retook and visually checked all 11 screenshots in `design/screens-b/`, using 11 confirmed payments plus one needs-check capture. Dark, Malay, compact History, merged wizard highlights, and 200% text were included; font scale was reset to 1.0 afterwards.
