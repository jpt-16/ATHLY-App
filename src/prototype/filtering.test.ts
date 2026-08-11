import { describe, expect, it } from 'vitest';

import { MEALS, SLOT_CANDIDATES } from './data';
import { ALLERGEN_LABEL, ALLERGENS } from './foodFacts';
import type { Allergen } from './foodFacts';
import { blockingAllergens, isSafe, matchesDislikes, safeMealIds, selectForSlot } from './filtering';
import { dayMeals } from './nutrition';

/** Onboarding chip label for an allergen, which is what the app passes around. */
const CHIP: Record<Allergen, string> = {
  peanuts: 'Peanuts',
  tree_nuts: 'Tree nuts',
  dairy: 'Dairy',
  gluten: 'Gluten',
  shellfish: 'Shellfish',
  fish: 'Fish',
  soy: 'Soy',
  eggs: 'Eggs',
  sesame: 'Sesame',
};

const SLOTS = Object.keys(SLOT_CANDIDATES);

describe('allergens are never served', () => {
  // The invariant the whole feature exists for. If this ever fails, someone with
  // a declared allergy is being shown food that could hurt them.
  it.each(ALLERGENS)('never returns a meal containing %s', (allergen) => {
    for (const slot of SLOTS) {
      const result = selectForSlot(SLOT_CANDIDATES[slot], {
        allergens: [CHIP[allergen]],
        dislikes: [],
      });
      if (result.meal) {
        expect(
          blockingAllergens(result.meal, [CHIP[allergen]]),
          `slot "${slot}" returned ${result.meal.id}, which contains ${allergen}`,
        ).toEqual([]);
      }
    }
  });

  it('has at least two safe options in every slot for every single allergen', () => {
    const thin: string[] = [];
    for (const slot of SLOTS) {
      for (const allergen of ALLERGENS) {
        const safe = safeMealIds(SLOT_CANDIDATES[slot], [CHIP[allergen]]);
        if (safe.length < 2) thin.push(`${slot} / ${allergen}: ${safe.length}`);
      }
    }
    expect(thin, 'These slots need more allergen-free meals in data.ts').toEqual([]);
  });

  it('still finds something when several allergies stack up', () => {
    const stacked = ['Dairy', 'Gluten', 'Peanuts', 'Tree nuts', 'Soy'];
    for (const slot of SLOTS) {
      const result = selectForSlot(SLOT_CANDIDATES[slot], { allergens: stacked, dislikes: [] });
      expect(result.meal, `slot "${slot}" has nothing safe for a stacked allergy profile`).not.toBeNull();
      if (result.meal) expect(blockingAllergens(result.meal, stacked)).toEqual([]);
    }
  });

  it('covers every meal a training day can ask for', () => {
    // Every slot dayMeals() can produce must be one the candidate table knows.
    const produced = new Set<string>();
    for (const mode of ['rest', 'practice', 'game'] as const) {
      for (const lift of ['', '6:30 am', '5:00 pm']) {
        for (const id of dayMeals(mode, lift)) produced.add(id);
      }
    }
    expect([...produced].filter((id) => !SLOT_CANDIDATES[id])).toEqual([]);
  });

  it('reports which allergen emptied a slot', () => {
    // A slot whose every candidate contains fish should name fish, not shrug.
    const fishOnly = ['salmon'];
    const result = selectForSlot(fishOnly, { allergens: ['Fish'], dislikes: [] });
    expect(result.meal).toBeNull();
    if (!result.meal) expect(result.blockedBy).toContain('fish');
    expect(ALLERGEN_LABEL.fish).toBe('fish');
  });

  it('ignores the "None of these" chip', () => {
    expect(isSafe(MEALS.breakfast, ['None of these'])).toBe(true);
  });

  it('blocks on a free-text allergy the athlete typed', () => {
    // Not in the nine-allergen vocabulary, so it falls back to name matching.
    expect(isSafe(MEALS.steakpot, ['Garlic'])).toBe(false);
    expect(isSafe(MEALS.snack, ['Garlic'])).toBe(true);
  });
});

describe('the relaxation ladder', () => {
  it('honours every constraint when it can', () => {
    const result = selectForSlot(['dinner', 'salmon'], {
      allergens: [],
      dislikes: [],
      maxMinutes: 60,
    });
    expect(result.meal?.id).toBe('dinner');
    if (result.meal) expect((result as { relaxed: string }).relaxed).toBe('none');
  });

  it('gives up time before it gives up a dislike', () => {
    // dinner is 28 min and contains dairy-free-but-disliked cheese-free items;
    // salmon is 18 min. Disliking fish should keep dinner even though it is slow.
    const result = selectForSlot(['dinner', 'salmon'], {
      allergens: [],
      dislikes: ['Fish'],
      maxMinutes: 20,
    });
    expect(result.meal?.id).toBe('dinner');
    if (result.meal) expect((result as { relaxed: string }).relaxed).toBe('time');
  });

  it('gives up a dislike only when nothing else is left', () => {
    const result = selectForSlot(['salmon'], { allergens: [], dislikes: ['Fish'] });
    expect(result.meal?.id).toBe('salmon');
    if (result.meal) expect((result as { relaxed: string }).relaxed).toBe('dislikes');
  });

  it('never gives up an allergen, even when that empties the slot', () => {
    const result = selectForSlot(['salmon'], { allergens: ['Fish'], dislikes: ['Fish'] });
    expect(result.meal).toBeNull();
  });
});

describe('dislike matching', () => {
  it('matches through an ingredient tag rather than its name', () => {
    // "Cheese" is declared; the wrap lists Caesar dressing, not cheese.
    expect(matchesDislikes(MEALS.wrap, ['Cheese'])).toBe(true);
  });

  it('matches free text against ingredient names', () => {
    expect(matchesDislikes(MEALS.steakpot, ['garlic'])).toBe(true);
    expect(matchesDislikes(MEALS.snack, ['garlic'])).toBe(false);
  });

  it('is quiet when nothing is declared', () => {
    expect(matchesDislikes(MEALS.breakfast, [])).toBe(false);
  });
});

describe('the default athlete', () => {
  it('sees exactly the meals the design shipped', () => {
    // No allergies and no dislikes must resolve to the prototype's own choices,
    // so the visual regression baseline stays valid.
    for (const [slot, candidates] of Object.entries(SLOT_CANDIDATES)) {
      const result = selectForSlot(candidates, { allergens: [], dislikes: [] });
      expect(result.meal?.id, `slot "${slot}" drifted from the shipped default`).toBe(candidates[0]);
    }
  });
});
