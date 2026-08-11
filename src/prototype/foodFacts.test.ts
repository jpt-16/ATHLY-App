import { describe, expect, it } from 'vitest';

import { MEALS } from './data';
import { ALLERGENS, DISLIKE_TAGS, INGREDIENT_FACTS } from './foodFacts';
import { mealAllergens, unknownIngredients } from './filtering';

/**
 * The guard the whole allergy filter rests on.
 *
 * Allergens are derived from ingredients, so an ingredient the facts table has
 * never heard of is the one way a meal could wrongly look safe. These tests make
 * that state impossible to commit.
 */
describe('ingredient facts', () => {
  it('knows every ingredient named by every recipe', () => {
    const missing = Object.entries(MEALS).flatMap(([id, meal]) =>
      unknownIngredients(meal).map((name) => `${id}: ${name}`),
    );

    expect(
      missing,
      `Add these to INGREDIENT_FACTS in foodFacts.ts. Until then they are treated as ` +
        `containing every allergen, so the meals below are hidden from anyone with an allergy.`,
    ).toEqual([]);
  });

  it('only uses allergens from the controlled vocabulary', () => {
    for (const [name, facts] of Object.entries(INGREDIENT_FACTS)) {
      for (const allergen of facts.allergens) {
        expect(ALLERGENS, `${name} carries an unknown allergen`).toContain(allergen);
      }
    }
  });

  it('keeps tags lowercase so matching is case-insensitive', () => {
    for (const [name, facts] of Object.entries(INGREDIENT_FACTS)) {
      for (const tag of facts.tags) {
        expect(tag, `${name} has a non-lowercase tag`).toBe(tag.toLowerCase());
      }
    }
    for (const [label, tags] of Object.entries(DISLIKE_TAGS)) {
      for (const tag of tags) {
        expect(tag, `${label} has a non-lowercase tag`).toBe(tag.toLowerCase());
      }
    }
  });

  it('fails closed: an unknown ingredient carries every allergen', () => {
    const bogus = {
      ...MEALS.breakfast,
      ingredients: [['Not A Real Ingredient', '1 cup', 1]] as [string, string, number][],
    };
    expect(mealAllergens(bogus)).toEqual(new Set(ALLERGENS));
  });
});

describe('derived allergens', () => {
  it.each([
    ['breakfast', 'peanuts'],
    ['breakfast', 'dairy'],
    ['breakfast', 'gluten'],
    ['salmon', 'fish'],
    ['postliftPm', 'soy'],
    ['wrap', 'fish'], // Caesar dressing is anchovy — easy to miss
    ['wrap', 'eggs'],
    ['recovery', 'dairy'],
  ] as const)('finds %s contains %s', (mealId, allergen) => {
    expect(mealAllergens(MEALS[mealId])).toContain(allergen);
  });

  it.each([
    ['snack', 'dairy'],
    ['snack', 'peanuts'],
    ['prelift', 'dairy'],
    ['taco', 'gluten'],
  ] as const)('finds %s is free of %s', (mealId, allergen) => {
    expect(mealAllergens(MEALS[mealId])).not.toContain(allergen);
  });
});
