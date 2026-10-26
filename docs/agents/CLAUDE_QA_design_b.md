# Claude QA: design B screenshots (round 1)

Good overall: structure, colours, dark mode, Malay and 200% text match B, and the spoken line is the real `ttsText` output. Fix these, then retake the screenshots.

## Must fix
1. **Manrope isn't rendering anywhere.** Every screenshot shows Roboto: compare "y", "g" and "a" in "Speak Payments Aloud". There are two causes:
   - `Text.defaultProps.style` is **replaced**, not merged, by any explicit `style` prop, so almost every Text loses the family.
   - On Android, fonts loaded at runtime with `useFonts` don't map `fontWeight` onto weight files, so bold text falls back to Roboto.

   Fix:
   - Embed Manrope at **build time** with the `expo-font` config plugin in `app.json`, using `fontDefinitions` with weights 400/500/600/700/800 under one family `Manrope`, so Android gets a real XML font family and `fontWeight` selects the right file. It also works offline. Drop the runtime `useFonts` call if the plugin covers it, so there's no first-frame flash.
   - Apply `fontFamily` explicitly through the shared type styles: a small typography helper or a themed `Text` used by the screens. Don't use `defaultProps`.
   - Verify on a screenshot that it really is Manrope.
2. **Edit payment header** shows the full capture UUID (`#01a17239-2602-…`). Remove it, or show only something human-readable.
3. **History filters take half the screen** (six rows of chips before the first payment). Make them compact: one horizontally scrollable row for direction (In + out / Money in / Money out / Needs check) and one for dates. Put app filtering in that row or in a select. The first payment row should be visible without scrolling on a 6.1" phone at 1.0 scale.
4. **Add Bank Rule:** the parser name defaults to the package name `com.paypingmy.e2e.notifier`. Default to the app label.
5. **Wizard tokens:** a multi-word payee is highlighted as two separate tokens, each labelled "customer / sender name" ("ZUS", then "Coffee"). Merge adjacent tokens of the same field into one highlight with one label.

## Check
6. In `today-dark.png` the "Teach PayPing this format" label wraps onto a second line, but it fits in light mode. Make sure no button label is clipped at 1.0 scale in either theme. Retake once Manrope is in, because the widths will change.
7. In the review item, "Ignore" has no outline while "Fix" has one. Pick one secondary-button style.

## Then
- Re-run `npx jest`, `npx tsc --noEmit` and `npm run lint`. Rebuild the release APK and retake **all** screenshots in `design/screens-b/`.
- Commit, push `feat/design-b`, and write `docs/agents/DESIGN_B_REPORT.md` (add a "QA round 1" section).
