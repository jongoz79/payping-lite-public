# KIMI TASK: negative, fuzz and stress tests for the parser engine and validator

Work in `/home/afo/dev/payping-lite-wt/rules` (branch `feat/rules`). Run `git merge main` first. The engine and validator run on user-supplied JSON and regexes, and every notification on the phone passes through them, so they must never crash, hang or log wrong money.

## Add `src/parser/__tests__/robustness.test.ts`, using `fast-check` (install with `npx expo install fast-check -- --save-dev`, or `npm i -D` if expo install refuses)
1. **Never throws:** for 2,000 random inputs (arbitrary unicode including emoji, RTL, NUL, lone surrogates, 0–20,000 chars, random `sourceApp`), `parse()` returns a valid `ParseResult` with all the starter parsers loaded, and `validateParser` / `validateGeneric` never throw on arbitrary JSON values (`fc.jsonValue()`).
2. **Money invariants:** whenever `direction` is `in` or `out`, `amountMinor` is a non-negative safe integer and `currency` is a 3-letter code. `info` always means `amountMinor === null`.
3. **No marketing money:** for 500 generated promo sentences ("Get up to RM{n} …", "Win RM{n}!", "cashback RM{n}", "from just RM{n}/month", in English and Malay), sent from every starter parser's package, the result is never `in` or `out` with high confidence.
4. **Length cap:** a 1 MB body completes in < 50 ms and only the first 4,000 chars are considered (an amount placed after char 4,000 is not found).
5. **Catastrophic regex:** the validator rejects a list of at least 15 known-evil patterns (`(a+)+$`, `(a|aa)+`, `(.*a){20}`, `([a-zA-Z]+)*`, …). For any pattern the validator accepts, running it against `'a'.repeat(5000)+'!'` must take < 50 ms. Test this on 300 generated "plausible user" patterns built from pieces like `RM\\s?`, `(?<amount>[\\d,]+\\.\\d{2})`, `.+?`, `\\s*`, literal words.
6. **Throughput:** parsing all fixtures (synthetic + real) ×20 must take < 2 s on this machine. Print the per-notification mean in the test output.
7. **Normalisation:** NFKC/NBSP/zero-width characters/mojibake variants of every real fixture body (insert U+200B, swap `'`↔`’`, NBSP for spaces) must still parse to the same amount and direction.

Fix any engine or validator bugs these tests find (that's the point), keeping all existing tests green. Note each bug found in the commit message.

**Done when:** `npm test`, `tsc` and lint are green. Commit and push, then report which bugs the tests found and how you fixed each.
