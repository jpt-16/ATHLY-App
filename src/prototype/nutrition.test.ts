import { describe, expect, it } from 'vitest';

import { computeTargets, dayMeals, microTargets } from './nutrition';
import { MICRONUTRIENTS } from './nutrients';
import type { AppState, Week } from './types';

/** A rest-day-only week, so activity is held constant unless a test varies it. */
const restWeek = (): Week => ({
  0: ['rest', '', '', ''],
  1: ['rest', '', '', ''],
  2: ['rest', '', '', ''],
  3: ['rest', '', '', ''],
  4: ['rest', '', '', ''],
  5: ['rest', '', '', ''],
  6: ['rest', '', '', ''],
});

const athlete = (over: Partial<AppState> = {}): AppState =>
  ({
    stage: 'targets',
    ob: 0,
    a: { likes: [], dislikes: [], allergies: [], sports: [], sex: 'male', goal: 'gain' },
    draft: '',
    nameDraft: '',
    age: 22,
    ft: 5,
    inch: 10,
    lb: 165,
    goalLb: null,
    rate: 1,
    openDay: null,
    week: restWeek(),
    overrides: {},
    selDay: 12,
    tab: 'home',
    overlay: null,
    mealId: 'snack',
    toast: null,
    genOn: false,
    genStep: 0,
    genDone: false,
    scope: 'day',
    buildStep: 0,
    planText: '',
    cal: 700,
    pro: 45,
    timeSel: '20',
    budgetSel: 'mid',
    include: [],
    deckIdx: 0,
    swapPick: null,
    swapSet: 0,
    logTab: 'recent',
    search: '',
    added: [],
    checked: {},
    insight: true,
    nextEaten: false,
    swapCommitted: null,
    cat: 0,
    ...over,
  }) as AppState;

describe('computeTargets', () => {
  it('derives resting burn with Mifflin–St Jeor, at the basis weight', () => {
    // The basis weight is the *goal* weight, which for this athlete defaults to
    // current + 15. That is the change this pass is about: an athlete is fed
    // like the body they are working toward, not the one they have.
    const t = computeTargets(athlete());
    const kg = t.basisLb * 0.4536;
    const cm = (5 * 12 + 10) * 2.54;
    expect(t.basisLb).toBe(180);
    expect(t.bmr).toBe(Math.round(10 * kg + 6.25 * cm - 5 * 22 + 5));
  });

  it('lowers the baseline for a female athlete of the same size', () => {
    const male = computeTargets(athlete({ a: { ...athlete().a, sex: 'male' } }));
    const female = computeTargets(athlete({ a: { ...athlete().a, sex: 'female' } }));
    expect(female.bmr).toBeLessThan(male.bmr);
    expect(male.bmr - female.bmr).toBe(166);
  });

  it('raises maintenance as training days are added', () => {
    const rest = computeTargets(athlete());
    const training = computeTargets(
      athlete({
        week: { ...restWeek(), 1: ['practice', '4:30 pm', '', '90'], 3: ['practice', '4:30 pm', '', '90'] },
      }),
    );
    expect(training.days).toBe(2);
    expect(training.maint).toBeGreaterThan(rest.maint);
  });

  it('puts a surplus above maintenance and a deficit below it', () => {
    const gain = computeTargets(athlete({ a: { ...athlete().a, goal: 'gain' } }));
    const lose = computeTargets(athlete({ a: { ...athlete().a, goal: 'lose' } }));
    const hold = computeTargets(athlete({ a: { ...athlete().a, goal: 'perform' } }));

    expect(gain.cal).toBeGreaterThan(gain.maint);
    expect(lose.cal).toBeLessThan(lose.maint);
    expect(hold.cal).toBe(hold.maint);
    expect(hold.adj).toBe(0);
  });

  it('caps fat loss near 1% of bodyweight a week', () => {
    // 165 lb caps at 1.75 lb/week, so a requested 2.5 is eased down.
    const t = computeTargets(athlete({ a: { ...athlete().a, goal: 'lose' }, rate: 2.5 }));
    expect(t.rate).toBe(1.75);
    expect(t.rate).toBeLessThan(2.5);
  });

  /**
   * A pound of bodyweight is treated as 3500 calories, so a pound a week is
   * 500 a day and every other pace is that scaled. Written out longhand rather
   * than recomputed from the formula, because a test that repeats the
   * implementation agrees with any bug the implementation has.
   */
  it.each([
    [0.5, 250],
    [0.75, 375],
    [1, 500],
    [1.25, 625],
    [1.5, 750],
  ])('puts %s lb a week at +%i calories a day', (rate, expected) => {
    expect(computeTargets(athlete({ rate })).adj).toBe(expected);
  });

  it('does not cap a minor who is gaining', () => {
    // This used to hold every under-18 athlete to 1 lb a week, which made the
    // top three of the five offered paces produce an identical target.
    const minor = computeTargets(athlete({ age: 16, rate: 1.5 }));
    const adult = computeTargets(athlete({ age: 25, rate: 1.5 }));

    expect(minor.young).toBe(true);
    expect(minor.rate).toBe(1.5);
    expect(minor.adj).toBe(adult.adj);
  });

  it('still caps a minor who is losing, and lower than an adult', () => {
    // The deficit ceiling is the one that stayed: 1.5 lb under 18, 2.5 over,
    // both further limited to about 1% of bodyweight.
    const heavy = { lb: 300, a: { ...athlete().a, goal: 'lose' as const }, rate: 2.5 };
    expect(computeTargets(athlete({ ...heavy, age: 16 })).rate).toBe(1.5);
    expect(computeTargets(athlete({ ...heavy, age: 25 })).rate).toBe(2.5);
  });

  it('sets protein against goal weight, not current weight', () => {
    const t = computeTargets(athlete({ goalLb: 180, rate: 1 }));
    // At one pound a week the recommendation is 1g per pound of goal weight.
    expect(t.goalLb).toBe(180);
    expect(t.protein).toBe(180);
  });

  it('splits the remaining calories into fat and carbohydrate', () => {
    const t = computeTargets(athlete());
    expect(t.fat).toBe(Math.round((t.cal * 0.27) / 9 / 5) * 5);
    // Macros should account for the calorie target within rounding slack.
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(fromMacros - t.cal)).toBeLessThanOrEqual(30);
  });
});

describe('dayMeals', () => {
  it('builds a plain day around four meals', () => {
    expect(dayMeals('rest', '')).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  it('adds pre-fuel and recovery on a practice day', () => {
    expect(dayMeals('practice', '')).toEqual(['breakfast', 'lunch', 'snack', 'recovery', 'dinner']);
  });

  it('swaps in a pre-game meal on a game day', () => {
    expect(dayMeals('game', '')).toEqual(['breakfast', 'pregame', 'recovery', 'dinner']);
  });

  it('brackets a morning lift with fast carbs and a refeed', () => {
    const meals = dayMeals('rest', '6:30 am');
    expect(meals[0]).toBe('prelift');
    expect(meals).toContain('postlift');
    expect(meals.indexOf('postlift')).toBeLessThan(meals.indexOf('lunch'));
  });

  it('slots an afternoon lift in before dinner', () => {
    const meals = dayMeals('rest', '5:00 pm');
    expect(meals).toContain('preliftPm');
    expect(meals).toContain('postliftPm');
    expect(meals.indexOf('postliftPm')).toBeLessThan(meals.indexOf('dinner'));
  });
});

describe('the goal weight drives everything', () => {
  it('raises calories when the goal weight rises', () => {
    // Requirement 6: changing the goal weight recalculates the numbers. If this
    // does not hold, nothing downstream — plan, recipes, shopping list — moves
    // either, because they are all derived from these.
    const lower = computeTargets(athlete({ goalLb: 170 }));
    const higher = computeTargets(athlete({ goalLb: 200 }));
    expect(higher.cal).toBeGreaterThan(lower.cal);
    expect(higher.protein).toBeGreaterThan(lower.protein);
    expect(higher.carbs).toBeGreaterThan(lower.carbs);
    expect(higher.fat).toBeGreaterThan(lower.fat);
  });

  it('uses current weight when the athlete is maintaining', () => {
    for (const goal of ['perform', 'habits'] as const) {
      const t = computeTargets(athlete({ a: { ...athlete().a, goal }, lb: 165, goalLb: 200 }));
      // A stray goal weight must not sneak into a maintenance calculation.
      expect(t.basisLb).toBe(165);
      expect(t.adj).toBe(0);
    }
  });

  it('feeds a losing athlete from the smaller body', () => {
    const losing = { a: { ...athlete().a, goal: 'lose' as const }, lb: 200, goalLb: 170 };
    const t = computeTargets(athlete(losing));
    expect(t.basisLb).toBe(170);
    // Maintenance is computed at the goal weight, so it sits below what the
    // athlete burns today even before the pace deficit is applied.
    const atCurrent = computeTargets(athlete({ ...losing, goalLb: 200 }));
    expect(t.maint).toBeLessThan(atCurrent.maint);
  });

  it('never drops the target below resting burn at the current weight', () => {
    // The guard that stops two deficits stacking on a teenager: maintenance at a
    // much smaller goal weight, and then a pace deficit on top of that.
    const t = computeTargets(
      athlete({
        a: { ...athlete().a, goal: 'lose' },
        age: 15,
        lb: 260,
        goalLb: 150,
        rate: 2.5,
      }),
    );
    const kg = 260 * 0.4536;
    const cm = (5 * 12 + 10) * 2.54;
    const restingNow = Math.round(10 * kg + 6.25 * cm - 5 * 15 + 5);
    expect(t.cal).toBeGreaterThanOrEqual(restingNow);
    expect(t.floored).toBe(true);
  });

  it('leaves the floor alone for an athlete who is gaining', () => {
    expect(computeTargets(athlete({ goalLb: 190 })).floored).toBe(false);
  });

  it('leaves a stateable gap when the floor binds', () => {
    // The targets screen shows the athlete resting burn, training and the goal
    // adjustment, and those have to account for the whole number at the top of
    // it. When the floor lifts the target, the difference is a fourth step —
    // so it has to be a positive amount the screen can name, not a silent
    // correction that leaves the visible rows summing to less than the total.
    const t = computeTargets(
      athlete({ a: { ...athlete().a, goal: 'lose' }, age: 15, lb: 260, goalLb: 150, rate: 2.5 }),
    );
    expect(t.floored).toBe(true);
    expect(t.cal - (t.maint + t.adj)).toBeGreaterThan(0);

    // And nothing to name when it does not bind.
    const gaining = computeTargets(athlete({ goalLb: 190 }));
    expect(gaining.cal).toBe(gaining.maint + gaining.adj);
  });
});

describe('micronutrient targets', () => {
  it('gives a number for all eight', () => {
    const t = computeTargets(athlete());
    for (const key of MICRONUTRIENTS) {
      expect(t.micros[key], key).toBeGreaterThan(0);
    }
  });

  it('scales fibre and sugar with energy, and holds the rest flat', () => {
    const small = microTargets(16, 'male', 2000);
    const large = microTargets(16, 'male', 4000);
    // Fibre is 14g per 1000 kcal and sugar is 10% of energy, so both double.
    expect(large.fiber).toBe(small.fiber * 2);
    expect(large.sugar).toBe(small.sugar * 2);
    // The DRIs are intakes, not ratios.
    expect(large.calcium).toBe(small.calcium);
    expect(large.iron).toBe(small.iron);
  });

  it('asks a 15-year-old girl for more iron than a boy the same age', () => {
    // The deficiency most often found in this group, and the reason sex is
    // asked for at all.
    expect(microTargets(15, 'female', 2500).iron).toBeGreaterThan(microTargets(15, 'male', 2500).iron);
  });

  it('gives 13-year-olds the younger band', () => {
    expect(microTargets(13, 'male', 2500).vitaminC).toBe(45);
    expect(microTargets(14, 'male', 2500).vitaminC).toBe(75);
  });

  it('averages the two when sex is not stated', () => {
    const male = microTargets(16, 'male', 2500);
    const female = microTargets(16, 'female', 2500);
    const na = microTargets(16, 'na', 2500);
    expect(na.iron).toBe(Math.round((male.iron + female.iron) / 2));
    expect(na.potassium).toBe(Math.round((male.potassium + female.potassium) / 2));
  });

  it('holds calcium at 1300mg through the teenage years', () => {
    // Peak bone mass is laid down now and not later, which is why this one does
    // not scale with anything.
    for (const age of [13, 15, 18]) {
      expect(microTargets(age, 'male', 3000).calcium).toBe(1300);
    }
    expect(microTargets(25, 'male', 3000).calcium).toBe(1000);
  });
});
