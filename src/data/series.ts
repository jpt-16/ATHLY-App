import { addDays, daysBetween, weekdayOf } from '../lib/clock';
import type { IsoDate } from '../lib/clock';
import { totalsByDate } from './dailyTotals';
import type { MealLog } from '../prototype/types';
import type { DayMetrics } from './metricsRepo';

/**
 * The series the charts are drawn from.
 *
 * Pure functions over what is already loaded, so a chart is a rendering of the
 * log rather than a second source of truth about it. Everything here follows
 * one rule, and it is the rule the Progress tab was rebuilt around: **a day with
 * no data is a gap, not a zero.** A bar chart that draws an empty column for a
 * day nobody logged is telling an athlete they ate nothing, and a weight chart
 * that joins Monday to Friday through zero draws a cliff that never happened.
 */

/** One letter per weekday, for an axis with seven labels and no room. */
const INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface DayBar {
  date: IsoDate;
  /** One letter, for the axis. */
  label: string;
  kcal: number;
  /** Height as a fraction of the tallest bar in the window, 0–1. */
  height: number;
  /** Against target: under, on, or over. `null` when nothing was logged. */
  standing: 'under' | 'on' | 'over' | null;
}

/** Within this fraction of target counts as on it. */
const ON_TARGET = 0.1;

/**
 * Calories per day, oldest first.
 *
 * Bars are scaled to the tallest day rather than to the target, so a week spent
 * well under still fills the chart and stays readable. The target line is drawn
 * separately by the screen, at `targetCal / tallest`.
 */
export function dailyCalories(
  logs: MealLog[],
  targetCal: number,
  today: IsoDate,
  days: number,
): { bars: DayBar[]; tallest: number; targetHeight: number } {
  const byDate = totalsByDate(logs);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));

  const kcals = dates.map((d) => byDate[d]?.kcal ?? 0);
  // The target is part of the scale even on a week nobody hit it, or the line
  // would sit off the top of a chart it is supposed to explain.
  const tallest = Math.max(targetCal, ...kcals, 1);

  const bars = dates.map((date, i) => {
    const totals = byDate[date];
    const kcal = kcals[i];
    const logged = !!totals && totals.entries > 0;
    return {
      date,
      label: INITIAL[weekdayOf(date)],
      kcal,
      height: logged ? kcal / tallest : 0,
      standing: !logged
        ? null
        : kcal < targetCal * (1 - ON_TARGET)
          ? ('under' as const)
          : kcal > targetCal * (1 + ON_TARGET)
            ? ('over' as const)
            : ('on' as const),
    };
  });

  return { bars, tallest, targetHeight: targetCal / tallest };
}

export interface WeightPoint {
  date: IsoDate;
  lb: number;
  /** Position in the plot area, 0 at the bottom edge and 1 at the top. */
  y: number;
  /** Distance across the plot, 0 at the oldest day shown and 1 at today. */
  x: number;
}

export interface WeightTrend {
  points: WeightPoint[];
  /** Pounds between the first and last weigh-in, signed. */
  change: number;
  /** The axis, rounded outward to whole pounds. */
  low: number;
  high: number;
  latest: number | null;
}

/**
 * Weigh-ins as a plottable line.
 *
 * Only days with a weight appear. The x position is the day's real place in the
 * window rather than its index among the points, so a fortnight's gap looks like
 * a fortnight's gap — evenly spacing the points would draw a steady decline
 * through a month when the athlete stepped on the scale twice.
 *
 * The y axis is padded by a pound either side of the range, because a flat run
 * of identical weights would otherwise be a line along the very bottom of the
 * box, which reads as zero rather than as steady.
 */
export function weightTrend(metrics: DayMetrics[], today: IsoDate, days: number): WeightTrend {
  const first = addDays(today, -(days - 1));
  const weighed = metrics
    .filter((m) => m.weightLb !== null && m.date >= first && m.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (weighed.length === 0) return { points: [], change: 0, low: 0, high: 0, latest: null };

  const lbs = weighed.map((m) => m.weightLb as number);
  const low = Math.floor(Math.min(...lbs)) - 1;
  const high = Math.ceil(Math.max(...lbs)) + 1;
  const span = high - low;

  return {
    points: weighed.map((m) => ({
      date: m.date,
      lb: m.weightLb as number,
      y: ((m.weightLb as number) - low) / span,
      x: days > 1 ? daysBetween(first, m.date) / (days - 1) : 1,
    })),
    change: Math.round((lbs[lbs.length - 1] - lbs[0]) * 10) / 10,
    low,
    high,
    latest: lbs[lbs.length - 1],
  };
}

/** Millilitres in one glass, the unit the water card counts in. */
export const GLASS_ML = 250;

/**
 * How much water a day's training earns.
 *
 * Baseline is the common 35 ml per kilogram of bodyweight, plus half a litre
 * for a training day — sweat losses vary far too much with heat and duration
 * for a number typed here to be worth more than a prompt to drink.
 *
 * **Not a clinical figure**, and the screens say so. `docs/NUTRITION.md` lists
 * it with the rest of what a dietitian needs to look at.
 */
export function waterTargetMl(weightLb: number, training: boolean): number {
  const kg = weightLb * 0.4536;
  return Math.round((kg * 35 + (training ? 500 : 0)) / 50) * 50;
}

/**
 * Sleep an athlete this age should be getting.
 *
 * The American Academy of Sleep Medicine's recommendation for 13–18 is 8–10
 * hours, and 9–12 for 6–12. This returns the lower bound, because it is the one
 * an athlete is actually failing to meet.
 */
export function sleepTargetMinutes(age: number): number {
  return age <= 12 ? 9 * 60 : age <= 18 ? 8 * 60 : 7 * 60;
}
