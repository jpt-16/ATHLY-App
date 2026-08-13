import { describe, expect, it } from 'vitest';

import { MEALS } from './data';
import { INGREDIENT_FACTS } from './foodFacts';
import { aisleFor, groceryCount, groceryFor } from './grocery';

describe('the shopping list is the plan', () => {
  it('contains every ingredient the planned meals call for', () => {
    // The list used to be fourteen hand-written rows shown to everyone. If a
    // meal is on the plan, what it needs is on the list.
    const meals = [MEALS.breakfast, MEALS.dinner];
    const names = new Set(groceryFor(meals).flatMap((a) => a.items.map((i) => i.name)));
    for (const meal of meals) {
      for (const [ingredient] of meal.ingredients) expect(names.has(ingredient)).toBe(true);
    }
  });

  it('contains nothing the planned meals do not call for', () => {
    // The other half, and the one the fixed list failed: an athlete who swapped
    // three dinners still got the ingredients for the pasta they replaced.
    const meals = [MEALS.breakfast];
    const wanted = new Set(meals.flatMap((m) => m.ingredients.map(([n]) => n)));
    for (const aisle of groceryFor(meals)) {
      for (const item of aisle.items) expect(wanted.has(item.name)).toBe(true);
    }
  });

  it('is empty when nothing is planned', () => {
    expect(groceryFor([])).toEqual([]);
    expect(groceryCount(groceryFor([]))).toBe(0);
  });
});

describe('repeats become one line', () => {
  it('counts an ingredient two meals share rather than listing it twice', () => {
    const twice = groceryFor([MEALS.breakfast, MEALS.breakfast]);
    const oats = twice.flatMap((a) => a.items).find((i) => i.name === 'Rolled oats');
    expect(oats?.count).toBe(2);
    expect(oats?.qty).toMatch(/× 2$/);
  });

  it('leaves a single occurrence with its plain quantity', () => {
    const once = groceryFor([MEALS.breakfast]);
    const oats = once.flatMap((a) => a.items).find((i) => i.name === 'Rolled oats');
    expect(oats?.count).toBe(1);
    expect(oats?.qty).toBe('1 cup');
  });

  it('lists each name once however many meals want it', () => {
    const all = groceryFor(Object.values(MEALS));
    const names = all.flatMap((a) => a.items.map((i) => i.name));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('aisles', () => {
  it('puts food where it is found', () => {
    expect(aisleFor('Banana')).toBe('Produce');
    expect(aisleFor('Spinach')).toBe('Produce');
    expect(aisleFor('Chicken breast')).toBe('Meat & fish');
    expect(aisleFor('Salmon fillet')).toBe('Meat & fish');
    expect(aisleFor('Greek yogurt')).toBe('Dairy & eggs');
    expect(aisleFor('Eggs')).toBe('Dairy & eggs');
    expect(aisleFor('Rolled oats')).toBe('Grains & pantry');
  });

  it('places every ingredient in the app somewhere', () => {
    // The fallback is the pantry, which is where oats and honey genuinely
    // belong — but nothing may fall through to `undefined`.
    for (const name of Object.keys(INGREDIENT_FACTS)) {
      expect(typeof aisleFor(name)).toBe('string');
      expect(aisleFor(name).length).toBeGreaterThan(0);
    }
  });

  it('does not confuse "dairy free" with dairy', () => {
    // Tag matching is exact for this reason: 'dairy free' contains 'dairy' as a
    // substring, and a coconut yogurt in the dairy aisle is a small lie with an
    // allergy-shaped shadow.
    const almond = Object.keys(INGREDIENT_FACTS).find((n) => INGREDIENT_FACTS[n].tags.includes('dairy free'));
    if (almond) expect(aisleFor(almond)).not.toBe('Dairy & eggs');
  });

  it('reads in the order a shop is walked', () => {
    const titles = groceryFor(Object.values(MEALS)).map((a) => a.title);
    expect(titles).toEqual(['Produce', 'Meat & fish', 'Dairy & eggs', 'Grains & pantry']);
  });

  it('sorts within an aisle', () => {
    for (const aisle of groceryFor(Object.values(MEALS))) {
      const names = aisle.items.map((i) => i.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });
});
