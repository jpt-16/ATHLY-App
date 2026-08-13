import { describe, expect, it } from 'vitest';

import { MEALS, SLOT_CANDIDATES } from './data';
import { ALLERGENS } from './foodFacts';
import type { Allergen } from './foodFacts';
import { blockingAllergens, prepMinutes } from './filtering';
import { CAL_TOLERANCE, PROTEIN_TOLERANCE, rankSwaps, swapPool } from './swaps';

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

const NO_LIMITS = { allergens: [], dislikes: [] };
const EVERY_MEAL = Object.keys(MEALS);

describe('the pool a swap may come from', () => {
  it('offers only meals from the same slot', () => {
    // The failure this prevents: steak pot roast offered as a replacement for
    // breakfast because its macros happened to line up.
    for (const [slot, ids] of Object.entries(SLOT_CANDIDATES)) {
      for (const id of ids) {
        const family = new Set(SLOT_CANDIDATES[slot]);
        for (const m of swapPool(id)) expect(family.has(m.id)).toBe(true);
      }
    }
  });

  it('never offers the meal being replaced', () => {
    for (const id of EVERY_MEAL) {
      expect(swapPool(id).map((m) => m.id)).not.toContain(id);
    }
  });

  it('returns nothing for a meal that does not exist', () => {
    expect(swapPool('not-a-meal')).toEqual([]);
    expect(rankSwaps('not-a-meal', NO_LIMITS)).toEqual([]);
  });
});

describe('allergens are never offered as a swap', () => {
  // The same invariant `filtering.test.ts` holds for the plan, held here. A meal
  // filtered out of the plan and then offered back through the swap sheet would
  // be the same failure by a different door.
  it.each(ALLERGENS)('never ranks a meal containing %s', (allergen) => {
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, { allergens: [CHIP[allergen]], dislikes: [] })) {
        expect(blockingAllergens(o.meal, [CHIP[allergen]])).toEqual([]);
      }
    }
  });
});

describe('the numbers are measured, not authored', () => {
  it('computes deltas against the meal actually being replaced', () => {
    // The bug this pins: `stats()` used to read `m.kcal - 750`, so every athlete
    // was told their swap's distance from a dinner they may never have been shown.
    const outgoing = MEALS.breakfast;
    for (const o of rankSwaps('breakfast', NO_LIMITS)) {
      expect(o.dCal).toBe(o.meal.kcal - outgoing.kcal);
      expect(o.dProtein).toBe(o.meal.p - outgoing.p);
      expect(o.dCarbs).toBe(o.meal.c - outgoing.c);
      expect(o.dFat).toBe(o.meal.f - outgoing.f);
      expect(o.dMinutes).toBe(prepMinutes(o.meal) - prepMinutes(outgoing));
    }
  });

  it('scores a closer meal higher than a distant one', () => {
    for (const id of EVERY_MEAL) {
      const ranked = rankSwaps(id, NO_LIMITS);
      for (let i = 1; i < ranked.length; i++) {
        // Ranking is by distance, so the match percentage must not increase as
        // we walk down the list.
        expect(ranked[i].match).toBeLessThanOrEqual(ranked[i - 1].match);
      }
    }
  });

  it('keeps every match percentage in range', () => {
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, NO_LIMITS)) {
        expect(o.match).toBeGreaterThanOrEqual(0);
        expect(o.match).toBeLessThanOrEqual(100);
        expect(Number.isInteger(o.match)).toBe(true);
      }
    }
  });

  it('agrees with the tolerance it advertises', () => {
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, NO_LIMITS)) {
        const close = Math.abs(o.dCal) <= CAL_TOLERANCE && Math.abs(o.dProtein) <= PROTEIN_TOLERANCE;
        expect(o.withinTolerance).toBe(close);
      }
    }
  });
});

describe('the explanation', () => {
  it('says something, always, and says it as a sentence', () => {
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, NO_LIMITS)) {
        expect(o.why.length).toBeGreaterThan(0);
        expect(o.why).toMatch(/^[A-Z0-9]/);
        expect(o.why.endsWith('.')).toBe(true);
      }
    }
  });

  it('never claims a swap is faster when it is slower', () => {
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, NO_LIMITS)) {
        if (o.dMinutes >= 0) expect(o.why).not.toMatch(/faster/i);
      }
    }
  });

  it('gets singulars right', () => {
    // "1 minutes faster" is the kind of detail that makes an app feel unfinished.
    for (const id of EVERY_MEAL) {
      for (const o of rankSwaps(id, NO_LIMITS)) {
        expect(o.why).not.toMatch(/\b1 (minutes|calories)\b/);
        expect(o.why).not.toMatch(/\b([02-9]|\d\d+) (minute|calorie)\b/);
      }
    }
  });
});

describe('soft preferences move a meal down, not out', () => {
  it('ranks a disliked meal last rather than hiding it', () => {
    // Someone who dislikes most of a slot should still be offered something.
    const ranked = rankSwaps('dinner', { allergens: [], dislikes: ['Fish'] });
    const salmon = ranked.findIndex((o) => o.meal.id === 'salmon');
    if (salmon >= 0) expect(salmon).toBe(ranked.length - 1);
  });

  it('still reports an honest match for a demoted meal', () => {
    // Demotion is an ordering decision. Misreporting the macros to justify it
    // would be lying to the athlete about their own numbers.
    const plain = rankSwaps('dinner', NO_LIMITS);
    const fussy = rankSwaps('dinner', { allergens: [], dislikes: ['Fish'] });
    for (const o of fussy) {
      const same = plain.find((p) => p.meal.id === o.meal.id);
      if (same) expect(o.match).toBe(same.match);
    }
  });
});

describe('ordering is stable', () => {
  it('returns the same list for the same question', () => {
    // The sheet re-renders on every keystroke elsewhere in the app; a ranking
    // that reshuffled would move the card under the athlete's thumb.
    for (const id of EVERY_MEAL) {
      const a = rankSwaps(id, NO_LIMITS).map((o) => o.meal.id);
      const b = rankSwaps(id, NO_LIMITS).map((o) => o.meal.id);
      expect(a).toEqual(b);
    }
  });

  it('honours the limit', () => {
    expect(rankSwaps('dinner', NO_LIMITS, 2).length).toBeLessThanOrEqual(2);
  });
});
