/**
 * Reading the recipes out of `src/prototype/data.ts` without running it.
 *
 * The data lives in a TypeScript module the app imports, and Node cannot import
 * it. Rather than add a build step for two scripts, this parses the literals out
 * of the source — and then checks its own work: `readRecipes` throws if it finds
 * no meals, and the ingredient names it returns are cross-checked against
 * `INGREDIENT_FACTS` by the caller. A silent partial parse would produce a
 * nutrition report that looks complete and is not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'src/prototype/data.ts');
const FACTS = path.join(ROOT, 'src/prototype/foodFacts.ts');
const NUTRITION = path.join(ROOT, 'src/prototype/nutrients.ts');

/**
 * Every meal and its ingredient list.
 *
 * `[name, quantity, weight]` triples are the ingredient rows; the third element
 * is the recipe's "already in your kitchen" flag and is not nutrition.
 *
 * Meals no longer carry authored `kcal`/`p`/`c`/`f` — a meal's nutrition is
 * summed from its ingredients through `src/prototype/nutrients.ts`. That makes
 * this tool's job narrower and more useful than it was: the thing worth
 * replacing with FoodData Central is the per-100g ingredient table, and the
 * recipes are just the list of which ingredients matter.
 */
export function readRecipes() {
  const src = fs.readFileSync(DATA, 'utf8');
  const meals = [];

  // Each meal is `key: M({ id, slot, name, kcal, p, c, f, …, ingredients })`.
  // Splitting on the key keeps a meal's macros with its own ingredient block.
  const blocks = src.split(/\n {2}[a-zA-Z0-9_]+: M\(\{/).slice(1);
  const keys = [...src.matchAll(/\n {2}([a-zA-Z0-9_]+): M\(\{/g)].map((m) => m[1]);

  blocks.forEach((block, i) => {
    const field = (name, pattern) => block.match(new RegExp(`\\n\\s{4}${name}: ${pattern}`))?.[1];
    const name = field('name', "'([^']*)'");
    const ingredients = [...block.matchAll(/\['([^']+)',\s*'([^']+)',\s*([012])\]/g)].map((m) => ({
      name: m[1],
      quantity: m[2],
    }));
    if (!name || !ingredients.length) return;

    meals.push({
      id: field('id', "'([^']*)'") ?? keys[i],
      key: keys[i],
      slot: field('slot', "'([^']*)'") ?? '',
      name,
      ingredients,
    });
  });

  // `MEALS` holds 44 entries today. The floor is a tripwire for a silent partial
  // read, not a count to keep in sync: a parser that quietly returns six meals
  // produces a nutrition report that looks finished and is not.
  if (meals.length < 40) {
    throw new Error(
      `only parsed ${meals.length} meals out of data.ts — the file's shape has changed and this parser ` +
        'needs updating. Refusing to report on a partial read.',
    );
  }
  return meals;
}

/** The ingredient names the app knows about, in declaration order. */
export function readIngredientNames() {
  const src = fs.readFileSync(FACTS, 'utf8');
  const body = src.slice(src.indexOf('INGREDIENT_FACTS'));
  const names = [...body.matchAll(/^\s{2}('([^']+)'|([A-Za-z][A-Za-z0-9]*)):\s*\{\s*allergens:/gm)].map(
    (m) => m[2] ?? m[3],
  );
  if (names.length < 50) {
    throw new Error(`only parsed ${names.length} ingredients out of foodFacts.ts — parser needs updating.`);
  }
  return names;
}

/**
 * The nutrition table the app ships with today, so the report can say what the
 * ingest would change rather than merely what it found.
 *
 * Parses the `n(...)` literals out of `nutrients.ts` in the same
 * read-the-source-rather-than-build-it spirit as `readRecipes`, and throws on a
 * short read for the same reason: a partial parse would produce a diff that
 * looks small because half the table went missing.
 */
export function readIngredientNutrition() {
  const src = fs.readFileSync(NUTRITION, 'utf8');
  const body = src.slice(src.indexOf('INGREDIENT_NUTRITION'));
  const out = {};

  const entry =
    /^ {2}('([^']+)'|([A-Za-z][A-Za-z0-9]*)): \{\s*per100g: n\(([^)]*)\),\s*portions: \{([^}]*)\}/gms;
  for (const m of body.matchAll(entry)) {
    const name = m[2] ?? m[3];
    const nums = m[4].split(',').map((x) => Number(x.trim()));
    if (nums.length !== 12 || nums.some((x) => Number.isNaN(x))) continue;
    const [kcal, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitaminC, vitaminD] =
      nums;
    const portions = {};
    for (const p of m[5].matchAll(/'?([^':,]+)'?:\s*([\d.]+)/g)) portions[p[1].trim()] = Number(p[2]);
    out[name] = {
      per100g: {
        kcal,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        potassium,
        calcium,
        iron,
        vitaminC,
        vitaminD,
      },
      portions,
    };
  }

  if (Object.keys(out).length < 50) {
    throw new Error(
      `only parsed ${Object.keys(out).length} entries out of nutrients.ts — parser needs updating.`,
    );
  }
  return out;
}

export { ROOT };
