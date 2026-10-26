# Real-notification fixtures (anonymised)

These fixtures come from the maintainer's own notification history: Maybank2u, Touch 'n Go, HSBC and Google Wallet, captured on Android from 2025 to 2026, 3,131 unique notifications. They cover **every format seen in that history**, with up to 3 examples per format. They were **anonymised** before being committed:
- people's names were replaced with a fixed pool of fake names
- merchants were replaced with fake shop names, except well-known chains and generic text
- amounts were jittered ±40%, keeping their formatting
- card/account tails, reference numbers and street names were randomised or replaced

Each case has the same shape as `parser-library/fixtures`, plus `"real": true`. `expect` doesn't pin a `ruleId`, so any parser that produces the right result passes:
- `direction`: `in` / `out` / `info`
- `amountMinor`: in minor units of the currency
- `currency`: only when not MYR
- `counterparty`: when present
- `confidence`: `high` = a parser for this app should match it; `none` = must NOT be logged as money (marketing, OTPs, points, declined cards)

`scripts/qa/reference_labeller.py` is the Python reference labeller that produced `expect`. Claude also uses it to cross-check the engine against the full private corpus, which never leaves the maintainer's machines.

Important negative cases:
- marketing text that contains amounts ("Get up to RM20K coverage from just RM21/month") must not be logged
- Google Wallet `DECLINED – RM…` is `info`
- refunds (`-RM12.52 was refunded…`) are `in`
- TNG reward points are `info`
