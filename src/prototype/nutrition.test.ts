import { describe, expect, it } from 'vitest';

import { computeTargets, dayMeals } from './nutrition';
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
    pMode: 'rec',
    pCustom: null,
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
  it('derives resting burn with Mifflin–St Jeor', () => {
    // 10(74.844) + 6.25(177.8) - 5(22) + 5 = 1craft… computed below
    const kg = 165 * 0.4536;
    const cm = 70 * 2.54;
    const expected = Math.round(10 * kg + 6.25 * cm - 5 * 22 + 5);
    expect(computeTargets(athlete()).bmr).toBe(expected);
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
    expect(t.recProtein).toBe(180);
  });

  it('honours a locked protein number', () => {
    const gpp = computeTargets(athlete({ goalLb: 180, pMode: 'gpp' }));
    expect(gpp.protein).toBe(180);

    const custom = computeTargets(athlete({ goalLb: 180, pMode: 'custom', pCustom: 210 }));
    expect(custom.protein).toBe(210);
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
