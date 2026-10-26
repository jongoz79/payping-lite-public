# KIMI TASK v3: make the starter parsers pass REAL notifications (after rules v2)

Do this right after `KIMI_TASK_rules_v2.md`, on `feat/rules`. Run `git merge main` first: it brings `parser-library/fixtures-real/` (352 anonymised real notifications) and the PLAN currency rules.

1. **Engine:** support the optional `currency` named group, with the symbol/code → ISO mapping in PLAN.md. `ParseResult.currency` is then whatever was extracted, not always `MYR`. Update `tts.ts` to say the code when it isn't MYR.
2. **Parsers:** in `parser-library/parsers/`, **write or replace** the starter parsers so that **every case in `fixtures-real/*.json` passes**:
   - `maybank2u.json` (`com.maybank2u.life`): replace your MAE parser, which used invented formats. Real titles are `Maybank2u: Card Transaction | Transfer | Scan & Pay | Funds Received`. Everything else from that app (marketing, approvals, surveys) must come out as `info`/`none`, **including marketing text with RM amounts in it**.
   - `touchngo.json` (`my.com.tngdigital.ewallet`): toll, transfer, DuitNow payment/transfer, received money, parking, "Payment To:", Alipay+, points (info).
   - `hsbc.json` (`my.com.hsbc.hsbcmalaysia`): credit card charged (including `supp`), DuitNow funds received.
   - `google-wallet.json` (`com.google.android.apps.walletnfcrel`): **the title is the merchant**, so the counterparty comes from the title (add an `extract` option for that if the schema can't express it). Handle foreign currencies, `DECLINED – …` → info, refunds `-RM… was refunded` → in, and "Preparing your receipt" → info.
   - Keep cimb/rhb/mypb/qrpaybiz as they are (still synthetic) and say so in each file's `description`.
3. **Fixture runner:** load `fixtures-real/` as well. In real cases, `expect` has no `ruleId`; compare direction, amountMinor, currency (default MYR), counterparty (when present) and confidence.
4. `scripts/qa/reference_labeller.py` (Python) is the reference that produced those expectations. If you're unsure what a case expects, read it.

**Done when:** all synthetic and real fixtures pass, plus tsc and lint. Commit, push, and report the pass counts per file.

5. **Validator: catastrophic regexes.** The JS engine also runs in the UI (live previews), where a pathological pattern freezes the app. In `validateParser`/`validateGeneric`, reject **nested quantifiers**: a quantified group whose contents contain a quantifier, e.g. `(a+)+`, `(.*)*`, `(\w+\s?)*`, `(?:x+|y)+`. Use the plain message "Rule N: the <field> pattern repeats a repeating part (like (a+)+). This can freeze the app. Simplify it." Add invalid fixtures and tests for it, and make sure none of the starter parsers trip it.
