import { describe, expect, it } from 'vitest';

import { GLASS_ML, dailyCalories, sleepTargetMinutes, waterTargetMl, weightTrend } from './series';
import type { DayMetrics } from './metricsRepo';
import { ZERO } from '../prototype/nutrients';
import type { MealLog } from '../prototype/types';

/**
 * The charts, checked on the thing that makes a chart lie: a missing day.
 *
 * A bar chart that draws an empty column for a day nobody logged tells an
 * athlete they ate nothing. A weight line that joins two weigh-ins a fortnight
 * apart as if they were consecutive draws a cliff that never happened. Both are
 * the same mistake — treating absence as a measurement — and both are what these
 * assertions exist to catch.
 */

const TODAY = '2026-08-19';

function log(date: string, kcal: number): MealLog {
  return {
    ...ZERO,
    kcal,
    id: `${date}-${kcal}`,
    date,
    loggedAt: `${date}T12:00:00.000Z`,
    source: 'plan',
    mealId: null,
    name: 'Something',
    servings: 1,
  };
}

describe('dailyCalories', () => {
  it('leaves a day with no logs at no height, and says nothing about it', () => {
    const { bars } = dailyCalories([log(TODAY, 2000)], 3000, TODAY, 7);
    const today = bars[bars.length - 1];
    const yesterday = bars[bars.length - 2];

    expect(today.kcal).toBe(2000);
    expect(today.standing).toBe('under');
    // Not a zero-calorie day. A bar with no height and no verdict.
    expect(yesterday.height).toBe(0);
    expect(yesterday.standing).toBeNull();
  });

  it('keeps the target inside the scale even when nobody reached it', () => {
    const { targetHeight, tallest } = dailyCalories([log(TODAY, 900)], 3000, TODAY, 7);
    expect(tallest).toBe(3000);
    expect(targetHeight).toBe(1);
  });

  it('lets a big day set the scale, so the target line moves down', () => {
    const { tallest, targetHeight } = dailyCalories([log(TODAY, 4500)], 3000, TODAY, 7);
    expect(tallest).toBe(4500);
    expect(targetHeight).toBeCloseTo(2 / 3);
  });

  it('calls within a tenth of target on it', () => {
    const at = (kcal: number) => dailyCalories([log(TODAY, kcal)], 3000, TODAY, 7).bars.at(-1)!.standing;
    expect(at(3000)).toBe('on');
    expect(at(2750)).toBe('on');
    expect(at(2600)).toBe('under');
    expect(at(3400)).toBe('over');
  });

  it('runs oldest to newest, ending today', () => {
    const { bars } = dailyCalories([], 3000, TODAY, 7);
    expect(bars).toHaveLength(7);
    expect(bars[0].date).toBe('2026-08-13');
    expect(bars[6].date).toBe(TODAY);
  });
});

describe('weightTrend', () => {
  const metric = (date: string, weightLb: number | null): DayMetrics => ({
    date,
    weightLb,
    waterMl: null,
    sleepMinutes: null,
  });

  it('spaces points by the day they fall on, not by their order', () => {
    // Two weigh-ins a fortnight apart, in a 28-day window. Spacing them evenly
    // would put the second in the middle and draw a slower climb than happened.
    const trend = weightTrend([metric('2026-07-23', 165), metric('2026-08-19', 172)], TODAY, 28);
    expect(trend.points).toHaveLength(2);
    expect(trend.points[0].x).toBeCloseTo(0);
    expect(trend.points[1].x).toBeCloseTo(1);
    expect(trend.change).toBe(7);
  });

  it('ignores days with no weigh-in rather than plotting them at zero', () => {
    const trend = weightTrend([metric('2026-08-18', null), metric(TODAY, 170)], TODAY, 28);
    expect(trend.points).toHaveLength(1);
    expect(trend.latest).toBe(170);
  });

  it('pads the axis so a steady weight is a line, not a floor', () => {
    const trend = weightTrend([metric('2026-08-17', 170), metric(TODAY, 170)], TODAY, 28);
    expect(trend.low).toBe(169);
    expect(trend.high).toBe(171);
    for (const p of trend.points) expect(p.y).toBeCloseTo(0.5);
  });

  it('has nothing to say before the first weigh-in', () => {
    const trend = weightTrend([], TODAY, 28);
    expect(trend.points).toEqual([]);
    expect(trend.latest).toBeNull();
    expect(trend.change).toBe(0);
  });
});

describe('targets', () => {
  it('asks a training day for more water than a rest day', () => {
    expect(waterTargetMl(165, true)).toBeGreaterThan(waterTargetMl(165, false));
    expect(waterTargetMl(165, false)).toBeGreaterThan(2000);
    expect(GLASS_ML).toBe(250);
  });

  it('holds a teenager to eight hours', () => {
    expect(sleepTargetMinutes(15)).toBe(480);
    expect(sleepTargetMinutes(11)).toBe(540);
    expect(sleepTargetMinutes(25)).toBe(420);
  });
});
