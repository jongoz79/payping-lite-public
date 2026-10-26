# Real-fixture and currency addition

Merged main and the committed real-ready `feat/rules` parsers, keeping the parallel worktree read only. Extended Kotlin conformance to load every JSON array in both `parser-library/fixtures` and `parser-library/fixtures-real`. It compares supplied expected fields without requiring a ruleId; missing expected currency defaults to MYR. Optional counterparty expectations remain optional, matching TypeScript's contract.

Implemented currency from the optional named `currency` group in the amount regex, using the same matched text/source as the amount. Mapping includes RM/MYR→MYR, JP¥/¥→JPY, NZ$→NZD, S$/SGD→SGD, US$/$→USD, A$→AUD, £→GBP, €→EUR and any other three-letter code (including IDR) passed through uppercase. Missing groups and unknown non-code symbols default to MYR. JPY and IDR use the specified simplified two-decimal minor units.

The real-ready schema also required Kotlin support for `{pattern,source}` extraction objects, hyphenated rule IDs and optional rule confidence. Added those and matched the TypeScript counterparty/reference cleanup. Explicit `confidence: none` rules suppress false money matches. Import validation now accepts that schema and mirrors the shared nested-quantifier rejection; the Android runtime watchdog remains in place. Missing optional named groups return null in the regex worker rather than killing it.

TTS keeps MYR wording (`Paid RM 12.50 to Cafe`) and speaks non-MYR codes after amounts (`Paid 790 JPY to Cafe`, `Paid 12.05 USD to Cafe`). No schema migration was needed: capture/reparse already persist the currency column.

## Verification

```sh
source ~/.bashrc
./android/gradlew -p android :payping-capture:testDebugUnitTest :payping-capture:connectedDebugAndroidTest :app:assembleDebug -PreactNativeArchitectures=x86_64 --continue --console=plain
npx tsc --noEmit
npx expo lint
npm test -- --runInBand
```

All passed:

- **352 real notifications**: Maybank2u 150, TNG 58, HSBC 28, Google Wallet 116.
- **61 shared fixtures**: all expected fields and default MYR assertions pass.
- **9 additional JVM tests**: existing 6 safety cases plus 3 currency mapping, extraction-source and spoken-text cases. Total **422 JVM tests**, zero failures.
- **Android instrumentation 1/1**: preserved previous migration/reparse/timeout checks and added actual Binder-worker parsing of `JP¥790.00 with Card`, title-only counterparty extraction, `JPY` / `79000` persistence and `Paid 790 JPY to Cafe` text. Existing MYR parsers without a currency group still work.
- **443 TypeScript tests**, clean typecheck and lint.
- **x86_64 Android APK assembly** succeeded.

Community parsers remain test/import data and are not bundled into the application; only the generic starter is bundled. No Swift implementation, production totals UI or new parser content was authored here. Real-device audible TTS remains part of device QA; spoken text was asserted directly in JVM and Android tests.
