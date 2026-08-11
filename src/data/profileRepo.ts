import { requireSupabase } from '../lib/supabase';
import type {
  AllergenDb,
  DayModeDb,
  FoodPrefsRow,
  GoalKind,
  ProfileRow,
  ProteinModeDb,
  SexBasis,
  TrainingOverrideRow,
  TrainingWeekRow,
} from '../lib/database.types';
import { withEveryWeekday } from './week';
import { ALLERGEN_BY_LABEL } from '../prototype/foodFacts';
import { computeTargets } from '../prototype/nutrition';
import type { AppState, DayMode, DaySpec, ProteinMode, Sex, Week } from '../prototype/types';

/**
 * Everything an athlete's account holds, in both directions.
 *
 * The app keeps one flat `AppState`; the database keeps six normalised tables.
 * This module is the only place that knows how one becomes the other, so the
 * screens go on reading the state shape the prototype gave them and the schema
 * stays a schema rather than a state dump.
 *
 * What is *not* saved is as deliberate as what is: `tab`, `overlay`, `toast`,
 * `search`, `draft` and the rest are the shape of a session, not of a person.
 * Restoring a signed-in athlete to the overlay they had open two days ago on a
 * different device would be an odd thing to do on purpose.
 */

/** The subset of `AppState` that belongs to the athlete rather than the session. */
export type PersistedState = Pick<
  AppState,
  'a' | 'age' | 'ft' | 'inch' | 'lb' | 'goalLb' | 'rate' | 'pMode' | 'pCustom' | 'week' | 'overrides'
>;

/**
 * The month the prototype's calendar is anchored to.
 *
 * The app's `overrides` are keyed by day-of-month against a hard-coded August
 * 2026 (`AthlyApp.tsx:227` and friends), which is prototype scaffolding, not a
 * design decision. The database stores real dates, because that is what a date
 * is; the conversion lives here so the wart stays in one file and disappears the
 * day the calendar becomes real, without a migration.
 */
const ANCHOR_YEAR = 2026;
/** Zero-based, as `Date` wants it. August. */
const ANCHOR_MONTH = 7;

function dayToDate(day: number): string {
  const mm = String(ANCHOR_MONTH + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${ANCHOR_YEAR}-${mm}-${dd}`;
}

function dateToDay(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** Chip label → enum, and back. Derived, so the two can never disagree. */
const LABEL_BY_ALLERGEN: Record<string, string> = Object.fromEntries(
  Object.entries(ALLERGEN_BY_LABEL).map(([label, key]) => [key, label]),
);

const DAY_MODES: readonly DayMode[] = ['rest', 'practice', 'game'];
const SEXES: readonly Sex[] = ['male', 'female', 'na'];
const GOALS: readonly GoalKind[] = ['gain', 'perform', 'lose', 'habits'];
const PROTEIN_MODES: readonly ProteinMode[] = ['rec', 'gpp', 'custom'];

/**
 * Trust nothing coming back from the database.
 *
 * Not because Postgres lies — the enums make these columns sound — but because a
 * value that has been through a schema change, a manual edit or a future
 * migration can arrive as something the union does not include, and a bad cast
 * would put it straight into state where the screens index arrays with it.
 */
function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/**
 * Write the whole account.
 *
 * Upserts rather than inserts throughout, so this is the same call whether the
 * athlete just created the account or edited a number in Profile. The child
 * tables are replaced wholesale — delete then insert — because these are small
 * sets where "which rows went away" is the entire question and diffing them
 * client-side would be more code for a worse answer.
 *
 * Not a transaction. PostgREST has no multi-statement transaction, so a failure
 * part-way leaves the account written and, say, the allergens not. That is why
 * the caller treats a failed save as a failed save and offers a retry, rather
 * than assuming it landed.
 */
export async function saveAccount(userId: string, s: PersistedState): Promise<void> {
  const db = requireSupabase();
  const a = s.a;
  const targets = computeTargets(s);

  const profile: Omit<ProfileRow, 'created_at' | 'updated_at'> = {
    user_id: userId,
    name: a.name ?? null,
    age: s.age,
    sex: (a.sex ?? 'na') as SexBasis,
    height_ft: s.ft,
    height_in: s.inch,
    weight_lb: s.lb,
    goal: (a.goal ?? null) as GoalKind | null,
    goal_weight_lb: s.goalLb,
    rate_lb_per_week: s.rate,
    protein_mode: s.pMode as ProteinModeDb,
    protein_custom_g: s.pCustom,
    sports: a.sports ?? [],
    onboarding_complete: true,
  };

  const { error: profileError } = await db.from('profiles').upsert(profile, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  const { error: goalsError } = await db.from('goals').upsert(
    {
      user_id: userId,
      calories: targets.cal,
      protein_g: targets.protein,
      fat_g: targets.fat,
      carbs_g: targets.carbs,
      bmr: targets.bmr,
      maintenance: targets.maint,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (goalsError) throw goalsError;

  const prefs: Omit<FoodPrefsRow, 'updated_at'> = {
    user_id: userId,
    likes: a.likes ?? [],
    dislikes: a.dislikes ?? [],
    cook_level: a.cook ?? null,
    budget: a.budget ?? null,
    weekday_minutes: a.time ?? null,
  };
  const { error: prefsError } = await db.from('user_food_prefs').upsert(prefs, { onConflict: 'user_id' });
  if (prefsError) throw prefsError;

  // Allergens. Chip labels in, enum values out; anything unrecognised is
  // dropped rather than guessed at, and `None of these` has no mapping by
  // design.
  const allergens = (a.allergies ?? [])
    .map((label) => ALLERGEN_BY_LABEL[label])
    .filter((x): x is AllergenDb => Boolean(x));

  const { error: clearAllergens } = await db.from('user_allergens').delete().eq('user_id', userId);
  if (clearAllergens) throw clearAllergens;
  if (allergens.length) {
    const { error } = await db
      .from('user_allergens')
      .insert(allergens.map((allergen) => ({ user_id: userId, allergen })));
    if (error) throw error;
  }

  const weekRows: TrainingWeekRow[] = Object.entries(s.week).map(([wd, spec]) => ({
    user_id: userId,
    weekday: Number(wd),
    mode: spec[0] as DayModeDb,
    session_time: spec[1] ?? '',
    lift_time: spec[2] ?? '',
    duration_minutes: spec[3] ?? '',
  }));
  const { error: weekError } = await db
    .from('training_week')
    .upsert(weekRows, { onConflict: 'user_id,weekday' });
  if (weekError) throw weekError;

  const overrideRows: TrainingOverrideRow[] = Object.entries(s.overrides).map(([day, spec]) => ({
    user_id: userId,
    override_date: dayToDate(Number(day)),
    mode: spec[0] as DayModeDb,
    session_time: spec[1] ?? '',
    lift_time: spec[2] ?? '',
    duration_minutes: spec[3] ?? '',
  }));
  const { error: clearOverrides } = await db.from('training_overrides').delete().eq('user_id', userId);
  if (clearOverrides) throw clearOverrides;
  if (overrideRows.length) {
    const { error } = await db.from('training_overrides').insert(overrideRows);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Read the whole account, or `null` if this user has never finished onboarding.
 *
 * Every query is unfiltered by user: Row Level Security adds the `user_id`
 * predicate in the database, and a client-side `.eq('user_id', …)` would only
 * duplicate a check that has already been made somewhere it cannot be removed.
 */
export async function loadAccount(): Promise<PersistedState | null> {
  const db = requireSupabase();

  const { data: profile, error } = await db.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  if (!profile || !profile.onboarding_complete) return null;

  const [prefs, allergens, week, overrides] = await Promise.all([
    db.from('user_food_prefs').select('*').maybeSingle(),
    db.from('user_allergens').select('allergen'),
    db.from('training_week').select('*'),
    db.from('training_overrides').select('*'),
  ]);

  // All seven days, whatever the rows say — see `withEveryWeekday`.
  const weekOut: Week = withEveryWeekday(null);
  for (const row of week.data ?? []) {
    weekOut[row.weekday] = [
      oneOf(DAY_MODES, row.mode, 'rest'),
      row.session_time ?? '',
      row.lift_time ?? '',
      row.duration_minutes ?? '',
    ] as DaySpec;
  }

  const overridesOut: Record<number, DaySpec> = {};
  for (const row of overrides.data ?? []) {
    overridesOut[dateToDay(row.override_date)] = [
      oneOf(DAY_MODES, row.mode, 'rest'),
      row.session_time ?? '',
      row.lift_time ?? '',
      row.duration_minutes ?? '',
    ] as DaySpec;
  }

  return {
    a: {
      name: profile.name ?? undefined,
      goal: oneOf(GOALS, profile.goal, 'perform'),
      sex: oneOf(SEXES, profile.sex, 'na'),
      sports: strings(profile.sports),
      likes: strings(prefs.data?.likes),
      dislikes: strings(prefs.data?.dislikes),
      allergies: (allergens.data ?? [])
        .map((row) => LABEL_BY_ALLERGEN[row.allergen])
        .filter((label): label is string => Boolean(label)),
      cook: prefs.data?.cook_level ?? undefined,
      budget: prefs.data?.budget ?? undefined,
      time: prefs.data?.weekday_minutes ?? undefined,
    },
    age: profile.age ?? 17,
    ft: profile.height_ft ?? 5,
    inch: profile.height_in ?? 10,
    lb: Number(profile.weight_lb ?? 165),
    goalLb: profile.goal_weight_lb === null ? null : Number(profile.goal_weight_lb),
    rate: Number(profile.rate_lb_per_week ?? 0.75),
    pMode: oneOf(PROTEIN_MODES, profile.protein_mode, 'rec'),
    pCustom: profile.protein_custom_g,
    week: weekOut,
    overrides: overridesOut,
  };
}
