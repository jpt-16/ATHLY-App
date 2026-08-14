import { describe, expect, it } from 'vitest';

import {
  EMPTY_TOTALS,
  adherence,
  favoriteItems,
  lastDays,
  recentItems,
  totalsByDate,
  totalsFor,
  weeklyCalories,
} from './dailyTotals';
import { ZERO } from '../prototype/nutrients';
import type { MealLog, Week } from '../prototype/types';

/**
 * These are the numbers the app states as fact about a person: what they ate,
 * how often they hit their protein, how closely they followed the plan. Every
 * one of them used to be a literal. The point of the tests below is that they no
 * longer can be.
 */

let seq = 0;
function log(date: string, macros: Partial<MealLog> = {}): MealLog {
  seq += 1;
  return {
    id: 'l' + seq,
    date,
    loggedAt: `${date}T${String(6 + (seq % 12)).padStart(2, '0')}:00:00.000Z`,
    source: 'plan',
    mealId: null,
    name: 'Something',
    servings: 1,
    // Micronutrients default to zero so a test that only cares about calories
    // does not have to name eight more fields.
    ...ZERO,
    kcal: 500,
    protein: 30,
    carbs: 60,
    fat: 15,
    ...macros,
  };
}

const week: Week = {
  0: ['rest', '', '', ''],
  1: ['practice', '4:30 pm', '', '90'],
  2: ['rest', '', '', ''],
  3: ['practice', '4:30 pm', '', '90'],
  4: ['rest', '', '', ''],
  // A lift on a rest day is still a training day — the same rule the calorie
  // target uses, and it has to be the same rule here or the two disagree.
  5: ['rest', '', '3:30 pm', ''],
  6: ['game', '11:00 am', '', ''],
};

describe('daily totals', () => {
  it('is empty when nothing was logged', () => {
    expect(totalsFor([], '2026-08-12')).toEqual(EMPTY_TOTALS);
  });

  it('adds up one day and ignores the others', () => {
    const logs = [
      log('2026-08-12', { kcal: 620, protein: 28, carbs: 82, fat: 21 }),
      log('2026-08-12', { kcal: 780, protein: 52, carbs: 76, fat: 24 }),
      log('2026-08-11', { kcal: 900, protein: 60, carbs: 90, fat: 30 }),
    ];
    // Exact rather than partial, and spread from `ZERO`, so the eight
    // micronutrients are asserted to be summed too — at zero here, because these
    // fixtures carry none, but present rather than quietly missing.
    expect(totalsFor(logs, '2026-08-12')).toEqual({
      ...ZERO,
      kcal: 1400,
      protein: 80,
      carbs: 158,
      fat: 45,
      entries: 2,
    });
  });

  it('reports a day with no logs as absent, not as zero', () => {
    // Zero eaten and nothing recorded are different claims, and the empty
    // states on Home and Progress turn on the difference.
    const byDate = totalsByDate([log('2026-08-12')]);
    expect(byDate['2026-08-12'].entries).toBe(1);
    expect(byDate['2026-08-11']).toBeUndefined();
  });

  it('counts back from today', () => {
    expect(lastDays('2026-08-12', 3)).toEqual(['2026-08-12', '2026-08-11', '2026-08-10']);
  });
});

describe('weekly calories', () => {
  it('marks weeks with nothing in them, rather than drawing them as failures', () => {
    const bars = weeklyCalories([], 3000, '2026-08-12', 8);
    expect(bars).toHaveLength(8);
    expect(bars.every((b) => !b.hasData)).toBe(true);
    expect(bars.every((b) => b.pct === 0)).toBe(true);
  });

  it('averages over the days that were logged, not over seven', () => {
    // Three days at target in a week someone used the app three times is a
    // week at target — not a 43% catastrophe. This is the difference between
    // a chart and an accusation.
    const logs = ['2026-08-10', '2026-08-11', '2026-08-12'].map((d) => log(d, { kcal: 3000 }));
    const bars = weeklyCalories(logs, 3000, '2026-08-12', 8);
    expect(bars[7]).toEqual({ label: 'W8', pct: 100, hasData: true });
    expect(bars[6].hasData).toBe(false);
  });

  it('puts older weeks first', () => {
    const logs = [log('2026-08-05', { kcal: 1500 }), log('2026-08-12', { kcal: 3000 })];
    const bars = weeklyCalories(logs, 3000, '2026-08-12', 8);
    expect(bars[6]).toMatchObject({ pct: 50, hasData: true });
    expect(bars[7]).toMatchObject({ pct: 100, hasData: true });
  });
});

describe('adherence', () => {
  const opts = { today: '2026-08-12', window: 7, targetCal: 3000, targetProtein: 150, week };

  it('counts nothing when nothing was logged', () => {
    const a = adherence([], opts);
    expect(a).toMatchObject({ daysLogged: 0, proteinDays: 0, calorieDays: 0, trainingFueled: 0 });
    // The training days themselves are still counted: they happened whether or
    // not anyone logged food around them.
    expect(a.trainingDays).toBe(4);
  });

  it('counts a day once, however many meals it holds', () => {
    const logs = [log('2026-08-12'), log('2026-08-12'), log('2026-08-11')];
    expect(adherence(logs, opts).daysLogged).toBe(2);
  });

  it('treats the protein target as a target, not a range', () => {
    const logs = [
      log('2026-08-12', { protein: 150 }),
      log('2026-08-11', { protein: 149 }),
      log('2026-08-10', { protein: 220 }),
    ];
    expect(adherence(logs, opts).proteinDays).toBe(2);
  });

  it('allows calories 10% either side', () => {
    const logs = [
      log('2026-08-12', { kcal: 3000 }),
      log('2026-08-11', { kcal: 2700 }), // exactly 10% under
      log('2026-08-10', { kcal: 2699 }),
      log('2026-08-09', { kcal: 3300 }), // exactly 10% over
      log('2026-08-08', { kcal: 3301 }),
    ];
    expect(adherence(logs, opts).calorieDays).toBe(3);
  });

  it('only counts training days it has food for', () => {
    // 10 August 2026 is a Monday: practice. The 11th is a Tuesday: rest.
    const logs = [log('2026-08-10'), log('2026-08-11')];
    const a = adherence(logs, opts);
    expect(a.trainingFueled).toBe(1);
    expect(a.trainingDays).toBe(4);
  });

  it('ignores anything outside the window', () => {
    expect(adherence([log('2026-08-01')], opts).daysLogged).toBe(0);
  });
});

describe('the log tab', () => {
  it('shows nothing before anything is logged', () => {
    expect(recentItems([], 8)).toEqual([]);
    expect(favoriteItems([], 8)).toEqual([]);
  });

  it('collapses repeats and orders by when they were last logged', () => {
    const logs = [
      log('2026-08-10', { mealId: 'lunch', name: 'Chicken burrito bowl' }),
      log('2026-08-11', { mealId: 'breakfast', name: 'Oats' }),
      log('2026-08-12', { mealId: 'lunch', name: 'Chicken burrito bowl' }),
    ];
    const items = recentItems(logs, 8);
    expect(items.map((i) => i.mealId)).toEqual(['lunch', 'breakfast']);
    expect(items[0].count).toBe(2);
  });

  it('groups hand-typed foods by name, case aside', () => {
    const logs = [
      log('2026-08-11', { name: 'Chocolate milk' }),
      log('2026-08-12', { name: 'chocolate milk' }),
    ];
    expect(recentItems(logs, 8)).toHaveLength(1);
  });

  it('will not call something logged once a favourite', () => {
    const logs = [
      log('2026-08-10', { mealId: 'lunch' }),
      log('2026-08-11', { mealId: 'lunch' }),
      log('2026-08-12', { mealId: 'dinner' }),
    ];
    expect(favoriteItems(logs, 8).map((i) => i.mealId)).toEqual(['lunch']);
  });

  it('respects the limit', () => {
    const logs = Array.from({ length: 20 }, (_, i) => log('2026-08-12', { name: 'Food ' + i }));
    expect(recentItems(logs, 8)).toHaveLength(8);
  });
});

describe('micronutrients are totalled like everything else', () => {
  it('sums all eight across a day', () => {
    // Added in `0006_micronutrients.sql`. The failure this guards against is a
    // sum that lists its fields by hand and quietly forgets the new ones.
    const logs = [
      log('2026-08-12', { fiber: 8, sodium: 400, iron: 2.5, vitaminD: 1.2, calcium: 200 }),
      log('2026-08-12', { fiber: 5, sodium: 650, iron: 1.5, vitaminD: 0.8, calcium: 310 }),
    ];
    const t = totalsFor(logs, '2026-08-12');
    expect(t.fiber).toBe(13);
    expect(t.sodium).toBe(1050);
    expect(t.iron).toBeCloseTo(4, 5);
    expect(t.vitaminD).toBeCloseTo(2, 5);
    expect(t.calcium).toBe(510);
  });

  it('carries them onto a recent-foods row', () => {
    const logs = [log('2026-08-12', { mealId: 'salmon', vitaminD: 21.8, potassium: 719 })];
    const [item] = recentItems(logs, 5);
    expect(item.vitaminD).toBeCloseTo(21.8, 5);
    expect(item.potassium).toBe(719);
  });

  it('takes the most recent portion when a food is logged twice', () => {
    // The same food at a different serving size is a different number, and the
    // row should show what it was last actually eaten at.
    const logs = [
      log('2026-08-11', { mealId: 'dinner', kcal: 500, iron: 2 }),
      log('2026-08-12', { mealId: 'dinner', kcal: 1000, iron: 4 }),
    ];
    const [item] = recentItems(logs, 5);
    expect(item.kcal).toBe(1000);
    expect(item.iron).toBeCloseTo(4, 5);
    expect(item.count).toBe(2);
  });
});
