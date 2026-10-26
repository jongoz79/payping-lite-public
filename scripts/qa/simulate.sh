#!/usr/bin/env bash
# PayPing Lite QA: simulate payment notifications on an Android emulator/device via adb.
# Notifications are posted by `com.android.shell`, so select "Shell" in the app picker
# (or run: scripts/qa/simulate.sh select-shell) before running scenarios.
#
# Usage: scripts/qa/simulate.sh <scenario> [count]
#   basic        a handful of realistic MY payment texts (in / out / info / unparseable)
#   dupes        the same notification posted N times within a minute -> expect 1 row
#   burst [N]    N distinct notifications as fast as adb allows (default 300)
#   negative     hostile / odd inputs: huge text, emoji, RTL, null-ish, OTP, zero/neg amounts
#   all          basic + dupes + negative + burst 300
#   counts       print capture row counts by status / direction from the device DB
set -euo pipefail
ADB=${ADB:-adb}
SERIAL=${ANDROID_SERIAL:-emulator-5554}
PKG=com.paypingmy.app
a() { "$ADB" -s "$SERIAL" "$@"; }
post() { # post <tag> <title> <body>
  local tag=$1 title=$2 body=$3
  # single-quote for the device shell; escape embedded single quotes
  local qt=${title//\'/\'\\\'\'} qb=${body//\'/\'\\\'\'}
  a shell "cmd notification post -t '$qt' '$tag' '$qb'" >/dev/null
}
db() { # run sqlite3 against a WAL-safe copy of the app DB pulled from the device
  local tmp; tmp=$(mktemp -d)
  for f in payping.db payping.db-wal payping.db-shm; do
    a exec-out run-as $PKG sh -c "cat \$(find /data/data/$PKG -name $f 2>/dev/null | head -1) 2>/dev/null" > "$tmp/$f" || true
  done
  sqlite3 "$tmp/payping.db" "$1"; rm -rf "$tmp"
}

clear_shell() { # snooze (= remove) every shell-posted notification so later runs are not capped at 50
  a shell 'for k in $(cmd notification list | grep "|com.android.shell|"); do cmd notification snooze --for 86400000 "$k"; done' >/dev/null 2>&1 || true
}
basic() {
  post qa-in-1  "You've received money!"        "You've received RM 12.50 from AHMAD BIN ALI."
  post qa-in-2  "DuitNow Transfer"              "RM1,250.00 has been credited to your account from SITI NURHALIZA. Ref: 88291"
  post qa-out-1 "Payment Successful"            "You have paid RM 8.00 to GRAB MALAYSIA."
  post qa-info  "Cash In Successful"            "Your reload of RM 50.00 is successful."
  post qa-none  "Promo"                         "Get 10% cashback this weekend only!"
  post qa-ms    "Wang diterima"                 "Anda telah menerima RM 30.00 daripada MOHD FAIZAL."
}
dupes() {
  local n=${1:-5}
  for i in $(seq "$n"); do post "qa-dupe" "You've received money!" "You've received RM 77.70 from DUPLICATE TEST."; done
}
burst() {
  local n=${1:-300} t0 t1 run_id
  run_id=$(date +%s%N)
  t0=$(date +%s)
  for i in $(seq "$n"); do
    # Android caps a package at 50 active notifications (NotificationService drops the rest),
    # so rotate 40 tags per run. A fresh prefix avoids the previous run's 24-hour snoozes.
    post "qa-burst-$run_id-$((i % 40))" "You've received money!" "You've received RM $((i % 500)).$(printf %02d $((i % 100))) from BURST CUSTOMER $i."
  done
  t1=$(date +%s); echo "posted $n in $((t1 - t0))s"
  clear_shell
}
negative() {
  post qa-neg-huge   "You've received money!" "$(head -c 20000 /dev/zero | tr '\0' 'A') RM 10.00 from END"
  post qa-neg-emoji  "💸 Payment 💸"          "You've received RM 5.00 from 🍜 Kedai Mee 🍜 ✅"
  post qa-neg-rtl    "تحويل"                   "RM 9.99 from محمد"
  post qa-neg-otp    "Your TAC"               "Your TAC is 482913. Do not share. RM 0.00"
  post qa-neg-zero   "You've received money!" "You've received RM 0.00 from ZERO."
  post qa-neg-neg    "You've received money!" "You've received RM -5.00 from NEGATIVE."
  post qa-neg-big    "You've received money!" "You've received RM 999,999,999.99 from WHALE."
  post qa-neg-nodec  "You've received money!" "You've received RM 15 from NO DECIMALS."
  post qa-neg-quote  "Payment \"quoted\""     "You've received RM 3.00 from O'Brien; DROP TABLE capture;--"
  post qa-neg-nl     "Multi"                  "line1
RM 4.00 from NEWLINE
line3"
  post qa-neg-empty  "x"                      " "
}
case ${1:-} in
  basic) basic ;;
  dupes) dupes "${2:-5}" ;;
  burst) burst "${2:-300}" ;;
  negative) negative ;;
  all) basic; dupes 5; negative; burst 300 ;;
  counts) db "select status, direction, count(*) from capture group by 1,2; select count(*) as total, count(distinct dedupe_key) as distinct_keys from capture;" ;;
  clear) clear_shell ;;
  select-shell) echo "Open the app → Settings → Captured Apps and enable 'Shell' (com.android.shell)." ;;
  *) sed -n '2,14p' "$0"; exit 1 ;;
esac
