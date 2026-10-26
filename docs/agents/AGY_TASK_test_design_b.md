# AGY TASK: hands-on test of design B on the emulator

Kimi rebuilt the app in design B on `feat/design-b`. You are the **tester, not the fixer**: don't change app code. Find what is broken, ugly or confusing before the user installs it on their phone.

## Setup
- Your worktree: `~/dev/payping-lite-wt/test-b`, branch `test/design-b`, tracking `origin/feat/design-b`. Pull before you start.
- Build: `npx expo prebuild --platform android`, then `cd android && ./gradlew assembleRelease`. Install on **emulator-5554** with `adb install -r`.
- Grant the listener: `adb shell cmd notification allow_listener com.paypingmy.app/expo.modules.paypingcapture.PayPingListenerService`.
- Fake payments: `adb shell cmd notification post -t "<title>" <tag> "<text>"`. Pick the posting app (Shell) in the app picker. Use realistic Malaysian texts in both directions, e.g. "You've received RM 45.00 from AHMAD BIN ALI", "Payment of RM 23.90 to ZUS Coffee is successful", "RM -5.00 refunded", plus one with no amount.
- Design reference: `git show origin/design/ab-B-kimi:design/ab/B-kimi/index.html` and `RATIONALE.md`.

## Test (screenshot every finding)
1. **First run:** all 5 Android steps. Check that Run in Background opens Android's "allow background" dialog, and that the status updates after you return.
2. **Capture → Today:**
   - Each posted payment appears with the right direction, amount and payee.
   - Totals and counts add up.
   - The "Spoken:" line matches `adb logcat -s PayPingTTS` and the announcement text.
   - Replay works.
3. **Screen off:** run `adb shell input keyevent 26` to turn the screen off, then `adb shell dumpsys deviceidle force-idle`. Post a payment, wait, then check logcat for "Announcing" with a timestamp close to the post. Finish with `adb shell dumpsys deviceidle unforce`.
4. **Fixing a wrong payment:** flip on Today and History; edit amount and payee; delete with confirmation. Totals must update straight away.
5. **History:** search, every filter, empty results, CSV export (the share sheet appears).
6. **Bank Rules:** toggle, Add Bank Rule from a no-amount capture (the teach wizard end to end), import JSON, generic rule edit and reset.
7. **Settings:**
   - Every switch and chip survives an app restart.
   - What to Say: each preset plus custom wording with [brackets]. The preview text matches what is spoken.
8. **Look and feel**, on every screen:
   - Light, dark, **Malay**, and font scale **2.0** (`adb shell settings put system font_scale 2.0`; reset to 1.0 afterwards).
   - Check for overlapping or clipped text, labels cut by the tab bar, tiny text, touch targets under 48 dp, and contrast.
   - The font must be **Manrope**, not Roboto. Compare the letters y, g and a.
9. **Regression run:** run `scripts/e2e.sh` and report the pass/fail of each Maestro flow.

## Deliverable
- `docs/agents/AGY_QA_design_b.md` with a table: # | screen | severity (blocker/major/minor) | what you saw | how to reproduce | screenshot path.
- Screenshots go in `design/qa-b/`.
- Commit both on `test/design-b` and push that branch only. **Never push main or feat/design-b.**
