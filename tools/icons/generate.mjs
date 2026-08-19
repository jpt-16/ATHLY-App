/**
 * Generates the PNG app icons in `public/` from the ATHLY mark.
 *
 *   node tools/icons/generate.mjs
 *
 * The mark is drawn as paths rather than text: `favicon.svg` sets the "A" in
 * Archivo, which is fine for a browser tab (the font is either there or the
 * fallback is close enough at 16px) but not for a rasteriser, where a missing
 * Archivo would silently bake Helvetica into a 512px icon. The geometry below
 * reproduces the favicon's proportions exactly.
 *
 * Rasterising uses the Chromium that Playwright already installs for the visual
 * harness, so this adds no dependency.
 *
 * Rerun this only when the mark changes; the PNGs it writes are committed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'public');
// `@capacitor/assets` reads its two sources from here and writes every iOS
// size from them, so these are inputs to a generator rather than shipped art.
const RESOURCES = path.join(ROOT, 'resources');

const TILE = '#111815';
const LETTER = '#F4F2ED';
const DOT = '#17A05E';

/**
 * The mark on a 100×100 canvas.
 *
 * The "A" is two slanted legs plus a trapezoidal crossbar whose edges follow
 * the legs' slant — the construction a heavy grotesque uses, and the reason the
 * counter comes out as a clean triangle. A fourth shape caps the apex: left
 * alone the legs meet at a point and the counter opens right at the top, which
 * reads as a notch rather than an apex. The green dot sits clear of the right
 * leg: its centre is 20.7 units from that leg's outer edge and its ring is 18.7
 * units across, so they do not touch at any size.
 */
const MARK = `
  <path d="M12,82 L42,18 L50,18 L29,82 Z" fill="${LETTER}"/>
  <path d="M88,82 L58,18 L50,18 L71,82 Z" fill="${LETTER}"/>
  <path d="M42,18 L58,18 L55.25,34 L44.75,34 Z" fill="${LETTER}"/>
  <path d="M23.25,58 L76.75,58 L82.4,70 L17.6,70 Z" fill="${LETTER}"/>
  <circle cx="81.25" cy="18.75" r="15.6" fill="${DOT}" stroke="${LETTER}" stroke-width="6.25"/>
`;

/**
 * @param {number} inset  padding around the mark, in canvas units per side.
 * @param {number|null} radius  corner radius, or null for a full-bleed square.
 */
function svg(inset, radius) {
  const scale = (100 - inset * 2) / 100;
  const corner = radius === null ? '' : ` rx="${radius}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100"${corner} fill="${TILE}"/>
  <g transform="translate(${inset},${inset}) scale(${scale})">${MARK}</g>
</svg>`;
}

/**
 * The native launch screen, which is the same picture the app draws while it
 * hydrates.
 *
 * That matters more than it sounds. iOS shows this until the web view has
 * loaded, and the app then shows its own splash until Supabase answers — two
 * different frames of the same moment. Drawing them identically means the
 * handover is invisible instead of a flash of one logo replaced by another.
 *
 * Square and generously padded because iOS crops this to whatever the device
 * is: only the middle survives on every screen.
 *
 * @param {string} ground  page colour behind the mark.
 */
function splash(ground) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="${ground}"/>
  <g transform="translate(43.75,43.75) scale(0.125)">
    <rect width="100" height="100" rx="32" fill="${TILE}"/>
    <g transform="translate(22,22) scale(0.56)">${MARK}</g>
  </g>
</svg>`;
}

const ICONS = [
  // iOS masks the Home Screen icon into its own squircle, so this one is
  // full-bleed and square — rounding it ourselves would double the corner.
  { file: 'apple-touch-icon.png', size: 180, svg: svg(8, null) },
  { file: 'icon-192.png', size: 192, svg: svg(8, 18) },
  { file: 'icon-512.png', size: 512, svg: svg(8, 18) },
  // `purpose: maskable` promises the launcher it can crop to any shape, so
  // everything that matters must sit inside the central 80% circle. At this
  // inset the mark's furthest corner is 39.6 units from centre, against the
  // 40-unit safe radius.
  { file: 'icon-maskable-512.png', size: 512, svg: svg(22, null) },
  // Capacitor's sources. Full-bleed square for the same reason as
  // `apple-touch-icon.png`: iOS applies its own squircle.
  { dir: RESOURCES, file: 'icon.png', size: 1024, svg: svg(8, null) },
  { dir: RESOURCES, file: 'splash.png', size: 2732, svg: splash('#F4F2ED') },
  { dir: RESOURCES, file: 'splash-dark.png', size: 2732, svg: splash('#111815') },
];

fs.mkdirSync(RESOURCES, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await page.setContent(
      `<style>html,body{margin:0;padding:0}svg{display:block;width:${icon.size}px;height:${icon.size}px}</style>${icon.svg}`,
    );
    const out = path.join(icon.dir ?? PUBLIC, icon.file);
    await page.locator('svg').screenshot({ path: out, omitBackground: false });
    await page.close();
    console.log(`wrote ${icon.file} (${icon.size}×${icon.size})`);
  }
} finally {
  await browser.close();
}
