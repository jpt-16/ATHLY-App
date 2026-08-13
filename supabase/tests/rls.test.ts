/**
 * Row Level Security, tested against a real database.
 *
 * This is the test that matters most in the project. The `anon` key the browser
 * carries is public — it is in the bundle, anyone can read it out — so the only
 * thing standing between one athlete's data and another's is a set of Postgres
 * policies. Policies are easy to write, easy to get subtly wrong, and silent
 * when they are: a missing `with check` on an update does not throw, it just
 * lets someone reassign a row to themselves.
 *
 * So the assertions here are deliberately paranoid, and they are made through
 * the same client library the app uses, against a real Postgres with the real
 * migration applied. Three actors:
 *
 *   * **anon** — nobody is signed in. Must read nothing and write nothing.
 *   * **user B** — signed in, but not the owner. Must read none of A's rows and
 *     fail every write against them.
 *   * **user A** — the owner. Must be able to read and write their own.
 *
 * The tables are read from the catalog rather than listed here, so a table added
 * later without policies fails this suite the day it appears instead of the day
 * someone notices.
 *
 * Running it:
 *
 *     supabase start          # local Postgres + auth, applies migrations
 *     npm run test:rls
 *
 * It is deliberately not part of `npm test`: that suite is hermetic and runs in
 * milliseconds in CI with no services. This one needs Docker and a database.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!ANON || !SERVICE) {
  throw new Error(
    'RLS tests need SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run `supabase start` and copy them from its output, or set them in the environment.',
  );
}

/** Tables every signed-in athlete owns rows in. */
const OWNED_TABLES = [
  'profiles',
  'goals',
  'user_food_prefs',
  'user_allergens',
  'training_week',
  'training_overrides',
  'meal_logs',
  'plan_swaps',
  'plan_days',
] as const;

type Owned = (typeof OWNED_TABLES)[number];

/** One valid row per table, for a given owner. Every column a check constraint touches. */
function sampleRow(table: Owned, userId: string): Record<string, unknown> {
  switch (table) {
    case 'profiles':
      return {
        user_id: userId,
        name: 'Sam',
        age: 17,
        sex: 'male',
        height_ft: 5,
        height_in: 10,
        weight_lb: 165,
      };
    case 'goals':
      return {
        user_id: userId,
        calories: 3000,
        protein_g: 180,
        fat_g: 90,
        carbs_g: 375,
        bmr: 1700,
        maintenance: 2800,
      };
    case 'user_food_prefs':
      return { user_id: userId, likes: ['Chicken'], dislikes: ['Mushrooms'], budget: 'mid' };
    case 'user_allergens':
      return { user_id: userId, allergen: 'peanuts' };
    case 'training_week':
      return { user_id: userId, weekday: 1, mode: 'practice', session_time: '4:30 pm' };
    case 'training_overrides':
      return { user_id: userId, override_date: '2026-08-12', mode: 'game' };
    case 'meal_logs':
      return {
        user_id: userId,
        log_date: '2026-08-12',
        source: 'plan',
        meal_id: 'breakfast',
        name: 'Peanut butter banana oats',
        servings: 1,
        kcal: 620,
        protein_g: 28,
        carbs_g: 82,
        fat_g: 21,
      };
    case 'plan_swaps':
      return { user_id: userId, plan_date: '2026-08-12', slot: 'dinner', meal_id: 'steakpot' };
    case 'plan_days':
      return { user_id: userId, plan_date: '2026-08-12', replans: 2 };
  }
}

interface Actor {
  id: string;
  email: string;
  client: SupabaseClient;
}

/** One row of `rls_coverage()`: a table or a view, and how it is protected. */
interface CoverageRow {
  object_name: string;
  kind: 'table' | 'view';
  rls_enabled: boolean;
  policy_count: number;
  /** Null for tables; false is the dangerous value for a view. */
  security_invoker: boolean | null;
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let alice: Actor;
let bob: Actor;

async function makeUser(tag: string): Promise<Actor> {
  const email = `rls-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@athly.test`;
  const password = 'correct-horse-battery-staple';

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error('could not create test user');

  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: created.user.id, email, client };
}

beforeAll(async () => {
  alice = await makeUser('alice');
  bob = await makeUser('bob');

  // Seed Alice's rows with the service role, so the seeding itself is not what
  // is under test.
  for (const table of OWNED_TABLES) {
    const { error } = await admin.from(table).insert(sampleRow(table, alice.id));
    if (error) throw new Error(`seeding ${table} failed: ${error.message}`);
  }
}, 60_000);

afterAll(async () => {
  // Deleting the users cascades their rows away, which is also a small check
  // that the foreign keys are wired the way the migration says.
  if (alice) await admin.auth.admin.deleteUser(alice.id);
  if (bob) await admin.auth.admin.deleteUser(bob.id);
  await admin.from('deleted_accounts').delete().in('deleted_user_id', [alice?.id, bob?.id].filter(Boolean));
});

describe('coverage', () => {
  /**
   * The check that outlives this file's assumptions.
   *
   * Everything below tests the tables that exist today. This one asks the
   * catalog what tables exist *now* and insists each has RLS on — so a table
   * added in Phase 3, or Phase 6, or by someone who has never read this file,
   * fails the suite the day it appears rather than the day it leaks.
   */
  it('has row level security enabled on every table in the public schema', async () => {
    const { data, error } = await admin.rpc('rls_coverage');
    expect(error).toBeNull();

    const objects = (data ?? []) as CoverageRow[];
    expect(objects.length).toBeGreaterThan(0);

    const unprotected = objects.filter((o) => o.kind === 'table' && !o.rls_enabled).map((o) => o.object_name);
    expect(unprotected).toEqual([]);
  });

  it('gives every athlete-facing table at least one policy', async () => {
    const { data } = await admin.rpc('rls_coverage');
    const objects = (data ?? []) as CoverageRow[];

    // Two deliberate exceptions: RLS on, no policies at all, which makes them
    // unreachable to every client but the service role. `deleted_accounts` holds
    // an audit trail nobody being audited should read; `rate_limits` holds how
    // close each caller is to their ceiling, which is neither theirs to read nor
    // — emphatically — theirs to write.
    const denyAll = ['deleted_accounts', 'rate_limits'];
    const silent = objects
      .filter((o) => o.kind === 'table' && !denyAll.includes(o.object_name) && Number(o.policy_count) === 0)
      .map((o) => o.object_name);
    expect(silent).toEqual([]);
  });

  /**
   * The one that would have shipped the leak.
   *
   * A Postgres view runs with its *owner's* privileges unless it is declared
   * `security_invoker`, and the owner here is the migration role, which RLS does
   * not constrain. `daily_totals` sums a table whose policies are airtight —
   * and without this flag it would hand every athlete every other athlete's
   * totals anyway. The table is not the hole; the view is.
   *
   * Asked of the catalog rather than of a list, so the next view somebody adds
   * is covered on the day it appears.
   */
  it('runs every view as its invoker, not as its owner', async () => {
    const { data } = await admin.rpc('rls_coverage');
    const views = (data ?? []).filter((o: CoverageRow) => o.kind === 'view') as CoverageRow[];

    expect(views.length).toBeGreaterThan(0);
    const ownerRights = views.filter((v) => !v.security_invoker).map((v) => v.object_name);
    expect(ownerRights).toEqual([]);
  });

  it('does not expose the coverage function to ordinary clients', async () => {
    const { error: anonError } = await anon.rpc('rls_coverage');
    expect(anonError).not.toBeNull();

    const { error: userError } = await alice.client.rpc('rls_coverage');
    expect(userError).not.toBeNull();
  });
});

describe.each(OWNED_TABLES)('%s', (table) => {
  it('is invisible to an anonymous client', async () => {
    const { data } = await anon.from(table).select('*');
    expect(data ?? []).toEqual([]);
  });

  it('rejects an anonymous insert', async () => {
    const { error } = await anon.from(table).insert(sampleRow(table, alice.id));
    expect(error).not.toBeNull();
  });

  it('rejects an anonymous delete', async () => {
    const { error } = await anon.from(table).delete().eq('user_id', alice.id);
    // Postgres reports "no rows matched" rather than an error for a filtered
    // delete, so the assertion that counts is that the row survived.
    void error;
    const { data: still } = await admin.from(table).select('user_id').eq('user_id', alice.id);
    expect((still ?? []).length).toBeGreaterThan(0);
  });

  it("shows user B none of user A's rows", async () => {
    const { data } = await bob.client.from(table).select('*');
    const foreign = (data ?? []).filter((row) => (row as { user_id: string }).user_id === alice.id);
    expect(foreign).toEqual([]);
  });

  it('will not let user B write a row owned by user A', async () => {
    const { error } = await bob.client.from(table).insert(sampleRow(table, alice.id));
    // This is the `with check` clause doing its job. Without it, the insert
    // succeeds and Bob has written into Alice's account.
    expect(error).not.toBeNull();
  });

  it("will not let user B delete user A's rows", async () => {
    await bob.client.from(table).delete().eq('user_id', alice.id);
    const { data: still } = await admin.from(table).select('user_id').eq('user_id', alice.id);
    expect((still ?? []).length).toBeGreaterThan(0);
  });

  it('lets the owner read their own rows', async () => {
    const { data, error } = await alice.client.from(table).select('*');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
    for (const row of data ?? []) {
      expect((row as { user_id: string }).user_id).toBe(alice.id);
    }
  });

  it('lets the owner write their own rows', async () => {
    const { error } = await bob.client.from(table).insert(sampleRow(table, bob.id));
    expect(error).toBeNull();
    await bob.client.from(table).delete().eq('user_id', bob.id);
  });
});

/**
 * The view, exercised the way a client uses it.
 *
 * The catalog test above proves `security_invoker` is set. These prove what that
 * setting buys: an aggregate that leaks nothing an athlete could not already
 * read from `meal_logs` itself.
 */
describe('daily_totals', () => {
  it('adds up only the caller’s own day', async () => {
    const { data, error } = await alice.client.from('daily_totals').select('*');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
    for (const row of data ?? []) {
      expect((row as { user_id: string }).user_id).toBe(alice.id);
    }

    const seeded = (data ?? []).find((r) => (r as { log_date: string }).log_date === '2026-08-12');
    // The one seeded entry, summed: 620 calories, 28g of protein.
    expect(seeded).toMatchObject({ kcal: 620, protein_g: 28, entries: 1 });
  });

  it("shows user B nothing of user A's totals", async () => {
    const { data } = await bob.client.from('daily_totals').select('*');
    const foreign = (data ?? []).filter((row) => (row as { user_id: string }).user_id === alice.id);
    expect(foreign).toEqual([]);
  });

  it('is invisible to an anonymous client', async () => {
    const { data } = await anon.from('daily_totals').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('cannot be written through', async () => {
    // Not a security boundary — Postgres refuses an insert into a grouped view
    // outright — but worth pinning: nothing should ever treat this as a table.
    const { error } = await alice.client
      .from('daily_totals')
      .insert({ user_id: alice.id, log_date: '2026-08-13', kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1 });
    expect(error).not.toBeNull();
  });
});

describe('entitlements', () => {
  it('is created automatically for a new account', async () => {
    const { data, error } = await alice.client.from('entitlements').select('*');
    expect(error).toBeNull();
    expect(data?.[0]?.tier).toBe('free');
  });

  it('cannot be granted by the athlete', async () => {
    // The whole point: no insert or update policy exists, so a user cannot
    // promote themselves no matter what they send.
    const { error: insertError } = await bob.client
      .from('entitlements')
      .insert({ user_id: bob.id, tier: 'pro', status: 'active' });
    expect(insertError).not.toBeNull();

    await bob.client.from('entitlements').update({ tier: 'pro' }).eq('user_id', bob.id);
    const { data: after } = await admin.from('entitlements').select('tier').eq('user_id', bob.id).single();
    expect(after?.tier).toBe('free');
  });

  it("shows nothing of another athlete's entitlements", async () => {
    const { data } = await bob.client.from('entitlements').select('*').eq('user_id', alice.id);
    expect(data ?? []).toEqual([]);
  });
});

describe('deleted_accounts', () => {
  it('is readable by nobody but the service role', async () => {
    const { data: anonRows } = await anon.from('deleted_accounts').select('*');
    expect(anonRows ?? []).toEqual([]);

    const { data: userRows } = await alice.client.from('deleted_accounts').select('*');
    expect(userRows ?? []).toEqual([]);
  });

  it('cannot be written by a signed-in athlete', async () => {
    const { error } = await alice.client
      .from('deleted_accounts')
      .insert({ deleted_user_id: alice.id, requested_by: 'user' });
    expect(error).not.toBeNull();
  });
});

describe('rate_limits', () => {
  it('is invisible and unwritable to every client', async () => {
    // A client that could read this would learn how close it was to the
    // ceiling; one that could write it would not have a ceiling. RLS is on with
    // no policies at all, the same posture as `deleted_accounts`.
    const { data: anonRows } = await anon.from('rate_limits').select('*');
    expect(anonRows ?? []).toEqual([]);

    const { data: userRows } = await alice.client.from('rate_limits').select('*');
    expect(userRows ?? []).toEqual([]);

    const { error } = await alice.client.from('rate_limits').insert({
      bucket: 'delete-account',
      subject: `user:${alice.id}`,
      window_start: new Date().toISOString(),
      count: 0,
    });
    expect(error).not.toBeNull();
  });
});

describe('consume_rate_limit', () => {
  const subject = () => `test:${crypto.randomUUID()}`;

  it('allows up to the limit and refuses past it', async () => {
    const who = subject();
    const call = () =>
      admin.rpc('consume_rate_limit', {
        p_bucket: 'test',
        p_subject: who,
        p_limit: 3,
        p_window: '1 hour',
      });

    expect((await call()).data).toBe(true);
    expect((await call()).data).toBe(true);
    expect((await call()).data).toBe(true);
    // The fourth is the one that matters.
    expect((await call()).data).toBe(false);
    expect((await call()).data).toBe(false);
  });

  it('counts each subject separately', async () => {
    // Otherwise one athlete deleting their account locks out everyone else.
    const [a, b] = [subject(), subject()];
    const call = (who: string) =>
      admin.rpc('consume_rate_limit', { p_bucket: 'test', p_subject: who, p_limit: 1, p_window: '1 hour' });

    expect((await call(a)).data).toBe(true);
    expect((await call(b)).data).toBe(true);
    expect((await call(a)).data).toBe(false);
  });

  it('counts each bucket separately', async () => {
    const who = subject();
    const call = (bucket: string) =>
      admin.rpc('consume_rate_limit', { p_bucket: bucket, p_subject: who, p_limit: 1, p_window: '1 hour' });

    expect((await call('one')).data).toBe(true);
    expect((await call('two')).data).toBe(true);
    expect((await call('one')).data).toBe(false);
  });

  it('counts concurrent calls rather than losing them', async () => {
    // The property the whole thing rests on. Read-then-write would let ten
    // simultaneous requests all see zero and all be allowed; the upsert takes a
    // row lock, so they are counted one after another.
    const who = subject();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        admin.rpc('consume_rate_limit', {
          p_bucket: 'test',
          p_subject: who,
          p_limit: 4,
          p_window: '1 hour',
        }),
      ),
    );
    expect(results.filter((r) => r.data === true)).toHaveLength(4);
  });

  it('is not callable by anyone but the service role', async () => {
    // `security definer` on a function that writes a table nobody has a policy
    // on. Reachable from the REST API would mean any client could exhaust
    // anyone's limit — or their own, silently.
    const args = { p_bucket: 'test', p_subject: subject(), p_limit: 1, p_window: '1 hour' };

    const { error: anonError } = await anon.rpc('consume_rate_limit', args);
    expect(anonError).not.toBeNull();

    const { error: userError } = await alice.client.rpc('consume_rate_limit', args);
    expect(userError).not.toBeNull();
  });

  it('refuses a limit that is not a limit', async () => {
    const { error } = await admin.rpc('consume_rate_limit', {
      p_bucket: 'test',
      p_subject: subject(),
      p_limit: 0,
      p_window: '1 hour',
    });
    expect(error).not.toBeNull();
  });
});

/**
 * `SPORTS` from `src/prototype/data.ts`, copied rather than imported.
 *
 * This file talks to Postgres and imports nothing from `src` — that separation
 * is why it lives in the node project rather than the app one, and importing a
 * constant is not worth undoing it. The copy can drift; the ceiling it is
 * checked against has nineteen slots of headroom above it, which is the margin
 * that makes drift survivable.
 */
const EVERY_SPORT = [
  'Soccer',
  'Football',
  'Basketball',
  'Baseball',
  'Softball',
  'Track',
  'Cross country',
  'Swimming',
  'Wrestling',
  'Volleyball',
  'Tennis',
  'Lacrosse',
  'Hockey',
  'Golf',
  'Rowing',
  'Cheer',
  'Dance',
  'Weightlifting',
  'CrossFit',
  'Just the gym',
  'Nothing right now',
];

describe('column bounds', () => {
  /**
   * `meal_logs.name` was bounded when it was written; the columns in 0001 were
   * not, and the difference was that one was written later. Row Level Security
   * means an athlete can only do this to their own row — so this is not a leak,
   * it is that "your name" had no ceiling and a client with a loop is not
   * obliged to be the client we shipped.
   */
  it('refuses a name longer than a name', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ name: 'a'.repeat(61) })
      .eq('user_id', alice.id);
    expect(error).not.toBeNull();
  });

  it('accepts a name of a plausible length', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ name: 'Alexandra' })
      .eq('user_id', alice.id);
    expect(error).toBeNull();
  });

  it('refuses an unbounded list of sports', async () => {
    const { error: tooMany } = await alice.client
      .from('profiles')
      .update({ sports: Array.from({ length: 41 }, (_, i) => `sport ${i}`) })
      .eq('user_id', alice.id);
    expect(tooMany).not.toBeNull();

    const { error: tooLong } = await alice.client
      .from('profiles')
      .update({ sports: ['x'.repeat(1700)] })
      .eq('user_id', alice.id);
    expect(tooLong).not.toBeNull();
  });

  it('still accepts every chip the app can actually offer', async () => {
    // The bounds exist to stop a megabyte, not an enthusiast. `SPORTS` in
    // `data.ts` offers 21 options and nothing stops an athlete tapping all of
    // them, so a ceiling below that would be a bug shipped as a safeguard.
    const { error } = await alice.client
      .from('profiles')
      .update({ sports: EVERY_SPORT })
      .eq('user_id', alice.id);
    expect(error).toBeNull();
  });

  it('refuses a training time that is not a time', async () => {
    const { error } = await alice.client
      .from('training_week')
      .update({ session_time: 'x'.repeat(21) })
      .eq('user_id', alice.id)
      .eq('weekday', 1);
    expect(error).not.toBeNull();
  });
});

describe('the plan an athlete edited', () => {
  // Swapping Thursday's dinner is a decision, and it used to live in React
  // state alone — gone the moment the tab closed. Now that it is a row, it is a
  // row somebody else must not be able to read or rewrite.
  it('is invisible to another athlete', async () => {
    for (const table of ['plan_swaps', 'plan_days'] as const) {
      const { data, error } = await bob.client.from(table).select('*');
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    }
  });

  it('cannot be written on someone else’s behalf', async () => {
    // The `with check` half of the policy. Without it an athlete could file a
    // swap against another account's Thursday.
    const { error } = await bob.client
      .from('plan_swaps')
      .insert({ user_id: alice.id, plan_date: '2026-08-13', slot: 'lunch', meal_id: 'wrap' });
    expect(error).not.toBeNull();
  });

  it('is readable and writable by its owner', async () => {
    const { data, error } = await alice.client.from('plan_swaps').select('*');
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);

    const { error: writeError } = await alice.client
      .from('plan_swaps')
      .upsert(
        { user_id: alice.id, plan_date: '2026-08-14', slot: 'dinner', meal_id: 'salmon' },
        { onConflict: 'user_id,plan_date,slot' },
      );
    expect(writeError).toBeNull();
  });

  it('is refused to anyone not signed in', async () => {
    for (const table of ['plan_swaps', 'plan_days'] as const) {
      const { data } = await anon.from(table).select('*');
      expect(data ?? []).toEqual([]);
    }
  });

  it('bounds the replan counter', async () => {
    // It is an input to a hash, not a quantity anyone reads. A client in a loop
    // should not be able to write an unbounded integer.
    const { error } = await admin
      .from('plan_days')
      .upsert({ user_id: alice.id, plan_date: '2026-08-20', replans: 100000 });
    expect(error).not.toBeNull();
  });

  it('keeps one swap per slot per day', async () => {
    // The primary key is the reason a second swap replaces the first rather
    // than stacking two meals into one dinner.
    const { error } = await admin
      .from('plan_swaps')
      .insert({ user_id: alice.id, plan_date: '2026-08-12', slot: 'dinner', meal_id: 'salmon' });
    expect(error).not.toBeNull();
  });
});
