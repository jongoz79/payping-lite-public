# Store Screenshot Specifications & Capture Plan

**Target Formats:**  
- Google Play Store (Phone 1080×2400 / 9:16 portrait)  
- Apple App Store (6.7" iPhone 1290×2796 & 6.5" iPhone 1242×2688)  

This document defines the 6 screenshot frames, their exact UI data states, and bilingual marketing captions ready for the final store asset generation pass.

---

## Screenshot 1: Instant Audio Payment Alerts (Today Tab)

- **Screen / Route:** `Today / Live` (`src/app/index.tsx`)
- **UI State & Mock Data:**
  - Status Line: `● Listening to 3 apps`
  - Hero Card: `TOTAL RECEIVED TODAY`: `+RM 384.50` (28 payments • Paid out: RM 42.00)
  - Latest Payment Spotlight:
    - App: *Touch 'n Go eWallet* (Launcher icon)
    - Amount: `+RM 18.50` (Large emerald green text)
    - Counterparty: `MOHD FAIZAL BIN ABDULLAH`
    - Subtitle: `Ref: TNG992817203 • Spoken: "Received RM 18.50 from Mohd Faizal"`
- **Captions:**
  - **English:** `Hear Every Payment Aloud • Instant Audio Alerts`
  - **Bahasa Melayu:** `Dengar Setiap Bayaran Bersuara • Pengumuman Pantas`

---

## Screenshot 2: Glanceable Merchant Display (Counter View)

- **Screen / Route:** `Today / Live` (Zoomed / Hero focus)
- **UI State & Mock Data:**
  - Focus on the high-contrast merchant hero card and latest transaction spotlight.
  - Demonstrates physical stall counter use (hawker cooking or wearing gloves; phone mounted 1–2 meters away).
  - Digits rendered in clean 42pt bold tabular figures.
- **Captions:**
  - **English:** `Glanceable Sales Counter • Readable From 2 Meters Away`
  - **Bahasa Melayu:** `Paparan Jualan Jelas • Boleh Dilihat Dari Jarak 2 Meter`

---

## Screenshot 3: Daily History & Audit Log (History Tab)

- **Screen / Route:** `History` (`src/app/history.tsx`)
- **UI State & Mock Data:**
  - Filter chips active on `[ Today ]`.
  - Header: `TODAY — SATURDAY, 24 OCT (+RM 384.50)`.
  - Top row expanded showing:
    - Customer: `MOHD FAIZAL BIN ABDULLAH` (`+RM 18.50`)
    - Raw Notification payload box: `Title: You've received money! | Body: RM 18.50 from MOHD FAIZAL...`
    - Action buttons: `[✏️ Edit Note]` `[🔊 Replay Voice]` `[+ Create parser from this]`
  - Secondary rows: *Sarah Tan Mei Ling* (`+RM 6.00`), *Wong Kok Leong* (`+RM 25.00`).
- **Captions:**
  - **English:** `Complete Audit History • On-Device Transaction Log`
  - **Bahasa Melayu:** `Rekod Jualan Lengkap • Disimpan Selamat Dalam Telefon`

---

## Screenshot 4: Select Any Installed App (Captured Apps)

- **Screen / Route:** `Captured Apps` (`src/app/app-picker.tsx`)
- **UI State & Mock Data:**
  - Search bar: `Search installed apps...`
  - Section "Selected Apps (3)":
    - *Touch 'n Go eWallet* (`my.com.tngdigital.ewallet`) — Checked ON
    - *MAE by Maybank2u* (`com.maybank2u.life`) — Checked ON
    - *CIMB OCTO* (`com.cimb.octo`) — Checked ON
  - Section "Other Installed Apps":
    - *RHB Mobile Banking*, *Bank Islam*, *Boost Merchant*
- **Captions:**
  - **English:** `Choose Your Apps • Works With Any Payment Alert`
  - **Bahasa Melayu:** `Pilih Aplikasi Anda • Pantau Mana-Mana Aplikasi Bayaran`

---

## Screenshot 5: Guided Parser Generator (Parsers Tab)

- **Screen / Route:** `Create Parser from Notification` (`src/app/create-parser.tsx`)
- **UI State & Mock Data:**
  - Header: `Create Parser`
  - Raw Notification Tokens container:
    - `[You've]` `[received]` `[money!]` `[RM]` `[ 18.50 ]` *(Highlighted Green: Tagged as Amount)*
    - `[from]` `[ MOHD FAIZAL BIN ABDULLAH ]` *(Highlighted Blue: Tagged as Customer)*
  - Live Verification Box:
    - `✓ Rule matches notification!`
    - `Spoken: "Received RM 18.50 from Mohd Faizal Bin Abdullah"`
- **Captions:**
  - **English:** `Create Custom Rules • Teach PayPing Any Notification`
  - **Bahasa Melayu:** `Cipta Peraturan Sendiri • Ajar Notifikasi Baharu Dengan Mudah`

---

## Screenshot 6: 100% Offline Privacy & Data Export (Settings Tab)

- **Screen / Route:** `Settings` (`src/app/settings.tsx`)
- **UI State & Mock Data:**
  - Voice section: `Duck Background Audio` (Toggled ON — lowers music during alerts).
  - Review section: `Auto-clean Old Notifications` (`30 Days`).
  - Troubleshooting card: `Android 13+ Restricted Settings Guide`.
  - Data section: `Export CSV` (Share to WhatsApp or Google Drive) and `Delete All Data`.
  - Footer: `PayPing Lite v3.0.0 • Zero network calls. 100% on this phone.`
- **Captions:**
  - **English:** `100% Private & Offline • Zero Cloud, Zero Logins, Zero Ads`
  - **Bahasa Melayu:** `100% Luar Talian & Peribadi • Tiada Pelayan, Tiada Iklan`
