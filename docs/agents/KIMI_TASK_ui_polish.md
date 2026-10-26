# KIMI TASK: UI polish after Claude's review (feat/ui)

Claude reviewed your screenshots with stress-test data on the device (341 rows needing a check). The structure is good. These issues hurt "easy to see, easy to use". Fix all of them on `feat/ui`.

## Today
1. **Order:** health line → total → **latest payment spotlight** (it's currently pushed off-screen) → "Needs your check" → feed.
2. **Needs your check:** show at most **3** cards, then a full-width row "See all 341 →" that opens History with the Needs check filter. With 300+ items, Today must not become a giant review list.
3. **Make review cards compact:**
   - One row: app icon + counterparty (fall back to the title) + amount on the right.
   - One line of raw body text, truncated, tap to expand.
   - One row of actions: Received / Paid / Ignore.
   - Put "Edit" and "Create parser" in a ⋮ overflow menu (icon button, with accessibilityLabel).
4. **Pluralisation:** "Listening to 1 app", "1 rule", "1 payment". Use plural forms in en and ms (Malay doesn't inflect, so check the wording reads naturally).
5. **Tab badge:** cap at "99+". It's currently truncated to "3…".

## History
6. **Show app labels, never package names:** both in rows and in the app filter chips. Use the label stored in `selected_app`. If the app was unselected or has no label, use the last package segment, title-cased. Always show the time in full (`1:41 pm`), and put the label + time on one line that may wrap rather than truncate the time.
7. **Filter chips:** a single horizontally scrollable row for dates (Today, Yesterday, 7 days, Month, Custom, Needs check), and a second row for apps. That replaces the current three rows.
8. **Performance:** use `@shopify/flash-list` (via `npx expo install`) for the History list and Today's feed. Query with pagination: 50 per page, keyset on `posted_at`. With 5,000 rows, scrolling must stay smooth.

## Parsers
9. **List first.** Replace the inline paste box with a primary button "+ Add parser" that opens a sheet/modal with three choices: Paste JSON, Open .json file, Create from a notification (that one picks a recent capture). The empty state keeps its one-sentence explanation plus the same button.
10. **Parser rows:** app labels, not packages. Relative time ("Last matched 2 h ago"). Edit / Share / Re-parse / Delete go into an overflow menu or the parser's detail screen. Keep the row compact.

## Settings
11. "Keep screen on while Today is open" should be a **toggle row** in a "Display" section (with Language), not a section header.

## Everywhere
12. **Top whitespace:** there's too much above the large titles (~130dp). Use the safe-area inset plus a normal large-title header.
13. **Accent colour:** use the brand green `#047857` (dark mode: `#34D399` on dark surfaces; check contrast) for primary buttons, selected chips, active tab and switches, replacing blue `#2563EB`, to match the new icon. Money-in stays green and money-out red; make sure a selected green chip can't be confused with money-in (use a filled chip with white text for selection).
14. Run the app in **Bahasa Melayu** and fix any truncation or overflow. Malay strings are longer.
15. **Large-text check:** set the system font scale to 1.3 (`adb shell settings put system font_scale 1.3`), check every screen for clipping, then reset to 1.0.

## Done when
- Tests, tsc and lint are green.
- A release x86_64 build is installed on emulator-5554.
- Refreshed screenshots committed in `design/screens/`, in **en and ms**, plus one at font scale 1.3: `today.png`, `today-ms.png`, `today-large.png`, `history.png`, `parsers.png`, `settings.png`, `add-parser.png`.
- Commit, push, and report.
