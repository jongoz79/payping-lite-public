# Tester Notes & Verification Guide

**Build Version:** 3.0.0  
**Target Tracks:** Google Play Internal Testing & Apple TestFlight  

---

## 1. TestFlight / Play Console: "What to Test" (Release Notes)

Copy and paste this into the **What to Test** field in TestFlight / Play Console (≤ 4,000 characters):

```text
Welcome to the PayPing Lite 3.0.0 test build!

PayPing Lite is a complete rewrite of PayPing MY as a 100% offline, privacy-first payment announcer for Malaysian stall owners and merchants.

CORE FEATURES TO TEST:

1. Permission Setup & Onboarding:
• Android: Grant Notification Access in Onboarding. (If on Android 13+, test the "Allow restricted settings" guide in Troubleshooting if prompted).
• iOS: Add the shared helper shortcut and verify automation setup.

2. App Selection & Capture:
• Open Settings → Captured Apps. Search and enable your installed banking or e-wallet apps (e.g. Touch 'n Go, MAE, CIMB, or Bank Islam).

3. Spoken Alerts (TTS) & Audio Ducking:
• Receive a payment notification on your device, or test using the live Parser Sandbox in Settings.
• Verify that the app announces: "Received RM {amount} from {counterparty}".
• Verify that background music or podcasts briefly dip in volume (audio ducking) and restore cleanly.

4. Glanceable Merchant Counter (Today Tab):
• Verify that today's total received updates immediately in large 42pt tabular text readable from 2 meters away.

5. User-Managed Parsers & Guided Generator:
• Check the new "Parsers" tab.
• Test "Create parser from this notification" from any row in History or Review. Tap tokens to tag Amount and Customer, and verify that the rule matches.
• Test the "Re-parse history" prompt.

6. Offline Privacy Verification:
• Verify that the app functions 100% offline with Airplane Mode enabled.

Please report any issues or edge cases to our GitHub Issues page:
https://github.com/jongoz79/payping-lite-public/issues
```

---

## 2. Android Internal Testing: Complete Tester Guide

Follow these steps when testing on a physical Android device:

### Step 1: Install & Launch
1. Accept the Play Store Internal Testing invite link and install **PayPing Lite v3.0.0**.
2. Open the app to the onboarding flow.

### Step 2: Grant Notification Access (Including Android 13+ Restricted Settings)
1. On the "Hear Payments Aloud" screen, tap **Enable Notification Access**.
2. If Android displays a greyed-out toggle with *"Restricted setting"*:
   - Open Android **Settings** → **Apps** → **PayPing Lite**.
   - Tap the **three dots (⋮)** in the top-right corner.
   - Tap **"Allow restricted settings"** and authenticate with your device PIN or fingerprint.
   - Return to PayPing Lite and toggle Notification Access **ON**.

### Step 3: Select Your Apps
1. Navigate to **Settings → Captured Apps** (or during Onboarding Step 3).
2. Use the search bar to locate your banking apps (e.g. *Touch 'n Go eWallet*, *MAE*, *CIMB OCTO*, *RHB*, *Public Bank*).
3. Toggle them **ON**. They will appear in the "Selected Apps" section at the top.

### Step 4: Verify Live Notification & TTS Speech
1. Have a friend or secondary phone send a small DuitNow QR or e-wallet transfer (e.g. RM 1.00).
2. **Audio Check:** Confirm your phone speaks aloud: *"Received RM 1.00 from [Name]"*.
3. **Ducking Check:** Play a YouTube video or Spotify track in the background. Verify the music dips smoothly during the announcement and immediately returns to normal volume.
4. **Dashboard Check:** Look at the Today tab. Confirm the total received updates by RM 1.00 and the transaction appears in the feed.

### Step 5: Test the Guided Parser Generator
1. If you received a notification from an app without a formal parser rule, it will appear in the **Review** tab or with generic fallback in **History**.
2. Tap the row to expand details, then tap **`Create parser from this notification`**.
3. Tap the amount token (e.g. `1.00`) and choose **Tag as Amount**.
4. Highlight the sender name and choose **Tag as Customer**.
5. Tap **Save** and accept the prompt to **Re-parse History**. Confirm past captures update immediately!

---

## 3. iOS 27 TestFlight: Complete Tester Guide

iOS does not permit persistent background notification listeners; it uses Apple Shortcuts automations with App Intents.

### Step 1: Install Helper Shortcut
1. Install **PayPing Lite v3.0.0** from TestFlight.
2. In the app onboarding, tap **Add PayPing Shortcut** (or use the shared iCloud link provided in test notes).
3. Tap **Add Shortcut** in Apple Shortcuts.

### Step 2: Create Automation in Shortcuts App
1. Open Apple's built-in **Shortcuts** app.
2. Tap the **Automation** tab at the bottom.
3. Tap the **+** button in the top-right corner.
4. Search for or select **App / Transaction Notification**:
   - Choose your banking app (e.g. *Touch 'n Go eWallet* or *MAE*).
5. **Critical Setting:** Under *"When"*, select **Run Immediately** (toggle OFF *"Notify When Run"* so it executes silently in the background).
6. Connect the automation action to: **Log Bank Notification with PayPing Lite**.
7. Connect the returned output text to Apple's built-in **Speak Text** action.

### Step 3: Verification
1. Lock your iPhone or place it on a desk.
2. Trigger an incoming transfer.
3. Verify that Siri Voice speaks the payment details aloud even while the phone is locked.
4. Open PayPing Lite to verify that the transaction is logged in the local SQLite database and reflected in Today's totals.
