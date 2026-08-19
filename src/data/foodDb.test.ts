import { describe, expect, it } from 'vitest';

import { portionOf, readProduct } from './foodDb';

/**
 * Reading a crowd-sourced food row without trusting it.
 *
 * Open Food Facts is typed in by strangers, and the fields ATHLY needs are
 * stored in grams even where the app shows milligrams and micrograms. Both
 * facts point the same way: every number here is either converted correctly and
 * inside what food can physically contain, or it does not become a nutrition
 * figure an athlete is held to.
 */

/** A plausible payload, in the units Open Food Facts actually uses. */
const greekYogurt = {
  product_name: 'Greek Yogurt, Plain',
  brands: 'Fage, Fage USA',
  serving_quantity: 170,
  nutriments: {
    'energy-kcal_100g': 59,
    proteins_100g: 10.3,
    carbohydrates_100g: 3.6,
    fat_100g: 0.4,
    fiber_100g: 0,
    sugars_100g: 3.6,
    // Grams in the source; milligrams on the screen.
    sodium_100g: 0.036,
    potassium_100g: 0.141,
    calcium_100g: 0.11,
    iron_100g: 0.0001,
    'vitamin-c_100g': 0.0006,
    // Micrograms on the screen: 0.0000012 g is 1.2 mcg.
    'vitamin-d_100g': 0.0000012,
  },
};

describe('readProduct', () => {
  it('converts every unit on the way in', () => {
    const food = readProduct('0012345678905', greekYogurt);
    expect(food).not.toBeNull();
    expect(food!.per100g.kcal).toBe(59);
    expect(food!.per100g.protein).toBeCloseTo(10.3);
    expect(food!.per100g.sodium).toBeCloseTo(36);
    expect(food!.per100g.potassium).toBeCloseTo(141);
    expect(food!.per100g.calcium).toBeCloseTo(110);
    expect(food!.per100g.iron).toBeCloseTo(0.1);
    expect(food!.per100g.vitaminC).toBeCloseTo(0.6);
    expect(food!.per100g.vitaminD).toBeCloseTo(1.2);
  });

  it('names the product the way a shelf does', () => {
    // One brand, not the comma-separated list of every name it trades under.
    expect(readProduct('0012345678905', greekYogurt)!.name).toBe('Fage Greek Yogurt, Plain');
  });

  it('keeps the stated serving when there is one', () => {
    expect(readProduct('0012345678905', greekYogurt)!.servingGrams).toBe(170);
    const noServing = readProduct('0012345678905', { ...greekYogurt, serving_quantity: undefined });
    expect(noServing!.servingGrams).toBeNull();
  });

  it('refuses a row with no energy rather than logging a zero-calorie food', () => {
    const missing = { ...greekYogurt, nutriments: { proteins_100g: 10 } };
    expect(readProduct('0012345678905', missing)).toBeNull();
  });

  it('refuses a row with no name', () => {
    expect(readProduct('0012345678905', { ...greekYogurt, product_name: '', brands: '' })).toBeNull();
  });

  it('drops a figure that food cannot physically contain', () => {
    // 3,000 kcal per 100 g is a units mistake — pure fat is 900. The whole row
    // goes, because energy is the field nothing else can stand in for.
    const wrong = { ...greekYogurt, nutriments: { ...greekYogurt.nutriments, 'energy-kcal_100g': 3000 } };
    expect(readProduct('0012345678905', wrong)).toBeNull();

    // A single impossible micronutrient is dropped to zero and the rest of the
    // product survives — better than refusing a real food over one bad cell.
    const badIron = { ...greekYogurt, nutriments: { ...greekYogurt.nutriments, iron_100g: 50 } };
    expect(readProduct('0012345678905', badIron)!.per100g.iron).toBe(0);
  });

  it('treats a missing micronutrient as zero, not as a hole', () => {
    const sparse = { ...greekYogurt, nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5 } };
    const food = readProduct('0012345678905', sparse)!;
    expect(food.per100g.protein).toBe(5);
    expect(food.per100g.calcium).toBe(0);
  });
});

describe('portionOf', () => {
  it('scales a 100 g row to the serving actually eaten', () => {
    const food = readProduct('0012345678905', greekYogurt)!;
    const serving = portionOf(food, 170);
    expect(serving.kcal).toBeCloseTo(100.3, 1);
    expect(serving.protein).toBeCloseTo(17.51, 1);
  });

  it('is exact at 100 g', () => {
    const food = readProduct('0012345678905', greekYogurt)!;
    expect(portionOf(food, 100).kcal).toBe(59);
  });
});
