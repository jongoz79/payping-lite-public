# Privacy Policy for PayPing Lite

**Effective Date:** October 26, 2026  
**Last Updated:** October 25, 2026  
**Project:** PayPing Lite (GPL-3.0-or-later)  
**Package / Bundle ID:** `com.paypingmy.app`  

---

## 1. Introduction

PayPing Lite ("we", "our", or "the app") is a free, open-source mobile application designed for Malaysian stall owners, merchants, and individuals who want instant, spoken audio notifications when receiving payments.

We believe that your financial transactions, customer details, and business records are strictly your private property. PayPing Lite is architected from the ground up as a **100% on-device, offline utility**. We do not operate cloud servers, we do not require accounts, and we do not collect, transmit, or monetize your data.

---

## 2. Zero Data Collection & Sharing

- **No Personal Information Collected:** We do not ask for or collect your name, email address, phone number, location, or device identifiers.
- **No Network Transmission:** PayPing Lite makes **zero network requests**. The app operates entirely offline and communicates with no servers.
- **No Third-Party SDKs or Analytics:** The app contains no third-party tracking, advertising, crash reporting, or telemetry tools (no Google Analytics, Firebase, Sentry, Facebook SDK, or AdMob).
- **No Data Sharing or Sale:** Because we do not collect any data, we never share, sell, or disclose your information to any third party.

---

## 3. How Notification Content is Handled

To provide spoken alerts and sales totals, PayPing Lite utilizes your device's native notification access systems:
1. **User Choice Only:** PayPing Lite only inspects notifications from the specific banking and e-wallet applications that you explicitly select in the app.
2. **On-Device Parsing:** Notification titles and bodies are processed in-memory on your device using pattern-matching rules (parsers).
3. **Local Storage:** The parsed output (amount, counterparty name, timestamp, and raw notification text) is stored solely in a private SQLite database file (`payping.db`) located within the app's protected sandbox on your device.
4. **Speech Output:** Spoken announcements are synthesized using your device's built-in Text-to-Speech (TTS) engine (such as Google Speech Services on Android or Siri Voice on iOS). No audio or voice recordings are transmitted or stored off your device.

---

## 4. User Control & Data Deletion

You maintain complete control over all data stored by PayPing Lite:
- **In-App Clear:** You can clear your transaction history or completely reset the entire local database at any time in **Settings → Data & Privacy** (**Delete Transaction History Only** or **Reset Entire App Database**). You can also delete a single payment from its detail screen.
- **System Clear / Uninstall:** You can clear all data through your operating system settings (*Android Settings → Apps → PayPing Lite → Clear Storage/Data*), or simply uninstall the application. Uninstalling the app permanently and irreversibly deletes the local SQLite database.
- **Data Export:** You can export your transaction records to a standard CSV file at any time using the in-app export feature, which utilizes your operating system's native share sheet.

---

## 5. Open Source Transparency

PayPing Lite is licensed under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)**. The complete source code is publicly accessible for audit, review, and verification on GitHub:  
[https://github.com/jongoz79/payping-lite-public](https://github.com/jongoz79/payping-lite-public)

---

## 6. Changes to This Privacy Policy

Because PayPing Lite operates offline with zero data collection, this privacy policy is unlikely to change. However, if updates are made to support new native platform capabilities, the revised policy will be published within the repository and application.

---

## 7. Contact Us

If you have any questions, feedback, or security inquiries regarding this privacy policy, please reach out by opening an issue on our GitHub repository:  
**GitHub Issues:** [https://github.com/jongoz79/payping-lite-public/issues](https://github.com/jongoz79/payping-lite-public/issues)
