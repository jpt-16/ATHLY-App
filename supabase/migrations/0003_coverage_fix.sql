-- Two corrections to 0002, both found by running it against a real Postgres.
--
-- The lesson in both is the same one: a guard that reports the wrong answer is
-- worse than no guard, because people learn to talk themselves past it.

-- ---------------------------------------------------------------------------
-- 1. `rls_coverage()` reported a correctly-secured view as insecure
--
-- `create view … with (security_invoker = on)` is stored in `pg_class.reloptions`
-- as the literal string it was written with — `security_invoker=on`, not
-- `=true`. 0002 compared against `'true'`, so `daily_totals` — which *is*
-- correct, and has been since it was created — came back as running with owner
-- rights, and `supabase/tests/rls.test.ts` would have failed on it.
--
-- A false alarm on the one security check nobody can eyeball is how the check
-- gets ignored, and then the real one is missed. Postgres accepts any of
-- true/on/1/yes for a boolean reloption, so all of them are matched here.
-- ---------------------------------------------------------------------------

create or replace function public.rls_coverage()
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
        -- Absent still means the default, and the default is still the unsafe
        -- one. Only the spelling of "present and true" has been widened.
        then coalesce(
          (select lower(option_value) in ('true', 'on', '1', 'yes')
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

-- ---------------------------------------------------------------------------
-- 2. `handle_new_user()` was reachable over the REST API
--
-- It is a trigger function — it exists to grant a free entitlement when a row
-- lands in `auth.users`, and it is `security definer` precisely so it can write
-- a table the athlete has no insert policy on.
--
-- But a function in the `public` schema is published by PostgREST, so it was
-- callable as `/rest/v1/rpc/handle_new_user` by anyone, signed in or not. In
-- practice the call fails — a trigger function has no `new` record outside a
-- trigger, so it errors rather than granting anything — which makes this a
-- warning rather than a hole. It is still a `security definer` function exposed
-- to the internet for no reason, and the fix is one line.
--
-- The trigger itself is unaffected: triggers execute the function as the table
-- owner and do not consult these grants.
-- ---------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- `touch_updated_at()` is the same shape of exposure and gets the same
-- treatment, though it is `security invoker` and so was never privileged.
revoke all on function public.touch_updated_at() from public;
revoke all on function public.touch_updated_at() from anon;
revoke all on function public.touch_updated_at() from authenticated;
