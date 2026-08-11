import type { PersistedState } from './profileRepo';
import { withEveryWeekday } from './week';
import { isIsoDate } from '../lib/clock';
import type { IsoDate } from '../lib/clock';
import type { DaySpec } from '../prototype/types';

/**
 * Onboarding answers, parked across a page load.
 *
 * Both ways of creating an account leave the page. An OAuth sign-in navigates to
 * Google and back; an email sign-up sends a link that is often opened in a
 * different tab, sometimes hours later. Either way the React tree is torn down
 * and rebuilt, and thirteen questions' worth of answers go with it unless they
 * are written down somewhere first.
 *
 * `localStorage` rather than `sessionStorage` because the email-confirmation
 * link opens a new tab, and `sessionStorage` does not cross that boundary.
 *
 * What is stored is what the athlete just typed into this device: a first name,
 * a weight, some food preferences. It is written on their own machine, it is not
 * sent anywhere, and it is deleted the moment it reaches the database. It also
 * expires on its own, so an abandoned sign-up does not leave answers sitting in
 * a shared browser indefinitely.
 */

const KEY = 'athly.pendingOnboarding';
/** Long enough to read an email, short enough not to linger. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Stash {
  savedAt: number;
  state: PersistedState;
}

function storage(): Storage | null {
  try {
    // Safari in private mode has a `localStorage` that throws on write, and
    // some embedded browsers have none at all. Neither is worth a crash: the
    // answers are simply not parked, and the athlete re-enters them.
    const s = window.localStorage;
    const probe = '__athly_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function stashOnboarding(state: PersistedState): void {
  const s = storage();
  if (!s) return;
  try {
    const stash: Stash = { savedAt: Date.now(), state };
    s.setItem(KEY, JSON.stringify(stash));
  } catch {
    // Quota, most likely. Nothing to do and nothing worth telling anyone.
  }
}

export function readOnboarding(): PersistedState | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(KEY);
  if (!raw) return null;
  try {
    const stash = JSON.parse(raw) as Stash;
    if (!stash?.state || typeof stash.savedAt !== 'number') return null;
    if (Date.now() - stash.savedAt > MAX_AGE_MS) {
      clearOnboarding();
      return null;
    }
    // This came out of storage the athlete can edit, and may have been written
    // by an older version of the app. A week missing a day crashes the render.
    return {
      ...stash.state,
      week: withEveryWeekday(stash.state.week),
      // Overrides were keyed by day-of-month before the app knew what day it
      // was. A `12` reaching the calendar becomes `Invalid Date`, so anything
      // that is not a real date is dropped rather than guessed at — it costs a
      // training-day tweak, not the thirteen answers this stash exists for.
      overrides: onlyDatedOverrides(stash.state.overrides),
    };
  } catch {
    // Corrupt or from an older shape. Drop it rather than reason about it.
    clearOnboarding();
    return null;
  }
}

function onlyDatedOverrides(overrides: unknown): Record<IsoDate, DaySpec> {
  if (!overrides || typeof overrides !== 'object') return {};
  const out: Record<IsoDate, DaySpec> = {};
  for (const [key, spec] of Object.entries(overrides as Record<string, DaySpec>)) {
    if (isIsoDate(key) && Array.isArray(spec)) out[key] = spec;
  }
  return out;
}

export function clearOnboarding(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* see above */
  }
}
