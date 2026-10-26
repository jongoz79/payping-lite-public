# KIMI TASK v2: parsers are user-owned (revises KIMI_TASK_rules.md)

The product direction changed. In your worktree run `git merge main`, then re-read `PLAN.md` § **Parsers: user-owned data, three engines** and the `parser` table. Summary: **the app ships with no app-specific parsers.** Users paste or import parser JSON files, edit them, test them and share them. Your bank files become **starter parsers for a future website**, not something bundled in the app.

Finish your current test/lint pass first, then apply these changes on `feat/rules`:

1. **Move `rules/` to `parser-library/`**: `parsers/*.json` (was `banks/`), `fixtures/*.json`, `schema.json`, `generic.default.json` (was `generic.json`).
2. **Schema, parser file top level:**
   - `bank` becomes **`id`** (pattern `^[a-z][a-z0-9_-]*$`), and `label` becomes **`name`**.
   - Add `schemaVersion` (const `1`), `version` (integer, ≥1), optional `author` and `description`.
   - Keep `androidPackages`, `iosAppNames` and `rules` as they are.
   - Update every parser and fixture file to match (`expect.ruleId` is unchanged).
3. **`src/parser/validate.ts`**: `validateParser(json: unknown): { ok: true, parser } | { ok: false, errors: string[] }`.
   - Errors must be **plain language for non-technical users**. Examples: "Rule 2 (touchngo.received.v1): the amount pattern needs a named group (?<amount>…)". "The id 'Touch NGo' can only use lowercase letters, numbers, - and _".
   - Also compile every regex and report the ones that won't compile, plus any that use lookbehind or other non-portable syntax.
   - Do the same for the generic config with `validateGeneric`.
4. **Engine API:**
   - `parse(input, parsers: Parser[], generic: GenericConfig)`. The caller passes the parsers; the engine must not import any JSON itself.
   - Cap the title and body at 4,000 characters each before matching.
   - Export `matchingParsers(input, parsers)` for the editor's test panel.
5. **Tests:**
   - The fixture test loads parsers from `parser-library/parsers` and passes them in.
   - Add validator tests with a few broken parser files (`parser-library/invalid/*.json`). Each test checks for specific readable messages.
6. **Template errors:** the TypeScript and lint errors in `src/components/app-tabs.web.tsx` and `src/hooks/*.web.ts` come with the Expo template. A minimal fix is fine, but don't go further; those screens will be replaced.

For inspiration, look at how actua lets users edit the generic keyword profile: `~/dev/payping-ref/actua/app/src/main/java/com/azimulkabir/actua/data/importing/NotificationImport.kt` (`FinancialMessageProfile`, plus `profile()` / `saveProfile()`). actuali's iOS parser has a regex fallback: `~/dev/payping-ref/actuali/Actuali/Actuali/Services/TransactionTextParser.swift` (MIT).

**Done when:** `npm test`, `npx tsc --noEmit` and `npx expo lint` are clean. Commit and push `feat/rules`, then reply with the report from the original brief plus a list of the validator messages you implemented.
