# Overnight report: PayPing Lite (2026-10-24 → 25)

You asked me to build autonomously toward Android and iOS test installs, with unit, negative and stress tests, and to scrutinise the UI/UX. This is what got done, what's verified, and the steps that need you.

## TL;DR

- **The app is built.** `main` has the full Expo app:
  - native Android capture (Kotlin) and iOS capture (Swift App Intent)
  - user-owned **Bank Rules** (parsers), with no hard-coded banks
  - Today / History / Bank Rules / Settings, English and Malay, accessibility fixes, the new RM icon
- **Tests** (all verified on `main`): **925 JS**, **437 Android JVM** and **13 Swift XCTests** (on Linux). The 6 Maestro end-to-end flows were run on the emulator: 5 passed on the first run, the 6th (the wizard) failed, was fixed, and then passed.
- **Stress test** on the emulator:
  - **300 of 300 burst notifications** captured and parsed, with p95 latency of 322 ms and zero worker crashes.
  - Killing the capture process mid-burst lost nothing that had already been saved.
- **Your real data:** I tested the parsers on your 3,131 real notifications from afo_DB (M2U, TNG, HSBC, Google Wallet). **All 3,076 money notifications are parsed correctly**: amount, direction, currency and name. 352 anonymised samples are committed as test fixtures. The raw data never left your machines.
- **What I couldn't do:** I couldn't build or upload to Play internal testing or TestFlight, because that needs your **Expo / Apple / Play logins**. See "Your steps" below; it's about 15 minutes.

## Your steps in the morning

1. `cd ~/dev/payping-lite && npx eas-cli@latest login` (account `apau96`, the same EAS project as the old app, so the Play signing key is reused).
2. **Android test build:** `npx eas-cli build -p android --profile preview` gives an installable APK, with no INTERNET permission.
   - For Play internal testing: `--profile production`, then `npx eas-cli submit -p android`.
   - First set the versionCode above the old app's: check Play Console, then run `npx eas-cli build:version:set`.
3. **iOS TestFlight:**
   - `npx eas-cli build -p ios --profile production`. EAS will ask for your Apple Developer login and create the certificates.
   - Then `npx eas-cli submit -p ios`.
   - This first iOS build is also the first time the Swift App Intent code gets compiled by Apple's tools. See `docs/agents/IOS_CAPTURE_REPORT.md` → "Check on the first EAS build" (7 items).
4. **Borrowed iPhone (iOS 27):** follow `docs/ios-shortcut-setup.md`, and check that the "When I receive a notification" trigger fires for TNG/MAE with Run Immediately while locked.
5. **Store copy** is ready to paste: `store/` (Play listing en/ms, data safety, permissions justification, privacy policy, App Store listing, TestFlight notes). Host `store/privacy-policy.html` somewhere public (the Play listing needs a URL).
6. **Store screenshots:** take them on **your real phone** with TNG/M2U installed (the emulator shows "Shell"/"E2E Notifier" as the source app). Then run `design/store-shots/` to frame them.

## What's where

| Area | Location | Status |
|---|---|---|
| Plan / decisions | `PLAN.md` | Kept current all night; read this first |
| Android capture | `modules/payping-capture/android` | Separate `:paypingCapture` process, DB-loaded parsers, installed-apps picker, regex sandbox process, ducking TTS |
| iOS capture | `modules/payping-capture/ios` | Swift engine + store tested on Linux; App Intent / Shortcuts unverified until EAS |
| Parser engine (TS) | `src/parser` | Validator with stable error codes, fuzz-hardened |
| Starter Bank Rules | `parser-library/parsers` | maybank2u, touchngo, hsbc, google-wallet tested on real data; cimb/rhb/mypb/qrpaybiz synthetic |
| Fixtures | `parser-library/fixtures`, `fixtures-real/`, `validation-fixtures.json` | Shared by TS, Kotlin and Swift |
| UI | `src/app`, `src/components` | 4 tabs, onboarding, wizard, en/ms |
| E2E | `e2e/`, `scripts/e2e.sh` | Maestro; `e2e/notifier` is a tiny helper app that posts test notifications |
| QA tools | `scripts/qa/simulate.sh`, `scripts/qa/reference_labeller.py` | adb notification simulator; Python reference labeller |
| Parser website | `site/` (`site/dist` is ready to host) | Library + guide in en/ms + GitHub issue template |
| Store / legal | `store/` | en + ms |
| Brand | `design/brand`, `assets/images` | RM-coin + sound-waves icon, splash, Play graphic |

## Decisions I made for you (change any of them)

- **UI:**
  - 4 tabs (review lives on Today, not its own tab).
  - The "Parsers" tab is now called **"Bank Rules"**, and the wizard button is **"Teach PayPing this format"**, to avoid jargon.
  - Brand green replaces blue as the accent colour.
- **Onboarding** has no "add parsers" step; users are prompted when the first unknown notification arrives.
- **Release builds have no INTERNET permission** (`PAYPING_OFFLINE=1` in `eas.json`). Debug builds keep it for Metro.
- **iOS** declares `usesNonExemptEncryption: false`, so TestFlight won't ask the export-compliance question.
- **TTS** follows the app language (English or Malay) and ducks music (on by default). Review auto-clean is off by default (7/30/90 days available). The restricted-settings help is always visible in Troubleshooting.
- **App icon:** a ringgit coin with sound waves, replacing the old "$" + paper plane.

## Bugs found and fixed overnight (QA highlights)

- **Validator vs wizard (P0):** the "Teach PayPing" wizard generated rules that the native validator rejected, and the preview said "No match found" against its own notification. Fixed, and covered by a round-trip test over every real fixture plus E2E flow 05.
- **iOS UI would have shown no data:** the DB client returned null on iOS. Fixed when I merged the iOS work.
- **Regex denial-of-service:** Android's regex engine can't be interrupted, so user rules now run in a supervised process. Kimi's fuzzing also found 5 classes of slow regex, which the validator now rejects.
- **Generic parser:** Malay "daripada/kepada" names, `RM 0.00` no longer logged as money, and negative amounts handled.
- **Real-data parsing:** truncated names ("S.A.Y.A EMPIRE" → "S", "SDN. BHD."), and TNG "DuitNow Payment to X" names taken from the title.
- **Stress tests:** Android caps one app at 50 active notifications and about 5 per second (that was my test harness, not the app). Real app issues: regex-worker restarts under bursts, and an in-memory queue. See "Codex's last task" below.
- Memory: two emulators plus Gradle exhausted 15 GB. Claude Code killed one of my builds, and I didn't restart it. I ran one emulator at a time after that.

## Codex's last task (capture performance + validator parity)

Report: `docs/agents/CAPTURE_PERF_REPORT.md`. The numbers are in `docs/qa/capture-perf-results.json`.

- **Raw first:** each notification is saved before it's parsed. On restart, unparsed rows are re-parsed; a timeout gets one retry and stays visible in "Check unconfirmed payments".
- **Regex worker:** it stays warm, gets one Binder call per notification, and is budgeted by CPU time (50 ms per regex, 250 ms per notification). A parser is flagged slow only after 3 consecutive timeouts.
- **Emulator proof:**
  - **300/300** burst notifications (p95 322 ms), and **100/100** at 5 per second (p95 256 ms).
  - 0 timeouts and 0 worker deaths.
  - The capture process was killed mid-burst, and **15 of 15** pending rows were recovered with no app UI open.
- **Burst speech:** 300 payments were announced in **4 summaries** ("58 payments received, total …"). Capture never waits for speech.
- **Parity:** Kotlin and Swift validators match TypeScript on all **99** shared validation cases. English and Malay announcement text matches across all 3 engines (34 shared cases), and Android picks an offline `ms-MY` voice for Malay.
- **Android limit, not ours:** Android itself sheds notification bursts above about 5 per second per sending app, before any listener sees them. Real bank apps don't post that fast.

## Known gaps / not verified

- Nothing has run on a **real phone** yet: OEM battery killers, real bank notifications live, audible TTS.
- iOS has never been compiled by Apple's toolchain (first EAS build), and the iOS 27 trigger hasn't been tested.
- cimb/rhb/mypb/qrpaybiz starter rules are synthetic; real samples are needed.
- Play versionCode: check the old app's highest code first.
