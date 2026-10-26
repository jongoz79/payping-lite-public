# Apple App Store Listing & Metadata — PayPing Lite

**Bundle Identifier:** `com.paypingmy.app`  
**Platform:** iOS 27+  
**License:** GPL-3.0-or-later  

---

## 1. App Store Product Page Information

### App Name (≤ 30 characters)
`PayPing Lite` *(12 / 30 characters)*

### Subtitle (≤ 30 characters)
`Payment Voice Alerts Offline` *(28 / 30 characters)*

### Promotional Text (≤ 170 characters)
`Hear incoming payments aloud offline. 100% private, zero servers, zero accounts. Built for Malaysian hawkers, merchants, and small stalls.` *(137 / 170 characters)*

### Description (≤ 4,000 characters)
```text
PayPing Lite is a lightweight, offline payment announcer designed for Malaysian stall owners, hawkers, night market merchants, and small shopkeepers.

When you're busy cooking, serving customers, or handling products, checking your phone to verify an incoming DuitNow, e-wallet, or bank transfer slows you down. PayPing Lite solves this by announcing your incoming payment notifications aloud the moment they land.

KEY FEATURES

• Voice Announcements via Apple Shortcuts:
Seamlessly connects with iOS Shortcuts automations to announce "Received RM 12.50 from Ali" through your iPhone speaker or connected Bluetooth speaker.

• Glanceable Sales Counter:
Place your iPhone on a stand or counter. High-contrast, large-format typography lets you verify today's running totals and recent transactions from 2 meters away.

• Audio Focus Ducking:
Streaming music or a podcast on your stall speaker? PayPing Lite automatically lowers background audio during payment announcements and restores it immediately.

• 100% On-Device Privacy:
No user accounts. No logins. No cloud servers. No ads. No analytics. PayPing Lite makes zero network requests. All payment alerts, counterparty names, and transaction totals remain strictly in your device's private local database.

• User-Managed Notification Parsers:
Customize how notifications are read. Import community rules via JSON, create custom rules directly from real incoming notifications, or rely on the built-in generic keyword parser.

• Reconciliation & CSV Export:
Review your daily transaction log and export clean CSV reports anytime via the iOS Share Sheet (AirDrop, Files, or WhatsApp) for easy bookkeeping.

HOW IT WORKS ON iOS

1. Add the shared PayPing helper shortcut to your device.
2. In the Shortcuts app, create an Automation: "When I receive a notification from [Your Bank App]", set to "Run Immediately".
3. PayPing Lite parses incoming notification details on-device and passes spoken text to the built-in Speak Text action.
4. Keep your phone volume up and serve your customers with confidence!

Open-source software licensed under GPL-3.0-or-later.
```

### Keywords (≤ 100 characters, comma-separated)
`duitnow,qr,touchngo,tng,mae,merchant,pos,payment,malaysia,cashier,audio,tts,hawker,voice,sales`  
*(94 / 100 characters)*

### URLs
- **Support URL:** `https://github.com/jongoz79/payping-lite-public/issues`
- **Marketing URL:** `https://github.com/jongoz79/payping-lite-public`
- **Privacy Policy URL:** `https://github.com/jongoz79/payping-lite-public/blob/main/store/privacy-policy.md` (or hosted `privacy-policy.html`)

---

## 2. App Privacy (App Store Privacy Nutrition Label)

In App Store Connect under **App Privacy**:

### Determination: **"Data Not Collected"**
Select **"No, we do not collect data from this app"**.

- **Does this app collect user data?** `No`.
- **Are any third-party analytics or advertising SDKs included?** `No`.
- **Reasoning:** All notification data is received via Apple Shortcuts / App Intent parameters, parsed in local memory, and stored exclusively in local SQLite on the device. Zero data is transmitted off the device.

---

## 3. Age Rating Questionnaire

In App Store Connect **Age Rating**:

| Content Category | Answer |
|---|---|
| Unrestricted Web Access | No |
| Gambling and Contests | No |
| Alcohol, Tobacco, or Drug Use | No |
| Violence / Horror | No |
| Sexual Content or Nudity | No |
| Medical / Treatment Information | No |
| User Interaction / Chat / Social | No |

**Resulting Rating:** **4+** (Suitable for all ages)

---

## 4. Export Compliance & Encryption

In App Store Connect when submitting builds:

- **Is your app designed to use cryptography or contains cryptography?**  
  Select **Yes** (standard iOS operating system HTTPS/system frameworks are linked by React Native).
- **Does your app qualify for any exemptions?**  
  Select **Yes**.
- **Exemption Basis:**  
  PayPing Lite qualifies for exemption under standard Category 5 Part 2 (uses standard operating system system encryption only, with zero proprietary or non-exempt cryptographic algorithms).
- **`Info.plist` Configuration:**  
  Configured in `app.json` / iOS build settings:
  ```xml
  <key>ITSAppUsesNonExemptEncryption</key>
  <false/>
  ```
  *(Setting this to `false` bypasses manual export compliance review prompts for TestFlight builds).*
