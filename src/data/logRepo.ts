import { requireSupabase } from '../lib/supabase';
import type { LogSourceDb, MealLogRow } from '../lib/database.types';
import { addDays, isIsoDate } from '../lib/clock';
import type { IsoDate } from '../lib/clock';
import type { LogSource, MealLog } from '../prototype/types';

/**
 * Reading and writing what an athlete ate.
 *
 * The counterpart to `profileRepo`, and the same rules apply: every query is
 * unfiltered by user, because Row Level Security adds the `user_id` predicate in
 * the database where it cannot be removed by a client bug. A `.eq('user_id', …)`
 * here would look like security and be decoration.
 *
 * Rows come back through `fromRow`, which validates rather than casts. These are
 * numbers the Home ring and the Progress tab will state as fact, so a null that
 * slipped past a schema change becomes a zero here instead of `NaN` three
 * screens later.
 */

/** How far back the app loads. Eight weeks is what the Progress chart shows. */
export const WINDOW_DAYS = 56;

const SOURCES: readonly LogSource[] = ['plan', 'recent', 'favorite', 'custom', 'swap'];

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function fromRow(row: MealLogRow): MealLog {
  return {
    id: row.id,
    // A date that is not a date would be handed to `fromIsoDate` and reappear as
    // `Invalid Date` inside a totals bucket. Drop it onto the epoch instead,
    // where it is visibly wrong rather than quietly wrong.
    date: isIsoDate(row.log_date) ? row.log_date : '1970-01-01',
    loggedAt: row.logged_at,
    source: SOURCES.includes(row.source as LogSource) ? (row.source as LogSource) : 'custom',
    mealId: row.meal_id,
    name: row.name,
    servings: num(row.servings, 1),
    kcal: Math.round(num(row.kcal)),
    protein: Math.round(num(row.protein_g)),
    carbs: Math.round(num(row.carbs_g)),
    fat: Math.round(num(row.fat_g)),
  };
}

/** What the caller supplies; the database fills in the id and the timestamp. */
export type NewLog = Omit<MealLog, 'id' | 'loggedAt'>;

/**
 * Write one entry.
 *
 * Returns the stored row rather than the one that was sent: the id and the
 * timestamp are the database's to decide, and the caller needs both to show the
 * entry and to let the athlete take it back.
 */
export async function logMeal(userId: string, log: NewLog): Promise<MealLog> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('meal_logs')
    .insert({
      user_id: userId,
      log_date: log.date,
      source: log.source as LogSourceDb,
      meal_id: log.mealId,
      name: log.name,
      servings: log.servings,
      kcal: Math.round(log.kcal),
      protein_g: Math.round(log.protein),
      carbs_g: Math.round(log.carbs),
      fat_g: Math.round(log.fat),
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/**
 * The same entry, with no database behind it.
 *
 * Without Supabase configured the app keeps its logs in component state and
 * loses them on refresh — the bargain the whole app strikes when there is no
 * account. Minting the id and the timestamp here keeps both paths producing the
 * same shape, so nothing downstream has to know which one it is looking at.
 */
export function localLog(log: NewLog, at: Date): MealLog {
  return { ...log, id: crypto.randomUUID(), loggedAt: at.toISOString() };
}

/** Take one back. */
export async function deleteLog(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('meal_logs').delete().eq('id', id);
  if (error) throw error;
}

/** Everything logged between two dates, inclusive. */
export async function loadRange(from: IsoDate, to: IsoDate): Promise<MealLog[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('meal_logs')
    .select('*')
    .gte('log_date', from)
    .lte('log_date', to)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/** The window the app keeps in memory: the last eight weeks, ending today. */
export function loadWindow(today: IsoDate): Promise<MealLog[]> {
  return loadRange(addDays(today, -(WINDOW_DAYS - 1)), today);
}
