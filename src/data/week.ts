import type { DaySpec, Week } from '../prototype/types';

/** A day with nothing on it. */
export const restDay = (): DaySpec => ['rest', '', '', ''];

/**
 * Guarantee all seven days.
 *
 * `renderVals` destructures `s.week[wd]` for every weekday, and `computeTargets`
 * counts training days across whatever keys the week happens to have. A week
 * missing a day therefore either crashes the render or, worse, quietly changes
 * an athlete's calorie target.
 *
 * Both routes back into the app can produce one: rows read from the database
 * (a partial write, a future migration) and answers read from local storage,
 * which anyone can edit and which may have been written by an older version of
 * this app. Neither is worth trusting, and the fix is the same for both, so it
 * lives here rather than twice.
 */
export function withEveryWeekday(week: Partial<Week> | null | undefined): Week {
  const out: Week = {};
  for (let wd = 0; wd < 7; wd++) {
    const day = week?.[wd];
    out[wd] =
      Array.isArray(day) && day.length === 4 && typeof day[0] === 'string'
        ? [day[0], day[1] ?? '', day[2] ?? '', day[3] ?? '']
        : restDay();
  }
  return out;
}
