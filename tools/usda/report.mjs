/**
 * Computed macros against authored macros, meal by meal.
 *
 *   node tools/usda/report.mjs [--json]
 *
 * The point of the exercise. Every meal in `src/prototype/data.ts` carries four
 * numbers a designer wrote down; this adds up the same meal from USDA data and
 * shows the two side by side.
 *
 * **A discrepancy here is a finding, not a bug to fix by adjusting the script.**
 * If the oats come out at 740 calories and the card says 620, the card has been
 * telling athletes something untrue — including athletes cutting weight, for
 * whom a 120-calorie error compounds daily. The output of this script is meant
 * to be read by a person and argued with, not consumed automatically.
 *
 * Nothing here writes to the app. Switching what athletes see is a separate,
 * deliberate commit.
 */
import fs from 'node:fs';
import path from 'node:path';

import { macrosFor, parseQuantity, round, toGrams } from './quantity.mjs';
import { ROOT, readRecipes } from './recipes.mjs';

const GENERATED = path.join(ROOT, 'src/prototype/ingredientNutrients.generated.ts');
const asJson = process.argv.includes('--json');

if (!fs.existsSync(GENERATED)) {
  console.error(
    `${path.relative(ROOT, GENERATED)} does not exist yet.\n\n` +
      '  FDC_API_KEY=… node tools/usda/ingest.mjs\n\n' +
      'has to run first, and its matches.json has to be filled in.',
  );
  process.exit(2);
}

const nutrients = loadGenerated(GENERATED);
const meals = readRecipes();

const rows = [];
const gaps = [];

for (const meal of meals) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const missing = [];

  for (const ing of meal.ingredients) {
    const food = nutrients[ing.name];
    if (!food) {
      missing.push({ ...ing, why: 'no confirmed USDA match' });
      continue;
    }

    const parsed = parseQuantity(ing.quantity);
    const weighed = toGrams(parsed, food, food.overrides ?? {});
    if (weighed.unresolved) {
      missing.push({ ...ing, why: weighed.unresolved, available: weighed.available });
      continue;
    }

    const macros = macrosFor(food, weighed.grams);
    if (!macros) {
      missing.push({ ...ing, why: 'food has no usable per-100g figures' });
      continue;
    }
    totals.kcal += macros.kcal;
    totals.protein += macros.protein;
    totals.carbs += macros.carbs;
    totals.fat += macros.fat;
  }

  // A meal missing an ingredient is reported as incomplete rather than compared.
  // Half a meal's calories next to a whole meal's authored figure would read as
  // a 40% overstatement by the designer, which would be this script's error.
  rows.push({
    id: meal.id,
    name: meal.name,
    complete: missing.length === 0,
    authored: meal.authored,
    computed: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    missing,
  });

  if (missing.length) gaps.push({ meal: meal.name, missing });
}

if (asJson) {
  console.log(JSON.stringify({ rows, gaps }, null, 2));
  process.exit(0);
}

const complete = rows.filter((r) => r.complete);

console.log('\nComputed vs authored — complete meals only\n');
console.log(pad('Meal', 34) + pad('kcal', 20) + pad('protein', 18) + 'carbs / fat');
console.log('─'.repeat(96));

for (const r of complete) {
  console.log(
    pad(r.name.slice(0, 32), 34) +
      pad(compare(r.computed.kcal, r.authored.kcal), 20) +
      pad(compare(r.computed.protein, r.authored.protein, 'g'), 18) +
      `${compare(r.computed.carbs, r.authored.carbs, 'g')}  ${compare(r.computed.fat, r.authored.fat, 'g')}`,
  );
}

if (complete.length) {
  const drift = complete.map((r) => pct(r.computed.kcal, r.authored.kcal));
  const mean = drift.reduce((a, b) => a + b, 0) / drift.length;
  const worst = complete
    .map((r) => ({ name: r.name, off: pct(r.computed.kcal, r.authored.kcal) }))
    .sort((a, b) => Math.abs(b.off) - Math.abs(a.off))
    .slice(0, 5);

  console.log(`\n${complete.length} of ${rows.length} meals computed end to end.`);
  console.log(`Mean calorie drift from the authored figure: ${round(mean)}%.`);
  console.log('\nFurthest off:');
  for (const w of worst)
    console.log(`  ${pad(w.name.slice(0, 40), 42)}${w.off > 0 ? '+' : ''}${round(w.off)}%`);
}

if (gaps.length) {
  console.log(`\n${gaps.length} meal(s) could not be computed in full:\n`);
  for (const g of gaps) {
    console.log(`  ${g.meal}`);
    for (const m of g.missing) {
      console.log(`    ${m.name} (${m.quantity}) — ${m.why}`);
      if (m.available?.length) console.log(`      USDA has: ${m.available.slice(0, 4).join('; ')}`);
    }
  }
  console.log(
    '\nFix these by confirming a match or adding a portion override in\n' +
      'tools/usda/matches.json. Do not estimate them here — an estimate in a\n' +
      'file called "nutrients" is indistinguishable from a measurement later.',
  );
}

console.log(
  '\nThese are findings about the authored numbers, not a patch to apply.\n' +
    'The app still shows the authored figures until somebody decides otherwise.\n',
);

// ---------------------------------------------------------------------------

/**
 * Read the generated file without importing TypeScript.
 *
 * The file is a single object literal after an `=`, so slicing to the first
 * brace and parsing is enough — and it is JSON, because `ingest.mjs` wrote it
 * with `JSON.stringify`.
 */
function loadGenerated(file) {
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('INGREDIENT_NUTRIENTS');
  const brace = src.indexOf('{', start);
  const end = src.lastIndexOf('}');
  if (start < 0 || brace < 0 || end <= brace) {
    throw new Error(`${path.relative(ROOT, file)} is not the shape ingest.mjs writes`);
  }
  return JSON.parse(src.slice(brace, end + 1));
}

function compare(computed, authored, unit = '') {
  const off = pct(computed, authored);
  const sign = off > 0 ? '+' : '';
  return `${computed}${unit} vs ${authored}${unit} (${sign}${round(off)}%)`;
}

function pct(computed, authored) {
  if (!authored) return 0;
  return ((computed - authored) / authored) * 100;
}

function pad(text, width) {
  return String(text).padEnd(width);
}
