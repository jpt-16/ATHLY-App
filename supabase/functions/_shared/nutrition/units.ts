import type { Portion } from './types.ts';

/**
 * Turning "2 slices" into grams, and refusing when it cannot be done.
 *
 * This is the part of natural-language logging most likely to be quietly wrong.
 * A model can tell you a meal contained toast; how much a slice of toast weighs
 * is a fact about bread, and inventing it is how an athlete ends up holding a
 * number nobody measured.
 *
 * So the order is strict:
 *
 * 1. A **mass or volume the athlete stated** — "150 g", "8 oz" — is arithmetic
 *    and is trusted.
 * 2. A **portion the provider publishes** — FDC ships `foodPortions`, and a
 *    "1 slice = 28 g" from USDA is evidence.
 * 3. Otherwise **give up**, and say which item needs a weight.
 *
 * There is no step 4 where a plausible number gets made up, because a plausible
 * number is indistinguishable from a measured one once it is on the screen.
 */

/** Units that are a mass outright. Grams per unit. */
const MASS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

/**
 * Volumes, in millilitres.
 *
 * Only usable when the food's density is known, which for this app means
 * drinks: 1 ml of milk or juice is close enough to 1 g that the error is far
 * below the error in everything else. For solids a cup is not a weight — a cup
 * of oats and a cup of rice differ by a factor of two — so `gramsFor` refuses
 * volume for anything not marked as a liquid.
 */
const VOLUME_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  cup: 236.588,
  cups: 236.588,
  tbsp: 14.787,
  tablespoon: 14.787,
  tablespoons: 14.787,
  tsp: 4.929,
  teaspoon: 4.929,
  teaspoons: 4.929,
  'fl oz': 29.5735,
  'fluid ounce': 29.5735,
};

export interface Measure {
  quantity: number;
  /** As said: "g", "slice", "cup", "medium", or "" for a bare count. */
  unit: string;
}

export type Weighed =
  | { grams: number; basis: 'stated' | 'portion'; note: string }
  /** No honest way to weigh this. The caller must ask. */
  | { grams: null; basis: 'unknown'; note: string };

const clean = (u: string) => u.trim().toLowerCase().replace(/\.$/, '');

/**
 * How many grams, and on what authority.
 *
 * @param liquid whether volume may be treated as mass. Drinks only.
 */
export function gramsFor(measure: Measure, portions: Portion[], liquid = false): Weighed {
  const quantity = Number(measure.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { grams: null, basis: 'unknown', note: 'No quantity given' };
  }

  const unit = clean(measure.unit);

  if (unit in MASS) {
    return { grams: round(quantity * MASS[unit]), basis: 'stated', note: `${quantity} ${unit}` };
  }

  if (unit in VOLUME_ML) {
    if (!liquid) {
      // A cup of oats and a cup of rice differ by a factor of two. Guessing
      // which one this is would be the whole problem in one line.
      return {
        grams: null,
        basis: 'unknown',
        note: `A ${unit} is a volume, and this is not a drink — say the weight`,
      };
    }
    return {
      grams: round(quantity * VOLUME_ML[unit]),
      basis: 'stated',
      note: `${quantity} ${unit} at the density of water`,
    };
  }

  // A named portion — "slice", "medium", "sandwich" — or a bare count. Both are
  // only answerable if the provider published a portion that matches.
  const match = bestPortion(unit, portions);
  if (match) {
    return {
      grams: round(quantity * match.grams),
      basis: 'portion',
      note: `${quantity} × ${match.label} (${round(match.grams)} g each)`,
    };
  }

  return {
    grams: null,
    basis: 'unknown',
    note: unit ? `No published weight for "${unit}"` : 'No published weight for one of these',
  };
}

/**
 * The provider's portion that best answers the unit asked for.
 *
 * Word-boundary matching rather than `includes`, because "slice" appearing
 * inside "sliced, per 100 g" is not a portion called a slice. A bare count with
 * exactly one published portion takes it; a bare count with several does not
 * guess between them.
 */
export function bestPortion(unit: string, portions: Portion[]): Portion | null {
  const usable = portions.filter((p) => Number.isFinite(p.grams) && p.grams > 0);
  if (usable.length === 0) return null;

  if (!unit) {
    // "2 eggs" with one published portion is unambiguous. With two — a large and
    // a medium — it is a question, and answering it would be picking at random.
    // `each` and `item` are the exception: those words mean "one of these".
    if (usable.length === 1) return usable[0];
    return usable.find((p) => /\b(each|item)\b/i.test(p.label)) ?? null;
  }

  // Both sides are stemmed: the athlete says "slices" and USDA publishes
  // "slice", and neither spelling should decide whether the food can be weighed.
  const word = new RegExp(`\\b(${stems(unit).map(escape).join('|')})(s|es)?\\b`, 'i');
  return usable.find((p) => word.test(p.label)) ?? null;
}

/**
 * The spellings a word might be published under.
 *
 * Every plausible stem rather than one guess at the right one: "slices" is
 * "slice" and "boxes" is "box", and no rule of thumb short of a real stemmer
 * gets both. Trying all three costs nothing and avoids the case that failed —
 * chopping "es" off "slices" and looking for "slic".
 */
function stems(word: string): string[] {
  const out = [word];
  if (word.endsWith('es') && word.length > 3) out.push(word.slice(0, -2));
  if (word.endsWith('s') && word.length > 2) out.push(word.slice(0, -1));
  return [...new Set(out)];
}

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
