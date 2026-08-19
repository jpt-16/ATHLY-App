import { addDays, startOfWeek, weekdayOf } from '../lib/clock';
import type { IsoDate } from '../lib/clock';
import { ZERO } from '../prototype/nutrients';
import type { Nutrients } from '../prototype/nutrients';
import type { MealLog, Week } from '../prototype/types';

/**
 * What the athlete actually ate, added up.
 *
 * Pure functions over a list of logs, deliberately separate from both the
 * database and the component: the Home ring and the Progress tab are the two
 * places this app makes factual claims about a person, and claims that can be
 * unit-tested are the only kind worth making.
 *
 * Everything here answers "what do the logs say", never "what should they say".
 * A day with no logs totals zero and is reported as having no data — the two are
 * different, and the screens treat them differently.
 */

export interface Totals extends Nutrients {
  /** How many things were logged. Zero means the day is empty, not that it was a fast. */
  entries: number;
}

export const EMPTY_TOTALS: Totals = { ...ZERO, entries: 0 };

const NUTRIENT_KEYS = Object.keys(ZERO) as (keyof Nutrients)[];

/**
 * Add one entry into a running total.
 *
 * Every nutrient, keyed off `ZERO`, so the eight micronutrients added in
 * `0006_micronutrients.sql` cannot be silently left out of a sum by a function
 * that lists its fields by hand.
 */
function add(into: Totals, log: MealLog): Totals {
  const out = { ...into, entries: into.entries + 1 };
  for (const key of NUTRIENT_KEYS) out[key] = into[key] + log[key];
  return out;
}

/** Everything logged on one date. */
export function logsOn(logs: MealLog[], date: IsoDate): MealLog[] {
  return logs.filter((l) => l.date === date);
}

/** One day's totals. */
export function totalsFor(logs: MealLog[], date: IsoDate): Totals {
  return logsOn(logs, date).reduce(add, EMPTY_TOTALS);
}

/** Totals for every day that has any, keyed by date. Days with none are absent. */
export function totalsByDate(logs: MealLog[]): Record<IsoDate, Totals> {
  const out: Record<IsoDate, Totals> = {};
  for (const log of logs) out[log.date] = add(out[log.date] ?? EMPTY_TOTALS, log);
  return out;
}

/** The last `n` days ending today, most recent first. */
export function lastDays(today: IsoDate, n: number): IsoDate[] {
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface WeekBar {
  label: string;
  /** Average daily calories that week as a percentage of target, uncapped. */
  pct: number;
  /** False when nothing was logged that week — an empty bar, not a bad week. */
  hasData: boolean;
}

/**
 * Calories against target, week by week, oldest first.
 *
 * The average is taken over the days that *have* logs rather than over seven,
 * because a week someone used the app on three days is a three-day average and
 * not a 43%-of-target catastrophe. That distinction is the difference between a
 * chart and an accusation.
 */
export function weeklyCalories(logs: MealLog[], targetCal: number, today: IsoDate, weeks: number): WeekBar[] {
  const byDate = totalsByDate(logs);
  const thisWeek = startOfWeek(today);

  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, (i - (weeks - 1)) * 7);
    let sum = 0;
    let days = 0;
    for (let d = 0; d < 7; d++) {
      const totals = byDate[addDays(start, d)];
      if (totals && totals.entries > 0) {
        sum += totals.kcal;
        days += 1;
      }
    }
    return {
      label: 'W' + (i + 1),
      pct: days && targetCal > 0 ? Math.round((sum / days / targetCal) * 100) : 0,
      hasData: days > 0,
    };
  });
}

export interface Adherence {
  /** Days in the window with at least one log. */
  daysLogged: number;
  /** Days that met the protein target. */
  proteinDays: number;
  /** Days whose calories landed within 10% of target either way. */
  calorieDays: number;
  /** Training days with at least one log, and how many training days there were. */
  trainingFueled: number;
  trainingDays: number;
  /** The size of the window, so a screen can render "4/7" without re-deriving it. */
  window: number;
}

/**
 * What the last `window` days say about how closely the plan was followed.
 *
 * Only days that have already happened count, which for the current week means
 * the window ends today. A day still in progress is included: someone checking
 * at lunchtime should see today's partial totals, not have today quietly
 * excluded and wonder why the number moved overnight.
 */
export function adherence(
  logs: MealLog[],
  opts: { today: IsoDate; window: number; targetCal: number; targetProtein: number; week: Week },
): Adherence {
  const byDate = totalsByDate(logs);
  const out: Adherence = {
    daysLogged: 0,
    proteinDays: 0,
    calorieDays: 0,
    trainingFueled: 0,
    trainingDays: 0,
    window: opts.window,
  };

  for (const date of lastDays(opts.today, opts.window)) {
    const spec = opts.week[weekdayOf(date)];
    // A lift on a rest day still counts as training — the same test the targets
    // math uses to decide the activity multiplier.
    const training = !!spec && (spec[0] !== 'rest' || !!spec[2]);
    if (training) out.trainingDays += 1;

    const totals = byDate[date];
    if (!totals || totals.entries === 0) continue;

    out.daysLogged += 1;
    if (training) out.trainingFueled += 1;
    if (opts.targetProtein > 0 && totals.protein >= opts.targetProtein) out.proteinDays += 1;
    if (opts.targetCal > 0 && Math.abs(totals.kcal - opts.targetCal) <= opts.targetCal * 0.1) {
      out.calorieDays += 1;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// The Log tab
// ---------------------------------------------------------------------------

export interface LoggedItem extends Nutrients {
  name: string;
  mealId: string | null;
  /** Most recent time this was logged. */
  lastLogged: MealLog;
  count: number;
}

/** One entry per distinct food, most recently logged first. */
export function recentItems(logs: MealLog[], limit: number): LoggedItem[] {
  return rollUp(logs).sort(cmpTime).slice(0, limit);
}

/**
 * The foods logged most often, ties broken by recency.
 *
 * "Favourite" here means *repeated*, which is a fact, rather than *rated*,
 * which the app has never asked about. Anything logged once is not a favourite
 * and is left out.
 */
export function favoriteItems(logs: MealLog[], limit: number): LoggedItem[] {
  return rollUp(logs)
    .filter((i) => i.count > 1)
    .sort((a, b) => b.count - a.count || cmpTime(a, b))
    .slice(0, limit);
}

/**
 * Foods the athlete typed in themselves, most recent first.
 *
 * There is no table of custom foods and there does not need to be one. A food
 * someone entered by hand is a log entry with `source: 'custom'`, so the log is
 * already the library — which means a food typed once is a one-tap log forever
 * without a second place for it to live, drift out of date, or be deleted from
 * independently.
 */
export function customItems(logs: MealLog[], limit: number): LoggedItem[] {
  return rollUp(logs.filter((l) => l.source === 'custom'))
    .sort(cmpTime)
    .slice(0, limit);
}

function cmpTime(a: LoggedItem, b: LoggedItem): number {
  return b.lastLogged.loggedAt.localeCompare(a.lastLogged.loggedAt);
}

function rollUp(logs: MealLog[]): LoggedItem[] {
  const by = new Map<string, LoggedItem>();
  for (const log of logs) {
    // Group by recipe when there is one, by name when there is not, so two
    // hand-typed "Chocolate milk" entries collapse but a renamed recipe does
    // not split in two.
    const key = log.mealId ?? 'name:' + log.name.toLowerCase();
    const seen = by.get(key);
    if (!seen) {
      const fresh = { name: log.name, mealId: log.mealId, lastLogged: log, count: 1 } as LoggedItem;
      for (const k of NUTRIENT_KEYS) fresh[k] = log[k];
      by.set(key, fresh);
      continue;
    }
    seen.count += 1;
    // The most recent entry's numbers win, so a food logged at a different
    // portion shows what it was last actually eaten at.
    if (log.loggedAt > seen.lastLogged.loggedAt) {
      seen.lastLogged = log;
      seen.name = log.name;
      for (const k of NUTRIENT_KEYS) seen[k] = log[k];
    }
  }
  return [...by.values()];
}
