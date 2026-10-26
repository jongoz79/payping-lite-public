#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ADB=${ADB:-adb}
SERIAL=${ANDROID_SERIAL:-emulator-5554}
MAESTRO=${MAESTRO:-"$HOME/.local/maestro/bin/maestro"}
APK=${APK:-"$ROOT/android/app/build/outputs/apk/release/app-release.apk"}
NOTIFIER_APK="$ROOT/e2e/notifier/app/build/outputs/apk/debug/app-debug.apk"
export JAVA_HOME=${JAVA_HOME:-"$HOME/.local/jdk/jdk-17.0.21+9"}
export MAESTRO_CLI_NO_ANALYTICS=${MAESTRO_CLI_NO_ANALYTICS:-true}

if [[ ! -f "$APK" ]]; then
  echo "Release APK not found: $APK" >&2
  exit 1
fi
if [[ ! -x "$MAESTRO" ]]; then
  echo "Maestro not found: $MAESTRO" >&2
  exit 1
fi

a() { "$ADB" -s "$SERIAL" "$@"; }
maestro_test() { "$MAESTRO" test "$1"; }
grant_listener() {
  a shell cmd notification allow_listener com.paypingmy.app/expo.modules.paypingcapture.PayPingListenerService
}
reset_app() {
  a shell pm clear com.paypingmy.app
  grant_listener
  a shell dumpsys deviceidle whitelist +com.paypingmy.app
}
post() {
  local title=$1 tag=$2 body=$3
  a shell "am start -W -n com.paypingmy.e2e.notifier/.MainActivity --es title '$title' --es tag '$tag' --es body '$body'" >/dev/null
}

"$ROOT/android/gradlew" -p "$ROOT/e2e/notifier" :app:assembleDebug
a install -r "$APK"
a install -r "$NOTIFIER_APK"
a shell pm grant com.paypingmy.e2e.notifier android.permission.POST_NOTIFICATIONS

FAILED=0
run_flow() { maestro_test "$1" || FAILED=1; }

reset_app
run_flow "$ROOT/e2e/01-onboarding.yaml"

reset_app
maestro_test "$ROOT/e2e/00-setup-shell.yaml"
run_flow "$ROOT/e2e/02-paste-parser.yaml"

reset_app
maestro_test "$ROOT/e2e/00-setup-shell.yaml"
run_flow "$ROOT/e2e/02-paste-parser.yaml"
post "E2E Pay" "e2e-1" "RM 12.50 from E2E Customer"
run_flow "$ROOT/e2e/03-capture-shows-on-today.yaml"

reset_app
maestro_test "$ROOT/e2e/00-setup-shell.yaml"
post "E2E Review" "e2e-2" "You received RM 9.50 from E2E Customer"
run_flow "$ROOT/e2e/04-needs-check.yaml"
post "E2E Review Flip" "e2e-flip" "You received RM 9.50 from E2E Customer"
run_flow "$ROOT/e2e/04b-flip.yaml"

reset_app
maestro_test "$ROOT/e2e/00-setup-shell.yaml"
post "E2E Wizard" "e2e-3" "You received RM 7.25 from E2E Customer"
run_flow "$ROOT/e2e/05-wizard.yaml"

reset_app
maestro_test "$ROOT/e2e/00-setup-shell.yaml"
run_flow "$ROOT/e2e/06-malay.yaml"

exit "$FAILED"
