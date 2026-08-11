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

/**
 * Every meal, with the macros its author wrote down.
 *
 * `[name, quantity, weight]` triples are the ingredient rows; the third element
 * is the grocery-list weighting the app uses and is not nutrition.
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
    const kcal = field('kcal', '(\\d+)');
    const ingredients = [...block.matchAll(/\['([^']+)',\s*'([^']+)',\s*([012])\]/g)].map((m) => ({
      name: m[1],
      quantity: m[2],
    }));
    if (!name || kcal === undefined || !ingredients.length) return;

    meals.push({
      id: field('id', "'([^']*)'") ?? keys[i],
      key: keys[i],
      slot: field('slot', "'([^']*)'") ?? '',
      name,
      authored: {
        kcal: Number(kcal),
        protein: Number(field('p', '(\\d+)') ?? 0),
        carbs: Number(field('c', '(\\d+)') ?? 0),
        fat: Number(field('f', '(\\d+)') ?? 0),
      },
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

export { ROOT };
