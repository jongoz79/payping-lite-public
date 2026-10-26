# PayPing Lite v2 — UX Specification & Design Document

**Document Version:** 2.1.0  
**Target Release:** PayPing Lite v1 (3.0.0)  
**Platforms:** Android 10+ (`NotificationListenerService`, Material 3), iOS 27 (`Shortcuts` + App Intents, iOS Native)  
**License:** GPL-3.0-or-later  
**Author:** UX Design Team (Agy)  
**Target Implementer:** Kimi (Screen builder) & Codex (Native capture module)

---

## 1. Executive Summary & Design Principles

PayPing Lite is an offline, privacy-first audio payment announcer for Malaysian merchants, pasar malam stalls, coffee shops, and budget-conscious individuals. Its primary job is to **speak incoming payment notifications aloud** ("Received RM 12.50 from Ali") the moment a payment lands, maintain a local audit log, and provide glanceable daily sales totals.

### 1.1 Core Principles

1. **Native and Plain — A Tool, Not a Landing Page:**  
   - Built to look and feel like a high-utility native system utility (similar to `actua` on Android and `actuali` on iOS).
   - **No decorative AI elements:** No colored card borders (`border-left` stripes), no gradient backgrounds, no heavy drop shadows, no pill badges on every label, and **no emojis as UI icons**.
   - Color is used strictly where it carries functional meaning: **on the amount text itself** (`+RM 12.50` green, `-RM 8.00` red, neutral gray for info). Cards and rows use neutral system surfaces (`#FFFFFF` in light, `#1E1E1E` in dark) with hairline borders.
2. **Zero Hard-Coded Banks — Installed Apps Picker:**  
   - The app does not assume or hard-code bank identities, brand colors, or logos.
   - On Android, the user chooses apps directly from the apps installed on their phone (queried via `MAIN`/`LAUNCHER` intent). Each app is displayed with its **actual launcher icon and OS label**.
   - Any app that posts notifications can be selected.
3. **Parsers Belong to the User:**  
   - The app ships with **zero bundled bank parsers**. It includes only an editable **Generic Fallback Parser** (keyword lists for money in/out and an MYR amount regex).
   - Users import parsers (paste JSON or open `.json` files, later downloadable from the community website), create new parsers directly from captured notifications, edit rules via visual form or raw JSON, test them against real captures, and export/share them.
4. **Glanceable from 2 Meters:**  
   - Hawkers need to verify payments with their phone sitting on a counter 1–2 meters away. The Today view keeps its large-format numbers (40pt+ bold tabular figures) and clear counterparty display.
5. **100% On-Device & Zero Cloud:**  
   - Makes zero network calls. All notifications, settings, and parsers reside in a single local SQLite database (`payping.db`).

---

## 2. Information Architecture & Navigation

The app is organized into **5 primary bottom tabs** plus an initial first-run Onboarding flow.

```
App Launch
├── First Run? ────► [Onboarding Modal / Flow]
│                         ├── 1. Privacy Pledge ("Nothing leaves your phone")
│                         ├── 2. Notification Access (Android) / Shortcut Setup (iOS)
│                         │       └── Permanently Visible Troubleshooting: Android 13+ Restricted Settings
│                         ├── 3. Pick Installed Apps (Android)
│                         ├── 4. Add Parsers (Optional: Paste JSON, File, or Skip)
│                         └── 5. Voice / TTS Test
│
└── Normal Run ───► [Main Tabs Navigator (5 Tabs)]
      │
      ├── Tab 1: [Today]
      │     ├── Plain-text Listener Health Line (Icon + Status + 1-tap action)
      │     ├── Merchant Glanceable Total Card (Total In, Count, Total Out)
      │     ├── Latest Transaction Spotlight (2-meter readable)
      │     └── Today's Chronological Feed
      │
      ├── Tab 2: [History]
      │     ├── Date Filter Chips (Today, Yesterday, Last 7d, Month, Custom)
      │     ├── Search Bar & App Filter
      │     ├── Daily Grouped Lists with Day Subtotals
      │     └── Expandable Row ──► Shows Raw Text + ["Create parser from this"] button
      │
      ├── Tab 3: [Review] (Badge shows pending count)
      │     ├── Unverified captures (low confidence or generic parser fallback)
      │     ├── Raw Notification Text prominently displayed
      │     ├── Actions: [Confirm In], [Confirm Out], [Ignore], [Edit ✏️]
      │     └── Link: ["Create parser from this notification"]
      │
      ├── Tab 4: [Parsers] (First-Class Tab)
      │     ├── Parser List (Active toggle, apps covered, last matched timestamp)
      │     ├── Import Actions ([Paste JSON], [Open File])
      │     ├── Parser Editor (Visual Form + Raw JSON Editor + Live Capture Test)
      │     ├── Re-parse History (Applies modified parser to past captures)
      │     └── Generic Parser Configuration (Editable keywords & amount regex)
      │
      └── Tab 5: [Settings]
            ├── Captured Apps (Opens Installed-Apps Picker)
            ├── Voice & Audio (TTS On/Off, Rate, Ducking toggle `tts_duck` [On by default])
            ├── Review Clean-up (`review_autoclean_days`: Off / 7 / 30 / 90 days; marks 'ignored')
            ├── Troubleshooting (Permanently visible Android 13+ Restricted Settings guide)
            ├── Data Management (Export CSV via OS Share Sheet, Clear Data)
            └── About & License (GPL-3.0, 100% Offline verification)
```

---

## 3. Screen Specifications & States

---

### Screen 1: Onboarding & Permissions

Introduces the offline premise, guides the user through capture setup, and provides **permanently visible troubleshooting** for Android's system permissions.

#### 1A. Android Flow
- **Step 1: Privacy Promise:** Clean, concise text: *"100% on this phone. No accounts, no servers, no ads. Reads payment alerts only from apps you pick."*
- **Step 2: Notification Access & Demystifier:**
  - Explains the standard Android prompt: *"Allow PayPing Lite to read all notifications?"*
  - Reassures user that PayPing Lite has no internet permission and only monitors apps they enable.
  - Primary button: `[Enable Notification Access]` (deep links to Android Notification Access settings).
  - **Permanently Visible Troubleshooting Section:**
    ```
    ┌────────────────────────────────────────────────────────┐
    │ Troubleshooting: Restricted Settings (Android 13+)     │
    │ If the switch is greyed out with "Restricted setting": │
    │ 1. Open Android Settings → Apps → PayPing Lite.        │
    │ 2. Tap the three dots (⋮) in the top-right corner.     │
    │ 3. Tap "Allow restricted settings" & enter your PIN.   │
    │ 4. Return here and enable Notification Access.         │
    └────────────────────────────────────────────────────────┘
    ```
- **Step 3: Installed-Apps Picker:** Searchable list of installed apps to choose which banks/e-wallets to monitor.
- **Step 4: Add Parsers (Optional):** Option to paste a parser JSON or open a `.json` file, or skip to continue with the generic parser.
- **Step 5: Voice Test:** Plays a sample TTS announcement. Verifies that transient audio ducking works properly.

#### 1B. iOS Flow (Shortcuts & App Intents)
- **Step 1: Privacy Promise:** Offline, private payment announcer for iPhone.
- **Step 2: Add Helper Shortcut:** Installs the shared iCloud helper shortcut (`LogBankNotificationIntent`).
- **Step 3: Create Automation:** Clean step-by-step guide to configure the iOS Shortcuts trigger: *"When I receive a notification from <app>"*, set to *Run Immediately*.
- **Step 4: Voice Test & Done:** Tests speech output and proceeds to Today tab.

---

### Screen 2: Installed-Apps Picker (Android)

Used during Onboarding (Step 3) and from `Settings → Captured Apps`.

#### Layout & Behavior:
- **Header:** "Captured Apps" with back button or "Done" button.
- **Search Bar:** Native search input (`Filter installed apps...`) to quickly find banking or e-wallet apps.
- **Top Section — "Selected Apps ({n})":**
  - Displays currently enabled apps pinned to the top.
  - Each row shows: OS launcher icon (40×40dp), App label (e.g. "Touch 'n Go eWallet"), Package name (`my.com.tngdigital.ewallet`), and a toggle switch (checked).
  - Toggling off immediately removes it from capture.
- **Lower Section — "All Installed Apps":**
  - Alphabetically sorted list of all launchable apps on the device (queried via Android `MAIN`/`LAUNCHER` intent without `QUERY_ALL_PACKAGES`).
  - Each row shows: Launcher icon, App label, Package name, and toggle switch (unchecked).
- **Helper Footnote:**  
  *"Select any app that sends you payment notifications. PayPing Lite will record notifications only from selected apps."*

---

### Screen 3: Today / Live (Merchant Dashboard)

Designed to sit on a phone mount or stall counter and be readable at a glance without decorative distractions.

```
+-------------------------------------------------------+
|  PayPing Lite                                         |
|  ● Listening to 3 apps                                |
+-------------------------------------------------------+
|  TOTAL RECEIVED TODAY                                 |
|  RM 384.50                                            |
|  28 payments  •  Paid out: RM 42.00  •  1 needs review|
+-------------------------------------------------------+
|  LATEST PAYMENT                                       |
|  [Icon] Touch 'n Go eWallet                  Just now |
|  +RM 18.50                                            |
|  MOHD FAIZAL BIN ABDULLAH                             |
|  Ref: TNG992817203                                    |
|  Spoken: "Received RM 18.50 from Mohd Faizal"    [🔊] |
+-------------------------------------------------------+
|  TODAY'S PAYMENTS                                     |
|  [Icon] MAE          +RM 6.00      12:44 PM           |
|         Sarah Tan                                     |
|  [Icon] CIMB OCTO    +RM 25.00     12:31 PM           |
|         Wong Kok Leong                                |
|  [Icon] Touch 'n Go  -RM 8.00      11:15 AM           |
|         GrabFood (Paid out)                           |
+-------------------------------------------------------+
```

#### Key Elements:
1. **Plain-Text Health Status Line (No colored banner card):**
   - **Active:** `● Listening to 3 apps` (Subtle 8pt green dot, 13pt secondary text).
   - **Access Revoked:** `⚠️ Notification access is off — Tap to enable` (Tappable line linking to system settings).
   - **No Apps Selected:** `ℹ️ No apps selected — Tap to choose apps` (Links to Installed-Apps Picker).
   - **Battery Warning:** `ℹ️ Battery optimization active — May delay alerts` (Links to battery settings).
2. **Merchant Glanceable Hero Card:**
   - Neutral card background (`#F8FAFC` light / `#1E1E1E` dark) with hairline 1px border (`#E2E8F0` / `#2D2D2D`).
   - Label: `TOTAL RECEIVED TODAY` in 11pt bold uppercase tracking.
   - Amount: `RM 384.50` in **42pt bold tabular figures**, colored in clean `money-in` emerald green (`#059669` light / `#10B981` dark).
   - Metadata line: `28 payments • Paid out: RM 42.00 • 1 needs review`.
3. **Latest Payment Spotlight:**
   - Shows the app's actual launcher icon (32×32dp) and app label.
   - Large amount: `+RM 18.50` (32pt bold).
   - Customer / Counterparty name in 17pt semi-bold.
   - Audio reassurance line with a replay icon button `[🔊]` to re-trigger TTS if the merchant missed it.
4. **Today's Feed:**
   - Standard native list rows showing app launcher icon, counterparty, time, and colored amount.
   - Tapping any row opens the transaction detail sheet.

---

### Screen 4: History & Audit

- **Search & Filters:** Real-time search across counterparty, reference, and note fields. App filter dropdown populated from `selected_app`.
- **Date Segmented Chips:** Quick-switch between Today, Yesterday, Last 7 Days, Month, or Custom range.
- **Expandable Row Detail:**
  - Shows original raw notification title and body in a monospaced block.
  - Shows matched `parser_id` and `rule_id`, or states *"Parsed via Generic Fallback"*.
  - When no app parser matched, provides a prominent button: **`[Create parser from this]`** linking directly into the parser creation wizard with this notification pre-loaded.

---

### Screen 5: Review Queue (`needs_review`)

Holds captures where confidence was `low` or `none` (e.g. captured via generic keyword match or unknown notification structure).

- **Actions per Row:**
  - **`[Confirm In]`**: Sets `status = 'logged'`, `direction = 'in'`. Adds amount to daily total immediately.
  - **`[Confirm Out]`**: Sets `status = 'logged'`, `direction = 'out'`.
  - **`[Ignore]`**: Sets `status = 'ignored'`. Excludes row from all totals.
  - **`[Create parser from this notification]`**: Opens the regex builder seeded with this raw text.
- **Auto-Cleanup Policy (`review_autoclean_days`):**
  - Configurable in Settings (Off by default; options: 7, 30, or 90 days).
  - When enabled, rows in `needs_review` older than the threshold are automatically marked `status = 'ignored'`.
  - **They are never deleted**, preserving full audit history for reconciliation.

---

### Screen 6: Parsers (First-Class Tab)

This replaces hard-coded bank presets. Users control all parser definitions.

- **Parser List:**
  - Displays each imported/created parser with name, author, covered app packages, rule count, enabled switch, and last-matched timestamp.
  - Actions: Edit, Test, Share `.json`, Re-parse history.
- **Import Flow (`[+ Import]`):**
  - Options: `Paste JSON` or `Open .json File`.
  - Validates against `parser-library/schema.json` with human-readable error messages.
- **Guided Parser Generator ("Create parser from this notification"):**
  - Displays captured notification text split into tappable tokens.
  - User taps the amount token to tag it as `amount` (generates `RM\s?(?<amount>[\d,]+\.\d{2})`).
  - User taps/highlights counterparty name to tag as `counterparty` (generates `from (?<counterparty>.+?)(?:\.|$)`).
  - Live preview immediately tests the regex against the notification.
  - Once saved, prompts user: *"Re-parse previous unparsed notifications from this app with this new rule?"* (skipping `user_edited = 1` rows).
- **Fallback Generic Parser:**
  - Editable credit/debit keyword lists and amount patterns with *"Reset to Default"*.

---

### Screen 7: Settings & Troubleshooting

```
+-------------------------------------------------------+
|  Settings                                             |
+-------------------------------------------------------+
|  CAPTURE                                              |
|  • Captured Apps                          [3 active >]|
+-------------------------------------------------------+
|  VOICE (TTS)                                          |
|  • Speak Payments Aloud                  [ Toggle ON ]|
|  • Duck Background Audio                 [ Toggle ON ]|
|    (Lowers music/radio volume during announcements)   |
|  • Speech Rate                             [ 1.0x  ──●]
|  • [ Test Voice Announcement ]                        |
+-------------------------------------------------------+
|  REVIEW QUEUE                                         |
|  • Auto-clean Old Notifications           [ 30 Days ▾]|
|    (Marks unreviewed captures older than 30d as       |
|     'ignored'. Rows are never deleted.)               |
+-------------------------------------------------------+
|  TROUBLESHOOTING                                      |
|  • Notification Listener Status            [Active ✓] |
|  • Android 13+ Restricted Settings Guide          [ >]|
|    "If Android disables Notification Access:          |
|     1. Open Settings → Apps → PayPing Lite            |
|     2. Tap ⋮ (three dots in top right)                |
|     3. Tap 'Allow restricted settings' & enter PIN    |
|     4. Return and toggle Notification Access ON"      |
|  • Battery Optimization Status              [Disabled]|
+-------------------------------------------------------+
|  DATA & PRIVACY                                       |
|  • Export All Transactions (CSV)          [ Export  >]|
|  • Delete Transaction History Only        [ Clear   >]|
|  • Reset Entire App Database              [ Reset   >]|
+-------------------------------------------------------+
|  ABOUT                                                |
|  • PayPing Lite v3.0.0 (Build 300)                    |
|  • 100% Offline • GPL-3.0 License                     |
+-------------------------------------------------------+
```

---

## 4. Visual Design System (Native & Plain)

### 4.1 Surface & Border Tokens

Adheres to Material 3 / iOS System design language: clean neutral backgrounds with 1px hairline dividers.

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `bg-canvas` | `#FFFFFF` | `#121212` | Main screen background |
| `bg-surface` | `#F8FAFC` | `#1E1E1E` | Cards, hero containers, bottom tab bar |
| `bg-subtle` | `#F1F5F9` | `#282828` | Search bars, code blocks, raw text boxes |
| `border-hairline` | `#E2E8F0` | `#2D2D2D` | Card borders, row separators |
| `text-primary` | `#0F172A` | `#F8FAFC` | Primary labels, merchant amounts |
| `text-secondary` | `#475569` | `#94A3B8` | Subtitles, package names, timestamps |
| `text-tertiary` | `#94A3B8` | `#64748B` | Reference numbers, captions |
| `accent-primary` | `#2563EB` | `#3B82F6` | Primary action buttons, active tab indicators |

### 4.2 Functional Amount Color Tokens

> [!IMPORTANT]
> Color is applied **only to amount text**, never as card borders or background fills.

| Direction | Token | Light Hex | Dark Hex | Display Format |
|---|---|---|---|---|
| **Money In** | `text-money-in` | `#059669` | `#10B981` | `+RM 12.50` (Green text + sign) |
| **Money Out** | `text-money-out` | `#DC2626` | `#F87171` | `-RM 8.00` (Red text + sign) |
| **Info / Non-Money** | `text-money-info` | `#475569` | `#94A3B8` | `RM 0.00` or `Info` (Neutral text) |

---

## 5. Finalized Configuration Specifications

These specifications reflect the finalized decisions from user review:

### 5.1 TTS Audio Focus Ducking (`tts_duck`)
- **Default:** `true` (Enabled by default).
- **Behavior:** Native TTS service requests transient audio focus ducking:
  `AudioAttributes.USAGE_ASSISTANCE_SONIFICATION` with `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`.
- When background music, radio, or podcasts are playing on the device or Bluetooth speaker, their volume automatically ducks (lowers) by ~70% during the payment announcement and restores immediately after completion.
- If toggled off in `Settings → Voice (TTS)`, speech plays without requesting audio focus ducking.

### 5.2 Review Auto-Clean Policy (`review_autoclean_days`)
- **Default:** `off` (Disabled by default).
- **Options:** `off`, `7`, `30`, `90` days.
- **Behavior:** When enabled, any capture with `status = 'needs_review'` whose `posted_at` is older than N days is updated to `status = 'ignored'`.
- **Guarantee:** **Rows are never deleted.** They remain in the SQLite database and appear in History under the "Ignored" filter, ensuring complete bookkeeping integrity.

### 5.3 Permanently Visible Restricted-Settings Guide
- **Location:** Displayed permanently in:
  1. Onboarding Step 2 (Notification Access help section).
  2. `Settings → Troubleshooting → Android 13+ Restricted Settings Guide`.
- **Text:**
  1. Open Android Settings → Apps → PayPing Lite.
  2. Tap the three dots (⋮) in the top-right corner.
  3. Tap "Allow restricted settings" and enter your device PIN/fingerprint.
  4. Return to PayPing Lite and toggle Notification Access ON.
