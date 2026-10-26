# Set up on-device iOS capture

PayPing Lite saves notifications locally. The **Log Bank Notification** action runs without opening the app, and returns announcement text. No login, server or cloud parsing is involved.

This guide targets the planned iOS 27 notification automation. Its availability, exposed title/body variables and locked-device behavior still need verification on a real iPhone. Earlier supported iOS versions (18+) can use the Message trigger below. Screenshots are TODO until device QA.

## Before setup

1. Install the signed PayPing build and open it once. This initializes the native database and makes its Shortcuts actions available.
2. The generic parser works immediately. For app-specific results, import a parser whose `iosAppNames` contains the App Name you will supply, for example `TNG eWallet`. Android package names do not select iOS parsers.
3. Notifications with no match are still saved for review. Only newly inserted transactions produce speech; informational notifications and duplicates return empty text.

## Notification automation (iOS 27, subject to device verification)

1. Open **Shortcuts → Automation → +** and select **When I receive a notification from an app**, if that trigger is available.
2. Choose the bank/e-wallet app, and select **Run Immediately**. Create a blank automation. Repeat this setup for each app you want to capture.
3. Add PayPing Lite's **Log Bank Notification** action.
4. Set **App Name** to the name in your parser, such as `TNG eWallet`. Set **Title** and **Body** from the corresponding variables actually exposed by the trigger. Set **Date** to the notification date if available; otherwise leave it unset to use the time the action runs.
5. If the trigger exposes only combined text, place it in Body and leave Title empty. Title-based parser rules then need adjustment. Do not assume an automation supplies content it does not expose.
6. Add **If** the result of Log Bank Notification **has any value**, then **Speak Text** using that result. End the If. This avoids an empty Speak Text action asking for input on informational/unmatched notifications.
7. Disable **Show When Run** for the logging action if that option appears. Use its returned text for speech, rather than adding a second confirmation dialog announcement.
8. Save, then send a real test payment notification. Reopen PayPing and confirm the saved amount, direction, currency and counterparty. Check that it speaks only once.

**Screenshots TODO:** trigger selection; Run Immediately; title/body/date variable mapping; If + Speak Text; saved row.

If the notification trigger is absent or omits content, use an available alternative rather than granting unrelated permissions. The action itself does not give PayPing general notification-reading access on iOS.

## SMS alternative: Message trigger

1. Open **Shortcuts → Automation → + → Message**.
2. Select the bank sender and/or a narrow transaction phrase. Choose **Run Immediately**.
3. Create a blank automation and add **Log Bank Notification**.
4. Set App Name to the relevant parser's iOS name. Put the incoming message content (Shortcut Input / the trigger's message-text variable) into Body. Leave Title empty unless your parser expects a fixed title, and leave Date unset unless the trigger supplies the message date.
5. Add the same **If result has any value → Speak Text(result)** sequence. Save and test with an actual bank SMS.

**Screenshots TODO:** sender/content filter; Message variable mapping; completed automation.

The Message setup structure follows MattFaz/actuali's SMS automation guide (MIT); PayPing uses its native on-device regex engine and does not use Actuali's server, budget account or cloud-model actions.

## Troubleshooting and first-device checklist

- If the action is missing, launch PayPing once, restart Shortcuts and search for **Log Bank Notification**. A missing action after that may indicate App Intents metadata was not included in the EAS build.
- If a row is saved but does not announce, inspect whether parsing found a money transaction and whether TTS is enabled. An empty result is intentional for info/none, duplicates and disabled TTS. Manual parser previews do not insert or speak.
- To check background behavior, close PayPing's UI, lock the phone and trigger another notification/message. Verify the row afterward. Do not claim lock-screen support until this succeeds on the target device.
- Siri/Shortcuts may require first-use permission or device unlock. Complete the system prompt manually, then repeat the automation test.
- Repeated invocations with the same app, normalized title/body and posted minute are deduplicated. Passing the original date is preferable when available.
- Returned text follows the app's Language setting (automatic, English or Malay), including spoken ringgit/sen amounts. Speech uses the Shortcuts Speak Text action; voice/rate selection there is separate from the app's native `speakTest` preview. For Malay, choose the installed Malay (Malaysia) voice in that action; the app's preview requests `ms-MY` and falls back to the default voice. Foreign amounts include their ISO code, e.g. `Paid 790 JPY to Cafe`.
