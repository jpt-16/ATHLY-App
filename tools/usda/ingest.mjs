/**
 * Pull nutrient data for the app's ingredients from USDA FoodData Central.
 *
 *   FDC_API_KEY=… node tools/usda/ingest.mjs
 *
 * Every macro figure in `src/prototype/data.ts` — 620 calories for the oats, 28g
 * of protein — was authored by hand for a design prototype. They are plausible.
 * Nobody has checked them. This is the first half of checking them: get real
 * per-100g numbers for the 88 ingredients, from a source that can be cited.
 *
 * ## The two-step, and why it is two steps
 *
 * 1. **Propose.** For every ingredient not yet confirmed, search FDC and write
 *    the candidates to `candidates.json`. Nothing is used yet.
 * 2. **Confirm.** A person reads `candidates.json` and copies the right `fdcId`
 *    into `matches.json`. Only ingredients listed there are fetched and written
 *    to the generated file.
 *
 * The script never picks. "Cheese" returns forty foods and the difference
 * between the first and the fourth is a hundred calories an ounce; a search
 * ranking is not evidence. Confirming 88 ingredients once is an afternoon, and
 * afterwards the numbers have a provenance instead of a vibe.
 *
 * ## What it will not do
 *
 * - Write a food it could not read an energy value for.
 * - Invent a gram weight for a portion USDA does not publish (see `quantity.mjs`).
 * - Change what the app displays. It writes a generated data file; switching the
 *   app over to it is a separate, deliberate commit made after reading
 *   `report.mjs`.
 *
 * ## Honest limitation
 *
 * This was written against the FDC documentation, not against a live response —
 * the environment it was built in cannot reach `api.nal.usda.gov`. It validates
 * hard and fails loudly with the raw payload rather than writing zeros. Expect
 * the first real run to want a fix-up; that is the cheap failure.
 *
 * A key is free and instant from https://fdc.nal.usda.gov/api-key-signup.html.
 * Keep it in your shell. It does not belong in this repo.
 */
import fs from 'node:fs';
import path from 'node:path';

import { FdcShapeError, normalizeFood, readCandidates } from './fdc.mjs';
import { ROOT, readIngredientNames, readRecipes } from './recipes.mjs';

const API = 'https://api.nal.usda.gov/fdc/v1';
const HERE = path.join(ROOT, 'tools/usda');
const MATCHES = path.join(HERE, 'matches.json');
const CANDIDATES = path.join(HERE, 'candidates.json');
const OUT = path.join(ROOT, 'src/prototype/ingredientNutrients.generated.ts');

/**
 * Foundation and SR Legacy only.
 *
 * Branded foods are a manufacturer's label transcribed, per serving, with the
 * serving size sometimes missing. Foundation and SR Legacy are laboratory
 * analyses published per 100g. For working out what is in a cup of oats, the
 * second kind is the only kind worth having.
 */
const DATA_TYPES = ['Foundation', 'SR Legacy'];

const key = process.env.FDC_API_KEY;
if (!key) {
  console.error(
    'FDC_API_KEY is not set.\n\n' +
      '  Get one free at https://fdc.nal.usda.gov/api-key-signup.html\n' +
      '  Then: FDC_API_KEY=your-key node tools/usda/ingest.mjs\n\n' +
      'Do not put it in a file in this repo.',
  );
  process.exit(2);
}

const matches = readJson(MATCHES, {});
const names = readIngredientNames();
const used = new Set(readRecipes().flatMap((m) => m.ingredients.map((i) => i.name)));

const confirmed = names.filter((n) => matchIdOf(n) !== null);
const pending = names.filter((n) => matchIdOf(n) === null);

console.log(`${names.length} ingredients — ${confirmed.length} confirmed, ${pending.length} to review.`);
console.log(`${used.size} of them are actually used by a recipe.\n`);

// ---------------------------------------------------------------------------
// Step 1 — propose
// ---------------------------------------------------------------------------

if (pending.length) {
  console.log(`Searching FDC for ${pending.length} unconfirmed ingredients…`);
  const proposals = {};
  for (const name of pending) {
    try {
      const doc = await search(name);
      proposals[name] = readCandidates(doc).slice(0, 6);
      console.log(`  ${name}: ${proposals[name].length} candidates`);
    } catch (err) {
      proposals[name] = { error: err.message };
      console.error(`  ${name}: ${err.message.split('\n')[0]}`);
    }
    await pause(120);
  }

  // Every search failing means the key, the network or the API — not 88
  // separate ingredient problems. Say so once, plainly, instead of leaving a
  // file full of errors that looks like a successful run.
  const errored = Object.values(proposals).filter((p) => p?.error).length;
  if (errored === pending.length) {
    console.error(
      `\nAll ${errored} searches failed. That is the API, not the ingredients.\n` +
        '  403 — the key is wrong, or something between you and api.nal.usda.gov is blocking it.\n' +
        '  429 — over the hourly limit; wait and run again.\n' +
        'Nothing was written.',
    );
    process.exit(1);
  }

  writeJson(CANDIDATES, proposals);
  console.log(
    `\nWrote ${path.relative(ROOT, CANDIDATES)}.\n` +
      'Read it, pick the right fdcId for each, and add it to matches.json:\n\n' +
      '  { "Rolled oats": { "fdcId": 169705 } }\n\n' +
      'If a quantity later has no USDA portion to weigh it by, add one there too:\n\n' +
      '  { "Rolled oats": { "fdcId": 169705, "portions": { "cup": 81 } } }\n',
  );
}

// ---------------------------------------------------------------------------
// Step 2 — build, from confirmed matches only
// ---------------------------------------------------------------------------

if (!confirmed.length) {
  console.log('Nothing confirmed yet, so there is nothing to generate. Fill in matches.json first.');
  process.exit(0);
}

console.log(`\nFetching ${confirmed.length} confirmed foods…`);
const foods = {};
const failures = [];

for (const name of confirmed) {
  const fdcId = matchIdOf(name);
  try {
    const doc = await fetchJson(`${API}/food/${fdcId}?api_key=${encodeURIComponent(key)}`);
    const food = normalizeFood(doc);
    foods[name] = { ...food, overrides: matches[name]?.portions ?? {} };
    console.log(`  ${name} → ${food.description} (${food.per100g.kcal} kcal/100g)`);
  } catch (err) {
    failures.push({ name, fdcId, message: err.message });
    console.error(`  ${name} (${fdcId}): ${err.message.split('\n')[0]}`);
  }
  await pause(120);
}

if (failures.length) {
  console.error(`\n${failures.length} food(s) could not be read:\n`);
  for (const f of failures) console.error(`  ${f.name} (${f.fdcId})\n${indent(f.message)}\n`);
  console.error(
    'Nothing was written. A partial file would look complete and be wrong in\n' +
      'places nobody could see, which is the failure mode this whole exercise is about.',
  );
  process.exit(1);
}

writeGenerated(foods);
console.log(`\nWrote ${path.relative(ROOT, OUT)} — ${Object.keys(foods).length} ingredients.`);
console.log('Next: node tools/usda/report.mjs, and read the diff before changing what the app shows.');

// ---------------------------------------------------------------------------

function matchIdOf(name) {
  const entry = matches[name];
  const id = typeof entry === 'number' ? entry : entry?.fdcId;
  return Number.isInteger(id) ? id : null;
}

async function search(query) {
  const res = await fetch(`${API}/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, dataType: DATA_TYPES, pageSize: 6, requireAllWords: false }),
  });
  if (!res.ok) throw new Error(`FDC search for "${query}" returned ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    // The key is in the URL, so it must not reach a log or a terminal someone
    // pastes into an issue.
    throw new Error(
      `FDC returned ${res.status} ${res.statusText} for ${url.replace(/api_key=[^&]*/, 'api_key=…')}`,
    );
  }
  return res.json();
}

/** FDC's published limit is 1,000 requests an hour. This stays well under it. */
function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`${path.relative(ROOT, file)} is not valid JSON: ${err.message}`);
    process.exit(2);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function indent(text) {
  return text
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n');
}

function writeGenerated(byName) {
  const header = `/**
 * Per-100g nutrients for the app's ingredients, from USDA FoodData Central.
 *
 * GENERATED by \`tools/usda/ingest.mjs\`. Do not edit by hand — edit
 * \`tools/usda/matches.json\` and run it again.
 *
 * Every entry here was confirmed by a person: the ingest proposes candidates,
 * a human picks the \`fdcId\`, and only then is the food fetched. \`fdcId\` is on
 * each record so any number can be traced back to
 * https://fdc.nal.usda.gov/fdc-app.html#/food-details/<fdcId>.
 *
 * Generated ${new Date().toISOString().slice(0, 10)} against FDC ${DATA_TYPES.join(' and ')} data.
 */

export interface IngredientPortion {
  amount: number;
  gramWeight: number;
  unit: string;
  modifier: string;
  description: string;
}

export interface IngredientNutrients {
  fdcId: number;
  description: string;
  dataType: string;
  per100g: { kcal: number; protein: number; carbs: number; fat: number };
  portions: IngredientPortion[];
  /** Gram weights a person supplied where USDA published none. */
  overrides: Record<string, number>;
}

export const INGREDIENT_NUTRIENTS: Record<string, IngredientNutrients> = `;

  fs.writeFileSync(OUT, header + JSON.stringify(byName, null, 2) + ';\n');
}
