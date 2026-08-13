-- ATHLY — the plan an athlete edited, rather than the one we generated.
--
-- The planner is a pure function: given the training week, the constraints and
-- the date, it produces the same day every time. That is a good property and it
-- is why nothing about the generated plan needs storing — it can always be
-- recomputed.
--
-- What cannot be recomputed is what the athlete did to it. Swapping Thursday's
-- dinner is a decision, and until this migration it lived in React state and
-- nowhere else: it survived until the tab was closed and not one second longer.
-- An athlete who planned their week on Sunday opened the app on Monday to find
-- the app had quietly changed its mind back.
--
-- Everything in `0001_init.sql` about Row Level Security applies unchanged —
-- `user_id`, four policies, `with check` on every write.

-- ---------------------------------------------------------------------------
-- plan_swaps — "I want this meal in this slot on this day"
-- ---------------------------------------------------------------------------

create table public.plan_swaps (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The athlete's own calendar day, computed client-side, for the same reason
  -- `meal_logs.log_date` is: see the note there.
  plan_date date not null,
  -- The slot family, e.g. 'dinner' — not the meal that was replaced. A replan
  -- may pick something different for that slot, and the athlete's choice is
  -- about the position in the day, not about the meal it displaced.
  slot text not null check (length(slot) between 1 and 40),
  -- Recipes live in the client bundle today and in a table later, so this is
  -- deliberately not a foreign key. An unknown id is re-checked against the
  -- allergen filter on read and ignored if it no longer resolves.
  meal_id text not null check (length(meal_id) between 1 and 80),
  primary key (user_id, plan_date, slot)
);

-- Every read is "this user, this week".
create index plan_swaps_user_date_idx on public.plan_swaps (user_id, plan_date);

alter table public.plan_swaps enable row level security;

create policy "plan swaps are readable by their owner"
  on public.plan_swaps for select to authenticated using (auth.uid() = user_id);
create policy "plan swaps are insertable by their owner"
  on public.plan_swaps for insert to authenticated with check (auth.uid() = user_id);
create policy "plan swaps are updatable by their owner"
  on public.plan_swaps for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan swaps are deletable by their owner"
  on public.plan_swaps for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- plan_days — "not that day, deal me another"
-- ---------------------------------------------------------------------------
--
-- A counter, not a plan. It joins the planner's rotation seed, so the same
-- number always reproduces the same day: storing the count is enough to bring
-- back exactly the day the athlete was looking at, without storing the day.

create table public.plan_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  -- Bounded because it is an input to a hash, not a quantity anyone reads. A
  -- client in a loop should not be able to write an unbounded integer.
  replans integer not null default 0 check (replans >= 0 and replans <= 1000),
  primary key (user_id, plan_date)
);

alter table public.plan_days enable row level security;

create policy "plan days are readable by their owner"
  on public.plan_days for select to authenticated using (auth.uid() = user_id);
create policy "plan days are insertable by their owner"
  on public.plan_days for insert to authenticated with check (auth.uid() = user_id);
create policy "plan days are updatable by their owner"
  on public.plan_days for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan days are deletable by their owner"
  on public.plan_days for delete to authenticated using (auth.uid() = user_id);
