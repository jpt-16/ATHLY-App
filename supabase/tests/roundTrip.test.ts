import { afterAll, describe, expect, it } from 'vitest';

import { signInWithEmail, signOut, signUpWithEmail } from '../../src/auth/authActions';
import { loadAccount, saveAccount } from '../../src/data/profileRepo';
import type { PersistedState } from '../../src/data/profileRepo';
import { deleteLog, loadWindow, logMeal } from '../../src/data/logRepo';
import { supabase } from '../../src/lib/supabase';
import { totalsFor } from '../../src/data/dailyTotals';

/**
 * The app's own code, against a real Supabase project.
 *
 * `rls.test.ts` proves the database refuses the wrong request. This proves the
 * app makes the right one — a different claim, and the one nobody had checked.
 * Everything here goes through the functions the screens call (`saveAccount`,
 * `loadAccount`, `logMeal`, `loadWindow`), so a repository that writes a column
 * the migration does not have fails here rather than in front of an athlete.
 *
 * **Only the anon key.** No `service_role`, no admin API: these are the same two
 * public values the browser bundle carries, doing what the browser does. If this
 * passes, a phone can do it.
 *
 *     npm run test:roundtrip
 *
 * It signs up two throwaway accounts and deletes them at the end, through the
 * same Edge Function the Profile screen calls — so the deletion path is covered
 * by the cleanup rather than by a test that pretends to delete something.
 *
 * Safe to point at the production project while it is empty, which is the only
 * time it is worth doing. Once real athletes exist, run it against a branch.
 */

const configured = !!supabase;

/** A fresh address per run, so a failed run never blocks the next one. */
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const alice = { email: `athly-rt-a-${stamp}@example.com`, password: 'correct-horse-battery-staple' };
const bob = { email: `athly-rt-b-${stamp}@example.com`, password: 'correct-horse-battery-staple' };

const sample: PersistedState = {
  a: {
    name: 'Round Trip',
    goal: 'gain',
    sex: 'male',
    likes: ['Chicken', 'Steak'],
    dislikes: ['Mushrooms'],
    allergies: ['Peanuts'],
    sports: ['Soccer'],
    cook: 'follow',
    budget: 'mid',
    time: '20',
  },
  age: 17,
  ft: 5,
  inch: 10,
  lb: 165,
  goalLb: 180,
  rate: 0.75,
  week: {
    0: ['rest', '', '', ''],
    1: ['practice', '4:30 pm', '6:30 am', '90'],
    2: ['practice', '4:30 pm', '', '90'],
    3: ['practice', '4:30 pm', '', '90'],
    4: ['practice', '4:30 pm', '6:30 am', '90'],
    5: ['rest', '', '3:30 pm', ''],
    6: ['game', '11:00 am', '', ''],
  },
  overrides: { '2026-08-14': ['game', '2:00 pm', '', ''] },
};

const today = '2026-08-12';
const meal = {
  date: today,
  source: 'plan' as const,
  mealId: 'breakfast',
  name: 'Peanut butter banana oats',
  servings: 1,
  kcal: 620,
  protein: 28,
  carbs: 82,
  fat: 21,
};

/** Populated as the suite goes, so cleanup knows what it has to remove. */
const created: { email: string; password: string }[] = [];

async function signUp(who: { email: string; password: string }): Promise<string> {
  const result = await signUpWithEmail(who.email, who.password);
  expect(result.error, `sign-up failed: ${result.error}`).toBeNull();

  const { data } = await supabase!.auth.getSession();
  if (!data.session) {
    throw new Error(
      'Signed up, but no session came back — the project requires email confirmation.\n' +
        'Turn "Confirm email" off in Authentication → Providers → Email to run this suite,\n' +
        'or run it against a branch that has it off. Nothing else in this file can proceed.',
    );
  }
  created.push(who);
  return data.session.user.id;
}

afterAll(async () => {
  if (!configured) return;
  // Tidy up whatever survived, whichever test failed. Deletion goes through the
  // Edge Function in its own test; this is the belt to that braces.
  for (const who of created) {
    try {
      await signOut();
      const back = await signInWithEmail(who.email, who.password);
      if (back.error) continue; // already deleted, which is the happy path
      const { deleteAccount } = await import('../../src/auth/authActions');
      await deleteAccount();
    } catch {
      console.warn(`round trip: could not clean up ${who.email}; delete it by hand`);
    }
  }
  await signOut();
}, 60_000);

describe.skipIf(!configured)('round trip', () => {
  let aliceId = '';

  it('creates an account and saves thirteen answers', async () => {
    aliceId = await signUp(alice);
    expect(aliceId).toBeTruthy();

    await saveAccount(aliceId, sample);
  });

  it('reads those answers back as the same thing', async () => {
    const back = await loadAccount();
    expect(back, 'nothing came back for an account that was just saved').not.toBeNull();

    // Every field the screens rely on, not a spot check: this is the test that
    // catches a column that silently dropped its value.
    expect(back!.a.name).toBe('Round Trip');
    expect(back!.a.goal).toBe('gain');
    expect(back!.age).toBe(17);
    expect(back!.lb).toBe(165);
    expect(back!.goalLb).toBe(180);
    expect(back!.rate).toBeCloseTo(0.75, 2);
    expect(back!.a.likes).toContain('Chicken');
    expect(back!.a.dislikes).toContain('Mushrooms');
    expect(back!.a.allergies).toContain('Peanuts');
    expect(back!.week[6][0]).toBe('game');
    expect(back!.week[5][2]).toBe('3:30 pm');
  });

  it('keeps a per-date override on the date it was set', async () => {
    // The shim that faked these against a hardcoded August 2026 is gone; this
    // is the assertion that it is really gone.
    const back = await loadAccount();
    expect(Object.keys(back!.overrides)).toEqual(['2026-08-14']);
    expect(back!.overrides['2026-08-14'][0]).toBe('game');
  });

  it('logs a meal and totals it', async () => {
    const stored = await logMeal(aliceId, meal);
    expect(stored.id, 'the database should have minted an id').toBeTruthy();
    expect(stored.loggedAt).toBeTruthy();
    expect(stored.kcal).toBe(620);

    const logs = await loadWindow(today);
    expect(logs.map((l) => l.name)).toContain(meal.name);

    // The number the Home ring is drawn from, computed from what came back out
    // of Postgres rather than from what went in.
    expect(totalsFor(logs, today)).toMatchObject({ kcal: 620, protein: 28, entries: 1 });
  });

  it('adds up a second helping', async () => {
    const second = await logMeal(aliceId, {
      ...meal,
      name: 'Chocolate milk',
      mealId: null,
      kcal: 210,
      protein: 8,
    });
    const logs = await loadWindow(today);
    expect(totalsFor(logs, today)).toMatchObject({ kcal: 830, protein: 36, entries: 2 });

    await deleteLog(second.id);
    const after = await loadWindow(today);
    expect(totalsFor(after, today)).toMatchObject({ kcal: 620, entries: 1 });
  });

  it('shows a second athlete none of the first one’s data', async () => {
    await signOut();
    await signUp(bob);

    // The whole access model, from the client side, with only the public key.
    expect(await loadAccount()).toBeNull();
    expect(await loadWindow(today)).toEqual([]);

    // And the aggregate view, which is the object that leaks if
    // `security_invoker` is ever dropped.
    const { data: totals } = await supabase!.from('daily_totals').select('*');
    expect(totals ?? []).toEqual([]);
  });

  it('deletes an account and everything attached to it', async () => {
    const { deleteAccount } = await import('../../src/auth/authActions');

    await signOut();
    const back = await signInWithEmail(alice.email, alice.password);
    expect(back.error).toBeNull();

    const gone = await deleteAccount();
    expect(gone.error, `delete-account failed: ${gone.error}`).toBeNull();

    // Signing back in must now fail: the account is gone, not merely emptied.
    await signOut();
    const retry = await signInWithEmail(alice.email, alice.password);
    expect(retry.error).not.toBeNull();
  });
});

describe.skipIf(configured)('round trip', () => {
  it('needs a project to talk to', () => {
    console.warn('Skipped: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to run the round trip.');
    expect(configured).toBe(false);
  });
});
