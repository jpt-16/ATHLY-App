/**
 * Drives the app through a twenty-step walkthrough and photographs the phone
 * frame at each step.
 *
 *   node tools/visual/capture.mjs <out-dir> [url]
 *
 * This is the harness the port was verified with: the original Claude Design
 * prototype and this build were driven through the same script and compared
 * pixel by pixel. It stays in the repo as a regression guard — `compare.mjs`
 * diffs a fresh capture against the committed baseline.
 *
 * Two details make the output reproducible rather than merely repeatable:
 *
 * - **The font is stubbed, not fetched.** `index.html` loads Archivo from
 *   Google Fonts. Waiting on a third party would make the baseline depend on
 *   network weather and on whatever Google is serving that week, so the request
 *   is intercepted and answered with the same variable font from
 *   `@fontsource-variable/archivo`, including the width axis the headings lean
 *   on.
 * - **Only the frame is captured**, via the `data-om-starter` marker, so page
 *   chrome and scrollbar differences stay out of the comparison.
 * - **The clock is frozen**, because the app renders a real calendar. Without
 *   the pin, `16-home` — which carries the week strip and today's date — would
 *   differ from its baseline every single day.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { TIMEZONE, pinClock } from './clock.mjs';

const OUT = process.argv[2];
const URL = process.argv[3] || 'http://localhost:4173/';
if (!OUT) {
  console.error('usage: node tools/visual/capture.mjs <out-dir> [url]');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const require = createRequire(import.meta.url);
const fontFile = path.join(
  path.dirname(require.resolve('@fontsource-variable/archivo/package.json')),
  'files/archivo-latin-wdth-normal.woff2',
);
const fontBytes = fs.readFileSync(fontFile);
/** Any path under the origin the CSP's `font-src` names; the route matches all of them. */
const FONT_URL = 'https://fonts.gstatic.com/s/archivo/athly-stub.woff2';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Wide enough that the shell renders its desktop branch — the compact branch
// has no frame to photograph, and the baselines are of the framed layout.
const page = await browser.newPage({
  viewport: { width: 520, height: 1050 },
  deviceScaleFactor: 2,
  timezoneId: TIMEZONE,
});
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
await pinClock(page);

// The stub answers in production's own shape: the stylesheet from
// googleapis, the font file from gstatic. It used to inline the woff2 as a
// `data:` URI, which was simpler and stopped working the day a
// Content-Security-Policy arrived — `font-src 'self' https://fonts.gstatic.com`
// does not cover `data:`, so the face was blocked, every screen would have been
// photographed in a fallback typeface, and `assertFontLoaded` refused. Serving
// it from the origin the policy actually names keeps the harness honest about
// what the shipped page does.
await page.route('https://fonts.googleapis.com/**', (route) =>
  route.fulfill({
    contentType: 'text/css',
    body: `@font-face{font-family:'Archivo';font-style:normal;font-weight:100 900;font-stretch:62% 125%;font-display:block;src:url(${FONT_URL}) format('woff2-variations');}`,
  }),
);

await page.route('https://fonts.gstatic.com/**', (route) =>
  route.fulfill({ contentType: 'font/woff2', body: fontBytes }),
);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const frame = page.locator('[data-om-starter="ios-frame"]');
await frame.waitFor({ timeout: 15000 });

await assertFontLoaded(page);

async function shot(name) {
  await page.waitForTimeout(450);
  await frame.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('  shot', name);
}

/**
 * Refuse to photograph the app in the wrong typeface.
 *
 * Every screen here is mostly text, so a stubbed font that quietly failed to
 * apply would fall back to whatever the system has and change every screen at
 * once — which looks exactly like a design regression and is not one. The
 * harness had no way to tell the two apart, so it is worth one assertion.
 *
 * `document.fonts.check` answers for the family, and the browser version goes
 * in the log beside it: a pixel comparison is only meaningful between two
 * renderings by the same renderer, and this is the line that says which.
 */
async function assertFontLoaded(p) {
  const state = await p.evaluate(async () => {
    await document.fonts.ready;
    return {
      ok: document.fonts.check('900 27px Archivo'),
      families: [...new Set([...document.fonts].map((f) => f.family))],
    };
  });
  console.log(`  chromium ${browser.version()} · fonts: ${state.families.join(', ') || '(none)'}`);
  if (!state.ok) {
    throw new Error(
      'Archivo did not load, so every screen would be captured in a fallback face.\n' +
        `Faces the page knows about: ${state.families.join(', ') || '(none)'}\n` +
        'The stub answers https://fonts.googleapis.com/** — check that route still matches what index.html asks for.',
    );
  }
}

const click = async (text, nth = 0) => {
  await page.locator(`text="${text}"`).nth(nth).click();
  await page.waitForTimeout(400);
};

await shot('01-intro');

await click("Let's set you up");
await page.locator('input').first().fill('Jordan');
await shot('02-name');

await click('Next');
await shot('03-goal');

await click('Gain lean weight');
await shot('04-baseline');

await click('Male');
await shot('05-body');

await click('Next');
await shot('06-target');

await click('Next');
await shot('07-sport');

await click('Soccer');
await click('Next');
await shot('08-week');

await click('Next');
await shot('09-likes');

await click('Chicken');
await click('Steak');
await click('Next');
await shot('10-dislikes');

await click('Mushrooms');
await click('Next');
await shot('11-allergies');

await click('Peanuts');
await click('Next');
await shot('12-cook');

await click('I can follow a recipe');
await shot('13-budget');

await click('Middle of the road');
await shot('14-time');

await click('About 20 minutes');
await shot('15-targets');

// The build animation runs on a timer before the app appears.
await page
  .locator('text=/Build my week|See my|Start/')
  .first()
  .click()
  .catch(() => {});
await page.waitForTimeout(4200);
await shot('16-home');

await click('Plan');
await shot('17-plan');

await click('Recipes');
await shot('18-recipes');

await click('Profile');
await shot('19-profile');

// The centre action in the tab bar opens the log.
await page
  .locator('[data-om-starter="ios-frame"] button')
  .last()
  .click()
  .catch(() => {});
await page.waitForTimeout(500);
await shot('20-log');

await browser.close();
