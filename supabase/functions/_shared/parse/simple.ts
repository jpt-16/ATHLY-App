import { MAX_ITEMS, MAX_TEXT_LENGTH } from './types.ts';
import type { ParseResult, ParsedItem } from './types.ts';

/**
 * Reading a meal without a model.
 *
 * The fallback when no LLM key is configured, and the reason the feature
 * degrades instead of breaking. It handles the half of real input that is a
 * list — "2 eggs, bacon, and 2 pieces of toast" — and is honest about the half
 * that is prose.
 *
 * It is also the proof that the parser is swappable. Two implementations behind
 * one interface, written at the same time, is the only version of that claim
 * worth making.
 *
 * ## What it will not do
 *
 * Guess. An item it cannot read a quantity for is marked `uncertain` and shown
 * to the athlete as something to check, rather than defaulting to one serving
 * and hoping. The whole system is built on the difference between a number with
 * a source and a number without one.
 */

/** Words that mean "one of" and carry no quantity. */
const ARTICLES = new Set(['a', 'an', 'one', 'some', 'a few']);

/** Written numbers, because people type them. */
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
};

/** Units worth recognising. Anything else is treated as part of the food's name. */
const UNITS = new Set([
  'g',
  'gram',
  'grams',
  'kg',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'ml',
  'l',
  'liter',
  'liters',
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'slice',
  'slices',
  'piece',
  'pieces',
  'serving',
  'servings',
  'scoop',
  'scoops',
  'bowl',
  'bowls',
  'glass',
  'glasses',
  'can',
  'cans',
  'bottle',
  'bottles',
  'bar',
  'bars',
  'egg',
  'eggs',
]);

/** Foods where a volume is a weight, near enough. See `units.ts`. */
const LIQUID = /\b(milk|water|juice|smoothie|shake|soda|coffee|tea|gatorade|lemonade|drink)\b/i;

/**
 * Filler that carries no food. Stripped before splitting so "I had a large
 * pepperoni pizza" does not become an item called "I had".
 */
const LEAD_IN = /^\s*(i\s+(had|ate|got|made)|for\s+\w+\s*[,:]?|today\s+i\s+\w+)\s+/i;

/** Separators between foods. "with a side of" is deliberately one of them. */
const SPLIT = /\s*(?:,|\band\b|\bplus\b|\bwith\s+a\s+side\s+of\b|\balong\s+with\b|\+|\&)\s*/i;

export function parseSimple(text: string): ParseResult {
  const cleaned = text.trim().slice(0, MAX_TEXT_LENGTH).replace(LEAD_IN, '');

  const items: ParsedItem[] = [];
  const ignored: string[] = [];

  for (const raw of cleaned.split(SPLIT)) {
    const phrase = raw.trim().replace(/[.!?]+$/, '');
    if (!phrase) continue;
    if (items.length >= MAX_ITEMS) {
      ignored.push(phrase);
      continue;
    }

    const item = readItem(phrase);
    if (item) items.push(item);
    else ignored.push(phrase);
  }

  return { items, parser: 'rules', ignored };
}

/**
 * One phrase — "2 pieces of toast" — into an item.
 *
 * Returns `null` for a phrase with no food left in it once the numbers and
 * units are removed, which is the honest answer for "a lot" or "some more".
 */
function readItem(phrase: string): ParsedItem | null {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  let quantity = 1;
  let unit = '';
  let uncertain = true;
  let i = 0;

  // "150g" is one token and two facts. Split it before anything else, or the
  // whole phrase becomes a food called "150g rice".
  const glued = /^(\d+(?:\.\d+)?)([a-z]+)$/i.exec(words[0]);
  if (glued && UNITS.has(glued[2].toLowerCase())) {
    words.splice(0, 1, glued[1], glued[2]);
  }

  const first = words[0].toLowerCase();
  const numeric = readNumber(first);
  if (numeric !== null) {
    quantity = numeric;
    uncertain = false;
    i = 1;
  } else if (ARTICLES.has(first)) {
    // "a turkey sandwich" is one sandwich, and that is not a guess about how
    // much — it is what the word means.
    quantity = 1;
    uncertain = false;
    i = 1;
  }

  // "2 oz chicken" and "2 slices of toast" — a unit, then optionally "of".
  if (i < words.length && UNITS.has(strip(words[i]))) {
    const candidate = strip(words[i]);
    // "2 eggs" is a count of a food, not two units of egg. Leave it as the food.
    if (candidate !== 'egg' && candidate !== 'eggs') {
      unit = candidate;
      i += 1;
      if (words[i]?.toLowerCase() === 'of') i += 1;
    }
  }

  const name = words.slice(i).join(' ').trim();
  if (!name || !/[a-z]/i.test(name)) return null;

  return {
    query: name,
    label: phrase,
    quantity,
    unit,
    brand: null,
    // Strictly "I am not sure I read this right": a quantity nobody stated, or
    // a container word that names a vessel rather than an amount.
    //
    // Deliberately *not* "I cannot weigh this". "A turkey sandwich" is read
    // perfectly — one sandwich — and how much a sandwich weighs is a separate
    // question that `gramsFor` answers by refusing. Folding the two together
    // marked every correctly-read food as doubtful and made the flag useless.
    uncertain: uncertain || VAGUE.test(unit),
    liquid: LIQUID.test(name),
  };
}

/** Portion words that name a container rather than an amount. */
const VAGUE = /^(bowl|bowls|glass|glasses|serving|servings|piece|pieces|scoop|scoops)$/i;

function readNumber(word: string): number | null {
  if (word in WORD_NUMBERS) return WORD_NUMBERS[word];

  // "1/2", "1.5", "2"
  const fraction = /^(\d+)\/(\d+)$/.exec(word);
  if (fraction) {
    const n = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(word);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function strip(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}
