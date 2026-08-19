-- ATHLY — weight, water and sleep.
--
-- Three things an athlete records about their body rather than their food, and
-- one table for all of them. They share a shape: at most one value per person
-- per calendar day, all optional, none of them meaningful without the date.
-- Three tables would have been three sets of policies, three repositories and
-- three round trips to draw one screen.
--
-- Weight is the odd one — it is a time series that happens to be sampled daily
-- rather than a daily total. It still belongs here: nobody weighs themselves
-- twice in a morning and means both, and the chart wants exactly one point per
-- day. `null` means not recorded, which is different from zero for every column
-- in this table and is why none of them are `not null`.
--
-- Row Level Security as everywhere else: `user_id`, four policies, `with check`
-- on every write. See `0001_init.sql`.

create table public.daily_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The athlete's own calendar day, computed on the client. Same reasoning as
  -- `meal_logs.log_date`: a timestamp cast to UTC moves an evening weigh-in to
  -- tomorrow for anyone west of Greenwich.
  log_date date not null,

  -- Pounds, to one decimal, which is what a bathroom scale shows. Bounds are a
  -- sanity check against a tampered client rather than a judgement about any
  -- particular athlete.
  weight_lb numeric(5, 1) check (weight_lb is null or (weight_lb >= 40 and weight_lb <= 700)),

  -- Millilitres, so the unit is the same everywhere and the display converts.
  -- 12 litres is far past what anyone drinks in a day and well past where
  -- drinking more becomes dangerous.
  water_ml integer check (water_ml is null or (water_ml >= 0 and water_ml <= 12000)),

  -- Minutes. Stored rather than a start and end time: the app asks how long
  -- they slept, not when, and inventing a bedtime to store a duration would be
  -- recording something nobody said.
  sleep_minutes integer check (sleep_minutes is null or (sleep_minutes >= 0 and sleep_minutes <= 1440)),

  updated_at timestamptz not null default now(),

  -- One row per athlete per day, enforced rather than assumed: the client
  -- upserts on this key, and without it a slow network turns one weigh-in into
  -- two points on the chart.
  primary key (user_id, log_date)
);

-- Every read is a window: "this user, the last N days", newest first.
create index daily_metrics_user_date_idx on public.daily_metrics (user_id, log_date desc);

alter table public.daily_metrics enable row level security;

create policy "daily metrics are readable by their owner"
  on public.daily_metrics for select to authenticated using (auth.uid() = user_id);
create policy "daily metrics are insertable by their owner"
  on public.daily_metrics for insert to authenticated with check (auth.uid() = user_id);
create policy "daily metrics are updatable by their owner"
  on public.daily_metrics for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily metrics are deletable by their owner"
  on public.daily_metrics for delete to authenticated using (auth.uid() = user_id);
