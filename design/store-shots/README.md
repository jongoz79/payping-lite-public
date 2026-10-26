# Store Screenshot Templates & Generation Pipeline

This directory provides automated SVG composition templates and a build script to generate high-resolution, production-ready store screenshots for **Google Play** and the **Apple App Store** in both **English (EN)** and **Bahasa Melayu (MS)**.

---

## 1. Specifications & Target Dimensions

| Store Platform | Screen Size / Device Target | Resolution (Pixels) | Aspect Ratio | Output Directory |
|---|---|---|:---:|---|
| **Google Play** | Phone Portrait Standard | **1080 × 1920** | 9:16 | `output/play/{en,ms}/` |
| **Apple App Store** | 6.9-inch Display (iPhone 16 Pro Max) | **1320 × 2868** | ~9:19.5 | `output/appstore-6.9/{en,ms}/` |
| **Apple App Store** | 6.5-inch Display (iPhone 14 Plus / 13 Pro Max) | **1284 × 2778** | ~9:19.5 | `output/appstore-6.5/{en,ms}/` |

**Design System Rules:**
- **Caption Band:** Solid restrained brand green (`#059669`) with 2px accent divider (`#047857`).
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`), high contrast bold white title (`#ffffff`), soft emerald subtitle (`#d1fae5`).
- **Device Frame:** Minimalist flat dark slate bezel (`#0f172a`, `rx=42`), zero artificial device gradients, zero drop glows, native flat aesthetic.

---

## 2. Screenshot Scenes & Captions

All 6 screens and marketing captions map directly to [`store/screenshots.md`](../../store/screenshots.md):

| Frame ID | Scene Name | Source Screenshot | English Caption | Bahasa Melayu Caption |
|---|---|---|---|---|
| `01-today` | Today Tab / Live Feed | `design/screens/today.png` | **Hear Every Payment Aloud**<br>*Instant Audio Alerts* | **Dengar Setiap Bayaran Bersuara**<br>*Pengumuman Pantas & Jelas* |
| `02-counter` | Glanceable Sales Counter | `design/screens/today.png` (Zoomed) | **Glanceable Sales Counter**<br>*Readable From 2 Metres Away* | **Paparan Jualan Jelas**<br>*Boleh Dilihat Dari Jarak 2 Meter* |
| `03-history` | Transaction History | `design/screens/history.png` | **Complete Audit History**<br>*On-Device Transaction Log* | **Rekod Jualan Lengkap**<br>*Disimpan Selamat Dalam Telefon* |
| `04-apps` | Connected Apps | `design/screens/apps.png`*(fallback: `settings.png`)* | **Choose Your Apps**<br>*Works With Any Payment Alert* | **Pilih Aplikasi Anda**<br>*Pantau Mana-Mana Aplikasi Bayaran* |
| `05-parsers` | Custom Bank Rules | `design/screens/parsers.png` | **Create Custom Rules**<br>*Teach PayPing Any Notification* | **Cipta Peraturan Sendiri**<br>*Ajar Notifikasi Baharu Dengan Mudah* |
| `06-settings` | Offline Privacy & Export | `design/screens/settings.png` | **100% Offline Privacy**<br>*Zero Network Calls • Export Anytime* | **100% Privasi Luar Talian**<br>*Tiada Internet • Eksport Bila-Bila Masa* |

---

## 3. Directory Layout

```text
design/store-shots/
├── README.md               # Pipeline documentation & instructions
├── template.svg            # Standalone reference vector SVG template
├── generate.mjs            # Production screenshot generator script
└── output/
    ├── play/
    │   ├── en/             # 6 PNGs (1080x1920)
    │   └── ms/             # 6 PNGs (1080x1920)
    ├── appstore-6.9/
    │   ├── en/             # 6 PNGs (1320x2868)
    │   └── ms/             # 6 PNGs (1320x2868)
    └── appstore-6.5/
        ├── en/             # 6 PNGs (1284x2778)
        └── ms/             # 6 PNGs (1284x2778)
```

---

## 4. How to Re-Run Once Final Screenshots Exist

Once final pixel-perfect screenshots are captured from the app (e.g. from an emulator or physical device at 1080×2400):

### Step 1: Place Raw Screenshots
Save the raw 1080×2400 un-framed PNG screenshots into `design/screens/`:
- `design/screens/today.png` (Today tab with sample received transactions)
- `design/screens/history.png` (History tab with expanded transaction)
- `design/screens/apps.png` (Captured apps picker with selected bank apps)
- `design/screens/parsers.png` (Bank rules list / parser generator)
- `design/screens/settings.png` (Settings with offline privacy info)

*(Note: If `apps.png` is not yet available, `generate.mjs` automatically falls back to `settings.png`.)*

### Step 2: Run the Generator
From the root of the worktree, run:
```bash
node design/store-shots/generate.mjs
```

### Requirements:
- **Node.js** (v18+)
- **`rsvg-convert`** (installed via `librsvg2-bin` on Ubuntu/Debian, or `brew install librsvg` on macOS)

The script renders all 36 PNG store assets in approximately 1–2 seconds.
