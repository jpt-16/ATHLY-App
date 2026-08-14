import { describe, expect, it } from 'vitest';

import { MEALS } from './data';
import { INGREDIENT_FACTS } from './foodFacts';
import {
  INGREDIENT_NUTRITION,
  MICRONUTRIENTS,
  NUTRIENT_LABEL,
  NUTRIENT_UNIT,
  ZERO,
  sumIngredients,
} from './nutrients';
import type { Nutrients } from './nutrients';

const KEYS = Object.keys(ZERO) as (keyof Nutrients)[];

describe('every recipe can be added up', () => {
  it('knows every ingredient every recipe names', () => {
    // The failure this prevents is silent and total: an unknown ingredient
    // contributes nothing, so the meal reads lighter than it is and every
    // downstream number — the ring, the swap ranking, the day's plan — is wrong
    // in the same direction with nothing on screen to say so.
    const missing: string[] = [];
    for (const meal of Object.values(MEALS)) {
      for (const u of sumIngredients(meal.ingredients).unknown) {
        missing.push(`${meal.id}: ${u.ingredient} — "${u.quantity}"`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every meal a positive calorie count', () => {
    for (const meal of Object.values(MEALS)) {
      expect(sumIngredients(meal.ingredients).total.kcal, meal.id).toBeGreaterThan(0);
    }
  });

  it('agrees with `foodFacts` on which ingredients exist', () => {
    // Two tables keyed by the same names. When they drift, one of them is being
    // consulted about an ingredient the other has never heard of.
    for (const name of Object.keys(INGREDIENT_NUTRITION)) {
      expect(INGREDIENT_FACTS[name], `${name} has nutrition but no facts`).toBeDefined();
    }
    const used = new Set(Object.values(MEALS).flatMap((m) => m.ingredients.map(([n]) => n)));
    for (const name of used) {
      expect(INGREDIENT_NUTRITION[name], `${name} is cooked with but has no nutrition`).toBeDefined();
    }
  });
});

describe('the numbers are internally consistent', () => {
  it('keeps the typical ingredient close to its own macros', () => {
    // The same check as below, but on the middle of the distribution rather than
    // the tail. A systematic error — a unit confusion, a column swapped — moves
    // the median; the four genuine outliers do not.
    const drifts: number[] = [];
    for (const entry of Object.values(INGREDIENT_NUTRITION)) {
      const { kcal, protein, carbs, fat, fiber } = entry.per100g;
      if (kcal === 0) continue;
      const atwater = 4 * protein + 4 * Math.max(0, carbs - fiber) + 2 * fiber + 9 * fat;
      drifts.push(Math.abs(atwater - kcal) / kcal);
    }
    drifts.sort((a, b) => a - b);
    const median = drifts[Math.floor(drifts.length / 2)];
    expect(median).toBeLessThan(0.04);
  });

  it('matches its own macros to within 15% on every ingredient', () => {
    // Atwater, with the fibre correction: 4 kcal per gram of protein and of
    // available carbohydrate, 9 per gram of fat, and ~2 per gram of fibre —
    // fibre is carbohydrate the body only partly ferments, so counting it at 4
    // overstates an apple by 12% and a bowl of oats by more.
    //
    // Real foods still miss this by a few percent, because the published energy
    // value is measured rather than derived and rounding compounds. A large gap
    // means a typo rather than biology. This is the check the authored per-meal
    // macros failed: 27 of 44 were more than 2% out from their own breakdown.
    for (const [name, entry] of Object.entries(INGREDIENT_NUTRITION)) {
      const { kcal, protein, carbs, fat, fiber } = entry.per100g;
      if (kcal === 0) continue;
      const available = Math.max(0, carbs - fiber);
      const atwater = 4 * protein + 4 * available + 2 * fiber + 9 * fat;
      const drift = Math.abs(atwater - kcal) / kcal;
      // 15%, not 5%, because four of these are legitimately that far out:
      // black beans, corn, spinach and honey all carry published energy values
      // derived with food-specific factors rather than the general ones. The
      // bound is here to catch a decimal point in the wrong place — which would
      // be 100% or more out — not to second-guess USDA.
      expect(drift, `${name}: ${kcal} kcal vs ${Math.round(atwater)} from macros`).toBeLessThan(0.15);
    }
  });

  it('never lets a component exceed the whole', () => {
    for (const [name, entry] of Object.entries(INGREDIENT_NUTRITION)) {
      const v = entry.per100g;
      // Sugar is a subset of carbohydrate; fibre is too.
      expect(v.sugar, `${name} sugar`).toBeLessThanOrEqual(v.carbs + 0.5);
      expect(v.fiber, `${name} fiber`).toBeLessThanOrEqual(v.carbs + 0.5);
      // Nothing weighs more than 100 g per 100 g.
      expect(v.protein + v.carbs + v.fat, `${name} mass`).toBeLessThanOrEqual(100);
    }
  });

  it('has no negative values anywhere', () => {
    for (const [name, entry] of Object.entries(INGREDIENT_NUTRITION)) {
      for (const key of KEYS) {
        expect(entry.per100g[key], `${name}.${key}`).toBeGreaterThanOrEqual(0);
      }
      for (const [quantity, grams] of Object.entries(entry.portions)) {
        expect(grams, `${name} "${quantity}"`).toBeGreaterThan(0);
      }
    }
  });

  it('states a portion weight for every quantity the recipes use', () => {
    // The other direction of the coverage test: a portion nobody cooks with is
    // dead weight, and usually a sign a recipe was edited and this was not.
    const used = new Map<string, Set<string>>();
    for (const meal of Object.values(MEALS)) {
      for (const [name, quantity] of meal.ingredients) {
        if (!used.has(name)) used.set(name, new Set());
        used.get(name)!.add(quantity);
      }
    }
    for (const [name, quantities] of used) {
      for (const q of quantities) {
        expect(INGREDIENT_NUTRITION[name]?.portions[q], `${name} "${q}"`).toBeGreaterThan(0);
      }
    }
  });
});

describe('summing', () => {
  it('scales with the portion weight', () => {
    // 200 g of a thing is twice 100 g of it. Worth pinning because the scaling
    // is the one piece of arithmetic between the table and every screen.
    const oats = INGREDIENT_NUTRITION['Rolled oats'];
    const cup = oats.portions['1 cup'];
    const total = sumIngredients([['Rolled oats', '1 cup', 0]]).total;
    expect(total.kcal).toBe(Math.round((oats.per100g.kcal * cup) / 100));
    expect(total.protein).toBe(Math.round((oats.per100g.protein * cup) / 100));
  });

  it('adds two ingredients rather than taking the larger', () => {
    const a = sumIngredients([['Rolled oats', '1 cup', 0]]).total;
    const b = sumIngredients([['Whole milk', '1 cup', 0]]).total;
    const both = sumIngredients([
      ['Rolled oats', '1 cup', 0],
      ['Whole milk', '1 cup', 0],
    ]).total;
    expect(both.kcal).toBe(a.kcal + b.kcal);
  });

  it('returns zero for an empty recipe rather than throwing', () => {
    expect(sumIngredients([]).total).toEqual(ZERO);
  });

  it('reports an unknown ingredient instead of silently dropping it', () => {
    const { total, unknown } = sumIngredients([['Moon cheese', '1 cup', 0]]);
    expect(unknown).toEqual([{ ingredient: 'Moon cheese', quantity: '1 cup' }]);
    expect(total.kcal).toBe(0);
  });

  it('reports a known ingredient in an unknown quantity', () => {
    const { unknown } = sumIngredients([['Rolled oats', '3 barrels', 0]]);
    expect(unknown).toEqual([{ ingredient: 'Rolled oats', quantity: '3 barrels' }]);
  });
});

describe('the micronutrients the app promises', () => {
  it('tracks all eight', () => {
    expect([...MICRONUTRIENTS]).toEqual([
      'fiber',
      'sugar',
      'sodium',
      'potassium',
      'calcium',
      'iron',
      'vitaminC',
      'vitaminD',
    ]);
  });

  it('gives every tracked nutrient a label and a unit', () => {
    for (const key of KEYS) {
      expect(NUTRIENT_LABEL[key], key).toBeTruthy();
      expect(NUTRIENT_UNIT[key], key).toBeTruthy();
    }
  });

  it('finds each micronutrient in at least one real meal', () => {
    // A column of zeros looks like tracking and is not. Every micronutrient has
    // to actually come from something an athlete might eat.
    for (const micro of MICRONUTRIENTS) {
      const found = Object.values(MEALS).some((m) => sumIngredients(m.ingredients).total[micro] > 0);
      expect(found, `nothing in the library contains ${micro}`).toBe(true);
    }
  });

  it('puts vitamin D where vitamin D actually is', () => {
    // Salmon and eggs are the library's only meaningful sources, which is itself
    // worth knowing: it is the nutrient the plan is least able to supply.
    expect(INGREDIENT_NUTRITION['Salmon fillet'].per100g.vitaminD).toBeGreaterThan(5);
    expect(INGREDIENT_NUTRITION.Eggs.per100g.vitaminD).toBeGreaterThan(1);
    expect(INGREDIENT_NUTRITION['Rolled oats'].per100g.vitaminD).toBe(0);
  });

  it('puts sodium in the salt', () => {
    expect(INGREDIENT_NUTRITION.Salt.per100g.sodium).toBeGreaterThan(30000);
    expect(INGREDIENT_NUTRITION.Banana.per100g.sodium).toBeLessThan(10);
  });
});
