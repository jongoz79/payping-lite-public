# AGY TASK: store listings, privacy policy, tester notes (needed for Play testing + TestFlight)

Work in `/home/afo/dev/payping-lite-wt/ux` (branch `design/ux-v1`). Run `git merge main` first. The user will upload these in the morning, so write them ready to paste, in **English and Bahasa Melayu**. Put everything in `store/`.

The facts are in `PLAN.md`: free, GPL-3.0, no account, no network calls, no ads, no analytics, all data on the device. Android reads notifications only from apps the user picks. iOS uses a Shortcuts automation on iOS 27. Version 3.0.0 replaces the old "PayPing MY" listing (same package `com.paypingmy.app`). The old app had accounts and a subscription; this one doesn't.

## Deliverables
1. `store/play-listing.md`:
   - title (≤30 chars), short description (≤80), full description (≤4,000), in en and ms
   - "What's new in 3.0.0" (≤500), which must explain the change from the old app: no login, no subscription, data stays on the phone, and old cloud features are removed
   - category suggestion, tags
2. `store/play-data-safety.md`: the answers for every Data safety form question. "No data collected / shared." Notification content is processed **on device only**, so per Google's definitions it isn't "collected". Say why for each answer.
3. `store/play-permissions.md`:
   - The text for the Notification Listener use. In Play Console, apps using `BIND_NOTIFICATION_LISTENER_SERVICE` may be asked to explain the use; write a ≤500-char justification plus a short demo-video script showing the core flow.
   - A list of every permission in the merged manifest. Find it after `npx expo prebuild -p android` in a scratch copy, or from `android/app/src/main/AndroidManifest.xml` if it exists, and explain each.
4. `store/privacy-policy.md` (also `store/privacy-policy.html`, a simple standalone page the user can host): plain-language, GPL project, no collection, on-device storage, how to delete data, contact = the GitHub repo issues page (`https://github.com/jongoz79/payping-lite/issues`).
5. `store/app-store-listing.md` (iOS): name, subtitle (≤30), promotional text, description, keywords (≤100 chars), support URL placeholder, **App Privacy = "Data Not Collected"**, age rating answers, and the export-compliance answer (no non-exempt encryption → `ITSAppUsesNonExemptEncryption = false`).
6. `store/testflight-notes.md`: "What to Test" text (≤4,000), plus steps for testers to set up the iOS 27 Shortcuts automation, and a Play **internal testing** tester guide for Android: install, grant Notification Access including restricted settings, pick apps, and test with a real payment.
7. Screenshot plan `store/screenshots.md`: which 6 screens, in which state, with captions in en and ms. Kimi is building the real UI now, and you'll capture the screenshots from the emulator in a later QA pass.

Keep the claims honest. Don't promise bank support; parsers are user-managed.

**Done when:** committed and pushed. Reply with a summary.
