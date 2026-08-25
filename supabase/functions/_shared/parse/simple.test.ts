import { describe, expect, it } from 'vitest';

import { parseSimple } from './simple.ts';

/**
 * The parser that runs when there is no model.
 *
 * Its job is to handle lists honestly and to be visibly out of its depth on
 * prose — not to appear to cope. Every assertion below is really about one
 * question: when it does not know, does it say so?
 */

const q = (text: string) => parseSimple(text).items;

describe('a list of foods', () => {
  it('reads the example off the brief', () => {
    const items = q('2 eggs, bacon, and 2 pieces of toast');
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ query: 'eggs', quantity: 2, unit: '' });
    expect(items[1]).toMatchObject({ query: 'bacon', quantity: 1 });
    expect(items[2]).toMatchObject({ query: 'toast', quantity: 2, unit: 'pieces' });
  });

  it('treats "a" as one, which is what the word means', () => {
    const items = q('a turkey sandwich and an apple');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ query: 'turkey sandwich', quantity: 1, uncertain: false });
    expect(items[1]).toMatchObject({ query: 'apple', quantity: 1 });
  });

  it('reads a stated weight, which is arithmetic rather than a guess', () => {
    expect(q('8 oz chicken')[0]).toMatchObject({
      query: 'chicken',
      quantity: 8,
      unit: 'oz',
      uncertain: false,
    });
    expect(q('150g rice')[0]).toMatchObject({ quantity: 150, unit: 'g' });
  });

  it('reads written numbers and fractions', () => {
    expect(q('two bagels')[0].quantity).toBe(2);
    expect(q('1/2 cup oats')[0]).toMatchObject({ quantity: 0.5, unit: 'cup' });
  });

  it('drops the lead-in rather than logging a food called "I had"', () => {
    const items = q('I had a large pepperoni pizza');
    expect(items).toHaveLength(1);
    expect(items[0].query).toBe('large pepperoni pizza');
  });

  it('splits "with a side of", which is a separator and not a food', () => {
    const items = q('chicken parm with a side of pasta');
    expect(items.map((i) => i.query)).toEqual(['chicken parm', 'pasta']);
  });

  it('marks a drink as one, so a cup can be weighed', () => {
    expect(q('2 cups of chocolate milk')[0].liquid).toBe(true);
    expect(q('2 cups of rice')[0].liquid).toBe(false);
  });
});

describe('when it does not know', () => {
  it('says so rather than defaulting to one serving', () => {
    // No quantity anywhere. It has to be logged as something, but the athlete
    // is the one who should decide how much.
    expect(q('bacon')[0].uncertain).toBe(true);
    expect(q('2 eggs')[0].uncertain).toBe(false);
  });

  it('flags a container word, which names a vessel rather than an amount', () => {
    // "A bowl" of what, how big? A number here would be invention.
    expect(q('a bowl of oatmeal')[0].uncertain).toBe(true);
    expect(q('a bowl of oatmeal')[0].unit).toBe('bowl');
  });

  it('keeps what it could not use instead of dropping it silently', () => {
    const out = parseSimple('rice and 12345');
    expect(out.items.map((i) => i.query)).toEqual(['rice']);
    expect(out.ignored).toContain('12345');
  });

  it('says which parser answered', () => {
    expect(parseSimple('rice').parser).toBe('rules');
  });
});

describe('bounds', () => {
  it('refuses to be a denial-of-service vector', () => {
    const many = Array.from({ length: 40 }, (_, i) => `${i + 1} apples`).join(', ');
    const out = parseSimple(many);
    expect(out.items.length).toBeLessThanOrEqual(12);
    expect(out.ignored.length).toBeGreaterThan(0);
  });

  it('survives an empty or meaningless description', () => {
    expect(parseSimple('').items).toEqual([]);
    expect(parseSimple('   ').items).toEqual([]);
    expect(parseSimple('!!!').items).toEqual([]);
  });
});
