# CODEX TASK: code review of design B (`feat/design-b`)

Kimi rebuilt every screen in design B. Review the diff `main...origin/feat/design-b` for **regressions and correctness**, not taste. Don't change app code. Report only.

Work in `~/dev/payping-lite-wt/review-b` on branch `review/design-b`, created from `origin/feat/design-b`.

## Check
1. **Behaviour preserved:** every action from main still exists and still calls the same db/native functions:
   - flip/correct, edit, delete
   - review actions
   - parser create/import/edit/reparse
   - CSV export, clear, reset
   - What to Say, background access
   - every setting key
   
   Diff the handlers, not the styles.
2. **Shared engine untouched:** there should be no changes under `src/parser`, `src/db`, `modules/`, `parser-library/` or `app.config.js` other than what a screen needs. Flag anything that changes parsing, TTS text or stored data.
3. **i18n:** every new key exists in en and ms. No hard-coded user-visible English in components.
4. **Accessibility:**
   - accessibilityLabel/role on icon-only buttons
   - 48 dp hit areas
   - nothing that clips text at large font scale, such as fixed heights on text containers or numberOfLines without ellipsis on important text.
5. **Performance:**
   - FlashList kept for long lists, with pagination intact
   - no heavy work in render
   - no new re-render loops (state set during render, effects without deps).
6. **Offline:** fonts are bundled at build time. No network fetches and no new permissions (check `npx expo prebuild` and the merged AndroidManifest).
7. **Tests:**
   - `npx jest`, `npx tsc --noEmit` and `npm run lint` are green.
   - List any test that was weakened or deleted rather than updated.

## Deliverable
`docs/agents/CODEX_REVIEW_design_b.md` with findings ranked blocker/major/minor. Each finding has `file:line`, what is wrong, and a concrete fix. Commit and push `review/design-b` only.
