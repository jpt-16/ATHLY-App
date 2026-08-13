import { requireSupabase } from '../lib/supabase';
import { isIsoDate } from '../lib/clock';
import type { IsoDate } from '../lib/clock';

/**
 * The edits an athlete made to their plan.
 *
 * The generated plan is not stored, and should not be: the planner is a pure
 * function of the training week, the athlete's constraints and the date, so it
 * can always be recomputed and storing it would only create a second version to
 * drift from the first.
 *
 * What is stored is what cannot be recomputed — a swap, and a re-roll. Both used
 * to live in React state alone, which meant they survived until the tab closed
 * and no longer. An athlete who planned their week on Sunday opened the app on
 * Monday to find it had changed its mind back.
 *
 * Separate from `profileRepo` on purpose. Onboarding answers are written once in
 * a batch at the end of a questionnaire; these are written one at a time as the
 * athlete taps, and pushing a whole account through the wire for one swapped
 * dinner would be the wrong shape.
 */

export interface StoredPlan {
  /** Keyed `${isoDate}|${slot}`, matching `AppState.swaps`. */
  swaps: Record<string, string>;
  /** Keyed by ISO date, matching `AppState.replans`. */
  replans: Record<string, number>;
}

export const EMPTY_PLAN: StoredPlan = { swaps: {}, replans: {} };

/** Record one swap. Upserted, so swapping the same slot twice replaces it. */
export async function savePlanSwap(
  userId: string,
  date: IsoDate,
  slot: string,
  mealId: string,
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('plan_swaps').upsert(
    { user_id: userId, plan_date: date, slot, meal_id: mealId },
    {
      onConflict: 'user_id,plan_date,slot',
    },
  );
  if (error) throw error;
}

/** Record how many times a day has been re-rolled. */
export async function savePlanReplans(userId: string, date: IsoDate, replans: number): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from('plan_days')
    .upsert({ user_id: userId, plan_date: date, replans }, { onConflict: 'user_id,plan_date' });
  if (error) throw error;
}

/**
 * Read every edit back.
 *
 * Unfiltered by user, like everything else in the repository layer: Row Level
 * Security adds the `user_id` predicate in the database, and repeating it here
 * would only duplicate a check that cannot be removed from there.
 *
 * Rows whose date the app cannot parse are dropped rather than trusted. A
 * malformed date would key a swap that never matches a day and would reach
 * `fromIsoDate` by way of the calendar.
 */
export async function loadPlan(): Promise<StoredPlan> {
  const db = requireSupabase();
  const [swaps, days] = await Promise.all([
    db.from('plan_swaps').select('*'),
    db.from('plan_days').select('*'),
  ]);
  if (swaps.error) throw swaps.error;
  if (days.error) throw days.error;

  const out: StoredPlan = { swaps: {}, replans: {} };
  for (const row of swaps.data ?? []) {
    if (!isIsoDate(row.plan_date) || !row.slot || !row.meal_id) continue;
    out.swaps[`${row.plan_date}|${row.slot}`] = row.meal_id;
  }
  for (const row of days.data ?? []) {
    if (!isIsoDate(row.plan_date)) continue;
    const n = Number(row.replans);
    if (Number.isInteger(n) && n > 0) out.replans[row.plan_date] = n;
  }
  return out;
}
