# Android E2E flows

Six Maestro flows cover onboarding, parser import, capture display, review, parser creation, and Malay UI. `00-setup-shell.yaml` is a shared fresh-install setup used before flows 02–06. `scripts/e2e.sh` builds and installs the release APK and E2E notifier, resets app data per flow, grants Notification Access, selects the notifier, posts notifications between Maestro invocations, and runs all flows in order.

The notifier in `e2e/notifier/` is a minimal Android app used only by these tests. Android's `com.android.shell` package has no launcher activity, so PayPing's launcher-based app picker cannot select it. The notifier posts real notifications from its own package instead, exercising the same native listener path.

The flows use the stable IDs `parser-add`, `today-total-received`, `wizard-token-amount`, `wizard-token-counterparty`, and `capture-confidence-high`, with accessibility labels for the remaining actions.

Onboarding's Notification Access grant is performed by the runner before app launch, so the flow advances rather than interacting with the system settings page.

## Syntax check

```bash
export JAVA_HOME="$HOME/.local/jdk/jdk-17.0.21+9"
for flow in e2e/*.yaml; do
  "$HOME/.local/maestro/bin/maestro" check-syntax "$flow"
done
bash -n scripts/e2e.sh
```

## Run

```bash
ANDROID_SERIAL=emulator-5554 scripts/e2e.sh
```

Overrides: `ANDROID_SERIAL`, `ADB`, `APK`, `MAESTRO`, and `JAVA_HOME`.
