import { describe, expect, it } from 'vitest';

import { bestMatch, readNutrients, readPortions, readSearch, scoreMatch, sourceOf } from './fdc.ts';
import { ProviderError } from './types.ts';
import search from './fixtures/eggSearch.json';

/**
 * Reading FoodData Central without trusting it.
 *
 * The fixture is hand-built from the documented response shape and carries the
 * four rows that matter: a good one, one with no energy value, one that is
 * physically impossible, and one whose energy is published in kilojoules under
 * the same nutrient number as kilocalories. Each is a way a nutrition figure
 * gets onto a meal card wrong, and each is refused here rather than downstream.
 */

const query = { text: 'eggs' };

describe('readNutrients', () => {
  it('reads every nutrient ATHLY IQ shows', () => {
    const n = readNutrients(search.foods[0].foodNutrients)!;
    expect(n.kcal).toBe(143);
    expect(n.protein).toBe(12.6);
    expect(n.fat).toBe(9.51);
    expect(n.sodium).toBe(142);
    expect(n.iron).toBe(1.67);
    expect(n.vitaminD).toBe(2);
  });

  it('treats an unmeasured micronutrient as zero, and a missing energy as a miss', () => {
    const n = readNutrients(search.foods[0].foodNutrients)!;
    // Not measured in this row. Zero is the right answer for a micronutrient.
    expect(n.vitaminC).toBe(0);
    // Not the right answer for calories, which is why the whole row goes.
    expect(readNutrients(search.foods[3].foodNutrients)).toBeNull();
  });

  it('refuses energy that food cannot physically contain', () => {
    // 3,000 kcal per 100 g is a units mistake — pure fat is 900.
    expect(readNutrients(search.foods[4].foodNutrients)).toBeNull();
  });

  it('refuses kilojoules wearing the kilocalorie nutrient number', () => {
    // 598 kJ is 143 kcal. Taking it at face value quadruples the food.
    expect(readNutrients(search.foods[5].foodNutrients)).toBeNull();
  });

  it('says no to a payload that is not a nutrient list at all', () => {
    expect(readNutrients(undefined)).toBeNull();
    expect(readNutrients({})).toBeNull();
  });
});

describe('readPortions', () => {
  it('takes the weights FDC publishes, per single portion', () => {
    const portions = readPortions(search.foods[0] as Record<string, unknown>);
    expect(portions).toContainEqual({ label: 'large', grams: 50 });
    expect(portions).toContainEqual({ label: 'medium', grams: 44 });
  });

  it('reads a branded serving, which comes in a different field', () => {
    const portions = readPortions(search.foods[2] as Record<string, unknown>);
    expect(portions).toContainEqual({ label: '1 can', grams: 250 });
  });

  it('invents nothing when the food publishes nothing', () => {
    expect(readPortions(search.foods[1] as Record<string, unknown>)).toEqual([]);
  });
});

describe('readSearch', () => {
  it('drops rows it cannot quote and ranks what is left', () => {
    const matches = readSearch(query, search);
    // The three unusable rows are gone: no energy, impossible energy, kilojoules.
    expect(matches.map((m) => m.id)).not.toContain('fdc:999003');
    expect(matches.map((m) => m.id)).not.toContain('fdc:999004');
    expect(matches.map((m) => m.id)).not.toContain('fdc:999005');
    expect(matches[0].id).toBe('fdc:748967');
  });

  it('says where each number came from', () => {
    const matches = readSearch(query, search);
    const branded = matches.find((m) => m.id === 'fdc:999002')!;
    expect(branded.source).toBe('branded');
    expect(branded.brand).toBe('Someone');
    expect(matches[0].source).toBe('generic');
  });

  it('throws on a response shape FDC does not document, rather than returning nothing', () => {
    // An empty list means "no such food". A changed API is a different problem
    // and deserves a different answer.
    expect(() => readSearch(query, { results: [] })).toThrow(ProviderError);
  });
});

describe('scoring', () => {
  it('prefers the plain food to the elaborate one', () => {
    const plain = scoreMatch(query, 'Egg, whole, raw, fresh', 'Foundation');
    const odd = scoreMatch(query, 'Egg, whole, dried, stabilized, glucose reduced', 'SR Legacy');
    expect(plain).toBeGreaterThan(odd);
  });

  it('prefers survey data for a composite dish', () => {
    const dish = { text: 'chicken parmesan with pasta' };
    const survey = scoreMatch(dish, 'Chicken parmesan with pasta', 'Survey (FNDDS)');
    const ingredient = scoreMatch(dish, 'Chicken parmesan with pasta', 'SR Legacy');
    expect(survey).toBeGreaterThan(ingredient);
  });

  it('prefers a branded row when a brand was named', () => {
    const branded = { text: 'greek yogurt', brand: 'Fage' };
    expect(scoreMatch(branded, 'Greek yogurt, plain', 'Branded')).toBeGreaterThan(
      scoreMatch(branded, 'Greek yogurt, plain', 'Foundation'),
    );
  });

  it('returns nothing rather than the least bad of a poor list', () => {
    const poor = readSearch({ text: 'zzzzzz qqqqqq' }, search);
    expect(bestMatch(poor)).toBeNull();
    expect(bestMatch(readSearch(query, search))).not.toBeNull();
  });
});

describe('sourceOf', () => {
  it('separates a label from a laboratory', () => {
    expect(sourceOf('Branded')).toBe('branded');
    expect(sourceOf('Foundation')).toBe('generic');
    expect(sourceOf('Survey (FNDDS)')).toBe('generic');
  });
});
