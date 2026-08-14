import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearOnboarding, readOnboarding, stashOnboarding } from './pendingOnboarding';
import type { PersistedState } from './profileRepo';

/**
 * The stash exists because creating an account leaves the page — to Google, or
 * into an email client and back through a link. If it ever fails quietly, an
 * athlete answers thirteen questions and lands in an app built on defaults, with
 * no error to explain it. Hence the expiry and the corruption cases below, which
 * are the ways "quietly" happens.
 */

const sample: PersistedState = {
  a: { likes: ['Chicken'], dislikes: [], allergies: ['Peanuts'], sports: ['Soccer'], name: 'Sam' },
  age: 17,
  ft: 5,
  inch: 10,
  lb: 165,
  goalLb: 180,
  rate: 0.75,
  week: {
    0: ['rest', '', '', ''],
    1: ['practice', '4:30 pm', '', '90'],
    2: ['rest', '', '', ''],
    3: ['practice', '4:30 pm', '', '90'],
    4: ['rest', '', '', ''],
    5: ['rest', '', '', ''],
    6: ['game', '11:00 am', '', ''],
  },
  overrides: {},
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('pending onboarding', () => {
  it('returns nothing when none was parked', () => {
    expect(readOnboarding()).toBeNull();
  });

  it('round-trips the answers', () => {
    stashOnboarding(sample);
    expect(readOnboarding()).toEqual(sample);
  });

  it('forgets them once cleared', () => {
    stashOnboarding(sample);
    clearOnboarding();
    expect(readOnboarding()).toBeNull();
  });

  it('expires after a day, and cleans up after itself', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T09:00:00Z'));
    stashOnboarding(sample);

    vi.setSystemTime(new Date('2026-08-12T08:59:00Z'));
    expect(readOnboarding()).toEqual(sample);

    vi.setSystemTime(new Date('2026-08-12T09:01:00Z'));
    expect(readOnboarding()).toBeNull();
    // Not merely reported as absent — actually removed, so stale answers do not
    // sit in a shared browser.
    expect(window.localStorage.getItem('athly.pendingOnboarding')).toBeNull();
  });

  it('drops a corrupt stash rather than reasoning about it', () => {
    window.localStorage.setItem('athly.pendingOnboarding', '{not json');
    expect(readOnboarding()).toBeNull();
    expect(window.localStorage.getItem('athly.pendingOnboarding')).toBeNull();
  });

  it('drops a stash written by an older shape', () => {
    window.localStorage.setItem('athly.pendingOnboarding', JSON.stringify({ answers: sample }));
    expect(readOnboarding()).toBeNull();
  });

  it('fills in a week that is missing days', () => {
    // This comes back out of storage the athlete can edit, and may have been
    // written by an older version of the app. `renderVals` destructures
    // `week[wd]` for all seven days, so a gap crashes the render — and a week
    // with fewer training days in it silently lowers their calorie target.
    window.localStorage.setItem(
      'athly.pendingOnboarding',
      JSON.stringify({ savedAt: Date.now(), state: { ...sample, week: { 1: ['game', '', '', ''] } } }),
    );

    const week = readOnboarding()?.week ?? {};
    expect(Object.keys(week)).toHaveLength(7);
    expect(week[1]).toEqual(['game', '', '', '']);
    expect(week[5]).toEqual(['rest', '', '', '']);
  });

  it('survives storage that throws', () => {
    // Safari in private mode, and some embedded browsers. The answers are not
    // parked; nothing crashes.
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => stashOnboarding(sample)).not.toThrow();
    spy.mockRestore();
  });
});
