# A/B design brief: PayPing Lite redesign (4 competing variants)

Four designers (Codex, Kimi, Agy and Claude) each build **one** variant. The owner will compare all four side by side and pick (or mix) a winner, which then gets implemented in the Expo app. **You are competing.** Make your variant clearly yours, but keep it buildable.

## The product, in one paragraph

PayPing Lite listens to banking and e-wallet notifications on the phone (TNG eWallet, MAE, HSBC, Google Wallet, Boost, …), logs each payment **on the device only**, and **speaks it out loud**. The main users are Malaysian small sellers and families: a hawker hears "Plus 4 ringgit, TNG eWallet, Imraan Corner" without looking at the phone. Parsing is driven by user-owned JSON "Bank Rules". When a rule is missing or unsure, the user fixes it in the app.

## What the owner said (verbatim intent)

- The current design looks "vibe coded" (coloured side bars on cards are an AI signature). **No coloured left borders or side bars. No gradient hero cards, no emoji as icons, no glassmorphism everywhere, no purple.**
- "Make the app easy to see, and use."
- **TTS is now short:** sign + amount, app, payee. For example: "Plus 4 ringgit, TNG eWallet, Imraan Corner" / "Tolak 75 ringgit, MAE, Plasticity PLT". Show this wherever the UI previews speech.
- **The parser sometimes gets the direction wrong.** The owner's real payment showed as *received* and they had to edit it manually. Your design **must** make spotting and fixing a wrong payment fast: one tap to flip in/out, and edit the amount/payee, from the list or detail. Optionally offer "apply to future notifications like this" (the rule learns).
- Users pick the apps to listen to from the list of their installed apps. Bank Rules are downloadable or editable JSON; the generic rule is editable too. Nothing is hard-coded.

## Research first (write it down)

Look at modern banking/fintech apps and take inspiration. **Cite what you took from where.** At least these:
- **Malaysian:** MAE by Maybank, TNG eWallet, GXBank, Boost Bank, AEON Bank, Ryt Bank, CIMB OCTO, BigPay.
- **Global:** Monzo, Revolut, Wise, Cash App, Apple Wallet / Apple Card, Copilot Money, Actual Budget.
- **Platform language:** Material 3 Expressive (Android 16) and Apple's current HIG / Liquid Glass (iOS 26+). The app ships on both.

Use the web if your tool allows it. Otherwise use what you know, and say so.

## Your design direction (keep the four variants distinct)

| Designer | Direction | Hint |
|---|---|---|
| **Codex** | **A: "Calm ledger"** | Wise / Monzo / Actual. Typographic, neutral, very legible lists, grouped by day, strong number alignment (tabular figures). Trust through restraint. |
| **Kimi** | **B: "Glanceable counter"** | Cash App / Apple Wallet / payment-terminal energy. The hawker use case: a huge "last payment" readout readable from 1 m, today's running total, a big "listening" state. Lists are secondary. |
| **Agy** | **C: "Local super-app familiar"** | MAE / TNG / GXBank / Ryt. Feels at home next to Malaysian banking apps: familiar patterns, tiles and chips, bilingual-first. Without copying any brand's colours or logos. |
| **Claude** | **D: "Platform native, expressive"** | Material 3 Expressive on Android with iOS HIG equivalents. Dynamic colour-friendly, shape and motion as hierarchy, native-feeling sheets and controls. |

## Deliverables (in your worktree)

Put everything in `design/ab/<variant-letter>-<your-name>/`, for example `design/ab/A-codex/`:

1. **`index.html`**: ONE self-contained interactive prototype.
   - No build step, no external requests except Google Fonts. Inline CSS/JS and SVG icons.
   - Render a phone frame of 390×844 (iOS) by default, with a toggle to Android 412×915.
   - Navigation between screens must work by clicking.
   - **Light and dark** (toggle) and **EN / MS** (toggle; Malay strings are longer, so check that layouts survive).
   - Load the data from `../mock-data.json` (fetch) with an inline copy as fallback, so it also works when opened from `file://`. **Render exactly that data.**
2. **Screens (all required):**
   1. **Today:** totals in/out, last payment, the list, the "needs checking" items (#11, #12, #13), and the listening status (on/off, how many apps).
   2. **Payment detail / edit:** flip direction in one tap, edit amount and payee, see the raw notification, "apply to future", delete.
   3. **History:** search and filter (app, in/out, date), grouped by day, with a CSV export entry point.
   4. **Bank Rules:** list, import (paste / file / from website), the generic rule, and "Teach PayPing this format" for #13 (a short wizard: highlight amount, highlight payee, choose in/out, preview).
   5. **Settings:** voice on/off, a speech preview using the new short TTS, language, apps to listen to (installed-apps picker with search), and battery/restricted-settings help.
   6. **First run (onboarding):** at most 3 steps (what it does and privacy; notification access; pick apps), then land on Today.
3. **`RATIONALE.md`** (at most 1 page):
   - Your principles.
   - Inspirations, with the app and the specific pattern taken.
   - Type scale, colour tokens and spacing scale.
   - How the "wrong direction" fix works.
   - Accessibility notes.
   - What is hard to build in React Native / Expo, if anything.
4. **`screens/`**: PNG screenshots of each screen, in light mode plus Today in dark mode, if your tool can capture them (headless Chromium is available: `npx playwright` or `chromium --headless --screenshot`). Optional but strongly preferred.

## Hard constraints

- **Accessibility:**
  - Text contrast WCAG AA; touch targets ≥ 48 dp.
  - Supports font scaling (test at 200%).
  - In/out must never be signalled by colour alone: show the sign (+/−) and a word or icon.
- **Money formatting:**
  - `+RM 4.00` / `−RM 629.75`, with a true minus sign (U+2212) and tabular figures.
  - MYR is the default; other currencies show their ISO code.
- **Buildable in Expo SDK 58 / React Native:**
  - No CSS-only tricks that RN can't do (e.g. backdrop blur everywhere is costly; say so if you use it).
  - Prefer system fonts or one Google font that is also available in Expo.
- **No invented features.** No cloud, no login, no budgets or charts beyond simple daily totals. v1 is on-device only.
- **Don't touch app source** (`src/`, `modules/`). This is design only.
- Stay inside your worktree. Commit on your branch, push your branch only (`git push -u origin <branch>`). Never push to main.

## Done =

- `index.html` opens and every screen is reachable, in light and dark, EN and MS.
- `RATIONALE.md` is written.
- Committed and pushed to your branch.
- Your final message lists:
  - the files
  - the three strongest ideas in your variant
  - one thing you'd steal from another direction
