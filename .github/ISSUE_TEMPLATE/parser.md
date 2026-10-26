---
name: Bank Parser / Sample Submission
about: Submit a new bank notification parser or share real sample notifications
title: "[Parser] <Bank Name>: <Brief summary>"
labels: ["parser", "community"]
assignees: ""
---

### IMPORTANT: Privacy & Anonymisation Checklist
Before submitting, you **MUST** anonymise all sensitive data:
- [ ] Replaced personal names with fake names (e.g., "AHMAD BIN ALI", "SITI AMINAH", "JOHN DOE")
- [ ] Replaced account numbers and card numbers with fake digits or masked tails (e.g., "ending 1234")
- [ ] Replaced reference numbers with generic strings (e.g., "REF123456789")
- [ ] Jittered or replaced transaction amounts (e.g., RM 45.20)
- [ ] Removed any personal phone numbers, emails, or home addresses

---

### 1. Bank or E-Wallet Information
- **Institution Name:** (e.g. CIMB Bank, Public Bank, GrabPay)
- **Country:** Malaysia (or other)
- **Android Package Name(s):** (e.g. `com.cimb.cimbocto`, find this in App Info or Play Store URL)
- **iOS App Name(s):** (e.g. `CIMB OCTO`)

---

### 2. Notification Samples
Provide at least one real notification sample received from this app.

#### Sample 1: Money Received (Incoming)
- **Notification Title:** `...`
- **Notification Body:** `...`
- **Expected Amount:** (e.g. RM 50.00)
- **Expected Counterparty (Sender):** (e.g. AHMAD BIN ALI)
- **Expected Reference:** (e.g. DUITNOW12345)

#### Sample 2: Money Spent / Paid (Outgoing)
- **Notification Title:** `...`
- **Notification Body:** `...`
- **Expected Amount:** (e.g. RM 18.50)
- **Expected Counterparty (Merchant/Recipient):** (e.g. RESTORAN MAJU)

#### Sample 3: Non-Financial / Marketing / OTP (To Ignore)
*Optional, but helpful to prevent false alerts:*
- **Notification Title:** `...`
- **Notification Body:** `...`
- **Reason to ignore:** (e.g. OTP SMS/push, promotional discount, reward points)

---

### 3. Proposed Parser JSON (Optional)
If you have written or exported a JSON parser definition, paste it below:

```json
{
  "schemaVersion": 1,
  "id": "mybank",
  "name": "My Bank",
  "version": 1,
  "author": "Your Name or Handle",
  "androidPackages": ["com.example.bank"],
  "iosAppNames": ["My Bank App"],
  "rules": [
    {
      "id": "mybank.transfer-received.v1",
      "priority": 200,
      "match": { "body": "transferred to your account" },
      "direction": "in",
      "extract": {
        "amount": "(?:RM|MYR)\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
        "counterparty": "from\\s+(?<counterparty>.+?)(?:\\s+on|\\.|$)"
      }
    }
  ]
}
```

---

### 4. Additional Context / Device Info
- Phone model & OS version (e.g. Pixel 8, Android 15 / iPhone 15, iOS 18)
- Any special edge cases (e.g. bilingual notifications, zero-cent formats like `RM50` vs `RM50.00`)
