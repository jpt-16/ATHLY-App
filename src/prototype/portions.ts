import type { Meal } from './data';
import { ZERO, roundNutrients, sumIngredients } from './nutrients';
import type { Nutrients } from './nutrients';

/**
 * How much of each recipe an athlete should actually eat.
 *
 * ## The gap this closes
 *
 * The plan was a list of fixed recipes. A 4,200-calorie athlete and a
 * 2,100-calorie athlete were handed the identical day and told it was theirs.
 * Measured against the ingredient table, a planned practice day comes to about
 * 3,660 calories for *everyone* — sometimes 250 over the target, sometimes 1,100
 * under, and never on purpose.
 *
 * That also made requirement 6 of the brief impossible: "recalculate meal plans
 * and recipes whenever the goal weight changes" cannot be satisfied by a plan
 * that never varied by anything. A serving multiplier is the smallest thing that
 * makes the plan a function of the target.
 *
 * ## How the multiplier is chosen
 *
 * One proportional factor for the day — `target ÷ what the day's recipes come
 * to` — so a day keeps its shape: breakfast stays breakfast-sized relative to
 * dinner rather than one meal absorbing the whole correction.
 *
 * Servings are then rounded to quarters, because "1¼ recipes" is an instruction
 * a person can follow and "1.07 recipes" is not. Rounding each meal
 * independently would let the errors pile up in one direction, so the day is
 * walked in order carrying the running difference: each meal is asked for the
 * servings that bring the *cumulative* total back to where it should be. The
 * error stays bounded by one quarter-serving of one meal instead of growing with
 * the length of the day.
 *
 * ## Where it stops
 *
 * `MIN_SERVINGS` and `MAX_SERVINGS` bound what an athlete is asked to do to a
 * recipe. Past those the instruction stops being sensible — a fifth of a bagel,
 * or four helpings of pot roast — and the honest answer is that this plan cannot
 * reach this target, which `shortfall` reports rather than hides. The fix for a
 * clamped day is a different plan, not a stranger portion.
 */

/** A quarter of a recipe is the smallest instruction worth giving. */
export const SERVING_STEP = 0.25;
export const MIN_SERVINGS = 0.5;
export const MAX_SERVINGS = 2;

const quarter = (n: number) => Math.round(n / SERVING_STEP) * SERVING_STEP;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A recipe's nutrition at one serving, computed from its ingredients. */
const baseCache = new Map<string, Nutrients>();

export function baseNutrition(meal: Meal): Nutrients {
  const hit = baseCache.get(meal.id);
  if (hit) return hit;
  const { total } = sumIngredients(meal.ingredients);
  baseCache.set(meal.id, total);
  return total;
}

/** A recipe's nutrition at some number of servings. */
export function scaleNutrients(base: Nutrients, servings: number): Nutrients {
  const out = {} as Nutrients;
  for (const key of Object.keys(ZERO) as (keyof Nutrients)[]) out[key] = base[key] * servings;
  return roundNutrients(out);
}

export function nutritionOf(meal: Meal, servings = 1): Nutrients {
  return scaleNutrients(baseNutrition(meal), servings);
}

export interface PortionedMeal {
  meal: Meal;
  servings: number;
  nutrients: Nutrients;
}

export interface PortionedDay {
  meals: PortionedMeal[];
  /** What the day adds up to once the servings are applied. */
  total: Nutrients;
  /**
   * Target calories minus what the day delivers. Positive means the plan could
   * not reach the target without portions nobody would follow.
   */
  shortfall: number;
  /** True when any meal hit `MIN_SERVINGS` or `MAX_SERVINGS`. */
  clamped: boolean;
}

/**
 * Portion a day's meals to hit a calorie target.
 *
 * Deterministic and order-dependent by design: the same meals in the same order
 * with the same target always produce the same servings, which is what lets the
 * plan be recomputed on every render without moving under the athlete.
 */
export function portionDay(meals: Meal[], targetCal: number): PortionedDay {
  if (!meals.length) return { meals: [], total: ZERO, shortfall: targetCal, clamped: false };

  const bases = meals.map(baseNutrition);
  const baseTotal = bases.reduce((n, b) => n + b.kcal, 0);
  if (baseTotal <= 0) return { meals: [], total: ZERO, shortfall: targetCal, clamped: false };

  const rawFactor = targetCal / baseTotal;
  const factor = clamp(rawFactor, MIN_SERVINGS, MAX_SERVINGS);

  let wanted = 0;
  let served = 0;
  // Clamping happens twice: once on the day's factor, when the target is out of
  // reach of these recipes entirely, and once per meal when the running
  // correction asks for more than a meal can carry. Either one means the day is
  // no longer a faithful answer to the target, so either one sets the flag.
  let clamped = factor !== rawFactor;
  const out: PortionedMeal[] = [];

  for (let i = 0; i < meals.length; i++) {
    const base = bases[i];
    wanted += base.kcal * factor;
    // The servings that would bring the running total back to where it should
    // be — not just this meal's share, but this meal's share plus whatever the
    // last few roundings left behind.
    const ideal = base.kcal > 0 ? (wanted - served) / base.kcal : factor;
    const servings = clamp(quarter(ideal), MIN_SERVINGS, MAX_SERVINGS);
    if (servings !== quarter(ideal)) clamped = true;
    served += base.kcal * servings;
    out.push({ meal: meals[i], servings, nutrients: scaleNutrients(base, servings) });
  }

  let total = ZERO;
  for (const p of out) {
    for (const key of Object.keys(ZERO) as (keyof Nutrients)[]) {
      total = { ...total, [key]: total[key] + p.nutrients[key] };
    }
  }

  return {
    meals: out,
    total: roundNutrients(total),
    shortfall: Math.round(targetCal - total.kcal),
    clamped,
  };
}

/**
 * How a serving count is written on screen.
 *
 * Whole numbers stay whole; quarters become fractions, because "1½" reads as an
 * instruction and "1.5 servings" reads as a spreadsheet.
 */
export function servingLabel(servings: number): string {
  const whole = Math.floor(servings);
  const frac = Math.round((servings - whole) * 4);
  const marks = ['', '¼', '½', '¾'];
  if (frac === 0) return `${whole}`;
  if (whole === 0) return marks[frac];
  return `${whole}${marks[frac]}`;
}
