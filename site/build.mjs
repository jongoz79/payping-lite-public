#!/usr/bin/env node
/**
 * site/build.mjs
 * Static site generator for PayPing Lite parser library.
 * Zero runtime network dependencies. Generates vanilla HTML/CSS/JS into site/dist/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PARSERS_DIR = path.join(ROOT_DIR, 'parser-library', 'parsers');
const FIXTURES_DIR = path.join(ROOT_DIR, 'parser-library', 'fixtures');
const FIXTURES_REAL_DIR = path.join(ROOT_DIR, 'parser-library', 'fixtures-real');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_PARSERS_DIR = path.join(DIST_DIR, 'parsers');

// Ensure destination directories exist
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(DIST_PARSERS_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });

// Verified tested parsers backed by real notification corpus
const REAL_TESTED_PARSERS = new Set(['google-wallet', 'hsbc', 'mae', 'touchngo']);

// Fixture mapping
const FIXTURE_FILE_MAP = {
  'google-wallet': [path.join(FIXTURES_REAL_DIR, 'google-wallet.json')],
  'hsbc': [path.join(FIXTURES_REAL_DIR, 'hsbc.json')],
  'mae': [
    path.join(FIXTURES_REAL_DIR, 'maybank2u.json'),
    path.join(FIXTURES_DIR, 'mae.json')
  ],
  'touchngo': [
    path.join(FIXTURES_REAL_DIR, 'touchngo.json'),
    path.join(FIXTURES_DIR, 'touchngo.json')
  ],
  'cimb': [path.join(FIXTURES_DIR, 'cimb.json')],
  'mypb': [path.join(FIXTURES_DIR, 'mypb.json')],
  'qrpaybiz': [path.join(FIXTURES_DIR, 'qrpaybiz.json')],
  'rhb': [path.join(FIXTURES_DIR, 'rhb.json')]
};

// SVG icons (clean, inline, no emoji)
const ICONS = {
  copy: `<svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M7 3.5A1.5 1.5 0 018.5 2h7A1.5 1.5 0 0117 3.5v9a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 12.5v-9zM8.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-7z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-1a.5.5 0 00-1 0v1a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h1a.5.5 0 000-1h-1z"/></svg>`,
  check: `<svg class="icon icon-check" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>`,
  download: `<svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.69L6.53 8.72a.75.75 0 00-1.06 1.06l4 4a.75.75 0 001.06 0l4-4a.75.75 0 10-1.06-1.06l-2.72 2.72V2.75z"/><path d="M3.5 14.75a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.25a.75.75 0 01-.75-.75z"/></svg>`,
  shieldCheck: `<svg class="icon icon-status" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M10 1.75a.75.75 0 01.375.1l6 3.5a.75.75 0 01.375.65v4.5a10.5 10.5 0 01-5.733 9.35.75.75 0 01-.764 0A10.5 10.5 0 014.25 10.5v-4.5a.75.75 0 01.375-.65l6-3.5a.75.75 0 01.375-.1zm4.03 6.47a.75.75 0 00-1.06-1.06L9 11.19l-1.97-1.97a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l4.5-4.5z" clip-rule="evenodd"/></svg>`,
  alertCircle: `<svg class="icon icon-status" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`,
  search: `<svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>`,
  arrowRight: `<svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>`,
  logo: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#059669"/><text x="16" y="21" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">RM</text></svg>`,
  github: `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHeader(activeNav = 'library', relativePrefix = '') {
  return `
  <header class="site-header">
    <div class="container header-inner">
      <a href="${relativePrefix}index.html" class="brand">
        ${ICONS.logo}
        <span class="brand-text">PayPing <span class="brand-sub">Parser Library</span></span>
      </a>
      <nav class="nav-links">
        <a href="${relativePrefix}index.html" class="nav-link ${activeNav === 'library' ? 'active' : ''}">Parsers</a>
        <a href="${relativePrefix}guide.html" class="nav-link ${activeNav === 'guide' ? 'active' : ''}">Guide (EN)</a>
        <a href="${relativePrefix}guide-ms.html" class="nav-link ${activeNav === 'guide-ms' ? 'active' : ''}">Panduan (MS)</a>
        <a href="https://github.com/jongoz79/payping-lite-public/issues/new?template=parser.md" target="_blank" rel="noopener" class="nav-link nav-link-external">
          Contribute ${ICONS.arrowRight}
        </a>
      </nav>
    </div>
  </header>`;
}

function renderFooter(relativePrefix = '') {
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-left">
        <p><strong>PayPing Lite</strong> &mdash; Zero network permissions, privacy-first ringgit voice alerts.</p>
        <p class="footer-subtext">Community bank parsers run entirely offline on your device.</p>
      </div>
      <div class="footer-links">
        <a href="${relativePrefix}index.html">Library</a>
        <a href="${relativePrefix}guide.html">Parser Guide (EN)</a>
        <a href="${relativePrefix}guide-ms.html">Panduan Parser (MS)</a>
        <a href="https://github.com/jongoz79/payping-lite-public" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
  </footer>`;
}

// Read all parsers, or only PAYPING_SITE_PARSERS (comma-separated ids) when set
const onlyParsers = (process.env.PAYPING_SITE_PARSERS || '').split(',').map(s => s.trim()).filter(Boolean);
const parserFiles = fs.readdirSync(PARSERS_DIR)
  .filter(f => f.endsWith('.json'))
  .filter(f => !onlyParsers.length || onlyParsers.includes(f.replace(/\.json$/, '')))
  .sort();
const parsers = [];

for (const file of parserFiles) {
  const filePath = path.join(PARSERS_DIR, file);
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const parserData = JSON.parse(rawContent);

  // Write copy of raw json to dist/parsers/
  fs.writeFileSync(path.join(DIST_PARSERS_DIR, file), rawContent);

  const isTested = REAL_TESTED_PARSERS.has(parserData.id);

  // Load sample fixtures
  const fixturePaths = FIXTURE_FILE_MAP[parserData.id] || [];
  let fixtures = [];
  for (const fp of fixturePaths) {
    if (fs.existsSync(fp)) {
      try {
        const list = JSON.parse(fs.readFileSync(fp, 'utf8'));
        fixtures = fixtures.concat(list);
      } catch (err) {
        console.warn(`Failed reading fixture ${fp}:`, err);
      }
    }
  }

  // Pick representative anonymized samples
  const validSamples = fixtures.filter(f => f && (f.title || f.body));
  const positiveSamples = validSamples.filter(f => f.expect?.confidence === 'high' || f.expect?.direction === 'in' || f.expect?.direction === 'out');
  const negativeSamples = validSamples.filter(f => f.expect?.confidence === 'none' || f.expect?.direction === 'info');

  const selectedSamples = [];
  if (positiveSamples.length > 0) selectedSamples.push(positiveSamples[0]);
  if (positiveSamples.length > 1) selectedSamples.push(positiveSamples[1]);
  if (negativeSamples.length > 0) selectedSamples.push(negativeSamples[0]);
  if (selectedSamples.length === 0 && validSamples.length > 0) {
    selectedSamples.push(validSamples[0]);
  }

  parsers.push({
    ...parserData,
    rawJson: rawContent,
    fileName: file,
    isTested,
    statusText: isTested ? 'Tested on real notifications' : 'Untested — help us with real samples',
    statusClass: isTested ? 'status-tested' : 'status-untested',
    samples: selectedSamples
  });
}

// Generate CSS
const CSS = `
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --color-primary: #059669;
  --color-primary-hover: #047857;
  --color-primary-light: #ecfdf5;
  --color-primary-border: #a7f3d0;
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-hover: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #4b5563;
  --color-text-subtle: #6b7280;
  --color-border: #e5e7eb;
  --color-border-subtle: #f3f4f6;
  --color-code-bg: #1f2937;
  --color-code-text: #f9fafb;
  --color-badge-tested-bg: #ecfdf5;
  --color-badge-tested-text: #065f46;
  --color-badge-tested-border: #a7f3d0;
  --color-badge-untested-bg: #fffbeb;
  --color-badge-untested-text: #92400e;
  --color-badge-untested-border: #fde68a;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #111827;
    --color-surface: #1f2937;
    --color-surface-hover: #374151;
    --color-text: #f9fafb;
    --color-text-muted: #d1d5db;
    --color-text-subtle: #9ca3af;
    --color-border: #374151;
    --color-border-subtle: #1f2937;
    --color-code-bg: #030712;
    --color-code-text: #f3f4f6;
    --color-badge-tested-bg: #064e3b;
    --color-badge-tested-text: #a7f3d0;
    --color-badge-tested-border: #047857;
    --color-badge-untested-bg: #451a03;
    --color-badge-untested-text: #fde68a;
    --color-badge-untested-border: #78350f;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.site-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-inner {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 700;
  font-size: 1.15rem;
}

.brand-sub {
  font-weight: 500;
  color: var(--color-text-subtle);
  font-size: 0.95rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nav-link:hover, .nav-link.active {
  color: var(--color-primary);
}

.nav-link.active {
  background: var(--color-border-subtle);
}

.nav-link-external {
  color: var(--color-primary);
  border: 1px solid var(--color-border);
}

/* Hero */
.hero {
  padding: 40px 0 28px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  max-width: 760px;
  margin-bottom: 20px;
}

.callout-box {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  font-size: 0.92rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.callout-box strong {
  color: var(--color-text);
}

/* Controls / Search Bar */
.controls-bar {
  margin: 28px 0 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 260px;
  max-width: 440px;
}

.search-box .icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-subtle);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  outline: none;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.filter-group {
  display: flex;
  gap: 8px;
}

.filter-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn.active, .filter-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-btn.active {
  background: var(--color-border-subtle);
}

/* Grid & Cards - Strictly NO side borders */
.parsers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  margin-bottom: 48px;
}

.parser-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s ease;
}

.parser-card:hover {
  border-color: #9ca3af;
}

.card-top {
  margin-bottom: 16px;
}

.card-header-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.parser-name {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.parser-name a {
  color: inherit;
  text-decoration: none;
}

.parser-name a:hover {
  color: var(--color-primary);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  line-height: 1.3;
  white-space: nowrap;
}

.badge-tested {
  background: var(--color-badge-tested-bg);
  color: var(--color-badge-tested-text);
  border: 1px solid var(--color-badge-tested-border);
}

.badge-untested {
  background: var(--color-badge-untested-bg);
  color: var(--color-badge-untested-text);
  border: 1px solid var(--color-badge-untested-border);
}

.badge-version {
  background: var(--color-bg);
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border);
}

.parser-desc {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  line-height: 1.4;
}

.parser-meta {
  font-size: 0.82rem;
  color: var(--color-text-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.meta-row {
  display: flex;
  gap: 6px;
}

.meta-label {
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 76px;
}

.meta-val {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  word-break: break-all;
}

/* Sample notification box */
.sample-preview {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin-bottom: 16px;
  font-size: 0.82rem;
}

.sample-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 3px;
}

.sample-body {
  color: var(--color-text-muted);
  line-height: 1.35;
}

.sample-tag {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--color-text-subtle);
  margin-bottom: 4px;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.btn:hover {
  background: var(--color-surface-hover);
  border-color: #9ca3af;
}

.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.8rem;
}

.btn-link {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-primary);
  padding: 6px 4px;
}

.btn-link:hover {
  text-decoration: underline;
  background: transparent;
}

/* Parser Detail View */
.detail-header {
  padding: 32px 0 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--color-text-subtle);
  margin-bottom: 12px;
}

.breadcrumb a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--color-primary);
}

.detail-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  padding: 32px 0 64px;
}

@media (max-width: 860px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 14px;
  letter-spacing: -0.01em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

/* Rules list */
.rule-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rule-id {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.direction-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.dir-in {
  background: #ecfdf5;
  color: #065f46;
}

.dir-out {
  background: #fef2f2;
  color: #991b1b;
}

.dir-info {
  background: #f3f4f6;
  color: #4b5563;
}

.rule-field {
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.field-label {
  font-weight: 600;
  color: var(--color-text-subtle);
  margin-bottom: 2px;
}

.field-regex {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  background: var(--color-bg);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Code viewer */
.code-block-wrapper {
  position: relative;
  margin-top: 12px;
}

.code-block {
  background: var(--color-code-bg);
  color: var(--color-code-text);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  max-height: 480px;
  line-height: 1.45;
}

.code-copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.code-copy-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

/* Guide formatting */
.guide-content {
  padding: 36px 0 64px;
  max-width: 820px;
}

.guide-prose h1 {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.guide-prose h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 36px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.guide-prose h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 24px 0 10px;
}

.guide-prose p {
  margin-bottom: 16px;
  color: var(--color-text-muted);
  font-size: 1rem;
}

.guide-prose ul, .guide-prose ol {
  margin: 0 0 18px 24px;
  color: var(--color-text-muted);
}

.guide-prose li {
  margin-bottom: 6px;
}

.guide-prose code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--color-border-subtle);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.guide-prose pre {
  background: var(--color-code-bg);
  color: var(--color-code-text);
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 18px 0;
  font-size: 0.85rem;
  line-height: 1.45;
}

.guide-prose pre code {
  background: transparent;
  padding: 0;
  border: none;
  color: inherit;
}

.lang-switch {
  display: inline-flex;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px;
  margin-bottom: 24px;
}

.lang-switch a {
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.lang-switch a.active {
  background: var(--color-primary);
  color: #ffffff;
}

/* Toast alert */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #111827;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.25s ease;
  z-index: 100;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}

/* Footer */
.site-footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 28px 0;
  font-size: 0.88rem;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.footer-subtext {
  color: var(--color-text-subtle);
  font-size: 0.82rem;
  margin-top: 4px;
}

.footer-links {
  display: flex;
  gap: 18px;
}

.footer-links a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--color-primary);
}
`;

fs.writeFileSync(path.join(DIST_DIR, 'style.css'), CSS);

// Generate JavaScript
const JS = `
// Client-side interactions: Copy JSON and Filtering
function copyParserJson(id, btnElement) {
  const scriptElem = document.getElementById('parser-json-' + id);
  if (!scriptElem) return;
  const text = scriptElem.textContent.trim();
  copyText(text, btnElement);
}

function copyText(text, btnElement) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(showSuccess).catch(fallback);
  } else {
    fallback();
  }

  function fallback() {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showSuccess();
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function showSuccess() {
    showToast("Parser JSON copied to clipboard");
    if (btnElement) {
      const origHtml = btnElement.getAttribute('data-orig-html') || btnElement.innerHTML;
      btnElement.setAttribute('data-orig-html', origHtml);
      btnElement.innerHTML = '<svg class="icon icon-check" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> Copied!';
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 2000);
    }
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg> ' + msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Search and filter logic
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.parser-card');

  if (!searchInput && filterBtns.length === 0) return;

  let currentFilter = 'all';

  function filterCards() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    cards.forEach(card => {
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const packages = (card.getAttribute('data-packages') || '').toLowerCase();
      const tested = card.getAttribute('data-tested') === 'true';

      let matchesFilter = true;
      if (currentFilter === 'tested' && !tested) matchesFilter = false;
      if (currentFilter === 'untested' && tested) matchesFilter = false;

      let matchesSearch = true;
      if (query.length > 0) {
        matchesSearch = name.includes(query) || packages.includes(query);
      }

      if (matchesFilter && matchesSearch) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterCards);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      filterCards();
    });
  });
});
`;

fs.writeFileSync(path.join(DIST_DIR, 'script.js'), JS);

// 1. Build Index Page
function buildIndexPage() {
  const embeddedJsonScripts = parsers.map(p => {
    return `<script type="application/json" id="parser-json-${escapeHtml(p.id)}">\n${p.rawJson}\n</script>`;
  }).join('\n');

  const cardsHtml = parsers.map(p => {
    const testedBadge = p.isTested
      ? `<span class="badge badge-tested">${ICONS.shieldCheck} Tested on real notifications</span>`
      : `<span class="badge badge-untested">${ICONS.alertCircle} Untested — help us with real samples</span>`;

    let sampleHtml = '';
    if (p.samples && p.samples.length > 0) {
      const s = p.samples[0];
      sampleHtml = `
      <div class="sample-preview">
        <div class="sample-tag">Example Notification</div>
        ${s.title ? `<div class="sample-title">${escapeHtml(s.title)}</div>` : ''}
        <div class="sample-body">${escapeHtml(s.body)}</div>
      </div>`;
    }

    return `
    <article class="parser-card" data-name="${escapeHtml(p.name)}" data-packages="${escapeHtml((p.androidPackages || []).concat(p.iosAppNames || []).join(' '))}" data-tested="${p.isTested}">
      <div class="card-top">
        <div class="card-header-line">
          <h2 class="parser-name"><a href="parsers/${escapeHtml(p.id)}.html">${escapeHtml(p.name)}</a></h2>
          <span class="badge badge-version">v${p.version}</span>
        </div>
        <div style="margin-bottom: 10px;">${testedBadge}</div>
        <p class="parser-desc">${escapeHtml(p.description || 'Community parser rules for PayPing Lite.')}</p>

        <div class="parser-meta">
          <div class="meta-row">
            <span class="meta-label">Rules:</span>
            <span>${p.rules ? p.rules.length : 0} pattern${p.rules && p.rules.length > 1 ? 's' : ''}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Android:</span>
            <span class="meta-val">${escapeHtml((p.androidPackages || []).join(', ') || 'None')}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">iOS:</span>
            <span class="meta-val">${escapeHtml((p.iosAppNames || []).join(', ') || 'None')}</span>
          </div>
        </div>

        ${sampleHtml}
      </div>

      <div class="card-actions">
        <button type="button" class="btn btn-primary" onclick="copyParserJson('${escapeHtml(p.id)}', this)">
          ${ICONS.copy} Copy JSON
        </button>
        <a href="parsers/${escapeHtml(p.fileName)}" download class="btn" title="Download ${escapeHtml(p.fileName)}">
          ${ICONS.download} .json
        </a>
        <a href="parsers/${escapeHtml(p.id)}.html" class="btn btn-link">
          Rules ${ICONS.arrowRight}
        </a>
      </div>
    </article>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PayPing Lite &mdash; Bank Parser Library</title>
  <meta name="description" content="Offline bank notification parsers for PayPing Lite. Zero cloud, zero network, 100% local ringgit voice alerts.">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${renderHeader('library')}

  <section class="hero">
    <div class="container">
      <h1 class="hero-title">Bank Notification Parsers</h1>
      <p class="hero-subtitle">
        Ready-to-use parser rules for Malaysian banks and digital wallets. PayPing Lite reads notifications offline using regular expressions with zero cloud dependencies.
      </p>

      <div class="callout-box">
        <div>
          <strong>How to use in PayPing Lite:</strong> In the app, open the <strong>Bank Rules</strong> tab, tap <strong>+ Add Bank Rule</strong>, then paste the JSON or choose <strong>Import Rule File (.json)</strong>. You can also tap <strong>Teach PayPing this format</strong> on any captured notification in Today or History.
        </div>
      </div>
    </div>
  </section>

  <main class="container" style="flex: 1;">
    <div class="controls-bar">
      <div class="search-box">
        ${ICONS.search}
        <input type="text" id="searchInput" class="search-input" placeholder="Search by bank name or package name..." aria-label="Search bank parsers">
      </div>
      <div class="filter-group">
        <button type="button" class="filter-btn active" data-filter="all">All (${parsers.length})</button>
        <button type="button" class="filter-btn" data-filter="tested">Tested (${parsers.filter(p => p.isTested).length})</button>
        <button type="button" class="filter-btn" data-filter="untested">Untested (${parsers.filter(p => !p.isTested).length})</button>
      </div>
    </div>

    <div class="parsers-grid" id="parsersGrid">
      ${cardsHtml}
    </div>
  </main>

  ${renderFooter()}

  ${embeddedJsonScripts}
  <script src="script.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
}

// 2. Build Parser Detail Pages
function buildDetailPages() {
  for (const p of parsers) {
    const testedBadge = p.isTested
      ? `<span class="badge badge-tested">${ICONS.shieldCheck} Tested on real notifications</span>`
      : `<span class="badge badge-untested">${ICONS.alertCircle} Untested — help us with real samples</span>`;

    const rulesHtml = (p.rules || []).map(r => {
      const dirClass = r.direction === 'in' ? 'dir-in' : (r.direction === 'out' ? 'dir-out' : 'dir-info');
      const dirLabel = r.direction === 'in' ? 'Money In' : (r.direction === 'out' ? 'Money Out' : 'Non-financial / Info');

      let extractFields = '';
      if (r.extract) {
        for (const [key, val] of Object.entries(r.extract)) {
          const pat = typeof val === 'object' && val.pattern ? val.pattern : val;
          extractFields += `
          <div class="rule-field">
            <div class="field-label">Extract ${escapeHtml(key)}:</div>
            <div class="field-regex">${escapeHtml(pat)}</div>
          </div>`;
        }
      }

      return `
      <div class="rule-item">
        <div class="rule-header">
          <span class="rule-id">${escapeHtml(r.id)}</span>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size: 0.8rem; color: var(--color-text-subtle);">Priority: ${r.priority}</span>
            <span class="direction-tag ${dirClass}">${dirLabel}</span>
          </div>
        </div>

        ${r.match?.title ? `
        <div class="rule-field">
          <div class="field-label">Match Title:</div>
          <div class="field-regex">${escapeHtml(r.match.title)}</div>
        </div>` : ''}

        ${r.match?.body ? `
        <div class="rule-field">
          <div class="field-label">Match Body:</div>
          <div class="field-regex">${escapeHtml(r.match.body)}</div>
        </div>` : ''}

        ${extractFields}
      </div>`;
    }).join('\n');

    let samplesSection = '';
    if (p.samples && p.samples.length > 0) {
      const sampleItems = p.samples.map(s => {
        const exp = s.expect || {};
        return `
        <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; font-size: 0.88rem;">
          <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-text);">${escapeHtml(s.name || 'Sample Notification')}</div>
          ${s.title ? `<div style="font-size: 0.82rem; color: var(--color-text-subtle); margin-bottom: 2px;">Title: <span style="color: var(--color-text); font-weight: 500;">${escapeHtml(s.title)}</span></div>` : ''}
          <div style="font-size: 0.84rem; margin-bottom: 8px;">Body: <span style="color: var(--color-text);">${escapeHtml(s.body)}</span></div>
          <div style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
            <span>Direction: <strong>${escapeHtml(exp.direction || 'none')}</strong></span>
            ${exp.amountMinor ? `<span>Amount: <strong>RM ${(exp.amountMinor / 100).toFixed(2)}</strong></span>` : ''}
            ${exp.counterparty ? `<span>Counterparty: <strong>${escapeHtml(exp.counterparty)}</strong></span>` : ''}
            ${exp.reference ? `<span>Ref: <strong>${escapeHtml(exp.reference)}</strong></span>` : ''}
          </div>
        </div>`;
      }).join('\n');

      samplesSection = `
      <section class="detail-section">
        <h2 class="section-title">Tested Sample Notifications</h2>
        <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: 14px;">
          ${p.isTested ? 'These real anonymised notification formats were verified against the reference labeller.' : 'Synthetic starter samples. If your real bank notifications look different, please submit real samples!'}
        </p>
        ${sampleItems}
      </section>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(p.name)} &mdash; PayPing Lite Parser</title>
  <meta name="description" content="Parser rules for ${escapeHtml(p.name)} in PayPing Lite.">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  ${renderHeader('library', '../')}

  <div class="detail-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Parsers</a>
        <span>/</span>
        <span style="color: var(--color-text);">${escapeHtml(p.name)}</span>
      </nav>

      <div class="detail-title-line">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 6px;">${escapeHtml(p.name)}</h1>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            ${testedBadge}
            <span class="badge badge-version">v${p.version}</span>
            <span style="font-size: 0.85rem; color: var(--color-text-subtle);">By ${escapeHtml(p.author || 'PayPing Community')}</span>
          </div>
        </div>

        <div class="detail-actions">
          <button type="button" class="btn btn-primary" onclick="copyParserJson('${escapeHtml(p.id)}', this)">
            ${ICONS.copy} Copy JSON
          </button>
          <a href="${escapeHtml(p.fileName)}" download class="btn">
            ${ICONS.download} Download .json
          </a>
        </div>
      </div>
    </div>
  </div>

  <main class="container">
    <div class="detail-grid">
      <div>
        <section class="detail-section">
          <h2 class="section-title">Parser Rules (${p.rules ? p.rules.length : 0})</h2>
          ${rulesHtml}
        </section>

        ${samplesSection}
      </div>

      <div>
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 10px;">Supported Apps</h3>
          <div style="font-size: 0.85rem; margin-bottom: 12px;">
            <div style="font-weight: 600; color: var(--color-text-subtle); margin-bottom: 2px;">Android Package:</div>
            <code style="word-break: break-all;">${escapeHtml((p.androidPackages || []).join(', ') || 'None')}</code>
          </div>
          <div style="font-size: 0.85rem; margin-bottom: 12px;">
            <div style="font-weight: 600; color: var(--color-text-subtle); margin-bottom: 2px;">iOS App Name:</div>
            <code style="word-break: break-all;">${escapeHtml((p.iosAppNames || []).join(', ') || 'None')}</code>
          </div>
          <div style="font-size: 0.85rem;">
            <div style="font-weight: 600; color: var(--color-text-subtle); margin-bottom: 2px;">Schema Version:</div>
            <span>${p.schemaVersion}</span>
          </div>
        </div>

        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 8px;">How to Import in App</h3>
          <ol style="font-size: 0.88rem; color: var(--color-text-muted); margin-left: 20px; line-height: 1.5;">
            <li>Click <strong>Copy JSON</strong> above.</li>
            <li>Open <strong>PayPing Lite</strong> on your phone.</li>
            <li>Open the <strong>Bank Rules</strong> tab.</li>
            <li>Tap <strong>+ Add Bank Rule</strong> and paste.</li>
          </ol>
        </div>

        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 8px;">Report an Issue / New Samples</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 12px;">
            If your bank modified their notification phrasing or if this parser missed a transaction, please share an anonymised sample!
          </p>
          <a href="https://github.com/jongoz79/payping-lite-public/issues/new?template=parser.md" target="_blank" rel="noopener" class="btn btn-sm" style="width: 100%;">
            ${ICONS.github} Submit on GitHub
          </a>
        </div>
      </div>
    </div>

    <section class="detail-section">
      <h2 class="section-title">Raw JSON Definition</h2>
      <div class="code-block-wrapper">
        <button type="button" class="btn btn-sm code-copy-btn" onclick="copyParserJson('${escapeHtml(p.id)}', this)">
          ${ICONS.copy} Copy
        </button>
        <pre class="code-block"><code id="code-block-${escapeHtml(p.id)}">${escapeHtml(p.rawJson)}</code></pre>
      </div>
    </section>
  </main>

  ${renderFooter('../')}

  <script type="application/json" id="parser-json-${escapeHtml(p.id)}">
${p.rawJson}
</script>
  <script src="../script.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(DIST_PARSERS_DIR, `${p.id}.html`), html);
  }
}

// 3. Build Guide Pages (EN and MS)
function buildGuidePages() {
  // English Guide
  const guideEnHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How to Make PayPing Understand Your Bank &mdash; Parser Guide</title>
  <meta name="description" content="Complete guide to creating, testing, and contributing bank notification parsers for PayPing Lite.">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${renderHeader('guide')}

  <main class="container guide-content">
    <div class="lang-switch">
      <a href="guide.html" class="active">English</a>
      <a href="guide-ms.html">Bahasa Melayu</a>
    </div>

    <article class="guide-prose">
      <h1>How to Make PayPing Understand Your Bank</h1>
      <p>
        PayPing Lite runs completely offline. It never connects to the internet and never sends your notifications to any cloud server. To turn incoming bank and e-wallet notifications into instant spoken ringgit announcements, PayPing uses <strong>deterministic regular expression parsers</strong>.
      </p>
      <p>
        You have two ways to add support for a new bank or e-wallet:
      </p>
      <ol>
        <li><strong>In-app visual generator (recommended):</strong> Tap a notification on your phone and let PayPing generate the rule automatically.</li>
        <li><strong>JSON definition (power users &amp; community contributors):</strong> Write portable regex rules that can be shared in the library.</li>
      </ol>

      <h2>1. The In-App Guided Flow</h2>
      <p>
        Whenever PayPing Lite receives a notification from a banking app that it doesn't recognize yet, it places it safely in the <strong>Needs Review</strong> queue without guessing or making mistakes.
      </p>
      <ol>
        <li>Open <strong>PayPing Lite</strong> and switch to the <strong>Needs Review</strong> tab.</li>
        <li>Tap the notification you want PayPing to learn.</li>
        <li>Select <strong>"Create parser from this notification"</strong>.</li>
        <li>
          <strong>Highlight the amount:</strong> The app displays the notification text. Simply tap or drag across the amount (e.g. <code>RM 45.20</code>). PayPing automatically generates the corresponding extraction pattern.
        </li>
        <li>
          <strong>Choose the direction:</strong>
          <ul>
            <li><strong>Money In:</strong> DuitNow transfers received, QR payments received, salary or cash deposits.</li>
            <li><strong>Money Out:</strong> Debit card transactions, QR payments sent, bill payments.</li>
            <li><strong>Info (Ignore):</strong> OTP codes, promotional alerts, login notices.</li>
          </ul>
        </li>
        <li>
          <strong>Test against recent history:</strong> PayPing tests the generated rule against other recent notifications from the same app to verify that it matches accurately without false positives.
        </li>
        <li>Tap <strong>Save Parser</strong>. The app immediately parses matching future notifications and speaks them aloud.</li>
      </ol>

      <h2>2. The Parser JSON Schema</h2>
      <p>
        Every parser in the library is a single self-contained JSON document conforming to <code>schemaVersion: 1</code>.
      </p>
      <pre><code>{
  "schemaVersion": 1,
  "id": "mybank",
  "name": "My Bank Malaysia",
  "version": 1,
  "author": "Community Contributor",
  "description": "Parser for My Bank transfer received and card charge notifications.",
  "androidPackages": ["com.mybank.app"],
  "iosAppNames": ["My Bank Mobile"],
  "rules": [
    {
      "id": "mybank.received.v1",
      "priority": 200,
      "match": {
        "title": "money received|duitnow received",
        "body": "transferred to your account"
      },
      "direction": "in",
      "confidence": "high",
      "extract": {
        "amount": "(?:RM|MYR)\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
        "counterparty": "from\\s+(?<counterparty>.+?)(?:\\s+on|\\.|$)",
        "reference": "ref(?:erence)?:?\\s*(?<reference>[A-Z0-9]+)"
      }
    }
  ]
}</code></pre>

      <h3>Key Rule Fields</h3>
      <ul>
        <li>
          <code>id</code>: A unique dotted identifier following <code>&lt;bank-id&gt;.&lt;rule-name&gt;.v&lt;version&gt;</code> (e.g., <code>hsbc.card-charged.v1</code>).
        </li>
        <li>
          <code>priority</code>: An integer (e.g. <code>200</code>). Higher priority rules are evaluated first. Put specific rules (like specific card alerts) higher than broad generic rules.
        </li>
        <li>
          <code>match</code>: An object with optional <code>title</code> and <code>body</code> regex patterns. If both are specified, <strong>both must match</strong>. Matches are evaluated case-insensitively.
        </li>
        <li>
          <code>direction</code>: <code>"in"</code> (money received), <code>"out"</code> (money spent), or <code>"info"</code> (non-financial notifications like OTPs or rewards).
        </li>
        <li>
          <code>confidence</code>: <code>"high"</code> for verified transactions that should be logged and spoken; <code>"none"</code> for notifications that must not be recorded as financial transactions.
        </li>
        <li>
          <code>extract</code>: Patterns containing named capture groups:
          <ul>
            <li><code>(?&lt;amount&gt;...)</code>: The transaction figure (digits, commas, and decimals).</li>
            <li><code>(?&lt;currency&gt;...)</code>: Optional currency indicator (defaults to <code>MYR</code> if omitted).</li>
            <li><code>(?&lt;counterparty&gt;...)</code>: Merchant name or sender/recipient name.</li>
            <li><code>(?&lt;reference&gt;...)</code>: Transaction ID or reference number.</li>
          </ul>
        </li>
      </ul>

      <h2>3. Strict Rules for Safe Regular Expressions</h2>
      <p>
        Because PayPing Lite runs in the background on mobile devices (Android Hermes/V8 and iOS JavaScriptCore/Swift), regex execution must be <strong>100% predictable, cross-platform, and fast</strong>:
      </p>

      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; margin: 20px 0;">
        <h4 style="color: #b91c1c; margin-bottom: 8px; font-weight: 700;">Engine Safety Guardrails</h4>
        <ul style="margin-bottom: 0;">
          <li>
            <strong>NO Lookbehind (Forbidden):</strong> Positive lookbehind <code>(?&lt;=...)</code> and negative lookbehind <code>(?&lt;!...)</code> are strictly prohibited. Different regex engines handle lookbehinds inconsistently and can cause fatal crashes on older mobile runtimes. Use non-capturing prefix groups <code>(?:prefix)</code> with named capture groups instead.
          </li>
          <li>
            <strong>NO Nested Quantifiers (Catastrophic Backtracking):</strong> Never nest quantifiers like <code>(a+)+</code> or <code>(.*)*</code>. In hostile or unexpected inputs, this causes exponential backtracking (ReDoS) that freezes the app.
          </li>
          <li>
            <strong>50ms Execution Budget:</strong> Any regex evaluation that exceeds 50 milliseconds is terminated automatically by the PayPing parser runtime.
          </li>
          <li>
            <strong>4,000 Character Cap:</strong> Input notification titles and bodies longer than 4,000 characters are safely truncated before parsing.
          </li>
          <li>
            <strong>Named Capture Syntax:</strong> Always use standard <code>(?&lt;name&gt;...)</code> named group syntax.
          </li>
        </ul>
      </div>

      <h2>4. Real Worked Examples</h2>

      <h3>Example A: Money In (DuitNow Funds Received)</h3>
      <p><strong>Notification Body:</strong> <code>You've received RM 120.00 in your A/C from AHMAD BIN ALI on 24/10/2026.</code></p>
      <pre><code>{
  "id": "sample.duitnow-in.v1",
  "priority": 200,
  "match": {
    "body": "You've received .* in your A/C"
  },
  "direction": "in",
  "confidence": "high",
  "extract": {
    "amount": "You've received\\s+(?<currency>RM|MYR)?\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
    "counterparty": "from\\s+(?<counterparty>.+?)(?:\\s+on|\\.|$)"
  }
}</code></pre>
      <p><em>Result:</em> Direction is <strong>in</strong>, amount is <strong>12000</strong> minor units (RM 120.00), counterparty is <strong>AHMAD BIN ALI</strong>.</p>

      <h3>Example B: Money Out (Credit Card Purchase)</h3>
      <p><strong>Notification Body:</strong> <code>MYR950.00 was charged to your credit card ending 1681 at MYDIN MART on 21/09/25.</code></p>
      <pre><code>{
  "id": "hsbc.card-charged.v1",
  "priority": 200,
  "match": {
    "body": "was charged to your (?:supp )?credit card"
  },
  "direction": "out",
  "confidence": "high",
  "extract": {
    "amount": "(?<currency>RM|MYR)\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
    "counterparty": "at (?<counterparty>.+?) on \\d"
  }
}</code></pre>
      <p><em>Result:</em> Direction is <strong>out</strong>, amount is <strong>95000</strong> minor units (RM 950.00), counterparty is <strong>MYDIN MART</strong>.</p>

      <h3>Example C: Negative Filter (Ignore Promotional Alerts)</h3>
      <p><strong>Notification Body:</strong> <code>Special Offer! Enjoy RM 20.00 cashback with our partners when you spend today.</code></p>
      <pre><code>{
  "id": "sample.promo-filter.v1",
  "priority": 300,
  "match": {
    "body": "cashback with our partners|discount voucher|enjoy up to"
  },
  "direction": "info",
  "confidence": "none"
}</code></pre>
      <p><em>Result:</em> Direction is <strong>info</strong> with confidence <strong>none</strong>. PayPing Lite ignores this notification completely and avoids announcing marketing text.</p>

      <h2>5. How to Submit New Parsers or Real Samples</h2>
      <p>
        Help expand the community library! We welcome parser additions and real notification samples:
      </p>
      <ol>
        <li>
          <strong>Anonymise everything:</strong> Replace personal names with fake names (e.g. "SITI AMINAH"), mask account numbers (e.g. "ending 1234"), and jitter transaction amounts.
        </li>
        <li>
          Open our <a href="https://github.com/jongoz79/payping-lite-public/issues/new?template=parser.md" target="_blank" rel="noopener">GitHub Parser Submission Template</a>.
        </li>
        <li>Fill out the bank name, package ID, and sample notification text.</li>
        <li>Our maintainers will review, write tests in <code>parser-library/fixtures-real</code>, and publish the update in the next library release.</li>
      </ol>
    </article>
  </main>

  ${renderFooter()}

  <script src="script.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST_DIR, 'guide.html'), guideEnHtml);

  // Bahasa Melayu Guide
  const guideMsHtml = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cara Mengajar PayPing Memahami Bank Anda &mdash; Panduan Parser</title>
  <meta name="description" content="Panduan lengkap mencipta, menguji dan menyumbang parser notifikasi bank untuk PayPing Lite.">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${renderHeader('guide-ms')}

  <main class="container guide-content">
    <div class="lang-switch">
      <a href="guide.html">English</a>
      <a href="guide-ms.html" class="active">Bahasa Melayu</a>
    </div>

    <article class="guide-prose">
      <h1>Cara Mengajar PayPing Memahami Bank Anda</h1>
      <p>
        PayPing Lite beroperasi sepenuhnya di luar talian (offline). Aplikasi ini langsung tidak memerlukan kebenaran internet dan tidak pernah menghantar notifikasi anda ke mana-mana pelayan awan (cloud). Untuk menukar notifikasi bank dan e-dompet kepada suara pengumuman ringgit yang pantas, PayPing menggunakan <strong>parser ungkapan nalar (regular expressions) yang deterministik</strong>.
      </p>
      <p>
        Terdapat dua cara untuk menambah sokongan bagi bank atau e-dompet baharu:
      </p>
      <ol>
        <li><strong>Penjana Visual Dalam Aplikasi (Disyorkan):</strong> Tekan pada notifikasi yang diterima di telefon anda dan biarkan PayPing membina peraturan secara automatik.</li>
        <li><strong>Definisi JSON (Untuk Pengguna Lanjutan &amp; Komuniti):</strong> Tulis peraturan regex mudah alih yang boleh dikongsi ke dalam pustaka parser.</li>
      </ol>

      <h2>1. Aliran Visual Berpandu Dalam Aplikasi</h2>
      <p>
        Apabila PayPing Lite menerima notifikasi daripada aplikasi perbankan yang belum dikenali, ia disimpan secara selamat di dalam tab <strong>Perlu Semakan (Needs Review)</strong> tanpa meneka secara melulu.
      </p>
      <ol>
        <li>Buka <strong>PayPing Lite</strong> dan pilih tab <strong>Perlu Semakan</strong>.</li>
        <li>Tekan notifikasi yang ingin diajar kepada PayPing.</li>
        <li>Pilih <strong>"Bina parser daripada notifikasi ini"</strong>.</li>
        <li>
          <strong>Sorot jumlah wang:</strong> Paparan aplikasi akan menunjukkan teks notifikasi. Cukup sekadar menekan atau memilih jumlah wang (contoh: <code>RM 45.20</code>). PayPing akan menjana corak pengekstrakan secara automatik.
        </li>
        <li>
          <strong>Pilih arah transaksi:</strong>
          <ul>
            <li><strong>Duit Masuk (Money In):</strong> Pindahan DuitNow diterima, bayaran QR diterima, gaji atau deposit tunai.</li>
            <li><strong>Duit Keluar (Money Out):</strong> Transaksi kad debit/kredit, bayaran QR dibuat, pembayaran bil.</li>
            <li><strong>Maklumat / Abaikan (Info):</strong> Kod OTP/TAC, promosi diskaun, amaran keselamatan log masuk.</li>
          </ul>
        </li>
        <li>
          <strong>Uji pada rekod sejarah terkini:</strong> PayPing akan menguji peraturan baharu terhadap notifikasi terdahulu daripada aplikasi yang sama untuk memastikan tiada padanan palsu (false positive).
        </li>
        <li>Tekan <strong>Simpan Parser</strong>. Notifikasi seterusnya akan diproses dan diumumkan secara bersuara serta-merta.</li>
      </ol>

      <h2>2. Skema JSON Parser</h2>
      <p>
        Setiap parser di dalam pustaka ini merupakan dokumen JSON lengkap yang mematuhi <code>schemaVersion: 1</code>.
      </p>
      <pre><code>{
  "schemaVersion": 1,
  "id": "mybank",
  "name": "My Bank Malaysia",
  "version": 1,
  "author": "Penyumbang Komuniti",
  "description": "Parser untuk notifikasi terima pindahan dan caj kad My Bank.",
  "androidPackages": ["com.mybank.app"],
  "iosAppNames": ["My Bank Mobile"],
  "rules": [
    {
      "id": "mybank.received.v1",
      "priority": 200,
      "match": {
        "title": "duit diterima|duitnow received",
        "body": "dipindahkan ke akaun anda"
      },
      "direction": "in",
      "confidence": "high",
      "extract": {
        "amount": "(?:RM|MYR)\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
        "counterparty": "daripada\\s+(?<counterparty>.+?)(?:\\s+pada|\\.|$)",
        "reference": "ref(?:erens)?\\s*(?:no)?:?\\s*(?<reference>[A-Z0-9]+)"
      }
    }
  ]
}</code></pre>

      <h3>Medan Utama Peraturan (Rules)</h3>
      <ul>
        <li>
          <code>id</code>: Pengenalpasti unik bertitik mengikut format <code>&lt;id-bank&gt;.&lt;nama-peraturan&gt;.v&lt;versi&gt;</code> (contoh: <code>hsbc.card-charged.v1</code>).
        </li>
        <li>
          <code>priority</code>: Nombor integer (contoh: <code>200</code>). Peraturan dengan nombor lebih tinggi akan dinilai terlebih dahulu. Letakkan peraturan khusus (seperti caj kad kredit tertentu) lebih tinggi daripada peraturan umum.
        </li>
        <li>
          <code>match</code>: Objek yang mengandungi corak regex pilihan <code>title</code> dan <code>body</code>. Jika kedua-duanya dinyatakan, <strong>kedua-duanya mesti sepadan</strong>. Padanan tidak sensitif huruf besar/kecil (case-insensitive).
        </li>
        <li>
          <code>direction</code>: <code>"in"</code> (wang masuk), <code>"out"</code> (wang keluar), atau <code>"info"</code> (bukan kewangan seperti OTP atau promosi).
        </li>
        <li>
          <code>confidence</code>: <code>"high"</code> untuk transaksi sah yang perlu direkod dan disebut; <code>"none"</code> untuk notifikasi yang tidak boleh direkodkan sebagai transaksi kewangan.
        </li>
        <li>
          <code>extract</code>: Corak pengekstrakan yang menggunakan kumpulan bernama (named capture groups):
          <ul>
            <li><code>(?&lt;amount&gt;...)</code>: Jumlah angka transaksi (digit, koma, dan titik perpuluhan).</li>
            <li><code>(?&lt;currency&gt;...)</code>: Mata wang pilihan (lalai kepada <code>MYR</code> jika tidak dinyatakan).</li>
            <li><code>(?&lt;counterparty&gt;...)</code>: Nama peniaga atau nama penghantar/penerima.</li>
            <li><code>(?&lt;reference&gt;...)</code>: Nombor rujukan transaksi.</li>
          </ul>
        </li>
      </ul>

      <h2>3. Peraturan Ketat untuk Regex yang Selamat</h2>
      <p>
        Memandangkan PayPing Lite beroperasi di latar belakang telefon pintar (Android Hermes/V8 dan iOS JavaScriptCore/Swift), pelaksanaan regex mestilah <strong>100% konsisten, selamat dan pantas</strong>:
      </p>

      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 18px; margin: 20px 0;">
        <h4 style="color: #b91c1c; margin-bottom: 8px; font-weight: 700;">Panduan Keselamatan Enjin Regex</h4>
        <ul style="margin-bottom: 0;">
          <li>
            <strong>DILARANG Menggunakan Lookbehind:</strong> Lookbehind positif <code>(?&lt;=...)</code> dan negatif <code>(?&lt;!...)</code> dilarang sama sekali. Enjin peranti berbeza mengendalikan lookbehind secara tidak seragam dan boleh menyebabkan aplikasi terhenti (crash). Gunakan kumpulan awalan bukan tangkapan <code>(?:awalan)</code> bersama kumpulan bernama.
          </li>
          <li>
            <strong>DILARANG Pengulangan Bersarang (Nested Quantifiers):</strong> Jangan sekali-kali menggandakan penentu kuantiti seperti <code>(a+)+</code> atau <code>(.*)*</code>. Ini boleh menyebabkan kegagalan <em>catastrophic backtracking</em> (ReDoS) yang membekukan telefon.
          </li>
          <li>
            <strong>Had Masa 50 Milisaat:</strong> Sebarang penilaian regex yang melebihi 50ms akan dibatalkan secara automatik oleh enjin parser PayPing demi menjimatkan bateri dan kelancaran sistem.
          </li>
          <li>
            <strong>Had 4,000 Aksara:</strong> Teks notifikasi yang melebihi 4,000 aksara akan dipendekkan secara automatik sebelum diproses.
          </li>
          <li>
            <strong>Sintaks Kumpulan Bernama:</strong> Sentiasa gunakan format standard <code>(?&lt;nama&gt;...)</code>.
          </li>
        </ul>
      </div>

      <h2>4. Contoh Transaksi Sebenar</h2>

      <h3>Contoh A: Wang Masuk (Pindahan DuitNow Diterima)</h3>
      <p><strong>Teks Notifikasi:</strong> <code>You've received RM 120.00 in your A/C from AHMAD BIN ALI on 24/10/2026.</code></p>
      <pre><code>{
  "id": "sample.duitnow-in.v1",
  "priority": 200,
  "match": {
    "body": "You've received .* in your A/C"
  },
  "direction": "in",
  "confidence": "high",
  "extract": {
    "amount": "You've received\\s+(?<currency>RM|MYR)?\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
    "counterparty": "from\\s+(?<counterparty>.+?)(?:\\s+pada|\\.|$)"
  }
}</code></pre>
      <p><em>Hasil:</em> Arah adalah <strong>in</strong>, jumlah adalah <strong>12000</strong> sen (RM 120.00), pihak lawan adalah <strong>AHMAD BIN ALI</strong>.</p>

      <h3>Contoh B: Wang Keluar (Caj Kad Kredit)</h3>
      <p><strong>Teks Notifikasi:</strong> <code>MYR950.00 was charged to your credit card ending 1681 at MYDIN MART on 21/09/25.</code></p>
      <pre><code>{
  "id": "hsbc.card-charged.v1",
  "priority": 200,
  "match": {
    "body": "was charged to your (?:supp )?credit card"
  },
  "direction": "out",
  "confidence": "high",
  "extract": {
    "amount": "(?<currency>RM|MYR)\\s*(?<amount>[\\d,]+\\.?\\d{0,2})",
    "counterparty": "at (?<counterparty>.+?) on \\d"
  }
}</code></pre>
      <p><em>Hasil:</em> Arah adalah <strong>out</strong>, jumlah adalah <strong>95000</strong> sen (RM 950.00), pihak lawan adalah <strong>MYDIN MART</strong>.</p>

      <h3>Contoh C: Penapis Negatif (Abaikan Notifikasi Promosi)</h3>
      <p><strong>Teks Notifikasi:</strong> <code>Tawaran Khas! Nikmati pulangan tunai RM 20.00 bersama rakan niaga kami hari ini.</code></p>
      <pre><code>{
  "id": "sample.promo-filter.v1",
  "priority": 300,
  "match": {
    "body": "pulangan tunai bersama|baucar diskaun|nikmati ganjaran"
  },
  "direction": "info",
  "confidence": "none"
}</code></pre>
      <p><em>Hasil:</em> Arah adalah <strong>info</strong> dengan keyakinan <strong>none</strong>. PayPing Lite tidak akan merekod atau membaca promosi ini.</p>

      <h2>5. Cara Menghantar Parser Baharu atau Sampel Notifikasi</h2>
      <p>
        Bantu kami memperluaskan pustaka parser komuniti! Sumbangan parser dan sampel notifikasi bank amat dialu-alukan:
      </p>
      <ol>
        <li>
          <strong>Padamkan maklumat sensitif (Anonymise):</strong> Gantikan nama sebenar dengan nama samaran (contoh: "SITI AMINAH"), padamkan nombor akaun/kad penuh (contoh: "ending 1234"), dan ubah sedikit jumlah wang.
        </li>
        <li>
          Buka <a href="https://github.com/jongoz79/payping-lite-public/issues/new?template=parser.md" target="_blank" rel="noopener">Templat Sumbangan Parser di GitHub</a>.
        </li>
        <li>Isikan nama bank, ID pakej aplikasi, dan teks contoh notifikasi.</li>
        <li>Penyelenggara akan menyemak, mencipta ujian automatik di dalam <code>parser-library/fixtures-real</code>, dan menyertakannya ke dalam keluaran rasmi seterusnya.</li>
      </ol>
    </article>
  </main>

  ${renderFooter()}

  <script src="script.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST_DIR, 'guide-ms.html'), guideMsHtml);
}

// Run generation
buildIndexPage();
buildDetailPages();
buildGuidePages();

console.log(`Generated parser library site into ${DIST_DIR}`);
console.log(`- Index: ${path.join(DIST_DIR, 'index.html')}`);
console.log(`- Guide EN: ${path.join(DIST_DIR, 'guide.html')}`);
console.log(`- Guide MS: ${path.join(DIST_DIR, 'guide-ms.html')}`);
console.log(`- Parsers: ${parsers.length} pages in ${DIST_PARSERS_DIR}`);
