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
  }
}

interface Actor {
  id: string;
  email: string;
  client: SupabaseClient;
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

    const tables = (data ?? []) as { table_name: string; rls_enabled: boolean; policy_count: number }[];
    expect(tables.length).toBeGreaterThan(0);

    const unprotected = tables.filter((t) => !t.rls_enabled).map((t) => t.table_name);
    expect(unprotected).toEqual([]);
  });

  it('gives every athlete-facing table at least one policy', async () => {
    const { data } = await admin.rpc('rls_coverage');
    const tables = (data ?? []) as { table_name: string; rls_enabled: boolean; policy_count: number }[];

    // `deleted_accounts` is the deliberate exception: RLS on, no policies at
    // all, which makes it unreachable to every client but the service role.
    const silent = tables
      .filter((t) => t.table_name !== 'deleted_accounts' && Number(t.policy_count) === 0)
      .map((t) => t.table_name);
    expect(silent).toEqual([]);
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
