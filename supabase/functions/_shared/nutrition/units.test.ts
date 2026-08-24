import { describe, expect, it } from 'vitest';

import { bestPortion, gramsFor } from './units.ts';
import type { Portion } from './types.ts';

/**
 * Weighing what somebody said, and refusing when it cannot be done.
 *
 * This is where natural-language logging is most likely to be quietly wrong. A
 * model can tell you the meal contained toast; how much a slice of toast weighs
 * is a fact about bread, and inventing it is how an athlete ends up holding a
 * number nobody measured. Every assertion below is about the difference between
 * arithmetic, evidence, and a guess.
 */

const eggPortions: Portion[] = [
  { label: 'large', grams: 50 },
  { label: 'medium', grams: 44 },
];

describe('a mass the athlete stated', () => {
  it('is arithmetic and is trusted', () => {
    expect(gramsFor({ quantity: 150, unit: 'g' }, [])).toEqual({
      grams: 150,
      basis: 'stated',
      note: '150 g',
    });
    expect(gramsFor({ quantity: 8, unit: 'oz' }, []).grams).toBeCloseTo(226.8, 1);
  });
});

describe('a volume', () => {
  it('is refused for solids, because a cup is not a weight', () => {
    // A cup of oats and a cup of rice differ by a factor of two. This is the
    // single most tempting place to guess.
    const out = gramsFor({ quantity: 1, unit: 'cup' }, []);
    expect(out.grams).toBeNull();
    expect(out.note).toMatch(/volume/i);
  });

  it('is allowed for a drink, where water is close enough', () => {
    expect(gramsFor({ quantity: 2, unit: 'cups' }, [], true).grams).toBeCloseTo(473.2, 1);
  });
});

describe('a portion the provider published', () => {
  it('is evidence, and says so', () => {
    const out = gramsFor({ quantity: 2, unit: 'large' }, eggPortions);
    expect(out).toMatchObject({ grams: 100, basis: 'portion' });
    expect(out.note).toContain('50 g each');
  });

  it('answers a bare count when there is only one portion to mean', () => {
    expect(gramsFor({ quantity: 2, unit: '' }, [{ label: 'slice', grams: 28 }]).grams).toBe(56);
  });

  it('refuses a bare count when there are several and no way to choose', () => {
    // "2 eggs" against both a large and a medium is a question, not an answer.
    expect(gramsFor({ quantity: 2, unit: '' }, eggPortions).grams).toBeNull();
  });
});

describe('anything else', () => {
  it('gives up and names what needs a weight', () => {
    const out = gramsFor({ quantity: 2, unit: 'slice' }, []);
    expect(out.grams).toBeNull();
    expect(out.note).toContain('slice');
  });

  it('refuses a quantity that is not one', () => {
    expect(gramsFor({ quantity: 0, unit: 'g' }, []).grams).toBeNull();
    expect(gramsFor({ quantity: NaN, unit: 'g' }, []).grams).toBeNull();
    expect(gramsFor({ quantity: -2, unit: 'g' }, []).grams).toBeNull();
  });
});

describe('bestPortion', () => {
  it('matches on the whole word, not on a substring', () => {
    // "slice" inside "sliced, per 100 g" is not a portion called a slice.
    expect(bestPortion('slice', [{ label: 'sliced, per 100 g', grams: 100 }])).toBeNull();
    expect(bestPortion('slice', [{ label: '1 slice', grams: 28 }])).not.toBeNull();
  });

  it('takes the plural of what was published', () => {
    expect(bestPortion('slices', [{ label: 'slice', grams: 28 }])?.grams).toBe(28);
  });

  it('ignores a portion with no usable weight', () => {
    expect(bestPortion('cup', [{ label: 'cup', grams: 0 }])).toBeNull();
  });
});
