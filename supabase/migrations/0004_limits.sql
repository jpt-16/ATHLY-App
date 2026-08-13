-- ATHLY — rate limiting, and bounds on the free text.
--
-- Two unrelated gaps found by an audit of what shipped in 0001–0003, kept in one
-- migration because both are the same kind of thing: a limit that was assumed
-- rather than enforced.

-- ---------------------------------------------------------------------------
-- 1. A counter something can actually be limited against
--
-- Edge Functions are stateless and there is no Redis here, so the only place two
-- requests can agree on how many there have been is the database.
--
-- Read what this does and does not cover. It limits functions *we* write. It
-- does not — cannot — limit Supabase Auth: `/auth/v1/token`, `/auth/v1/signup`
-- and the rest are GoTrue's own endpoints, reached with the public anon key and
-- never passing through our code. Their limits are project settings, and they
-- are listed as required configuration in `docs/PRODUCTION_READINESS.md`
-- precisely because nothing in this repository can assert them.
--
-- Fixed windows rather than a sliding log: an athlete at the boundary can spend
-- two windows' worth in quick succession, which for "delete my account twice a
-- minute" is not a threat worth a more expensive structure.
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  -- What is being limited ('delete-account'), and who ('user:<uuid>'). Prefixed
  -- rather than a bare uuid so an IP or an email hash can share the table later
  -- without the two being confusable.
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, subject, window_start)
);

-- RLS on with no policies at all: unreadable and unwritable by any user, in
-- either role. Deliberate, and the same posture as `deleted_accounts`. A client
-- that could read this would learn how close it was to the limit; one that could
-- write it would not have a limit.
alter table public.rate_limits enable row level security;

/**
 * Count one request, and say whether it is allowed.
 *
 * `security definer` so it can write a table no user has a policy on, and
 * revoked from every client role regardless — only the service role, which is to
 * say only an Edge Function, can call it.
 *
 * Atomic by construction: the upsert takes a row lock, so two requests arriving
 * together are counted twice rather than both reading the same number and both
 * being let through.
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seconds numeric := extract(epoch from p_window);
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or v_seconds <= 0 then
    raise exception 'consume_rate_limit: a limit of % per % is not a limit', p_limit, p_window;
  end if;

  -- Floor now() to the start of its window, so every caller in the same window
  -- lands on the same key without having to coordinate.
  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / v_seconds) * v_seconds);

  insert into public.rate_limits (bucket, subject, window_start, count)
  values (p_bucket, p_subject, v_window, 1)
  on conflict (bucket, subject, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Sweep this subject's expired windows on the way past. Cheap — it is an
  -- index scan on the primary key's leading columns — and it means the table
  -- cannot grow without bound just because nobody scheduled a cleanup job.
  delete from public.rate_limits
   where bucket = p_bucket
     and subject = p_subject
     and window_start < v_window - (p_window * 3);

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, interval) from public;
revoke all on function public.consume_rate_limit(text, text, integer, interval) from anon;
revoke all on function public.consume_rate_limit(text, text, integer, interval) from authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, interval) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Bounds on the free text
--
-- `meal_logs.name` was written with `check (length(name) between 1 and 200)`.
-- The columns in 0001 were not, and the difference is not principled — it is
-- that one was written later, after the thought had occurred.
--
-- Row Level Security means an athlete can only do this to their own row, so this
-- is not a leak and not a way to reach anyone else. It is that "your name" is a
-- `text` column with no ceiling, and a client with a loop can put a megabyte in
-- it. The database is the only place a bound holds, because the client that
-- would respect one is the client an attacker replaces.
--
-- Every table is empty today, so these apply to nothing retroactively. Any of
-- them would fail loudly against existing data rather than truncating it, which
-- is the right way round.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add constraint profiles_name_length
    check (name is null or length(name) between 1 and 60),
  -- Free text by design — an athlete's sport is not ours to constrain — but a
  -- list, and lists have lengths. `array_to_string` bounds the total because a
  -- CHECK constraint cannot contain the subquery that per-element would need.
  --
  -- Every ceiling here is set well clear of what the app can actually produce:
  -- `SPORTS` in `data.ts` offers 21 chips and `LOVE`/`HATE` offer 42 and 30, so
  -- a bound sized to "what seems reasonable" would reject an athlete who simply
  -- tapped a lot of them. These are meant to stop a megabyte, not to second-guess
  -- an enthusiast.
  add constraint profiles_sports_bounded
    check (cardinality(sports) <= 40 and length(array_to_string(sports, ',')) <= 1600);

alter table public.user_food_prefs
  add constraint food_prefs_likes_bounded
    check (cardinality(likes) <= 120 and length(array_to_string(likes, ',')) <= 5000),
  add constraint food_prefs_dislikes_bounded
    check (cardinality(dislikes) <= 120 and length(array_to_string(dislikes, ',')) <= 5000),
  -- Chip selections, all three of them. Nothing an athlete types reaches these.
  add constraint food_prefs_short_fields
    check (
      (cook_level is null or length(cook_level) <= 40)
      and (budget is null or length(budget) <= 40)
      and (weekday_minutes is null or length(weekday_minutes) <= 40)
    );

-- The training tables collect display strings from a picker ("4:30 pm"), which
-- the client composes rather than accepts. Bounded anyway, on the same reasoning
-- as everything above: the client is not where a bound holds.
alter table public.training_week
  add constraint training_week_short_fields
    check (
      length(session_time) <= 20 and length(lift_time) <= 20 and length(duration_minutes) <= 10
    );

alter table public.training_overrides
  add constraint training_overrides_short_fields
    check (
      length(session_time) <= 20 and length(lift_time) <= 20 and length(duration_minutes) <= 10
    );
