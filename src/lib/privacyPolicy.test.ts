import { describe, expect, it } from 'vitest';

// `?raw` rather than `node:fs`: this file is compiled with the app, which has no
// Node types, and Vite hands the file over as a string either way.
import policy from '../../public/privacy.html?raw';
import { USER_TABLES } from './database.types';

/**
 * The privacy policy, checked against the schema it describes.
 *
 * A privacy policy goes wrong the same way a Content-Security-Policy does: not
 * with an error, but by quietly ceasing to be true. Someone adds a table, the
 * app starts storing something new, and the page that promises to list
 * everything now lists everything but one — which is worse than having no page,
 * because it is a specific false statement to a fourteen-year-old and their
 * parents.
 *
 * So every table an athlete's data lives in is named here with the words the
 * policy uses for it. Add a table and this fails until the policy is updated.
 */

/**
 * Whitespace collapsed, because the file is wrapped for reading and a phrase
 * that happens to straddle a line break is still a phrase the policy contains.
 */
const POLICY = policy.toLowerCase().replace(/\s+/g, ' ');

/** Each user-owned table, and a phrase the policy must use to describe it. */
const DESCRIBED: Record<string, string[]> = {
  profiles: ['height and weight', 'goal weight'],
  goals: ['calorie and protein targets'],
  user_food_prefs: ['foods you like'],
  user_allergens: ['allergies'],
  training_week: ['training schedule'],
  training_overrides: ['session and lift times'],
  meal_logs: ['meals you log', 'micronutrients'],
  plan_swaps: ['meal swaps'],
  plan_days: ['replanned days'],
  daily_metrics: ['weight, water and sleep'],
};

describe('the privacy policy', () => {
  it('accounts for every table an athlete has rows in', () => {
    // The assertion that actually bites: a new table with no entry above fails
    // here, before it can quietly make the policy false.
    expect(Object.keys(DESCRIBED).sort()).toEqual([...USER_TABLES].sort());
  });

  it('says out loud what each one holds', () => {
    for (const [table, phrases] of Object.entries(DESCRIBED)) {
      for (const phrase of phrases) {
        expect(POLICY, `${table}: "${phrase}"`).toContain(phrase);
      }
    }
  });

  it('names every third party the app actually reaches', () => {
    // Each of these is a real request the running app makes. Google Fonts is
    // the one most easily forgotten, because nobody chose it as a data
    // processor — it arrived with a typeface.
    for (const party of ['supabase', 'vercel', 'google fonts', 'open food facts']) {
      expect(POLICY, party).toContain(party);
    }
  });

  it('states the things the app deliberately does not do', () => {
    for (const claim of ['no advertising', 'no analytics', 'never sold', 'no photographs', 'no location']) {
      expect(POLICY, claim).toContain(claim);
    }
  });

  it('is honest that it has not been reviewed', () => {
    expect(POLICY).toContain('has not been reviewed by a lawyer');
  });

  it('says how to delete an account, since that is the request most people arrive with', () => {
    expect(POLICY).toContain('delete your account');
  });

  it('sets a floor of 13 and says what happens below it', () => {
    expect(POLICY).toContain('13 and over');
    expect(POLICY).toContain('under 13');
  });
});
