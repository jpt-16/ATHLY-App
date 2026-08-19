import { requireSupabase } from '../lib/supabase';
import type { DailyMetricsRow } from '../lib/database.types';
import { addDays, isIsoDate } from '../lib/clock';
import type { IsoDate } from '../lib/clock';

/**
 * Weight, water and sleep — the three things an athlete records about their
 * body rather than their food.
 *
 * Same rules as `logRepo`: no query filters by user, because Row Level Security
 * adds that predicate in the database where a client bug cannot drop it. Rows
 * come back through `fromRow`, which validates rather than casts — these become
 * points on a chart, and a null that slipped past a schema change should be an
 * absent day rather than a spike to zero.
 *
 * Writes are upserts on `(user_id, log_date)`, because recording a weight is
 * correcting today's entry, not adding a second one. The three measurements are
 * written independently: saving water must not blank a weight recorded an hour
 * earlier, which is why each writer sends only its own column.
 */

/** How far back the charts read. Twelve weeks shows a season's worth of trend. */
export const METRICS_WINDOW_DAYS = 84;

/** One day's measurements. `null` means not recorded, which is not zero. */
export interface DayMetrics {
  date: IsoDate;
  weightLb: number | null;
  waterMl: number | null;
  sleepMinutes: number | null;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function fromRow(row: DailyMetricsRow): DayMetrics {
  return {
    // A date that is not a date would be handed to the chart's axis and come
    // back as `Invalid Date`. Drop it on the epoch, where it is visibly wrong.
    date: isIsoDate(row.log_date) ? row.log_date : '1970-01-01',
    weightLb: num(row.weight_lb),
    waterMl: num(row.water_ml),
    sleepMinutes: num(row.sleep_minutes),
  };
}

/** Everything recorded in the window ending today, oldest first. */
export async function loadMetrics(today: IsoDate): Promise<DayMetrics[]> {
  const db = requireSupabase();
  const from = addDays(today, -(METRICS_WINDOW_DAYS - 1));
  const { data, error } = await db
    .from('daily_metrics')
    .select('*')
    .gte('log_date', from)
    .lte('log_date', today)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/**
 * Write one measurement for one day.
 *
 * `patch` carries exactly the column being set. An upsert sending all three
 * would erase the two the athlete did not touch — the kind of data loss nobody
 * sees happen and nobody can undo.
 */
async function upsert(userId: string, date: IsoDate, patch: Partial<DailyMetricsRow>): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from('daily_metrics')
    .upsert(
      { user_id: userId, log_date: date, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'user_id,log_date' },
    );
  if (error) throw error;
}

/** Record a weigh-in. One per day: the second replaces the first. */
export function saveWeight(userId: string, date: IsoDate, weightLb: number): Promise<void> {
  return upsert(userId, date, { weight_lb: weightLb });
}

/** Record the day's water, in millilitres. */
export function saveWater(userId: string, date: IsoDate, waterMl: number): Promise<void> {
  return upsert(userId, date, { water_ml: waterMl });
}

/** Record last night's sleep, in minutes. */
export function saveSleep(userId: string, date: IsoDate, sleepMinutes: number): Promise<void> {
  return upsert(userId, date, { sleep_minutes: sleepMinutes });
}
