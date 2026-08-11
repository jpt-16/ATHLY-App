/**
 * Turning "1 cup" into grams.
 *
 * Recipe quantities in `src/prototype/data.ts` are the strings a person would
 * write on a card — `'1 cup'`, `'2 tbsp'`, `'1 large'`, `'3 oz dry'`, `'pinch'`.
 * Nutrient data is per 100 grams. Something has to bridge the two, and the only
 * honest bridge is the gram weight USDA publishes for that food's own portions:
 * a cup of rolled oats is 81g and a cup of white rice is 185g, and no general
 * rule gets you from one to the other.
 *
 * The rule this module follows throughout: **when the bridge is missing, say so.**
 * Nothing here estimates. An unresolved pair comes back as `{ unresolved }` with
 * the portions USDA does publish, so a human can add an override to
 * `matches.json` — a number somebody chose and can defend, rather than one this
 * script inferred and nobody checked.
 */

const OUNCE_G = 28.349523125;

/** Units that are a mass outright, so the food's own portions are irrelevant. */
const MASS_UNITS = {
  gram: 1,
  ounce: OUNCE_G,
  pound: OUNCE_G * 16,
};

/**
 * Every spelling of a unit, canonical name first.
 *
 * Both directions are needed and they are not the same problem. A recipe writes
 * `tbsp`; USDA's `foodPortions` may say `tablespoon` in `measureUnit.name`, or
 * `tbsp` in the free-text `modifier`, or leave the measure unit as
 * `undetermined` and put everything in the modifier. Matching on one spelling
 * finds the portion for some foods and silently misses it for others — which
 * surfaces as an ingredient dropping out of a meal's total rather than as an
 * error.
 *
 * `handful` is deliberately absent. It is not a measure, and pretending
 * otherwise is exactly the invented number this work exists to remove.
 */
const UNIT_ALIASES = {
  cup: ['cup', 'cups', 'c'],
  tablespoon: ['tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tbl'],
  teaspoon: ['teaspoon', 'teaspoons', 'tsp'],
  slice: ['slice', 'slices'],
  clove: ['clove', 'cloves'],
  large: ['large', 'lg'],
  medium: ['medium', 'med'],
  small: ['small', 'sm'],
  scoop: ['scoop', 'scoops'],
  bunch: ['bunch', 'bunches'],
  fillet: ['fillet', 'fillets', 'filet'],
  each: ['each', 'unit', 'piece', 'whole'],
  gram: ['g', 'gram', 'grams'],
  ounce: ['oz', 'ounce', 'ounces'],
  pound: ['lb', 'lbs', 'pound', 'pounds'],
};

/** Alias → canonical, built once from the table above. */
const CANONICAL = new Map(
  Object.entries(UNIT_ALIASES).flatMap(([canonical, aliases]) => aliases.map((alias) => [alias, canonical])),
);

/** Words that carry no measure at all. */
const UNMEASURED = new Set(['pinch', 'handful', 'handfuls', 'dash', 'splash', 'to taste', 'drizzle']);

/**
 * Parse a recipe quantity.
 *
 * Returns `{ amount, unit }`, or `{ unmeasured: true }` for a pinch, or
 * `{ error }` when the string is not something this understands — which is a
 * result to report, not to paper over.
 */
export function parseQuantity(raw) {
  const text = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!text) return { error: 'empty quantity' };
  if (UNMEASURED.has(text)) return { unmeasured: true, text };

  // `'3 oz dry'` — the trailing note describes the state, not the amount, and
  // is kept so the report can show it next to the number.
  const match = text.match(/^([\d./\s]+)\s*([a-z]*)\s*(.*)$/);
  if (!match) return { error: `cannot parse "${raw}"` };

  const [, amountText, unitText, note] = match;
  const amount = parseAmount(amountText);
  if (amount === null) return { error: `cannot parse the amount in "${raw}"` };

  if (!unitText) return { amount, unit: 'each', note: note || undefined };
  if (UNMEASURED.has(unitText)) return { unmeasured: true, text };

  const unit = CANONICAL.get(unitText);
  if (!unit) return { error: `unknown unit "${unitText}" in "${raw}"` };
  return { amount, unit, note: note || undefined };
}

/** `1`, `1.5`, `1/2`, `1 1/2`. */
function parseAmount(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  let total = 0;
  for (const part of parts) {
    if (part.includes('/')) {
      const [n, d] = part.split('/').map(Number);
      if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
      total += n / d;
      continue;
    }
    const n = Number(part);
    if (!Number.isFinite(n)) return null;
    total += n;
  }
  return total > 0 ? total : null;
}

/**
 * How many grams a parsed quantity of a given food weighs.
 *
 * `food.portions` is what USDA published for that food; `overrides` is what a
 * human wrote into `matches.json` after looking at it. Overrides win, because
 * they were chosen deliberately.
 *
 * Returns `{ grams, basis }` or `{ unresolved, available }`.
 */
export function toGrams(parsed, food, overrides = {}) {
  if (parsed.unmeasured) {
    return { unresolved: `"${parsed.text}" is not a measure`, available: portionNames(food) };
  }
  if (parsed.error) return { unresolved: parsed.error, available: portionNames(food) };

  const massFactor = MASS_UNITS[parsed.unit];
  if (massFactor) {
    // A mass is a mass. No lookup, no ambiguity, and true for every food.
    return { grams: parsed.amount * massFactor, basis: 'mass' };
  }

  const override = overrides[parsed.unit];
  if (typeof override === 'number' && override > 0) {
    return { grams: parsed.amount * override, basis: `override: 1 ${parsed.unit} = ${override}g` };
  }

  const portion = findPortion(food, parsed.unit);
  if (!portion) {
    return {
      unresolved: `no USDA portion for "${parsed.unit}"`,
      available: portionNames(food),
    };
  }

  // A portion row is "this many of this unit weighs this much", and `amount` is
  // usually 1 but not always — dividing by it is what makes "2 tbsp" right when
  // USDA published the weight of four.
  const per = portion.gramWeight / (portion.amount || 1);
  if (!Number.isFinite(per) || per <= 0) {
    return {
      unresolved: `USDA portion for "${parsed.unit}" has no usable weight`,
      available: portionNames(food),
    };
  }
  return { grams: parsed.amount * per, basis: `usda: 1 ${parsed.unit} = ${round(per)}g` };
}

/**
 * Find the portion row matching a unit.
 *
 * Matched against the measure unit first and the free-text modifier second,
 * because `measureUnit.name` is a controlled vocabulary and `modifier` is not.
 * Anything looser than a whole-word match would start guessing — "cup" inside
 * "cupcake" is the kind of thing that quietly produces a wrong number.
 */
function findPortion(food, unit) {
  const portions = food?.portions ?? [];
  const aliases = UNIT_ALIASES[unit] ?? [unit];

  const exact = portions.find((p) => aliases.includes(normalize(p.unit)));
  if (exact) return exact;

  // `measureUnit.name` is a controlled vocabulary and often `undetermined`;
  // `modifier` is free text. Whole-word only — "cup" inside "cupcake" is the
  // kind of loose match that quietly produces a wrong number.
  const word = new RegExp(`\\b(${aliases.join('|')})\\b`);
  return portions.find((p) => word.test(normalize(p.modifier)) || word.test(normalize(p.description)));
}

function normalize(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

/** What this food *does* have, so a failure tells you how to fix it. */
function portionNames(food) {
  return (food?.portions ?? []).map(
    (p) => `${p.amount ?? 1} ${p.unit ?? p.modifier ?? '?'} = ${p.gramWeight}g`,
  );
}

export function round(n, places = 1) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * Macros for a weight of a food, from its per-100g figures.
 *
 * Returns null rather than zeros when the food has no usable nutrients — a meal
 * silently missing an ingredient's calories is worse than a meal that reports it
 * could not be computed.
 */
export function macrosFor(food, grams) {
  const per100 = food?.per100g;
  if (!per100 || !Number.isFinite(per100.kcal)) return null;
  const k = grams / 100;
  return {
    kcal: per100.kcal * k,
    protein: (per100.protein ?? 0) * k,
    carbs: (per100.carbs ?? 0) * k,
    fat: (per100.fat ?? 0) * k,
  };
}
