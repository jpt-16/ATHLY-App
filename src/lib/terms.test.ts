import { describe, expect, it } from 'vitest';

import terms from '../../public/terms.html?raw';

/**
 * The terms, checked for the clauses this particular app cannot ship without.
 *
 * Not a review — a lawyer does that. These assert the handful of sentences that
 * exist because of what ATHLY *is*: nutrition guidance, aimed at minors,
 * carrying an allergy filter, produced by equations no dietitian has signed off.
 * Each one is a clause somebody would be tempted to trim for brevity, and each
 * one is the reason the page exists at all.
 */

const TERMS = terms.toLowerCase().replace(/\s+/g, ' ');

describe('the terms of use', () => {
  it('says plainly that this is not medical advice', () => {
    expect(TERMS).toContain('not medical or dietetic advice');
    // The specific admission, not just the general disclaimer: the equations
    // were validated on adults and nobody qualified has reviewed the output.
    expect(TERMS).toContain('no registered dietitian has yet reviewed');
  });

  it('tells someone with an eating disorder not to use it, and where to go', () => {
    // A calorie tracker aimed at teenagers has to say this first, not in a
    // footnote. It is the clause most easily cut for length.
    expect(TERMS).toContain('do not use athly if you have an eating disorder');
    expect(TERMS).toContain('helpline');
  });

  it('refuses to let the allergy filter be read as a safety system', () => {
    expect(TERMS).toContain('check every label yourself');
    expect(TERMS).toContain('it is not a safety system');
    // And says why, because "we are not liable" without a reason is not a
    // warning, it is a shield.
    expect(TERMS).toContain('open food facts');
  });

  it('is honest about where each nutrition figure comes from', () => {
    expect(TERMS).toContain('authored estimate');
    expect(TERMS).toContain('good estimate rather than a measurement');
  });

  it('sets the same age floor the privacy policy does', () => {
    expect(TERMS).toContain('13 or older');
  });

  it('says the data belongs to the athlete', () => {
    expect(TERMS).toContain('what you put in is yours');
  });

  it('admits it has not been reviewed', () => {
    expect(TERMS).toContain('has not been reviewed by a lawyer');
  });

  it('still carries the placeholders that must be filled before publication', () => {
    // Deliberately asserted rather than quietly left: governing law depends on
    // where ATHLY is established, and a jurisdiction guessed here would be worse
    // than a blank one. This test fails once they are filled in — which is the
    // prompt to delete it.
    expect(TERMS).toContain('[state]');
    expect(TERMS).toContain('this paragraph is a placeholder');
  });
});
