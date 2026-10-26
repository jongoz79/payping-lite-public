import os
import subprocess

BRAND_DIR = "/home/afo/dev/payping-lite-wt/ux/design/brand"
ASSETS_DIR = "/home/afo/dev/payping-lite-wt/ux/assets/images"

os.makedirs(BRAND_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

# Primary Brand Color: Emerald 600 (#059669) - Represents Money In / Transaction Arrival
# Coin Center: (410, 512), r = 165
# Safe Zone: Circle radius 338 from (512, 512). Max distance of mark from center is 297px.
# "RM" Monogram: Outlined SVG paths inside mask cutting out of the coin disc.
# Bold stroke weights (34-38px) engineered for sharp legibility at 48px and 24px.

MASK_RM_DEF = """
    <mask id="coin-rm-mask">
      <!-- White base keeps the full coin disc -->
      <rect width="1024" height="1024" fill="#FFFFFF"/>
      
      <!-- Black cuts out the RM letter silhouettes from the coin -->
      <g fill="#000000">
        <!-- Letter R Silhouette -->
        <path d="
          M 308 426
          H 372
          C 392 426 404 438 404 458
          V 480
          C 404 500 392 512 372 512
          H 348
          V 516
          L 404 598
          H 364
          L 324 538
          H 346
          V 598
          H 308
          Z
        "/>
        <!-- Letter M Silhouette -->
        <path d="
          M 416 426
          H 448
          L 464 506
          L 480 426
          H 512
          V 598
          H 480
          V 490
          L 468 546
          H 460
          L 448 490
          V 598
          H 416
          Z
        "/>
      </g>
      
      <!-- White restores the inner counter of R so it remains part of the coin -->
      <g fill="#FFFFFF">
        <path d="
          M 346 458
          H 368
          C 374 458 376 462 376 469
          V 469
          C 376 476 374 480 368 480
          H 346
          Z
        "/>
      </g>
    </mask>
"""

# Reusable Mark Group (Used in Icon, Adaptive Foreground, Monochrome, Splash, Notification)
MARK_BODY = """
    <!-- Coin with RM Monogram cutout -->
    <circle cx="410" cy="512" r="165" fill="#FFFFFF" mask="url(#coin-rm-mask)"/>
    
    <!-- Sound Ping Arc 1: r=245, stroke 50 -->
    <path d="M 592 348 A 245 245 0 0 1 592 676" fill="none" stroke="#FFFFFF" stroke-width="50" stroke-linecap="round"/>
    
    <!-- Sound Ping Arc 2: r=345, stroke 50 -->
    <path d="M 681 299 A 345 345 0 0 1 681 725" fill="none" stroke="#FFFFFF" stroke-width="50" stroke-linecap="round"/>
"""

# 1. Main Universal / iOS Icon SVG (1024x1024, opaque background)
icon_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
{MASK_RM_DEF}
  </defs>
  <rect width="1024" height="1024" fill="#059669"/>
  <g fill="#FFFFFF">
{MARK_BODY}
  </g>
</svg>"""

# 2. Android Adaptive Foreground SVG (1024x1024, transparent)
android_fg_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
{MASK_RM_DEF}
  </defs>
  <g fill="#FFFFFF">
{MARK_BODY}
  </g>
</svg>"""

# 3. Android Adaptive Background SVG (1024x1024, flat solid color)
android_bg_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#059669"/>
</svg>"""

# 4. Android Adaptive Monochrome SVG (1024x1024, transparent with white mark)
android_mono_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
{MASK_RM_DEF}
  </defs>
  <g fill="#FFFFFF">
{MARK_BODY}
  </g>
</svg>"""

# 5. Splash Icon SVG (512x512, transparent with mark)
splash_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">
  <defs>
{MASK_RM_DEF}
  </defs>
  <g fill="#FFFFFF">
{MARK_BODY}
  </g>
</svg>"""

# 6. Notification Icon SVG (96x96, transparent with white silhouette)
notification_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 1024 1024">
  <defs>
{MASK_RM_DEF}
  </defs>
  <g fill="#FFFFFF">
{MARK_BODY}
  </g>
</svg>"""

# 7. Play Store Feature Graphic SVG (1024x500)
play_feature_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
{MASK_RM_DEF}
  </defs>
  <!-- Background -->
  <rect width="1024" height="500" fill="#06281E"/>
  
  <!-- Subtle decorative line divider -->
  <line x1="390" y1="120" x2="390" y2="380" stroke="#065F46" stroke-width="2"/>

  <!-- Left: Mark Group, scaled to ~300x300, placed at (60, 100) -->
  <g transform="translate(60, 100) scale(0.293)">
    <g fill="#10B981">
{MARK_BODY}
    </g>
  </g>

  <!-- Right: Typography -->
  <!-- App Title -->
  <text x="430" y="210" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="800" letter-spacing="-1">PayPing Lite</text>

  <!-- Value Proposition Badge -->
  <rect x="430" y="234" width="144" height="26" rx="6" fill="#047857"/>
  <text x="502" y="252" text-anchor="middle" fill="#A7F3D0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="0.5">100% ON-DEVICE</text>

  <!-- Tagline Line 1 -->
  <text x="430" y="306" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600">Hear every payment.</text>

  <!-- Tagline Line 2 -->
  <text x="430" y="340" fill="#6EE7B7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400">Nothing leaves your phone.</text>
</svg>"""

# Write all SVG sources to design/brand/
files_to_write = {
    f"{BRAND_DIR}/icon.svg": icon_svg,
    f"{BRAND_DIR}/android-icon-foreground.svg": android_fg_svg,
    f"{BRAND_DIR}/android-icon-background.svg": android_bg_svg,
    f"{BRAND_DIR}/android-icon-monochrome.svg": android_mono_svg,
    f"{BRAND_DIR}/splash-icon.svg": splash_svg,
    f"{BRAND_DIR}/notification-icon.svg": notification_svg,
    f"{BRAND_DIR}/play-feature-graphic.svg": play_feature_svg,
}

for path, content in files_to_write.items():
    with open(path, "w") as f:
        f.write(content.strip())
    print(f"Wrote {path}")

# Render PNGs into assets/images/ using rsvg-convert
png_renders = [
    (f"{BRAND_DIR}/icon.svg", f"{ASSETS_DIR}/icon.png", 1024, 1024),
    (f"{BRAND_DIR}/android-icon-foreground.svg", f"{ASSETS_DIR}/android-icon-foreground.png", 1024, 1024),
    (f"{BRAND_DIR}/android-icon-background.svg", f"{ASSETS_DIR}/android-icon-background.png", 1024, 1024),
    (f"{BRAND_DIR}/android-icon-monochrome.svg", f"{ASSETS_DIR}/android-icon-monochrome.png", 1024, 1024),
    (f"{BRAND_DIR}/splash-icon.svg", f"{ASSETS_DIR}/splash-icon.png", 512, 512),
    (f"{BRAND_DIR}/notification-icon.svg", f"{ASSETS_DIR}/notification-icon.png", 96, 96),
    (f"{BRAND_DIR}/play-feature-graphic.svg", f"{BRAND_DIR}/play-feature-graphic.png", 1024, 500),
]

for src, dst, w, h in png_renders:
    subprocess.run(["rsvg-convert", "-w", str(w), "-h", str(h), src, "-o", dst], check=True)
    print(f"Rendered {dst} ({w}x{h})")

# Render test preview scales for review (192px and 48px)
subprocess.run(["rsvg-convert", "-w", "192", "-h", "192", f"{BRAND_DIR}/icon.svg", "-o", f"{BRAND_DIR}/icon-preview-192.png"], check=True)
subprocess.run(["rsvg-convert", "-w", "48", "-h", "48", f"{BRAND_DIR}/icon.svg", "-o", f"{BRAND_DIR}/icon-preview-48.png"], check=True)
print("Rendered 192px and 48px previews in design/brand/")
