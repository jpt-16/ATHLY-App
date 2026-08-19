/**
 * The database, as TypeScript sees it.
 *
 * Hand-written to match `supabase/migrations/0001_init.sql`, and the one file
 * here that can silently drift from reality — TypeScript checks these types
 * against the queries, not against Postgres. Regenerate rather than edit once
 * the Supabase CLI is available:
 *
 *     npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * Until then, a change to the migration means a change here, and
 * `supabase/tests/rls.test.ts` is what catches the two disagreeing: it selects
 * and writes every column against a real database.
 *
 * The row shapes below are `type` aliases and not `interface`s, which matters
 * more than it looks: an interface does not get an implicit index signature, so
 * it fails `Record<string, unknown>` — the constraint the Supabase client puts
 * on a table row. Declare these as interfaces and every query silently degrades
 * to `never`, which is what the generated output avoids by doing the same thing.
 */

export type GoalKind = 'gain' | 'perform' | 'lose' | 'habits';
export type SexBasis = 'male' | 'female' | 'na';
export type ProteinModeDb = 'rec' | 'gpp' | 'custom';
export type DayModeDb = 'rest' | 'practice' | 'game';
export type AllergenDb =
  'peanuts' | 'tree_nuts' | 'dairy' | 'gluten' | 'shellfish' | 'fish' | 'soy' | 'eggs' | 'sesame';

export type ProfileRow = {
  user_id: string;
  name: string | null;
  age: number | null;
  sex: SexBasis | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lb: number | null;
  goal: GoalKind | null;
  goal_weight_lb: number | null;
  rate_lb_per_week: number | null;
  sports: string[];
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Weight, water and sleep for one athlete on one day.
 *
 * Every measurement is nullable and they are recorded independently — an
 * athlete who logs their sleep has not thereby said they drank nothing. `null`
 * is "not recorded", which is a different fact from zero for all three.
 */
export type DailyMetricsRow = {
  user_id: string;
  log_date: string;
  weight_lb: number | null;
  water_ml: number | null;
  sleep_minutes: number | null;
  updated_at: string;
};

export type GoalsRow = {
  user_id: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  bmr: number;
  maintenance: number;
  computed_at: string;
};

export type FoodPrefsRow = {
  user_id: string;
  likes: string[];
  dislikes: string[];
  cook_level: string | null;
  budget: string | null;
  weekday_minutes: string | null;
  updated_at: string;
};

export type AllergenRow = {
  user_id: string;
  allergen: AllergenDb;
  declared_at: string;
};

export type TrainingWeekRow = {
  user_id: string;
  weekday: number;
  mode: DayModeDb;
  session_time: string;
  lift_time: string;
  duration_minutes: string;
};

export type TrainingOverrideRow = {
  user_id: string;
  /** `YYYY-MM-DD`. */
  override_date: string;
  mode: DayModeDb;
  session_time: string;
  lift_time: string;
  duration_minutes: string;
};

export type EntitlementRow = {
  user_id: string;
  tier: string;
  status: string;
  expires_at: string | null;
  updated_at: string;
};

export type LogSourceDb = 'plan' | 'recent' | 'favorite' | 'custom' | 'swap';

export type MealLogRow = {
  id: string;
  user_id: string;
  /** `YYYY-MM-DD`, in the athlete's own timezone. */
  log_date: string;
  logged_at: string;
  source: LogSourceDb;
  meal_id: string | null;
  name: string;
  servings: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /**
   * The eight micronutrients, nullable because rows written before
   * `0006_micronutrients.sql` have none and inventing values for them would make
   * a fabricated figure indistinguishable from a measured one.
   */
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  vitamin_d_mcg: number | null;
};

/**
 * A meal the athlete put into a slot themselves.
 *
 * Keyed by the position in the day rather than by the meal it displaced: a
 * replan may pick something different for that slot, and the choice was about
 * what goes at dinner, not about the pasta it replaced.
 */
export type PlanSwapRow = {
  user_id: string;
  /** `YYYY-MM-DD`, in the athlete's own timezone. */
  plan_date: string;
  slot: string;
  meal_id: string;
};

/** How many times a day has been re-rolled. An input to the planner's seed. */
export type PlanDayRow = {
  user_id: string;
  plan_date: string;
  replans: number;
};

/**
 * The `daily_totals` view. Read-only from here — `Insert` and `Update` exist
 * only because the client's table type demands them, and Postgres will refuse
 * either way.
 */
export type DailyTotalsRow = {
  user_id: string;
  log_date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  entries: number;
};

/** Columns the database fills in for us, and so are not required on insert. */
type Generated = 'created_at' | 'updated_at' | 'computed_at' | 'declared_at' | 'id' | 'logged_at';

/**
 * @typeParam Sparse Columns a write may legitimately leave out.
 *
 * `daily_metrics` is the case: weight, water and sleep are recorded
 * independently, so an upsert that had to name all three would blank the two
 * the athlete did not touch. Nullable in the schema is not the same as optional
 * on insert, and only the second one is safe to assume.
 */
type Table<Row, Sparse extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Extract<keyof Row, Generated> | Sparse> &
    Partial<Pick<Row, Extract<keyof Row, Generated> | Sparse>>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      goals: Table<GoalsRow>;
      user_food_prefs: Table<FoodPrefsRow>;
      user_allergens: Table<AllergenRow>;
      training_week: Table<TrainingWeekRow>;
      training_overrides: Table<TrainingOverrideRow>;
      entitlements: Table<EntitlementRow>;
      meal_logs: Table<MealLogRow>;
      daily_metrics: Table<DailyMetricsRow, 'weight_lb' | 'water_ml' | 'sleep_minutes'>;
      plan_swaps: Table<PlanSwapRow>;
      plan_days: Table<PlanDayRow>;
    };
    Views: {
      daily_totals: Table<DailyTotalsRow>;
    };
    Functions: Record<never, never>;
    Enums: {
      goal_kind: GoalKind;
      sex_basis: SexBasis;
      protein_mode: ProteinModeDb;
      day_mode: DayModeDb;
      allergen: AllergenDb;
      log_source: LogSourceDb;
    };
    CompositeTypes: Record<never, never>;
  };
}

/**
 * The user-owned tables, named once.
 *
 * `deleted_accounts` and `entitlements` are absent from this list on purpose:
 * the first is service-role only, the second is read-only to the athlete, so
 * neither takes part in the read/write round trip the repository performs.
 */
export const USER_TABLES = [
  'profiles',
  'goals',
  'user_food_prefs',
  'user_allergens',
  'training_week',
  'training_overrides',
  'meal_logs',
  'plan_swaps',
  'plan_days',
  'daily_metrics',
] as const;

export type UserTable = (typeof USER_TABLES)[number];
