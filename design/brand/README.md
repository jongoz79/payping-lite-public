# PayPing Lite — Brand Identity & Asset Guidelines

**Version:** 2.0.0  
**Target:** PayPing Lite v1 (3.0.0)  
**Package:** `com.paypingmy.app`

---

## 1. Concept & Metaphor

PayPing Lite announces payments aloud the moment they land ("Received RM 12.50 from Ali").

The visual identity uses a clean, flat, geometric symbol:
- **The Ringgit Coin:** A solid white disc stamped with a bold **"RM" monogram** (Malaysian Ringgit currency cue), drawn as outlined SVG vector paths with no font dependencies.
- **The Audio Ping Waves:** Two bold, concentric acoustic broadcast arcs radiating outward to the right, representing spoken Text-to-Speech alerts and instant sound verification.

### Design Principles:
- **Zero Downloader Confusion:** Avoids down-arrows that resemble file/browser download utilities. The "RM" monogram immediately identifies the app as a Malaysian ringgit payment tool.
- **Zero Fluff:** No gradients, no glows, no 3D bevels, no glossy highlights, and no mascots.
- **Tool-Like Legibility:** Designed to be crisp and immediately legible at 48×48 launcher icon scale and 24×24 status bar scale.
- **Android Themed Icon Native:** Built with a stencil negative-space cutout that functions natively in single-color monochrome.

---

## 2. Color Palette

| Token | Hex | Role | Usage |
|---|---|---|---|
| **Primary Brand (Emerald)** | `#059669` | Money In / Trust / Vitality | Icon background, Android adaptive background, Splash background |
| **Foreground Accent** | `#FFFFFF` | Contrast & Clarity | Coin body, acoustic arcs |
| **Monogram Cutout** | Transparent / `#059669` | Negative Space Identity | Cutout revealing the background color through the coin |
| **Dark Theme Slate** | `#06281E` / `#0F172A` | Background Depth | Play Store feature graphic background |
| **Monochrome Silhouette** | `#FFFFFF` on transparent | System Themed Tinting | Android 13+ Material You themed icons & status bar notifications |

---

## 3. Asset Specifications & Inventory

| File Path | Dimensions | Format | Safe Zone & Role |
|---|---|---|---|
| `assets/images/icon.png` | 1024×1024 | Opaque PNG | iOS app icon & universal store asset (no transparency) |
| `assets/images/android-icon-foreground.png` | 1024×1024 | RGBA PNG | Android adaptive foreground (mark inside 66% / 676px circle) |
| `assets/images/android-icon-background.png` | 1024×1024 | RGB PNG | Android adaptive background (solid `#059669`) |
| `assets/images/android-icon-monochrome.png` | 1024×1024 | RGBA PNG | Android 13+ Material You themed icon (white on transparent) |
| `assets/images/splash-icon.png` | 512×512 | RGBA PNG | Native launch splash screen mark |
| `assets/images/notification-icon.png` | 96×96 | RGBA PNG | Android status bar notification white silhouette |
| `design/brand/play-feature-graphic.png` | 1024×500 | RGB PNG | Google Play Store listing promotional banner |
| `design/brand/icon-preview-192.png` | 192×192 | RGB PNG | Standard review scale |
| `design/brand/icon-preview-48.png` | 48×48 | RGB PNG | Standard 48px launcher icon review scale |

---

## 4. Adaptive Icon Safe-Zone Compliance

Android adaptive icons require the primary mark to be completely contained within a **66% diameter safe circle** (radius = 337.9px from canvas center `(512, 512)`).

- **Mark Bounding Box:** X from 245 to 780 (width 535px, centered at 512.5), Y from 275 to 749 (height 474px, centered at 512).
- **Maximum Distance from Center:** **297.0px**, leaving >40px margin before the 337.9px boundary.
- **Result:** No launcher mask (circle, squircle, rounded square, teardrop) clips any part of the coin or ping waves.

---

## 5. Rendering Commands (`rsvg-convert`)

All source files are vector SVGs located in `design/brand/`. To re-render the PNG assets:

```bash
# Automated build script:
python3 design/brand/generate_brand_assets.py

# Or individually via rsvg-convert:
rsvg-convert -w 1024 -h 1024 design/brand/icon.svg -o assets/images/icon.png
rsvg-convert -w 1024 -h 1024 design/brand/android-icon-foreground.svg -o assets/images/android-icon-foreground.png
rsvg-convert -w 1024 -h 1024 design/brand/android-icon-background.svg -o assets/images/android-icon-background.png
rsvg-convert -w 1024 -h 1024 design/brand/android-icon-monochrome.svg -o assets/images/android-icon-monochrome.png
rsvg-convert -w 512 -h 512 design/brand/splash-icon.svg -o assets/images/splash-icon.png
rsvg-convert -w 96 -h 96 design/brand/notification-icon.svg -o assets/images/notification-icon.png
rsvg-convert -w 1024 -h 500 design/brand/play-feature-graphic.svg -o design/brand/play-feature-graphic.png
rsvg-convert -w 192 -h 192 design/brand/icon.svg -o design/brand/icon-preview-192.png
rsvg-convert -w 48 -h 48 design/brand/icon.svg -o design/brand/icon-preview-48.png
```
