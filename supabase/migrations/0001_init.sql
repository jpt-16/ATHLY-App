-- ATHLY — initial schema.
--
-- Every table here holds one athlete's own data and nothing else. The access
-- boundary is Row Level Security, enforced by Postgres on every statement,
-- rather than by the client choosing to filter. That distinction is the whole
-- point: the `anon` key the browser carries is public by design, so a query it
-- sends must be refused by the database, not merely never sent.
--
-- The shape of it, applied to every user table without exception:
--
--   * a `user_id` column referencing `auth.users(id) on delete cascade`, so
--     deleting the account removes the rows rather than orphaning them
--   * `enable row level security`
--   * four policies — select, insert, update, delete — each requiring
--     `auth.uid() = user_id`
--
-- A table added later without those is a data leak, which is why
-- `supabase/tests/rls.test.ts` enumerates the tables from the catalog instead of
-- a hand-kept list: the test fails the moment an unprotected table appears.

-- ---------------------------------------------------------------------------
-- Controlled vocabularies
--
-- These mirror the unions in `src/prototype/types.ts` and the `Allergen` type in
-- `src/prototype/foodFacts.ts`. Enums rather than free text because an allergen
-- that fails to match the client's vocabulary silently stops filtering meals,
-- which is the one failure in this app that can hurt someone.
-- ---------------------------------------------------------------------------

create type public.goal_kind as enum ('gain', 'perform', 'lose', 'habits');
create type public.sex_basis as enum ('male', 'female', 'na');
create type public.protein_mode as enum ('rec', 'gpp', 'custom');
create type public.day_mode as enum ('rest', 'practice', 'game');
create type public.allergen as enum (
  'peanuts', 'tree_nuts', 'dairy', 'gluten', 'shellfish', 'fish', 'soy', 'eggs', 'sesame'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Who the athlete is, and the inputs the targets are computed from.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  age integer check (age between 13 and 120),
  sex public.sex_basis,
  height_ft integer check (height_ft between 3 and 8),
  height_in integer check (height_in between 0 and 11),
  weight_lb numeric(5, 1) check (weight_lb between 50 and 700),
  goal public.goal_kind,
  goal_weight_lb numeric(5, 1) check (goal_weight_lb between 50 and 700),
  rate_lb_per_week numeric(3, 2) check (rate_lb_per_week between 0 and 3),
  protein_mode public.protein_mode not null default 'rec',
  protein_custom_g integer check (protein_custom_g between 0 and 500),
  -- Free text: the onboarding step offers chips but also accepts anything
  -- typed, and an athlete's sport is not ours to constrain.
  sports text[] not null default '{}',
  -- False while an athlete is part-way through onboarding, so the app can drop
  -- them back where they left off instead of at the beginning.
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The targets last computed for this athlete.
--
-- Derived data, stored anyway: `computeTargets` is deterministic, so this is
-- reproducible from `profiles` — but keeping the snapshot means we can tell what
-- an athlete was actually shown last week, and the server can recompute and
-- compare rather than trust the client's arithmetic.
create table public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  calories integer not null check (calories > 0),
  protein_g integer not null check (protein_g >= 0),
  fat_g integer not null check (fat_g >= 0),
  carbs_g integer not null check (carbs_g >= 0),
  bmr integer not null check (bmr > 0),
  maintenance integer not null check (maintenance > 0),
  computed_at timestamptz not null default now()
);

-- Food preferences. Soft constraints: the planner relaxes these before it gives
-- up. Allergens live in their own table because they are never relaxed.
create table public.user_food_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  cook_level text,
  budget text,
  weekday_minutes text,
  updated_at timestamptz not null default now()
);

-- Declared allergies. One row per allergen.
--
-- A row per allergen rather than an array so the enum does the validating, and
-- so a future "declared on" or "severity" column has somewhere to go.
create table public.user_allergens (
  user_id uuid not null references auth.users (id) on delete cascade,
  allergen public.allergen not null,
  declared_at timestamptz not null default now(),
  primary key (user_id, allergen)
);

-- The repeating weekly training pattern. One row per weekday, 0 = Sunday.
create table public.training_week (
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  mode public.day_mode not null default 'rest',
  -- Times are stored as the display strings the app collects ("4:30 pm"), not as
  -- `time` values: they are informal, sometimes blank, and never arithmetic.
  session_time text not null default '',
  lift_time text not null default '',
  duration_minutes text not null default '',
  primary key (user_id, weekday)
);

-- Per-date departures from the weekly pattern.
create table public.training_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  override_date date not null,
  mode public.day_mode not null,
  session_time text not null default '',
  lift_time text not null default '',
  duration_minutes text not null default '',
  primary key (user_id, override_date)
);

-- What the athlete is entitled to.
--
-- Here now, unused until payments, because retrofitting an entitlement check
-- into screens that never had one is how features get shipped ungated.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free',
  status text not null default 'active',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Deletion audit.
--
-- No foreign key, deliberately: the row it would reference is gone by the time
-- anyone reads this. It records that an account existed and was deleted, and
-- carries no personal data beyond the identifier that no longer resolves to
-- anyone. Not readable by any user — service-role only.
create table public.deleted_accounts (
  deleted_user_id uuid primary key,
  deleted_at timestamptz not null default now(),
  requested_by text not null default 'user'
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Postgres denies everything on an RLS-enabled table until a policy permits it,
-- so `enable row level security` with no policies at all is a locked table. The
-- policies below open exactly one door: your own rows.
--
-- `with check` on insert and update is not optional. `using` filters which rows
-- you may act on; `with check` validates the row you are writing. Without it a
-- user could update their own row to carry another user's `user_id`, or insert
-- one outright.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.user_food_prefs enable row level security;
alter table public.user_allergens enable row level security;
alter table public.training_week enable row level security;
alter table public.training_overrides enable row level security;
alter table public.entitlements enable row level security;
alter table public.deleted_accounts enable row level security;

-- profiles
create policy "profiles are readable by their owner"
  on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles are insertable by their owner"
  on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles are updatable by their owner"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles are deletable by their owner"
  on public.profiles for delete to authenticated using (auth.uid() = user_id);

-- goals
create policy "goals are readable by their owner"
  on public.goals for select to authenticated using (auth.uid() = user_id);
create policy "goals are insertable by their owner"
  on public.goals for insert to authenticated with check (auth.uid() = user_id);
create policy "goals are updatable by their owner"
  on public.goals for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals are deletable by their owner"
  on public.goals for delete to authenticated using (auth.uid() = user_id);

-- user_food_prefs
create policy "food prefs are readable by their owner"
  on public.user_food_prefs for select to authenticated using (auth.uid() = user_id);
create policy "food prefs are insertable by their owner"
  on public.user_food_prefs for insert to authenticated with check (auth.uid() = user_id);
create policy "food prefs are updatable by their owner"
  on public.user_food_prefs for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food prefs are deletable by their owner"
  on public.user_food_prefs for delete to authenticated using (auth.uid() = user_id);

-- user_allergens
create policy "allergens are readable by their owner"
  on public.user_allergens for select to authenticated using (auth.uid() = user_id);
create policy "allergens are insertable by their owner"
  on public.user_allergens for insert to authenticated with check (auth.uid() = user_id);
create policy "allergens are updatable by their owner"
  on public.user_allergens for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "allergens are deletable by their owner"
  on public.user_allergens for delete to authenticated using (auth.uid() = user_id);

-- training_week
create policy "training week is readable by its owner"
  on public.training_week for select to authenticated using (auth.uid() = user_id);
create policy "training week is insertable by its owner"
  on public.training_week for insert to authenticated with check (auth.uid() = user_id);
create policy "training week is updatable by its owner"
  on public.training_week for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "training week is deletable by its owner"
  on public.training_week for delete to authenticated using (auth.uid() = user_id);

-- training_overrides
create policy "training overrides are readable by their owner"
  on public.training_overrides for select to authenticated using (auth.uid() = user_id);
create policy "training overrides are insertable by their owner"
  on public.training_overrides for insert to authenticated with check (auth.uid() = user_id);
create policy "training overrides are updatable by their owner"
  on public.training_overrides for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "training overrides are deletable by their owner"
  on public.training_overrides for delete to authenticated using (auth.uid() = user_id);

-- entitlements
--
-- Read-only to the athlete. There is no insert, update or delete policy, so a
-- user cannot grant themselves a subscription no matter what they send. Writes
-- come from the service role, which bypasses RLS, via a payment webhook.
create policy "entitlements are readable by their owner"
  on public.entitlements for select to authenticated using (auth.uid() = user_id);

-- deleted_accounts has RLS enabled and no policies at all: unreadable and
-- unwritable by any user, service-role only. Deliberate, not an oversight.

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
-- `search_path` pinned: a function without it resolves unqualified names
-- against the caller's path, which a user could set to a schema of their own.
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger food_prefs_touch_updated_at
  before update on public.user_food_prefs
  for each row execute function public.touch_updated_at();

create trigger entitlements_touch_updated_at
  before update on public.entitlements
  for each row execute function public.touch_updated_at();

-- Give every new account a free entitlement row.
--
-- `security definer` so it can write a table the user has no insert policy on —
-- which is the point: entitlements are granted by the system, never claimed by
-- the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.entitlements (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS coverage, reported from the catalog
--
-- Exists so `supabase/tests/rls.test.ts` can assert on every table that exists
-- rather than on a list someone remembered to update. A test that enumerates
-- tables by hand passes happily the day an unprotected one is added, which is
-- precisely the day it should fail.
--
-- It returns metadata about tables — names, whether RLS is on, how many
-- policies — and no row of anyone's data. It is revoked from `anon` and
-- `authenticated` regardless, so only the service role can call it.
-- ---------------------------------------------------------------------------

create or replace function public.rls_coverage()
returns table (table_name text, rls_enabled boolean, policy_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.relname::text,
    c.relrowsecurity,
    (select count(*) from pg_catalog.pg_policy p where p.polrelid = c.oid)
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

revoke all on function public.rls_coverage() from public;
revoke all on function public.rls_coverage() from anon;
revoke all on function public.rls_coverage() from authenticated;
grant execute on function public.rls_coverage() to service_role;
