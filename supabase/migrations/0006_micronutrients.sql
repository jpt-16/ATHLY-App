-- ATHLY — micronutrients on the log, and the end of the protein override.
--
-- Two changes, both following from the same decision: nutrition is computed
-- from an ingredient table now (`src/prototype/nutrients.ts`) rather than typed
-- per meal, so the app has eight more numbers about every meal than it did and
-- one fewer question to ask the athlete.

-- ---------------------------------------------------------------------------
-- 1. Eight more columns on meal_logs
-- ---------------------------------------------------------------------------
--
-- Copied onto the row like the macros above them, and for the same reason: a log
-- is a record of what happened. When the FoodData Central ingest revises an
-- ingredient, last Tuesday must not quietly become a different Tuesday.
--
-- Every column is nullable. Rows written before this migration have no
-- micronutrient data and never will — inventing a value for them would be worse
-- than the gap, because a fabricated iron figure is indistinguishable from a
-- measured one once it is in the table. `daily_totals` sums them as zero, which
-- is what "we don't know" has to look like in a sum.
--
-- Bounds are generous ceilings meant to stop a tampered client writing nonsense,
-- not to second-guess a large meal. They mirror `0002_logs.sql`.

alter table public.meal_logs
  add column fiber_g integer check (fiber_g is null or (fiber_g >= 0 and fiber_g <= 500)),
  add column sugar_g integer check (sugar_g is null or (sugar_g >= 0 and sugar_g <= 1000)),
  add column sodium_mg integer check (sodium_mg is null or (sodium_mg >= 0 and sodium_mg <= 100000)),
  add column potassium_mg integer check (potassium_mg is null or (potassium_mg >= 0 and potassium_mg <= 50000)),
  add column calcium_mg integer check (calcium_mg is null or (calcium_mg >= 0 and calcium_mg <= 50000)),
  -- Iron and vitamin D land in single digits, where whole numbers would throw
  -- away most of the signal.
  add column iron_mg numeric(6, 2) check (iron_mg is null or (iron_mg >= 0 and iron_mg <= 1000)),
  add column vitamin_c_mg integer check (vitamin_c_mg is null or (vitamin_c_mg >= 0 and vitamin_c_mg <= 20000)),
  add column vitamin_d_mcg numeric(6, 2) check (vitamin_d_mcg is null or (vitamin_d_mcg >= 0 and vitamin_d_mcg <= 1000));

-- ---------------------------------------------------------------------------
-- 2. daily_totals learns to add them up
-- ---------------------------------------------------------------------------
--
-- Replaced rather than altered, because a view's column list cannot be extended
-- in place. `security_invoker = on` is restated deliberately: a view defaults to
-- running with its *owner's* rights, and this one would otherwise hand every
-- athlete every other athlete's totals through a table whose policies are
-- perfect. `rls_coverage()` reports the flag, and `supabase/tests/rls.test.ts`
-- fails if it is ever dropped.

drop view if exists public.daily_totals;

create view public.daily_totals
with (security_invoker = on) as
select
  user_id,
  log_date,
  sum(kcal)::integer as kcal,
  sum(protein_g)::integer as protein_g,
  sum(carbs_g)::integer as carbs_g,
  sum(fat_g)::integer as fat_g,
  -- `coalesce` inside the sum, not around it: a day mixing pre-migration rows
  -- with new ones should total the part it knows rather than collapsing to null.
  sum(coalesce(fiber_g, 0))::integer as fiber_g,
  sum(coalesce(sugar_g, 0))::integer as sugar_g,
  sum(coalesce(sodium_mg, 0))::integer as sodium_mg,
  sum(coalesce(potassium_mg, 0))::integer as potassium_mg,
  sum(coalesce(calcium_mg, 0))::integer as calcium_mg,
  sum(coalesce(iron_mg, 0))::numeric(8, 2) as iron_mg,
  sum(coalesce(vitamin_c_mg, 0))::integer as vitamin_c_mg,
  sum(coalesce(vitamin_d_mcg, 0))::numeric(8, 2) as vitamin_d_mcg,
  count(*)::integer as entries
from public.meal_logs
group by user_id, log_date;

-- ---------------------------------------------------------------------------
-- 3. The protein override is gone
-- ---------------------------------------------------------------------------
--
-- Protein is derived from the athlete's goal weight and nothing else. The two
-- columns let someone type a number that silently contradicted every other
-- figure on the screen, and the app no longer writes them.
--
-- Dropped rather than left behind: a column nothing writes and nothing reads is
-- a trap for the next person, who will reasonably assume it means something.
-- Nobody has an account yet, so nothing is lost.

alter table public.profiles
  drop column if exists protein_mode,
  drop column if exists protein_custom_g;

drop type if exists public.protein_mode;
