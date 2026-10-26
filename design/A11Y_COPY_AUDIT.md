# PayPing Lite: Static Accessibility & Copy Audit

**Audit Target:** App source code on `main` (`src/app/`, `src/components/`, `src/i18n/`, `src/utils/`, `src/parser/`)  
**Scope:** Accessibility (WCAG 2.1 AA / TalkBack & VoiceOver), Spoken Ringgit Announcements, Hawker Tone & Plain Language (EN + MS), 48dp Touch Targets, Non-Color Signals  
**Auditor:** Antigravity (Pair Programming Assistant)  
**Implementation Note:** App code is unmodified; fixes are prioritized for **Kimi-UI** implementation.

---

## Executive Summary & Priority Matrix

| Priority | Definition | Item Count | Key Examples |
|---|---|:---:|---|
| **P0 (Critical)** | Core voice/TTS & TalkBack failure, data loss risk, or blocker for disabled users | **5** | Amounts announced as "RM12.50" rather than spoken ringgit words; missing switch labels in Settings; destructive resets lacking warnings |
| **P1 (High)** | Major hawker jargon, missing button roles/labels, touch targets < 48dp | **8** | "Parsers"/"Pengurai" developer terminology on main navigation; tokenizer token width < 48dp; wizard dual-input collision |
| **P2 (Medium)** | Expandable states unannounced, missing hint text, color-only state differentiation | **6** | Transaction row expansion missing `accessibilityState={{ expanded }}`; wizard token selection color without field badge |
| **P3 (Low)** | Subtle typographic polish, redundant styling, secondary screen copy tuning | **4** | Unused `a11y.*` strings cleanup; secret version tap accessibility |

---

## 1. Pressable & Button Accessibility Audit (Labels, Roles & States)

### 1.1 `src/components/today-view.tsx:46`
- **Issue:** Health status header `<Pressable accessibilityRole="button" onPress={...} style={styles.health}>` lacks an `accessibilityLabel`.
- **TalkBack/VoiceOver Experience:** VoiceOver reads fragmented child elements: *"circle, Listening to 3 apps, button"* or *"alert-circle-outline, Notification access is off — Tap to enable, button"*.
- **Suggested Fix:** Add an explicit, dynamic `accessibilityLabel` based on system status:
  ```tsx
  accessibilityLabel={
    accessOff
      ? t('today.accessOff')
      : props.selectedCount === 0
        ? t('today.noApps')
        : t('today.listening', { count: props.selectedCount })
  }
  accessibilityHint={accessOff || props.selectedCount === 0 ? t('a11y.openSettingsHint') : undefined}
  ```

### 1.2 `src/components/today-view.tsx:99`
- **Issue:** `<Pressable onPress={() => props.onCreateParser(parserPrompt)} style={styles.parserPrompt}>` is missing `accessibilityRole="button"` and `accessibilityLabel`.
- **TalkBack/VoiceOver Experience:** Screen readers read raw icon names: *"lightbulb-outline, Make PayPing understand Maybank notifications, chevron-right"*.
- **Suggested Fix:**
  ```tsx
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={t('makePayPingUnderstand', { app: parserApp?.label ?? parserPrompt.source_app })}
    accessibilityHint={t('a11y.createRuleHint')}
    onPress={() => props.onCreateParser(parserPrompt)}
    style={styles.parserPrompt}
  >
  ```

### 1.3 `src/components/capture-row.tsx:43`
- **Issue:** `<Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress}>` has no `accessibilityLabel` and no `accessibilityState={{ expanded }}`.
- **TalkBack/VoiceOver Experience:** Screen readers read all text children in pieces: *"Siti Aminah, Touch 'n Go eWallet, 10:45 AM, Received, +RM 25.00"*. When focused in History (`src/components/history-view.tsx:117`), expanding/collapsing the row gives zero audio feedback.
- **Suggested Fix:**
  - Provide a cohesive `accessibilityLabel` using spoken words.
  - Add `accessibilityState={{ expanded: isExpanded }}` when interactive in History.
  - Add `accessibilityHint={t('a11y.expandTransaction')}`.

### 1.4 `src/app/(tabs)/settings.tsx:174, 188, 246`
- **Issue:** All three `<Switch>` components in `SettingsScreen` (Speak Payments, Duck Audio, Keep Awake) lack `accessibilityLabel`.
- **TalkBack/VoiceOver Experience:** When swiping to the switch node, TalkBack announces: *"Switch, On, double tap to toggle"*, leaving the user in the dark about what setting is being changed.
- **Suggested Fix:**
  - Line 174: `accessibilityLabel={t('settings.speakPayments')}`
  - Line 188: `accessibilityLabel={t('settings.duckAudio')}`
  - Line 246: `accessibilityLabel={t('settings.keepAwake')}`

### 1.5 `src/components/app-picker.tsx:168`
- **Issue:** App details expand button `<Pressable accessibilityRole="button" accessibilityLabel={item.app.label} ...>` uses the exact app name as its label:
  ```tsx
  <Switch accessibilityLabel={t('a11y.toggleApp', { app: item.app.label })} ... />
  <Pressable accessibilityRole="button" accessibilityLabel={item.app.label} ... />
  ```
- **TalkBack/VoiceOver Experience:** User hears: *"Capture notifications from Maybank, switch, on"*, then immediately *"Maybank, button, collapsed"*.
- **Suggested Fix:** Differentiate the info expander:
  - `accessibilityLabel={t('a11y.showAppDetails', { app: item.app.label })}`
  - EN: `"Show package details for {app}"`
  - MS: `"Tunjukkan butiran aplikasi {app}"`

### 1.6 `src/app/(tabs)/_layout.tsx:27-55`
- **Issue:** `Tabs.Screen` declarations lack `tabBarAccessibilityLabel`. When `tabBarBadge: reviewCount` is shown, VoiceOver reads *"Today, 3"* without explaining what "3" means.
- **Suggested Fix:**
  ```tsx
  tabBarAccessibilityLabel: reviewCount > 0
    ? `${t('tabs.today')}, ${t('needsCheckCount', { count: reviewCount })}`
    : t('tabs.today')
  ```

---

## 2. Spoken Ringgit Amounts (TalkBack / VoiceOver & TTS Engine)

### 2.1 The Problem
When TalkBack or VoiceOver reads `RM 12.50` or `+RM 12.50`:
- **Android TalkBack (EN):** Reads *"plus R M twelve point five zero"* or *"twelve dollars fifty cents"*.
- **Android TalkBack (MS):** Reads *"tambah R M satu dua perpuluhan lima sifar"*.
- **iOS VoiceOver:** Reads *"R M twelve dollars and fifty cents"*.
- **Internal TTS (`src/parser/tts.ts:8-15`):** Even the app's speech synthesizer outputs literal `RM 12.50`!
  ```ts
  // src/parser/tts.ts line 8-15
  const amount = result.currency === 'MYR'
    ? `RM ${major}.${String(minor).padStart(2, '0')}`
    : ...;
  return `Received ${amount}...`;
  ```
  This causes the Android native TTS engine to announce *"Received R M twelve point five zero from Ali"*, which sounds robotic, unnatural, and difficult to comprehend in a noisy hawker stall.

### 2.2 Suggested Fix: Dedicated Spoken Formatter
Introduce `formatSpokenAmount` in `src/utils/format.ts`:
```ts
export function formatSpokenAmount(
  amountMinor: number | null,
  currency = 'MYR',
  language: 'en' | 'ms' = 'en'
): string {
  if (amountMinor === null) return '';
  const major = Math.floor(Math.abs(amountMinor) / 100);
  const minor = Math.abs(amountMinor) % 100;

  if (currency === 'MYR') {
    if (language === 'ms') {
      if (minor === 0) return `${major} ringgit`;
      if (major === 0) return `${minor} sen`;
      return `${major} ringgit ${minor} sen`;
    } else {
      if (minor === 0) return `${major} ringgit`;
      if (major === 0) return `${minor} cents`;
      return `${major} ringgit ${minor} sen`;
    }
  }

  // Non-MYR fallback
  return `${major}${minor > 0 ? `.${String(minor).padStart(2, '0')}` : ''} ${currency}`;
}
```

### 2.3 Required Component Updates
1. **`src/parser/tts.ts:8-15`:**
   - Update `ttsText` to format using spoken words:
   - English: `"Received 12 ringgit 50 sen from Ali"` / `"Paid 12 ringgit 50 sen to Ali"`
   - Malay: `"Diterima 12 ringgit 50 sen daripada Ali"` / `"Dibayar 12 ringgit 50 sen kepada Ali"`
2. **`src/components/today-view.tsx:64-70` (Total Received Hero):**
   - Provide `accessibilityLabel`:
     ```tsx
     accessibilityLabel={`${t('totalReceivedToday')}: ${formatSpokenAmount(received, 'MYR', language)}. ${t('paymentsCount', { count: loggedToday.length })}. ${t('paidOut')}: ${formatSpokenAmount(paid, 'MYR', language)}`}
     ```
3. **`src/components/today-view.tsx:120-130` (Latest Payment):**
   - Provide `accessibilityLabel`:
     ```tsx
     accessibilityLabel={`${latest.direction === 'in' ? t('received') : t('paid')} ${formatSpokenAmount(latest.amount_minor, latest.currency, language)}${latest.counterparty ? ` ${language === 'ms' ? 'daripada' : 'from'} ${latest.counterparty}` : ''}`}
     ```
4. **`src/components/capture-row.tsx:43-61` (`CaptureListItem`):**
   - Apply `accessibilityLabel` using `t('a11y.transaction', ...)` with `formatSpokenAmount`.
5. **`src/app/(tabs)/settings.tsx:69` & `src/app/onboarding.tsx:34` (`speakTest`):**
   - Change test announcement from:
     `speakTest(`${t('received')} RM 12.50`)`
   - To natural spoken words:
     `speakTest(language === 'ms' ? 'Diterima 12 ringgit 50 sen daripada Ali' : 'Received 12 ringgit 50 sen from Ali')`

---

## 3. Hawker Copy & Tone Audit (Jargon Elimination)

A Malaysian pasar malam or hawker stall owner needs rapid, unmistakable cues. Technical terminology creates friction and distrust.

### 3.1 Critical Jargon Audit List

| Location / Key | Current String (EN / MS) | Problem / Hawkish Impact | Suggested Replacement (EN) | Suggested Replacement (MS) |
|---|---|---|---|---|
| `tabs.parsers` / `parsers.title` | `Parsers` / `Pengurai` | **Major Jargon.** "Parsers" is developer slang. In Malay, "Pengurai" means biological decomposer (fungi/bacteria). Hawkers think in terms of "Banks" or "Bank Rules". | **Bank Rules** (or **Banks**) | **Aturan Bank** (or **Bank**) |
| `src/app/(tabs)/_layout.tsx:46` | Tab Icon: `code-json` (`{ }`) | Curly brackets `{ }` signify developer syntax, not money or banking. | Icon: `bank-outline` | Icon: `bank-outline` |
| `makePayPingUnderstand` / `createParserFromThis` | `Make PayPing understand {app} notifications → Create parser` / `Bantu PayPing memahami notifikasi {app} → Cipta pengurai` | "Create parser" / "Cipta pengurai" sounds like writing code. | **Make PayPing recognize {app} → Add rule** | **Ajar PayPing kenali {app} → Tambah aturan** |
| `genericFallback` / `history.genericFallback` | `Parsed via Generic Fallback` / `Diurai melalui Pengurai Generik` | Technical parsing pipeline failure mode phrasing. | **Detected using standard format** | **Dikesan guna format asas** |
| `capture.counterparty` / `parsers.counterpartyField` | `Counterparty` / `Pihak transaksi` | "Counterparty" is legal banking jargon; "Pihak transaksi" sounds like a commercial court contract. | **Sender / Customer** (or **Name**) | **Nama Pelanggan / Penghantar** |
| `parsers.pasteJson` / `parsers.openFile` | `Paste JSON` / `Open .json File` / `Tampal JSON` / `Buka Fail .json` | Exposing file extensions (`.json`) on primary buttons intimidates non-technical stall owners. | **Paste rule code** / **Import rule file** | **Tampal kod aturan** / **Pilih fail aturan** |
| `parsers.rawEditor` | `Raw JSON` / `JSON Mentah` | Developer mode exposed without context. | **Code View (Advanced)** | **Paparan Kod (Lanjutan)** |
| `parsers.packageNames` | `App package names` / `Nama pakej aplikasi` | Users don't know what an Android package name is (`com.maybank2u.life`). | **Bank application ID** | **ID aplikasi bank** |
| `settings.duckAudio` / `duckAudioDescription` | `Duck Background Audio` / `Perlahankan Audio Latar Belakang` | "Audio ducking" is sound engineering jargon. | **Lower music volume during alerts** | **Perlahankan muzik semasa pengumuman** |
| `settings.capture` / `settings.capturedApps` | `Capture` / `Captured Apps` / `Pemantauan` / `Aplikasi Dipantau` | "Capture" sounds like taking photos; "Pemantauan" sounds like surveillance/police monitoring. | **Connected Bank Apps** | **Aplikasi Bank & E-Dompet** |
| `review.confirmIn` / `review.confirmOut` | `Confirm In` / `Confirm Out` / `Sahkan Masuk` / `Sahkan Keluar` | Lacks clear financial object. | **Confirm Money In** / **Confirm Money Out** | **Sahkan Duit Masuk** / **Sahkan Duit Keluar** |
| `needsCheckCount` | `{count} needs check` | Bad English grammar (subject-verb agreement). | **{count} need check** (or **{count} to check**) | **{count} perlu disemak** |

### 3.2 Natural Bahasa Melayu Nuances
- **"Tekan" vs "Ketik":**
  - Current: `Ketik untuk mendayakan`, `Ketik tiga titik...`, `Ketik amaun...`.
  - Indonesian software uses "Ketik" (which in standard Malay means "to type on a typewriter/keyboard").
  - Malaysian Android users naturally say **"Tekan"** (e.g., *"Tekan untuk aktifkan"*, *"Tekan tiga titik di penjuru atas"*, *"Tekan pada jumlah wang"*).
- **"Duit" vs "Wang":**
  - "Wang masuk / Wang keluar" is formal. In daily Malaysian hawker speech, **"Duit Masuk"** and **"Duit Keluar"** are universally understood and clearer when spoken over noise.

---

## 4. Touch Targets Audit (Minimum 48x48 dp)

Android Material Design & WCAG 2.5.5 require all interactive touch targets to be at least **48x48 dp** (or provide equivalent touch slop).

### 4.1 Findings & Violations

| File & Line | Component | Current Dimensions | Status | Problem & Suggested Fix |
|---|---|---|:---:|---|
| `src/components/parser-wizard.tsx:163-178` | Token Selection Pressable (`styles.token`) | `minHeight: 48, paddingHorizontal: 6, gap: 4` | **FAIL** | Short tokens like `"RM"`, `"."`, `"to"`, `"di"` have rendered widths of only **18dp–28dp**. Users with large fingers or cooking gloves at a stall easily mis-tap adjacent tokens. **Fix:** Add `minWidth: 44` or `minWidth: 48` to `styles.token`, or add `hitSlop={6}`. |
| `src/components/today-view.tsx:89-91` | Review Action Text Buttons (`styles.reviewLinks`) | `AppButton variant="text"` | **PASS** | Meets 48dp minimum height via `styles.button: { minHeight: 48 }`. |
| `src/components/history-view.tsx:80-85` | Date Filter Chips (`styles.chips`) | `Chip` component: `minHeight: 48, paddingHorizontal: 16` | **PASS** | With padding, minimum width is ~54dp; height is 48dp. |
| `src/components/app-picker.tsx:168` | App Detail Expander (`styles.detailButton`) | `width: 48, minHeight: 56` | **PASS** | Exceeds 48x48 dp. |
| `src/components/parser-list-item.tsx:59-70` | Parser Action Buttons (`styles.actions`) | Row of `AppButton` | **PASS** | Each button has `minHeight: 48, paddingHorizontal: 16`. |

---

## 5. Color as the Only Signal (WCAG 1.4.1)

WCAG 1.4.1 states that color must not be the sole visual means of conveying information, indicating an action, or distinguishing an element.

### 5.1 Findings & Required Fixes

1. **Wizard Token Selection (`src/components/parser-wizard.tsx:169-175`):**
   - **Problem:** When a token is tagged as "amount" or "counterparty", its background turns `theme.accent` (blue). There is **no icon or text label** distinguishing whether the token was assigned to the amount or counterparty! A colorblind user cannot tell which field is active or assigned.
   - **Fix:** Render a tiny text indicator or symbol badge next to selected tokens:
     - E.g. `[Jumlah] RM12.50` / `[Pihak] Ali` or an underline/border pattern.
2. **Destructive Actions in Settings (`src/app/(tabs)/settings.tsx:301-306`):**
   - **Problem:** "Delete Transaction History Only" and "Reset Entire App Database" use `theme.danger` (red text & icon). To a user with protanopia or deuteranopia, `#B91C1C` can appear identical to dark gray `#475569`.
   - **Fix:** Add a text badge or warning icon:
     - `icon="alert-octagon-outline"`
     - Subtitle warning: `"[Irreversible] Permanently removes records."`
3. **Live Test Match Indicator (`src/components/parser-live-test.tsx:58-60` & `parser-wizard.tsx:186`):**
   - **Problem:** Success/Failure is shown in green vs gray text:
     ```tsx
     <Text style={[styles.result, { color: result?.ruleId ? theme.moneyIn : theme.textSecondary }]}>
       {t(result?.ruleId ? 'parsers.testSuccess' : 'parsers.testFailure')}
     </Text>
     ```
   - **Fix:** Prepend an explicit icon:
     - Success: `<Icon name="check-circle" color={theme.moneyIn} size={18} /> Match found`
     - Failure: `<Icon name="close-circle-outline" color={theme.textSecondary} size={18} /> No match found`
4. **Transaction List Items (`src/components/capture-row.tsx:40-60`):**
   - **Audit Result: PASS.** Green and red are supplemented with prefix text (`Received` / `Paid`), explicit math signs (`+` / `-`), and distinct direction labels.

---

## 6. Complete Replacement Dictionary (EN & MS)

Below are the recommended drop-in replacements for `src/i18n/en.ts` and `src/i18n/ms.ts`:

### 6.1 Navigation & Main Tabs
```ts
// EN
'tabs.parsers': 'Bank Rules',
'parsers.title': 'Bank Rules',

// MS
'tabs.parsers': 'Aturan Bank',
'parsers.title': 'Aturan Bank',
```

### 6.2 Today & Review Feed
```ts
// EN
'needsCheckCount': '{count} need check',
'needsYourCheck': 'Check unconfirmed payments ({count})',
'createParserFromThis': 'Teach PayPing this format',
'makePayPingUnderstand': 'Make PayPing recognize {app} → Add rule',
'genericFallback': 'Standard bank pattern',
'review.confirmIn': 'Confirm Money In',
'review.confirmOut': 'Confirm Money Out',
'review.createParser': 'Add bank rule from this notification',
'capture.counterparty': 'Customer / Sender name',

// MS
'needsCheckCount': '{count} perlu disemak',
'needsYourCheck': 'Sahkan bayaran belum pasti ({count})',
'createParserFromThis': 'Ajar PayPing format ini',
'makePayPingUnderstand': 'Ajar PayPing kenali {app} → Tambah aturan',
'genericFallback': 'Format asas standard',
'review.confirmIn': 'Sahkan Duit Masuk',
'review.confirmOut': 'Sahkan Duit Keluar',
'review.createParser': 'Bina aturan bank daripada notifikasi ini',
'capture.counterparty': 'Nama pelanggan / penghantar',
```

### 6.3 Bank Rules (Parsers) Management
```ts
// EN
'parsers.import': 'Add Bank Rule',
'parsers.pasteJson': 'Paste Rule Code',
'parsers.openFile': 'Import Rule File (.json)',
'parsers.empty': 'No custom bank rules yet. Import a rule or create one from a payment.',
'parsers.rawEditor': 'Code View (Advanced)',
'parsers.packageNames': 'Android Package ID',
'parsers.iosAppNames': 'iOS App Name',
'parsers.counterpartyPattern': 'Sender / Merchant name pattern',
'parsers.shareJson': 'Share Rule (.json)',
'parsers.generic': 'Standard Fallback Pattern',
'parsers.genericDescription': 'Used when your bank does not have a custom rule installed.',
'parsers.creditKeywords': 'Money-in words (e.g. received, terima)',
'parsers.debitKeywords': 'Money-out words (e.g. paid, bayar, charged)',
'parsers.wizardIntro': 'Tap the parts of your notification to teach PayPing how to read it.',
'parsers.tagAmount': 'Tap the amount to mark it as the money received or paid.',
'parsers.tagCounterparty': 'Tap the customer or merchant name to mark who sent the money.',

// MS
'parsers.import': 'Tambah Aturan Bank',
'parsers.pasteJson': 'Tampal Kod Aturan',
'parsers.openFile': 'Pilih Fail Aturan (.json)',
'parsers.empty': 'Belum ada aturan bank tersuai. Import aturan atau bina daripada bayaran yang diterima.',
'parsers.rawEditor': 'Paparan Kod (Lanjutan)',
'parsers.packageNames': 'ID Pakej Android',
'parsers.iosAppNames': 'Nama Aplikasi iOS',
'parsers.counterpartyPattern': 'Corak nama pelanggan / peniaga',
'parsers.shareJson': 'Kongsi Fail Aturan (.json)',
'parsers.generic': 'Corak Asas Standard',
'parsers.genericDescription': 'Digunakan apabila tiada aturan khusus dipasang untuk bank anda.',
'parsers.creditKeywords': 'Perkataan duit masuk (cth. terima, received, credited)',
'parsers.debitKeywords': 'Perkataan duit keluar (cth. bayar, paid, debited, charged)',
'parsers.wizardIntro': 'Tekan pada bahagian teks notifikasi untuk mengajar PayPing membacanya.',
'parsers.tagAmount': 'Tekan pada jumlah wang untuk tandakannya sebagai amaun transaksi.',
'parsers.tagCounterparty': 'Tekan pada nama pelanggan atau peniaga untuk tandakan siapa yang membayar.',
```

### 6.4 Settings & Audio
```ts
// EN
'settings.capturedApps': 'Connected Bank Apps',
'settings.duckAudio': 'Lower Music During Alerts',
'settings.duckAudioDescription': 'Temporarily lowers Spotify, YouTube or radio volume while announcing payments.',
'settings.troubleshooting': 'Setup & Permissions Troubleshooting',

// MS
'settings.capturedApps': 'Aplikasi Bank & E-Dompet',
'settings.duckAudio': 'Perlahankan Muzik Semasa Pengumuman',
'settings.duckAudioDescription': 'Memperlahankan volum muzik atau radio secara automatik semasa pengumuman bersuara.',
'settings.troubleshooting': 'Bantuan Kebenaran & Masalah Notifikasi',
```

---

## 7. Actionable Implementation Checklist for Kimi-UI

- [ ] **1. Create `formatSpokenAmount` utility in `src/utils/format.ts`:**
  - Support `MYR` integer & decimal formatting in words (`"12 ringgit 50 sen"`, `"12 ringgit"`, `"50 sen"`).
- [ ] **2. Update `src/parser/tts.ts`:**
  - Replace `RM major.minor` string formatting with natural spoken words.
- [ ] **3. Update `TodayView` (`src/components/today-view.tsx`):**
  - Add `accessibilityLabel` with spoken words to Total Received hero card (line 66) and latest payment (line 120).
  - Add `accessibilityRole="button"` and `accessibilityLabel` to health header (line 46) and parser prompt (line 99).
  - Use `t('a11y.replay')` for replay button (line 132).
- [ ] **4. Update `CaptureListItem` (`src/components/capture-row.tsx`):**
  - Add unified `accessibilityLabel` to parent `<Pressable>` using spoken ringgit format.
- [ ] **5. Update Settings Switches (`src/app/(tabs)/settings.tsx`):**
  - Add `accessibilityLabel` to the three switches on lines 174, 188, and 246.
  - Update `speakTest` call on line 69 to use spoken words.
- [ ] **6. Update Navigation & Icons (`src/app/(tabs)/_layout.tsx`):**
  - Change `parsers` tab icon from `code-json` to `bank-outline`.
  - Add `tabBarAccessibilityLabel` to `index` tab accounting for badge review count.
- [ ] **7. Touch Target Fix in Wizard (`src/components/parser-wizard.tsx`):**
  - Add `minWidth: 44` to `styles.token` to ensure short tokens (`RM`, `.`, `to`) meet 48dp touch guidelines.
  - Add visual text tag or field indicator to selected tokens so color is not the only signal.
- [ ] **8. Fix Duplicate Label in Parser Editor (`src/components/parser-editor.tsx`):**
  - Change line 199 label from `parsers.packageNames` to a distinct `parsers.iosAppNames` key.
- [ ] **9. Update `src/i18n/en.ts` and `src/i18n/ms.ts`:**
  - Replace technical jargon with hawker-friendly terminology as specified in Section 6.
