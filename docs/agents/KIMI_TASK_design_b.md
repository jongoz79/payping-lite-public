# KIMI TASK: build design B ("Glanceable counter") into the app

The user picked **B**, your A/B variant. Port it into the real React Native app on branch `feat/design-b` (worktree `~/dev/payping-lite-wt/design-b`). This is a visual and layout rebuild: **every existing feature, setting and test must keep working.**

## Source of truth
- Prototype: `design/ab/B-kimi/index.html` on branch `design/ab-B-kimi` (commit `d2f0f4f`, which includes Claude's text-collision fixes), plus `RATIONALE.md` and `screens/`. Read it with `git show design/ab-B-kimi:design/ab/B-kimi/index.html`.
- Treat the **fixed** prototype as the spec: letter-spacing no tighter than -0.02em (Manrope already runs tight, so glyphs collide below that), a 12 px minimum text size, and an unparsed amount shown as a small muted label.
- The family preferred B. The user personally liked A's calm. Keep B's structure and counter card, and keep the lime accent to functional moments only (latest amount, the active switch, primary "teach" actions). Everything else stays quiet ink/muted.

## Foundations
1. **Theme:** replace the palette in `src/constants/theme.ts` with B's tokens (light and dark): canvas, surface, subtle, ink, muted, line, in, out, accent `#D9FF57`, accentInk.
   - Keep the existing `useTheme()` keys working (`text`, `background`, `moneyIn`, …) by mapping them, so screens you haven't touched yet still render.
   - Check AA contrast. Lime is never used for text on a light surface.
2. **Font:** Manrope, **bundled offline** via `@expo-google-fonts/manrope` (`npx expo install`). Release builds have **no INTERNET permission**, so nothing may load fonts at runtime from the network. Fall back to the system font if loading fails, and never block the first screen on fonts for more than one frame.
3. **Type scale and spacing** from the RATIONALE. Use tabular numerals for money.
4. **Accessibility:** everything must stay usable at system font scale 2.0. Wrap and stack, never clip. 48 dp touch targets; true minus "−"; IN/OUT in words next to the colour.

## Screens (map each prototype screen to the existing route)
| Prototype | App route |
| --- | --- |
| Today | `src/app/(tabs)/index.tsx` + `src/components/today-view.tsx` |
| History | `src/app/(tabs)/history.tsx` + `history-view.tsx` |
| Edit payment | `src/app/capture/[id].tsx` |
| Bank Rules | `src/app/(tabs)/parsers.tsx` + `parser-*` components |
| Teach wizard | `parser-wizard.tsx` / `parser-create.tsx` |
| Settings | `src/app/(tabs)/settings.tsx` |
| First run | `src/app/onboarding.tsx` |
| Apps sheet | `src/app/apps.tsx` / `app-picker.tsx` |

**Today:**
- Order:
  1. Listening strip, with the health warnings `today-view` already has: notification access off, no apps, battery saving on.
  2. Dark counter card: app, time, "Latest confirmed payment", big signed amount, payee, the line that was spoken plus a replay button.
  3. Received/paid tiles, each with its own count.
  4. Needs checking (max 3, plus "View all").
  5. Feed.
- The spoken line must use the real `ttsText(…, getTtsTemplates())` output, not a hard-coded string.

**History and Today rows:**
- B's row layout, with the 48 dp **flip** button on every signed row.
- Flip reuses the existing `correctCapture` path.
- Keep FlashList and pagination.

**Edit payment:** big amount, payee, Money in / Money out segmented control, amount/payee fields, raw notification, delete with confirmation. Keep all existing behaviour of `capture/[id].tsx`.

**Settings:**
- B's grouped rows.
- Keep **every** current setting, including "What to Say" (`/announcement`), the new **Run in Background** section (`components/background-access.tsx`), speech rate, ducking, review auto-clean, keep-awake, language, CSV export, clear and reset.
- Restyle `src/app/announcement.tsx` and `background-access.tsx` to match.

**Bank Rules and wizard:**
- B's list with switches.
- The wizard's notification text with inline tappable tokens: tokens are inline highlights, **not** 48 px tall boxes that break the sentence. Give tap targets padding instead.

**Onboarding:** B's step dots + icon tile + large title. Android has 5 steps (privacy, notification access, apps, **background**, voice).

## Constraints
- No new runtime permissions and no network.
- Don't change parsing, capture, TTS text or DB code except where a screen needs a value. Those are shared with Kotlin and Swift through fixtures.
- Every string goes in **both** `src/i18n/en.ts` and `ms.ts`. Malay is longer, so test it.
- Match the existing code style: single quotes, `@/` imports, small components. Run Prettier as `npx prettier --single-quote --print-width 110`. Don't reformat files you didn't otherwise change.
- Update component tests when markup changes, but don't delete assertions about behaviour.

## Done when
- `npx jest`, `npx tsc --noEmit` and `npm run lint` are green.
- A release build is installed on **emulator-5554**: `cd android && ./gradlew assembleRelease`, then `adb install -r`. Grant the listener with `adb shell cmd notification allow_listener com.paypingmy.app/expo.modules.paypingcapture.PayPingListenerService`. Post test notifications with `adb shell cmd notification post`.
- Screenshots in `design/screens-b/` (realistic data, ≥10 rows including one needing a check):
  - `today`, `today-dark`, `today-ms`, `today-large` (font_scale 2.0, reset afterwards)
  - `history`, `edit`, `rules`, `wizard`, `settings`, `announcement`, `onboarding-background`
- Commit in logical steps on `feat/design-b`, push the branch (**never push main**), and write `docs/agents/DESIGN_B_REPORT.md` covering what changed, anything you couldn't match, and any open questions.
