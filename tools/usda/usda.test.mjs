import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FdcShapeError, normalizeFood, readCandidates, readNutrients } from './fdc.mjs';
import { macrosFor, parseQuantity, toGrams } from './quantity.mjs';
import { readIngredientNames, readRecipes } from './recipes.mjs';

/**
 * The USDA tooling, tested without a network.
 *
 * Two different things are under test and they are worth keeping apart:
 *
 * - **The parsers over this repo's own files** (`recipes.mjs`) are tested against
 *   the real `data.ts` and `foodFacts.ts`. These assertions are load-bearing:
 *   they fail the day someone reshapes the recipe data and the ingest starts
 *   silently reading half of it.
 * - **The FDC readers** are tested against hand-written fixtures. See
 *   `fixtures/README.md` — the shapes are researched, the numbers are made up,
 *   and neither has been seen against the live API.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', name), 'utf8'));

describe('reading this repo', () => {
  it('finds every meal, not most of them', () => {
    const meals = readRecipes();
    expect(meals.length).toBe(44);
    for (const meal of meals) {
      expect(meal.name).toBeTruthy();
      expect(meal.ingredients.length).toBeGreaterThan(0);
      expect(meal.authored.kcal).toBeGreaterThan(0);
    }
  });

  it('reads the authored macros off the meal it belongs to', () => {
    const oats = readRecipes().find((m) => m.id === 'breakfast');
    expect(oats.name).toBe('Peanut butter banana oats');
    expect(oats.authored).toEqual({ kcal: 620, protein: 28, carbs: 82, fat: 21 });
    expect(oats.ingredients[0]).toEqual({ name: 'Rolled oats', quantity: '1 cup' });
  });

  it('knows an ingredient for every one a recipe names', () => {
    // If this fails, the ingest would skip an ingredient and `report.mjs` would
    // quietly compare a partial meal against a whole one.
    const known = new Set(readIngredientNames());
    const used = new Set(readRecipes().flatMap((m) => m.ingredients.map((i) => i.name)));
    expect([...used].filter((n) => !known.has(n))).toEqual([]);
  });

  it('can parse every quantity string the recipes actually use', () => {
    const quantities = new Set(readRecipes().flatMap((m) => m.ingredients.map((i) => i.quantity)));
    const unparseable = [...quantities].filter((q) => parseQuantity(q).error);
    expect(unparseable).toEqual([]);
  });
});

describe('quantities', () => {
  it('reads amounts, including fractions', () => {
    expect(parseQuantity('1 cup')).toMatchObject({ amount: 1, unit: 'cup' });
    expect(parseQuantity('1.5 cups')).toMatchObject({ amount: 1.5, unit: 'cup' });
    expect(parseQuantity('1/2 cup')).toMatchObject({ amount: 0.5, unit: 'cup' });
    expect(parseQuantity('1/3 cup')).toMatchObject({ amount: 1 / 3, unit: 'cup' });
    expect(parseQuantity('2 tbsp')).toMatchObject({ amount: 2, unit: 'tablespoon' });
    expect(parseQuantity('3 cloves')).toMatchObject({ amount: 3, unit: 'clove' });
  });

  it('treats a bare number as a count', () => {
    expect(parseQuantity('2')).toMatchObject({ amount: 2, unit: 'each' });
    expect(parseQuantity('1/2')).toMatchObject({ amount: 0.5, unit: 'each' });
  });

  it('keeps the note on "3 oz dry" without letting it change the amount', () => {
    expect(parseQuantity('3 oz dry')).toMatchObject({ amount: 3, unit: 'ounce', note: 'dry' });
  });

  it('refuses to turn a pinch into a number', () => {
    // The whole design: a measure nobody took is reported, never estimated.
    expect(parseQuantity('pinch')).toMatchObject({ unmeasured: true });
    expect(parseQuantity('2 handfuls')).toMatchObject({ unmeasured: true });
  });

  it('says so when it does not understand a unit', () => {
    expect(parseQuantity('1 knob').error).toMatch(/unknown unit/);
    expect(parseQuantity('some').error).toBeTruthy();
  });
});

describe('grams', () => {
  const oats = normalizeFood(fixture('food-detail.json'));

  it('converts a mass without consulting the food at all', () => {
    const grams = toGrams(parseQuantity('6 oz'), { portions: [] });
    expect(grams.grams).toBeCloseTo(170.1, 1);
    expect(grams.basis).toBe('mass');
  });

  it('uses the food’s own cup weight', () => {
    // A cup of oats is 81g and a cup of rice is 185g. This is exactly why a
    // general volume-to-mass rule would be wrong.
    expect(toGrams(parseQuantity('1 cup'), oats).grams).toBe(81);
    expect(toGrams(parseQuantity('1/2 cup'), oats).grams).toBe(40.5);
  });

  it('divides by the portion amount USDA published', () => {
    // The fixture says 4 tbsp weigh 20g, so 2 tbsp weigh 10g — not 40.
    expect(toGrams(parseQuantity('2 tbsp'), oats).grams).toBe(10);
  });

  it('reports an unweighable quantity instead of guessing', () => {
    const result = toGrams(parseQuantity('1 slice'), oats);
    expect(result.grams).toBeUndefined();
    expect(result.unresolved).toMatch(/no USDA portion/);
    // And tells you what it does have, so the fix is obvious.
    expect(result.available).toContain('1 cup = 81g');
  });

  it('lets a human override win', () => {
    const result = toGrams(parseQuantity('1 slice'), oats, { slice: 25 });
    expect(result.grams).toBe(25);
    expect(result.basis).toMatch(/override/);
  });

  it('will not weigh a pinch', () => {
    expect(toGrams(parseQuantity('pinch'), oats).unresolved).toMatch(/not a measure/);
  });
});

describe('FDC responses', () => {
  it('reads a nested detail document', () => {
    const food = normalizeFood(fixture('food-detail.json'));
    expect(food.fdcId).toBe(169705);
    expect(food.per100g).toEqual({ kcal: 380, protein: 13.2, carbs: 67.7, fat: 6.5 });
  });

  it('takes kilocalories over kilojoules under the same nutrient number', () => {
    // The fixture carries both, kilojoules first. Taking the first would put
    // 1,628 calories in a bowl of oats.
    expect(normalizeFood(fixture('food-detail.json')).per100g.kcal).toBe(380);
  });

  it('reads a flattened search hit too', () => {
    const candidates = readCandidates(fixture('food-search.json'));
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({ fdcId: 169705, kcalPer100g: 380 });
    // Foundation foods often carry Atwater energy instead of nutrient 1008.
    expect(candidates[1]).toMatchObject({ fdcId: 173904, kcalPer100g: 371 });
    // And a hit with no energy at all is reported as null, not as zero.
    expect(candidates[2].kcalPer100g).toBeNull();
  });

  it('throws with the payload when the shape is not what it expects', () => {
    expect(() => normalizeFood({ description: 'no id' })).toThrow(FdcShapeError);
    expect(() => normalizeFood({ fdcId: 1, foodNutrients: [] })).toThrow(/no usable energy/);
    expect(() => readCandidates({ nope: true })).toThrow(/no `foods` array/);
  });

  it('drops portions with no usable weight', () => {
    const food = normalizeFood({
      fdcId: 1,
      foodNutrients: [{ nutrient: { id: 1008, unitName: 'KCAL' }, amount: 100 }],
      foodPortions: [
        { amount: 1, gramWeight: 0, modifier: 'cup' },
        { amount: 1, gramWeight: null, modifier: 'slice' },
        { amount: 1, gramWeight: 50, modifier: 'cup' },
      ],
    });
    expect(food.portions).toHaveLength(1);
  });

  it('returns null rather than zero for a food it cannot read', () => {
    expect(readNutrients(undefined)).toBeNull();
    expect(readNutrients([{ nutrientId: 1003, value: 10 }])).toBeNull();
  });
});

describe('macros', () => {
  const oats = normalizeFood(fixture('food-detail.json'));

  it('scales per-100g figures by weight', () => {
    const m = macrosFor(oats, 81);
    expect(m.kcal).toBeCloseTo(307.8, 1);
    expect(m.protein).toBeCloseTo(10.69, 1);
  });

  it('refuses a food with no figures', () => {
    expect(macrosFor({ per100g: null }, 100)).toBeNull();
  });
});
