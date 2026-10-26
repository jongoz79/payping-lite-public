#!/usr/bin/env node
/**
 * design/store-shots/generate.mjs
 * Generates store screenshots for Google Play and Apple App Store
 * using raw 1080x2400 mobile screenshots.
 *
 * Target formats:
 * - Google Play Phone: 1080 x 1920
 * - Apple App Store 6.9-inch: 1320 x 2868 (iPhone 16 Pro Max)
 * - Apple App Store 6.5-inch: 1284 x 2778 (iPhone 14 Plus / 13 Pro Max)
 *
 * Usage:
 *   node design/store-shots/generate.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const SCREENS_DIR = path.join(ROOT_DIR, 'design', 'screens');
const OUTPUT_DIR = path.join(__dirname, 'output');
const SVG_TMP_DIR = path.join(__dirname, '.tmp_svg');

fs.mkdirSync(SVG_TMP_DIR, { recursive: true });

// Formats specification
const FORMATS = {
  'play': {
    name: 'Google Play (Phone)',
    width: 1080,
    height: 1920,
    bandHeight: 380,
    phoneWidth: 920,
    phoneMarginTop: 380,
    titleY: 175,
    subtitleY: 245,
    titleSize: 52,
    subtitleSize: 32,
    bezelPad: 8,
    bezelRadius: 42,
    screenRadius: 34
  },
  'appstore-6.9': {
    name: 'App Store 6.9-inch (1320x2868)',
    width: 1320,
    height: 2868,
    bandHeight: 560,
    phoneWidth: 1140,
    phoneMarginTop: 560,
    titleY: 260,
    subtitleY: 355,
    titleSize: 64,
    subtitleSize: 40,
    bezelPad: 10,
    bezelRadius: 52,
    screenRadius: 42
  },
  'appstore-6.5': {
    name: 'App Store 6.5-inch (1284x2778)',
    width: 1284,
    height: 2778,
    bandHeight: 540,
    phoneWidth: 1100,
    phoneMarginTop: 540,
    titleY: 250,
    subtitleY: 345,
    titleSize: 62,
    subtitleSize: 38,
    bezelPad: 10,
    bezelRadius: 50,
    screenRadius: 40
  }
};

// 6 Screenshot Screens based on store/screenshots.md
const SCREENS = [
  {
    id: '01-today',
    imageFile: 'today.png',
    fallback: 'today.png',
    en: {
      title: 'Hear Every Payment Aloud',
      subtitle: 'Instant Audio Alerts'
    },
    ms: {
      title: 'Dengar Setiap Bayaran Bersuara',
      subtitle: 'Pengumuman Pantas & Jelas'
    }
  },
  {
    id: '02-counter',
    imageFile: 'today.png',
    fallback: 'today.png',
    zoom: 1.25,
    en: {
      title: 'Glanceable Sales Counter',
      subtitle: 'Readable From 2 Metres Away'
    },
    ms: {
      title: 'Paparan Jualan Jelas',
      subtitle: 'Boleh Dilihat Dari Jarak 2 Meter'
    }
  },
  {
    id: '03-history',
    imageFile: 'history.png',
    fallback: 'today.png',
    en: {
      title: 'Complete Audit History',
      subtitle: 'On-Device Transaction Log'
    },
    ms: {
      title: 'Rekod Jualan Lengkap',
      subtitle: 'Disimpan Selamat Dalam Telefon'
    }
  },
  {
    id: '04-apps',
    imageFile: 'apps.png',
    fallback: 'settings.png', // Placeholder until apps screenshot is captured
    en: {
      title: 'Choose Your Apps',
      subtitle: 'Works With Any Payment Alert'
    },
    ms: {
      title: 'Pilih Aplikasi Anda',
      subtitle: 'Pantau Mana-Mana Aplikasi Bayaran'
    }
  },
  {
    id: '05-parsers',
    imageFile: 'parsers.png',
    fallback: 'today.png',
    en: {
      title: 'Create Custom Rules',
      subtitle: 'Teach PayPing Any Notification'
    },
    ms: {
      title: 'Cipta Peraturan Sendiri',
      subtitle: 'Ajar Notifikasi Baharu Dengan Mudah'
    }
  },
  {
    id: '06-settings',
    imageFile: 'settings.png',
    fallback: 'today.png',
    en: {
      title: '100% Offline Privacy',
      subtitle: 'Zero Network Calls • Export Anytime'
    },
    ms: {
      title: '100% Privasi Luar Talian',
      subtitle: 'Tiada Internet • Eksport Bila-Bila Masa'
    }
  }
];

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveImageBase64(imageName, fallbackName) {
  let p = path.join(SCREENS_DIR, imageName);
  if (!fs.existsSync(p)) {
    p = path.join(SCREENS_DIR, fallbackName);
  }
  if (!fs.existsSync(p)) {
    throw new Error(`Screenshot not found: ${imageName} or ${fallbackName} in ${SCREENS_DIR}`);
  }
  return fs.readFileSync(p).toString('base64');
}

function buildSvg(formatKey, screen, lang) {
  const f = FORMATS[formatKey];
  const copy = screen[lang];
  const base64Img = resolveImageBase64(screen.imageFile, screen.fallback);

  const phoneX = (f.width - f.phoneWidth) / 2;
  const phoneY = f.phoneMarginTop;
  const phoneH = f.height - phoneY;

  const zoom = screen.zoom || 1.0;
  const baseImgH = f.phoneWidth * (2400 / 1080);
  const imgW = f.phoneWidth * zoom;
  const imgH = baseImgH * zoom;
  const imgX = zoom > 1 ? -((imgW - f.phoneWidth) / 2) : 0;
  const imgY = 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.width}" height="${f.height}" viewBox="0 0 ${f.width} ${f.height}">
  <!-- Plain Canvas Background -->
  <rect width="${f.width}" height="${f.height}" fill="#f8fafc" />

  <!-- Top Caption Band (Brand Green #059669) -->
  <rect width="${f.width}" height="${f.bandHeight}" fill="#059669" />

  <!-- Subtle divider between band and canvas -->
  <line x1="0" y1="${f.bandHeight}" x2="${f.width}" y2="${f.bandHeight}" stroke="#047857" stroke-width="2" />

  <!-- Marketing Captions (Clean System Typography) -->
  <text x="${f.width / 2}" y="${f.titleY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${f.titleSize}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">${escapeXml(copy.title)}</text>
  <text x="${f.width / 2}" y="${f.subtitleY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${f.subtitleSize}" font-weight="500" fill="#d1fae5" text-anchor="middle">${escapeXml(copy.subtitle)}</text>

  <!-- Device Frame (Flat Slate #0f172a, no gradients, no glows) -->
  <g transform="translate(${phoneX}, ${phoneY})">
    <!-- Outer phone bezel -->
    <rect x="-${f.bezelPad}" y="0" width="${f.phoneWidth + f.bezelPad * 2}" height="${phoneH + 20}" rx="${f.bezelRadius}" fill="#0f172a" />

    <!-- Screen clip -->
    <defs>
      <clipPath id="screenClip-${formatKey}-${screen.id}">
        <rect x="0" y="8" width="${f.phoneWidth}" height="${phoneH + 12}" rx="${f.screenRadius}" />
      </clipPath>
    </defs>

    <!-- Scaled screenshot -->
    <image href="data:image/png;base64,${base64Img}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" preserveAspectRatio="none" clip-path="url(#screenClip-${formatKey}-${screen.id})" />
  </g>
</svg>`;
}

async function run() {
  console.log('Generating store screenshots with rsvg-convert...\n');

  let totalGenerated = 0;

  for (const [formatKey, f] of Object.entries(FORMATS)) {
    for (const lang of ['en', 'ms']) {
      const outDir = path.join(OUTPUT_DIR, formatKey, lang);
      fs.mkdirSync(outDir, { recursive: true });

      for (const screen of SCREENS) {
        const outName = `${screen.id}.png`;
        const outPath = path.join(outDir, outName);
        const svgContent = buildSvg(formatKey, screen, lang);

        const tmpSvgPath = path.join(SVG_TMP_DIR, `${formatKey}_${lang}_${screen.id}.svg`);
        fs.writeFileSync(tmpSvgPath, svgContent);

        execSync(`rsvg-convert "${tmpSvgPath}" -o "${outPath}"`);
        totalGenerated++;
      }
    }
  }

  // Clean up tmp svg
  fs.rmSync(SVG_TMP_DIR, { recursive: true, force: true });

  console.log(`Successfully generated ${totalGenerated} store screenshots in ${OUTPUT_DIR}:`);
  console.log(`- play/en & ms: 1080x1920 (12 images)`);
  console.log(`- appstore-6.9/en & ms: 1320x2868 (12 images)`);
  console.log(`- appstore-6.5/en & ms: 1284x2778 (12 images)`);
}

run().catch((err) => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
