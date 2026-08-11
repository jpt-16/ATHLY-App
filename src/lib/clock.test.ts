import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addDays,
  daysBetween,
  daysInMonth,
  fromIsoDate,
  isIsoDate,
  longDateLabel,
  monthLabel,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  todayIso,
  weekAround,
  weekdayOf,
} from './clock';

/**
 * The cases here are the ones that decide whether a food log lands on the right
 * day. A date library would be overkill for what the app does; a date library's
 * worth of edge cases still applies.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe('local dates', () => {
  it('takes the date from local time, not UTC', () => {
    // Late evening is where the bug lives: 6pm Tuesday in Los Angeles is
    // already Wednesday in UTC, and an athlete logging dinner has not eaten
    // tomorrow's food. Both ends here are local, so the assertion holds in
    // every zone — which is the property `toISOString().slice(0, 10)` lacks.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 11, 23, 30));
    expect(todayIso()).toBe('2026-08-11');

    vi.setSystemTime(new Date(2026, 7, 12, 0, 30));
    expect(todayIso()).toBe('2026-08-12');
  });

  it('round-trips a date through midnight local', () => {
    const d = fromIsoDate('2026-08-12');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
    expect(toIsoDate(d)).toBe('2026-08-12');
  });
});

describe('isIsoDate', () => {
  it('accepts a real date', () => {
    expect(isIsoDate('2026-08-12')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects the shapes that actually turn up', () => {
    // The prototype keyed overrides by day-of-month; a stash written by that
    // version must not be handed to `fromIsoDate`.
    expect(isIsoDate('12')).toBe(false);
    expect(isIsoDate(12)).toBe(false);
    expect(isIsoDate('2026-8-12')).toBe(false);
    expect(isIsoDate('2026-08-12T09:00:00Z')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('rejects a date that does not exist', () => {
    // `new Date(2026, 1, 30)` is happily the 2nd of March. The round-trip
    // catches it; a regex alone does not.
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2025-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });
});

describe('arithmetic', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('counts whole days across a DST boundary', () => {
    // In US zones the clocks go forward on 8 March 2026, making one 23-hour
    // day. Dividing milliseconds without rounding gives 6.958… days.
    expect(daysBetween('2026-03-06', '2026-03-13')).toBe(7);
    expect(daysBetween('2026-08-12', '2026-08-12')).toBe(0);
    expect(daysBetween('2026-08-12', '2026-08-05')).toBe(-7);
  });

  it('knows how long a month is', () => {
    expect(daysInMonth('2026-08-01')).toBe(31);
    expect(daysInMonth('2026-02-14')).toBe(28);
    expect(daysInMonth('2024-02-14')).toBe(29);
    expect(daysInMonth('2026-09-30')).toBe(30);
  });

  it('finds the start of the month and the week', () => {
    expect(startOfMonth('2026-08-12')).toBe('2026-08-01');
    // Weeks start Monday. The 12th of August 2026 is a Wednesday.
    expect(weekdayOf('2026-08-12')).toBe(3);
    expect(startOfWeek('2026-08-12')).toBe('2026-08-10');
    // Sunday belongs to the week that began the Monday before it, not the one
    // starting the next day.
    expect(startOfWeek('2026-08-16')).toBe('2026-08-10');
    expect(startOfWeek('2026-08-10')).toBe('2026-08-10');
  });

  it('centres the home strip on today', () => {
    const week = weekAround('2026-08-12');
    expect(week).toHaveLength(7);
    expect(week[3]).toBe('2026-08-12');
    expect(week[0]).toBe('2026-08-09');
    expect(week[6]).toBe('2026-08-15');
  });
});

describe('labels', () => {
  it('reads the way the design writes them', () => {
    expect(monthLabel('2026-08-12')).toBe('August 2026');
    expect(longDateLabel('2026-08-12')).toBe('Wednesday, August 12');
  });
});
