# KIMI TASK: Parser rules, TS engine, fixtures (PLAN.md row 1a)

Read `PLAN.md` first, especially **Parser rules** and **Architecture**, and `AGENTS.md`.

## Goal
Port the old PayPing parsers into **data** (`rules/banks/*.json`) plus a small **TypeScript reference engine** (`src/parser/`), with fixture-based tests. Kotlin and Swift engines will be built later against the same fixtures, so the rule format and fixtures are the contract. Keep them simple and portable.

## Inputs (read-only)
- Old parsers: `~/dev/payping/lib/parsers/{touchngo,mae,cimb,rhb,mypb,qrpaybiz,generic}.ts`, `utils/amountExtractor.ts`
- Old tests, a source of real sample text: `~/dev/payping/lib/parsers/__tests__/*.test.ts`
- Package names: `BANKING_APPS` in `~/dev/payping/modules/notification-listener/android/src/main/java/com/paypingmy/notificationlistener/PayPingNotificationListener.java`. These are the **real** package names; some in the old TS parsers are wrong, so use the Java list.
- Generic keyword approach: `~/dev/payping-ref/actua/app/src/main/java/com/azimulkabir/actua/data/importing/NotificationImport.kt` (`FinancialMessageParser`). It's GPL, so you can adapt it with an attribution comment.

## Deliverables
1. `rules/schema.json`: a JSON Schema for a bank rules file (format in PLAN.md).
2. `rules/banks/<bank>.json` for touchngo, mae, cimb, rhb, mypb, qrpaybiz. Every pattern in the old parsers, including special cases like TNG "Cash In Successful", becomes a rule with a stable `id` (`<bank>.<name>.v1`) and a `priority`.
3. `rules/generic.json`: default MYR amount patterns plus `debitKeywords` / `creditKeywords`.
4. `rules/fixtures/<bank>.json` and `rules/fixtures/generic.json`. For each one:
   - at least one positive case per rule, plus negative cases (marketing or OTP messages that must **not** log an amount)
   - case shape: `{ name, platform, sourceApp, title, body, expect: { ruleId, direction, amountMinor, counterparty?, reference?, confidence } }`
   - if you have to invent sample text, mark it `"synthetic": true`
5. `src/parser/engine.ts` exporting `parse(input: { platform, sourceApp, title, body }, rules, generic) => ParseResult`, using exactly the behaviour in PLAN.md:
   - normalise (NFKC, mojibake fix, whitespace)
   - choose rules by package or iOS app name, highest priority first
   - all `match` regexes must hit (case-insensitive)
   - named-group `extract`; `amount` required unless the direction is `info`
   - fall back to the generic parser
   - Amounts are integer **sen** (`amountMinor`); never use floats for money.
6. **Portable regex only:** no lookbehind and no JS-only flags. Named groups use `(?<name>…)`, which Kotlin and Swift both support. Write that constraint into `rules/schema.json`'s description.
7. Tests: add `jest-expo` (via `npx expo install`) and a `test` script in package.json. `src/parser/__tests__/fixtures.test.ts` runs **every** fixture file through the engine. Also add a test that validates every rules file against `rules/schema.json`.
8. `src/parser/tts.ts`: `ttsText(result) => string | null`, following the TTS text rules in PLAN.md.

## Out of scope
UI, the DB, native code. Don't touch `modules/`.

## Done when
- `npm test` passes.
- `npx tsc --noEmit` and `npx expo lint` are clean.
- Commit on branch `feat/rules`, and push.
- Reply with a short report: how many rules and fixtures per bank, which old patterns you couldn't port or weren't sure about, and which fixtures are synthetic.
