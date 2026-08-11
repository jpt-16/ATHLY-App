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
  protein_mode: ProteinModeDb;
  protein_custom_g: number | null;
  sports: string[];
  onboarding_complete: boolean;
  created_at: string;
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

/** Columns the database fills in for us, and so are not required on insert. */
type Generated = 'created_at' | 'updated_at' | 'computed_at' | 'declared_at';

type Table<Row> = {
  Row: Row;
  Insert: Omit<Row, Extract<keyof Row, Generated>> & Partial<Pick<Row, Extract<keyof Row, Generated>>>;
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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      goal_kind: GoalKind;
      sex_basis: SexBasis;
      protein_mode: ProteinModeDb;
      day_mode: DayModeDb;
      allergen: AllergenDb;
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
] as const;

export type UserTable = (typeof USER_TABLES)[number];
