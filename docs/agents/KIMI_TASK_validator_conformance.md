# KIMI TASK: shared validator conformance fixtures

There are three validators: TS (`src/parser/validate.ts`, used by the UI), Kotlin (`ParserValidation.kt`, native import/save) and Swift (iOS, in progress). They must accept and reject exactly the same parsers, or a user could save a parser in the UI that the native engine then refuses, or the reverse. Your fuzz hardening made TS stricter than Kotlin.

Work on `feat/rules` (`git merge main` first).

1. **`parser-library/validation-fixtures.json`**: an array of `{ name, kind: "parser"|"generic"|"regex", input, expect: { ok: boolean, codes: string[] } }`.
   - Cover every rejection rule your validator has: schema errors, bad id, missing amount group, lookbehind, nested quantifiers, `(a|aa)+`, adjacent unbounded atoms, group-boundary repetition, unanchored leading greedy runs, length caps, JSON depth.
   - Cover **plausible valid patterns that must be accepted**: at least 40, taken from the real starter parsers and typical user patterns like `RM\s?(?<amount>[\d,]+\.\d{2})` and `from (?<counterparty>[^.]+)`.
2. **Stable error codes:** add a machine-readable `code` (e.g. `REGEX_NESTED_QUANTIFIER`, `REGEX_LOOKBEHIND`, `MISSING_AMOUNT_GROUP`, `BAD_ID`…) to every validator error, alongside the plain-language message. Fixtures assert codes, not English text.
3. A TS test that runs the file. Also write `parser-library/VALIDATION.md`: one line per rule and code, in plain language, so Kotlin and Swift can mirror the rules exactly.
4. **Loosen anything you over-tightened:** if a reasonable user pattern gets rejected (for example a simple `.+?` between literals), loosen the rule rather than the fixture. Normal users must not hit false rejections.

**Done when:** tests, tsc and lint are green. Commit, push, and report the list of codes.
