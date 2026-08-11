/**
 * The instant every screenshot is taken at.
 *
 * The app renders a real calendar now — the month, the strip of days across the
 * Home screen, "today" — so without this the committed baselines would expire at
 * the next midnight and be wrong again every month. Both capture scripts freeze
 * the browser's clock here before the app loads.
 *
 * `setFixedTime` pins `Date` only; `setTimeout` keeps running, which the build
 * animation between the targets screen and Home depends on.
 *
 * The timezone is pinned alongside it, because a date is local (see
 * `src/lib/clock.ts`) and the machine running this is not always in the same
 * zone as the one that captured the baseline.
 */

/** Wednesday, 12 August 2026, mid-morning — a training day in the seeded week. */
export const PINNED_TIME = new Date('2026-08-12T09:00:00Z');

export const TIMEZONE = 'UTC';

/** Freeze `page`'s clock. Call before `page.goto`. */
export async function pinClock(page) {
  await page.clock.setFixedTime(PINNED_TIME);
}
