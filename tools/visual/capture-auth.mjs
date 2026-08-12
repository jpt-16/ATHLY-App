/**
 * Photographs the account screens.
 *
 *   node tools/visual/capture-auth.mjs <out-dir> [url]
 *
 * A second walkthrough rather than four more steps on the end of the first one,
 * because it needs a *different build*: the account gate only exists when a
 * Supabase project is configured, and the twenty original baselines are of the
 * app with none. Two builds, two captures, two baselines — and the original
 * twenty stay exactly what they have always been.
 *
 * The build this drives is configured with a URL that resolves to nothing. Every
 * screen here renders before any request is made, so none is needed; a real
 * project would make the capture depend on a network and an account.
 *
 * Font stubbing and the frame-only screenshot work exactly as in `capture.mjs`.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { TIMEZONE, pinClock } from './clock.mjs';

const OUT = process.argv[2];
const URL = process.argv[3] || 'http://localhost:4173/';
if (!OUT) {
  console.error('usage: node tools/visual/capture-auth.mjs <out-dir> [url]');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const require = createRequire(import.meta.url);
const fontFile = path.join(
  path.dirname(require.resolve('@fontsource-variable/archivo/package.json')),
  'files/archivo-latin-wdth-normal.woff2',
);
const fontB64 = fs.readFileSync(fontFile).toString('base64');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 520, height: 1050 },
  deviceScaleFactor: 2,
  timezoneId: TIMEZONE,
});
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
await pinClock(page);

await page.route('https://fonts.googleapis.com/**', (route) =>
  route.fulfill({
    contentType: 'text/css',
    body: `@font-face{font-family:'Archivo';font-style:normal;font-weight:100 900;font-stretch:62% 125%;font-display:block;src:url(data:font/woff2;base64,${fontB64}) format('woff2-variations');}`,
  }),
);

// The configured build talks to a host that does not exist. Answer its auth
// calls with a flat "signed out" so the app settles instead of waiting out a DNS
// timeout on every screenshot.
await page.route('**/auth/v1/**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
);

await page.goto(URL, { waitUntil: 'domcontentloaded' });

const frame = page.locator('[data-om-starter="ios-frame"]');
await frame.waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);

// Same assertion as `capture.mjs`, for the same reason: a font that silently
// failed to apply would change every screen at once and look like a redesign.
const fontState = await page.evaluate(async () => {
  await document.fonts.ready;
  return {
    ok: document.fonts.check('900 27px Archivo'),
    families: [...new Set([...document.fonts].map((f) => f.family))],
  };
});
console.log(`  chromium ${browser.version()} · fonts: ${fontState.families.join(', ') || '(none)'}`);
if (!fontState.ok) {
  throw new Error(
    `Archivo did not load; every screen would be captured in a fallback face. Faces seen: ${
      fontState.families.join(', ') || '(none)'
    }`,
  );
}

async function shot(name) {
  await page.waitForTimeout(450);
  await frame.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('  shot', name);
}

const click = async (text, nth = 0) => {
  await page.locator(`text="${text}"`).nth(nth).click();
  await page.waitForTimeout(400);
};

// Straight through the thirteen questions — the same answers `capture.mjs`
// gives, so the screens behind the gate are identical and any difference the
// comparison finds is the gate's own.
await click("Let's set you up");
await page.locator('input').first().fill('Jordan');
await click('Next');
await click('Gain lean weight');
await click('Male');
await click('Next');
await click('Next');
await click('Soccer');
await click('Next');
await click('Next');
await click('Chicken');
await click('Steak');
await click('Next');
await click('Mushrooms');
await click('Next');
await click('Peanuts');
await click('Next');
await click('I can follow a recipe');
await click('Middle of the road');
await click('About 20 minutes');

await page
  .locator('text=/Build my week|See my|Start/')
  .first()
  .click()
  .catch(() => {});
await page.waitForTimeout(600);
await shot('21-gate');

await click('Sign up with email');
await shot('22-signup');

await page.locator('input[type="email"]').fill('sam@example.com');
await page.locator('input[type="password"]').fill('a-good-password');
await shot('23-signup-filled');

// Back to the gate, then into sign-in, which is the same screen wearing
// different copy.
await page.locator('[data-om-starter="ios-frame"] button').first().click();
await page.waitForTimeout(400);
await click('Already have an account? Sign in');
await shot('24-signin');

await click('I forgot my password');
await shot('25-forgot');

await browser.close();
