import { describe, expect, it } from 'vitest';

import { LIFT_TIMES, TIMES, fromInputValue, toDisplay, toInputValue, toMinutes } from './timeOfDay';

/**
 * The two forms a time takes, and the round trip between them.
 *
 * Every time in the schedule is a display string an athlete reads. Every time
 * an `<input type="time">` hands back is 24-hour. A conversion that loses noon
 * or midnight — the two the 12-hour clock handles badly — silently moves
 * somebody's practice by twelve hours.
 */
describe('times of day', () => {
  it('round-trips every half hour it offers', () => {
    for (const t of [...TIMES, ...LIFT_TIMES]) {
      expect(fromInputValue(toInputValue(t))).toBe(t);
    }
  });

  it('handles noon and midnight, where the 12-hour clock is worst', () => {
    expect(toDisplay(0)).toBe('12:00 am');
    expect(toDisplay(12 * 60)).toBe('12:00 pm');
    expect(toInputValue('12:00 am')).toBe('00:00');
    expect(toInputValue('12:00 pm')).toBe('12:00');
    expect(fromInputValue('00:30')).toBe('12:30 am');
    expect(fromInputValue('12:30')).toBe('12:30 pm');
  });

  it('reads a time the picker produced but the chips never offer', () => {
    expect(fromInputValue('17:45')).toBe('5:45 pm');
    expect(toMinutes('5:45 pm')).toBe(17 * 60 + 45);
  });

  it('refuses nonsense rather than guessing at it', () => {
    expect(toMinutes('half four')).toBeNull();
    expect(toMinutes('13:00 pm')).toBeNull();
    expect(toMinutes('4:75 pm')).toBeNull();
    expect(fromInputValue('')).toBe('');
    expect(fromInputValue('25:00')).toBe('');
    expect(toInputValue('')).toBe('');
  });

  it('offers far more than the six fixed times it replaced', () => {
    // The old list was 6:00 am, 7:00 am and four afternoon slots — no answer for
    // a midday game or an early lift.
    expect(TIMES.length).toBeGreaterThan(30);
    expect(TIMES).toContain('12:30 pm');
    expect(TIMES[0]).toBe('5:00 am');
    expect(LIFT_TIMES).toContain('5:30 am');
  });
});
