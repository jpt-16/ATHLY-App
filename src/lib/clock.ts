/**
 * Dates, in the only timezone that matters: the athlete's own.
 *
 * The app was ported from a design prototype that believed it was always the
 * 12th of August 2026 — `new Date(2026, 7, dateNum)` in half a dozen places, a
 * calendar with 31 days hardcoded, and per-day overrides keyed by day-of-month.
 * That is fine for a screenshot and useless for a food log, which has to know
 * which day "today" is before it can total anything.
 *
 * Everything date-shaped goes through here, for two reasons:
 *
 * - **A day is local, not UTC.** An athlete in Los Angeles who eats dinner at
 *   6pm on Tuesday is not logging Wednesday's food, but `Date.prototype
 *   .toISOString().slice(0, 10)` says they are for seven hours every evening.
 *   Every conversion below is built out of the local getters instead, and
 *   `fromIsoDate` never hands a bare `YYYY-MM-DD` to the `Date` constructor,
 *   because that string is parsed as UTC midnight and comes back as the
 *   previous day for anyone west of Greenwich.
 * - **The screenshots have to be reproducible.** `tools/visual/capture.mjs`
 *   freezes the browser clock before the app loads, so a calendar rendered from
 *   the real date does not expire the committed baselines at midnight.
 */

/** A calendar date with no time and no zone: `YYYY-MM-DD`. */
export type IsoDate = string;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Now. The only place in the app that reads the system clock. */
export function today(): Date {
  return new Date();
}

/** Today's calendar date, as the athlete's device reckons it. */
export function todayIso(): IsoDate {
  return toIsoDate(today());
}

/** Local date part of a `Date`. Deliberately not `toISOString` — see above. */
export function toIsoDate(d: Date): IsoDate {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Local midnight on the given date. */
export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Shape check for anything claiming to be a date.
 *
 * Used on values coming back from `localStorage` and from the database, where a
 * string written by an older version of the app — the prototype's day-of-month
 * keys, for instance — would otherwise be handed to `fromIsoDate` and turn into
 * `Invalid Date` several screens later.
 */
export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = fromIsoDate(v);
  // Round-trip rather than range-check: this rejects 2026-02-30, which the
  // regex is happy with and `Date` silently rolls forward to March.
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === v;
}

/** `n` days after `iso` (or before it, for negative `n`). */
export function addDays(iso: IsoDate, n: number): IsoDate {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

/** Whole days from `from` to `to`, positive when `to` is later. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  // Both ends are local midnight, so a DST boundary between them leaves a 23-
  // or 25-hour day in the difference. Rounding puts it back on a whole day.
  const ms = fromIsoDate(to).getTime() - fromIsoDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Day of the week, Sunday 0 — the same basis as `AppState['week']`. */
export function weekdayOf(iso: IsoDate): number {
  return fromIsoDate(iso).getDay();
}

/** Days in the month containing `iso`. February is why this exists. */
export function daysInMonth(iso: IsoDate): number {
  const d = fromIsoDate(iso);
  // Day zero of the following month is the last day of this one.
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** The first of the month containing `iso`. */
export function startOfMonth(iso: IsoDate): IsoDate {
  return iso.slice(0, 8) + '01';
}

/** `August 2026`, for the calendar header. */
export function monthLabel(iso: IsoDate): string {
  const d = fromIsoDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** `Wednesday, August 12`, for the selected-day header. */
export function longDateLabel(iso: IsoDate): string {
  const d = fromIsoDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** `August 12`, for the toast that follows a replan. */
export function shortDateLabel(iso: IsoDate): string {
  const d = fromIsoDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * The seven days the Home strip shows: today, with the three days either side.
 *
 * The prototype hardcoded 9–15 with the 12th in the middle. Keeping today
 * centred rather than starting the strip on Sunday means the next two training
 * days are always visible, which is what the strip is for.
 */
export function weekAround(iso: IsoDate): IsoDate[] {
  return [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(iso, n));
}

/**
 * How the Log tab refers to a day: `this morning`, `yesterday`, `Monday`, or
 * the date once a week has passed and the weekday name stops being useful.
 */
export function relativeDayLabel(iso: IsoDate, now: IsoDate, hour?: number): string {
  const diff = daysBetween(iso, now);
  if (diff === 0) {
    if (hour === undefined) return 'today';
    return hour < 12 ? 'this morning' : hour < 17 ? 'this afternoon' : 'this evening';
  }
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return WEEKDAYS[weekdayOf(iso)];
  return shortDateLabel(iso);
}

/** Monday-based start of the week containing `iso`, for weekly rollups. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const wd = weekdayOf(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
