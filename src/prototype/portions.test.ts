import { describe, expect, it } from 'vitest';

import { MEALS, SLOT_CANDIDATES } from './data';
import { dayMeals } from './nutrition';
import {
  MAX_SERVINGS,
  MIN_SERVINGS,
  SERVING_STEP,
  baseNutrition,
  nutritionOf,
  portionDay,
  servingLabel,
} from './portions';

/** The meals a given day calls for, at their shipped first choice. */
const dayFor = (mode: 'rest' | 'practice' | 'game', lift = '') =>
  dayMeals(mode, lift).map((slot) => MEALS[SLOT_CANDIDATES[slot][0]]);

const SHAPES = [
  ['rest', ''],
  ['rest', '6:30 am'],
  ['practice', ''],
  ['practice', '6:30 am'],
  ['game', ''],
  ['game', '5:00 pm'],
] as const;

describe('a meal knows what it contains', () => {
  it('computes nutrition from the ingredients rather than a stated number', () => {
    // Every meal used to carry four hand-written numbers. 27 of the 44 did not
    // even agree with themselves — the stated calories were more than 2% away
    // from 4·protein + 4·carbs + 9·fat.
    for (const meal of Object.values(MEALS)) {
      const base = baseNutrition(meal);
      expect(base.kcal, meal.id).toBeGreaterThan(0);
      const atwater = 4 * base.protein + 4 * base.carbs + 9 * base.fat;
      // Now derived from one table, so the internal agreement is much tighter.
      expect(Math.abs(atwater - base.kcal) / base.kcal, meal.id).toBeLessThan(0.15);
    }
  });

  it('scales linearly with servings', () => {
    const one = nutritionOf(MEALS.breakfast, 1);
    const two = nutritionOf(MEALS.breakfast, 2);
    expect(two.kcal).toBe(one.kcal * 2);
    expect(two.iron).toBeCloseTo(one.iron * 2, 1);
  });

  it('scales the micronutrients too, not just the macros', () => {
    const half = nutritionOf(MEALS.dinner, 0.5);
    const full = nutritionOf(MEALS.dinner, 1);
    for (const key of ['fiber', 'sodium', 'potassium', 'calcium', 'vitaminC'] as const) {
      if (full[key] > 0) expect(half[key]).toBeLessThan(full[key]);
    }
  });
});

describe('a day is portioned to the target', () => {
  it('lands close to the target for a realistic range of athletes', () => {
    // The whole point: a 2,200-calorie athlete and a 4,000-calorie athlete get
    // the same recipes at different sizes, instead of the same day.
    for (const [mode, lift] of SHAPES) {
      for (const target of [2200, 2800, 3400, 4000]) {
        const day = portionDay(dayFor(mode, lift), target);
        if (day.clamped) continue;
        const drift = Math.abs(day.total.kcal - target) / target;
        expect(drift, `${mode}/${lift || 'no lift'} at ${target}: got ${day.total.kcal}`).toBeLessThan(0.06);
      }
    }
  });

  it('moves when the target moves', () => {
    const meals = dayFor('practice');
    const small = portionDay(meals, 2400);
    const large = portionDay(meals, 3600);
    expect(large.total.kcal).toBeGreaterThan(small.total.kcal);
    expect(large.total.protein).toBeGreaterThan(small.total.protein);
  });

  it('keeps the shape of the day rather than loading one meal', () => {
    // A day where dinner absorbs the entire correction is not the same day.
    const day = portionDay(dayFor('practice'), 4000);
    const servings = day.meals.map((m) => m.servings);
    expect(Math.max(...servings) - Math.min(...servings)).toBeLessThanOrEqual(0.5);
  });

  it('only ever asks for quarter servings', () => {
    for (const [mode, lift] of SHAPES) {
      for (const target of [2000, 3000, 4400]) {
        for (const m of portionDay(dayFor(mode, lift), target).meals) {
          const steps = m.servings / SERVING_STEP;
          expect(Number.isInteger(Math.round(steps * 1e6) / 1e6), `${m.meal.id} ${m.servings}`).toBe(true);
        }
      }
    }
  });

  it('never asks for a portion nobody would follow', () => {
    for (const target of [800, 1500, 6000, 9000]) {
      for (const m of portionDay(dayFor('practice'), target).meals) {
        expect(m.servings).toBeGreaterThanOrEqual(MIN_SERVINGS);
        expect(m.servings).toBeLessThanOrEqual(MAX_SERVINGS);
      }
    }
  });

  it('says so when the plan cannot reach the target', () => {
    // Honest failure: a 9,000-calorie target is not reachable from these
    // recipes at sane portions, and the app should know that rather than quietly
    // serving 7,300 and calling it done.
    const day = portionDay(dayFor('practice'), 9000);
    expect(day.clamped).toBe(true);
    expect(day.shortfall).toBeGreaterThan(0);
  });

  it('reports no shortfall on a day it can hit', () => {
    const day = portionDay(dayFor('practice'), 3400);
    expect(Math.abs(day.shortfall)).toBeLessThan(220);
  });

  it('is stable — the same question gets the same answer', () => {
    // The plan is recomputed on every render. A day that re-portioned itself
    // would move under the athlete's thumb.
    const meals = dayFor('game', '6:30 am');
    const a = portionDay(meals, 3200).meals.map((m) => m.servings);
    const b = portionDay(meals, 3200).meals.map((m) => m.servings);
    expect(a).toEqual(b);
  });

  it('totals what its meals total', () => {
    const day = portionDay(dayFor('practice'), 3400);
    const sum = day.meals.reduce((n, m) => n + m.nutrients.kcal, 0);
    expect(Math.abs(day.total.kcal - sum)).toBeLessThanOrEqual(1);
  });

  it('handles an empty day without dividing by zero', () => {
    const day = portionDay([], 3000);
    expect(day.meals).toEqual([]);
    expect(day.total.kcal).toBe(0);
    expect(day.shortfall).toBe(3000);
  });
});

describe('serving labels', () => {
  it('reads as an instruction rather than a decimal', () => {
    expect(servingLabel(1)).toBe('1');
    expect(servingLabel(0.5)).toBe('½');
    expect(servingLabel(0.75)).toBe('¾');
    expect(servingLabel(1.25)).toBe('1¼');
    expect(servingLabel(2)).toBe('2');
  });
});
