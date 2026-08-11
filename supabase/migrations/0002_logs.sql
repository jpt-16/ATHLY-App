-- ATHLY — the food log.
--
-- Until now the Home ring was a constant: `tg.cal - 1840`. This migration is
-- what makes it a measurement. One table of things eaten, and a view that adds
-- them up per day.
--
-- Everything in `0001_init.sql` about Row Level Security applies here unchanged
-- — `user_id`, four policies, `with check` on every write — with one addition
-- that only shows up once a view exists. See the note above `daily_totals`.

-- Where a log entry came from. "The plan told me to" and "I typed it in myself"
-- are different claims about how much the numbers can be trusted, and Phase 4's
-- planner has to be able to tell them apart.
create type public.log_source as enum ('plan', 'recent', 'favorite', 'custom', 'swap');

-- ---------------------------------------------------------------------------
-- meal_logs
-- ---------------------------------------------------------------------------

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The athlete's own calendar day, not a timestamp cast to UTC. Someone eating
  -- dinner at 6pm in Los Angeles is not logging tomorrow's food, which is what
  -- `logged_at::date` would decide for them for seven hours every evening. The
  -- client sends the date it computed locally; see `src/lib/clock.ts`.
  log_date date not null,
  logged_at timestamptz not null default now(),
  source public.log_source not null,

  -- The recipe this came from, when it came from one. Deliberately *not* a
  -- foreign key: recipes live in the client bundle today and in a table later,
  -- and a log must survive a recipe being renamed or retired.
  meal_id text,

  -- The macros are copied onto the row, not looked up through `meal_id`.
  --
  -- A log is a record of what happened. When a recipe is edited, or when the
  -- USDA pass revises its numbers, last Tuesday must not quietly become a
  -- different Tuesday — an athlete tracking a cut would see their history
  -- rewrite itself underneath them.
  name text not null check (length(name) between 1 and 200),
  servings numeric(4, 2) not null default 1 check (servings > 0 and servings <= 20),
  kcal integer not null check (kcal >= 0 and kcal <= 10000),
  protein_g integer not null check (protein_g >= 0 and protein_g <= 1000),
  carbs_g integer not null check (carbs_g >= 0 and carbs_g <= 2000),
  fat_g integer not null check (fat_g >= 0 and fat_g <= 1000)
);

-- Every read is "this user, this day" or "this user, this month".
create index meal_logs_user_date_idx on public.meal_logs (user_id, log_date desc, logged_at desc);

alter table public.meal_logs enable row level security;

create policy "meal logs are readable by their owner"
  on public.meal_logs for select to authenticated using (auth.uid() = user_id);
create policy "meal logs are insertable by their owner"
  on public.meal_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "meal logs are updatable by their owner"
  on public.meal_logs for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meal logs are deletable by their owner"
  on public.meal_logs for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_totals
--
-- A view rather than a table kept up to date by triggers. A view cannot drift
-- from what it sums, and there is no insert path to forget to maintain.
--
-- `security_invoker = on` is the load-bearing word here. A Postgres view runs
-- with its *owner's* privileges by default, and the owner of this one is the
-- migration role — which RLS on `meal_logs` does not constrain. Ship it without
-- this and every athlete reads every other athlete's totals through a table
-- whose policies are perfect. The view is the hole, not the table.
--
-- `supabase/tests/rls.test.ts` asserts it, from the catalog, for every view that
-- ever exists.
-- ---------------------------------------------------------------------------

create view public.daily_totals with (security_invoker = on) as
  select
    user_id,
    log_date,
    sum(kcal)::integer      as kcal,
    sum(protein_g)::integer as protein_g,
    sum(carbs_g)::integer   as carbs_g,
    sum(fat_g)::integer     as fat_g,
    count(*)::integer       as entries
  from public.meal_logs
  group by user_id, log_date;

-- ---------------------------------------------------------------------------
-- RLS coverage, extended to views
--
-- `rls_coverage()` in 0001 reported tables only (`relkind = 'r'`). It would
-- never have looked at the view above — so the one object in this migration
-- that can leak is the one the guard could not see. This replaces it with a
-- version that reports both, and says for each view whether it runs as its
-- invoker.
--
-- Still metadata only: names and flags, no row of anyone's data, and still
-- revoked from everyone but the service role.
-- ---------------------------------------------------------------------------

drop function if exists public.rls_coverage();

create function public.rls_coverage()
returns table (
  object_name text,
  kind text,
  rls_enabled boolean,
  policy_count bigint,
  security_invoker boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.relname::text,
    case c.relkind when 'r' then 'table' else 'view' end,
    c.relrowsecurity,
    (select count(*) from pg_catalog.pg_policy p where p.polrelid = c.oid),
    case
      when c.relkind = 'v'
        -- `reloptions` carries `security_invoker=true` only when it was asked
        -- for. Absent means the default, and the default is the unsafe one.
        then coalesce(
          (select option_value = 'true'
             from pg_catalog.pg_options_to_table(c.reloptions)
            where option_name = 'security_invoker'),
          false
        )
      else null
    end
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'v')
  order by c.relname;
$$;

revoke all on function public.rls_coverage() from public;
revoke all on function public.rls_coverage() from anon;
revoke all on function public.rls_coverage() from authenticated;
grant execute on function public.rls_coverage() to service_role;
