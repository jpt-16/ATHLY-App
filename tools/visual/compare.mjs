/**
 * Diffs a capture against the committed baseline, pixel by pixel.
 *
 *   node tools/visual/compare.mjs <baseline-dir> <candidate-dir> [diff-dir]
 *
 * Exits non-zero if any screen differs, writing a diff image per failing screen
 * so the change can be looked at rather than guessed at. A missing or extra
 * screen is a failure too — a walkthrough that stopped early would otherwise
 * pass by comparing nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [baseDir, candDir, diffDir = 'tools/visual/diffs'] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error('usage: node tools/visual/compare.mjs <baseline-dir> <candidate-dir> [diff-dir]');
  process.exit(2);
}

const pngs = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();

const baseline = pngs(baseDir);
const candidate = pngs(candDir);
let failed = false;

const missing = baseline.filter((f) => !candidate.includes(f));
const extra = candidate.filter((f) => !baseline.includes(f));
if (missing.length) {
  console.error(`missing from capture: ${missing.join(', ')}`);
  failed = true;
}
if (extra.length) {
  console.error(`not in baseline: ${extra.join(', ')}`);
  failed = true;
}

fs.mkdirSync(diffDir, { recursive: true });
let worst = 0;

for (const file of baseline.filter((f) => candidate.includes(f))) {
  const a = PNG.sync.read(fs.readFileSync(path.join(baseDir, file)));
  const b = PNG.sync.read(fs.readFileSync(path.join(candDir, file)));
  if (a.width !== b.width || a.height !== b.height) {
    console.error(`${file}: SIZE MISMATCH ${a.width}×${a.height} vs ${b.width}×${b.height}`);
    failed = true;
    continue;
  }
  const out = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1 });
  const pct = (n / (a.width * a.height)) * 100;
  worst = Math.max(worst, pct);
  console.log(`${file}: ${n} px (${pct.toFixed(3)}%)`);
  if (n > 0) {
    fs.writeFileSync(path.join(diffDir, file), PNG.sync.write(out));
    failed = true;
  }
}

console.log(`worst: ${worst.toFixed(3)}%`);
if (failed) {
  console.error(`\nVisual regression. Diffs written to ${diffDir}/.`);
  console.error('If the change is intended, review the diffs and refresh the baseline:');
  console.error('  npm run test:visual:update');
  process.exit(1);
}
console.log('\nNo visual change.');
