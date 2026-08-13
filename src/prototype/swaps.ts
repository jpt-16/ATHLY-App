import { MEALS, SLOT_CANDIDATES } from './data';
import type { Meal } from './data';
import { isSafe, matchesDislikes, prepMinutes } from './filtering';

/**
 * Finding a replacement that hits the same numbers.
 *
 * What this replaces: a hand-written list of four dinners, each carrying an
 * authored `match: '98% match'` string and an authored sentence explaining
 * itself, ranked against an outgoing meal the code assumed was 750 calories and
 * 45g of protein no matter which meal the athlete had actually tapped. It told
 * every athlete the same three swaps for the same fictional dinner, and the
 * percentages were decoration — a number typed by a designer, not measured.
 *
 * What it does instead: rank every meal the athlete may safely eat in the same
 * slot by how far its macros sit from the meal being replaced, and derive both
 * the percentage and the explanation from that distance. A swap is only worth
 * offering if the day's numbers survive it, so distance *is* the ranking.
 */

/**
 * How close is close enough, in the design's own words: the swap sheet has
 * always told the athlete each option "lands within 60 calories and 3g of
 * protein". These are that promise, made checkable — `withinTolerance` is what
 * decides whether a delta renders green or red, and the sheet's subheading is
 * generated from the same two numbers rather than repeating them in prose.
 */
export const CAL_TOLERANCE = 60;
export const PROTEIN_TOLERANCE = 3;

/** Which slot family a meal belongs to, e.g. `dinner` → the seven dinners. */
const SLOT_OF: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [slot, ids] of Object.entries(SLOT_CANDIDATES)) {
    for (const id of ids) out[id] = slot;
  }
  return out;
})();

/**
 * The slot a committed swap should be filed under.
 *
 * A swap is stored against a slot rather than against the meal it replaced, so
 * that re-planning the day — which may pick a different meal for that slot —
 * still honours the athlete's choice.
 */
export function slotFamilyOf(mealId: string): string | null {
  return SLOT_OF[mealId] ?? null;
}

/**
 * The pool a replacement may come from.
 *
 * The slot family first, because a breakfast is not a substitute for a dinner
 * however well its macros line up — an athlete offered steak pot roast at 7am
 * has been given a worse answer than no answer. Meals outside every family fall
 * back to matching on the displayed slot label so nothing is unswappable.
 */
export function swapPool(outgoingId: string): Meal[] {
  const outgoing = MEALS[outgoingId];
  if (!outgoing) return [];
  const family = SLOT_OF[outgoingId];
  const ids = family
    ? (SLOT_CANDIDATES[family] ?? [])
    : Object.keys(MEALS).filter((id) => MEALS[id].slot === outgoing.slot);
  return ids
    .filter((id) => id !== outgoingId)
    .map((id) => MEALS[id])
    .filter(Boolean);
}

export interface SwapOption {
  meal: Meal;
  /** Signed differences against the outgoing meal. Negative means less. */
  dCal: number;
  dProtein: number;
  dCarbs: number;
  dFat: number;
  dMinutes: number;
  /** 0–100, computed from macro distance. Never authored. */
  match: number;
  /** Both calories and protein inside the tolerances above. */
  withinTolerance: boolean;
  /** A true sentence about this specific pairing. */
  why: string;
}

export interface SwapConstraints {
  /** Onboarding allergy chip labels. Hard — an unsafe meal is never ranked. */
  allergens: string[];
  /** "Won't eat" chip labels. Soft — costs a meal its place, not its safety. */
  dislikes: string[];
  /** Minutes available. Soft. */
  maxMinutes?: number;
}

/**
 * How far apart two meals are, as a single number. Lower is closer.
 *
 * Relative rather than absolute, so 40 calories off a 250-calorie snack counts
 * for more than 40 off an 800-calorie dinner — which is how it actually feels to
 * eat. Calories and protein carry most of the weight because they are the two
 * numbers the app holds the athlete to; carbohydrate and fat are along for the
 * ride and mostly break ties.
 */
function distance(outgoing: Meal, candidate: Meal): number {
  const rel = (delta: number, base: number) => Math.abs(delta) / Math.max(base, 1);
  return (
    0.45 * rel(candidate.kcal - outgoing.kcal, outgoing.kcal) +
    0.35 * rel(candidate.p - outgoing.p, outgoing.p) +
    0.1 * rel(candidate.c - outgoing.c, outgoing.c) +
    0.1 * rel(candidate.f - outgoing.f, outgoing.f)
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Say something true about this pairing.
 *
 * Every branch below is a fact derived from the two meals, which is the point:
 * the sentence an athlete reads is the reason the meal ranked, not copy written
 * before either meal existed. Clauses are collected in order of how much they
 * would change someone's mind and the best two are joined.
 */
function explain(outgoing: Meal, candidate: Meal, o: Omit<SwapOption, 'why' | 'meal'>): string {
  const clauses: string[] = [];

  if (o.dMinutes <= -5) clauses.push(`${plural(-o.dMinutes, 'minute')} faster`);
  if (o.dProtein >= 5) clauses.push(`${o.dProtein}g more protein`);
  else if (o.dProtein <= -5) clauses.push(`${-o.dProtein}g less protein`);

  if (o.withinTolerance) {
    // "within 60 calories and 3g of protein of your dinner" is the sheet's own
    // phrasing, so the generated line keeps it — with the two degenerate cases
    // spelled out, because "the same protein of chicken pasta" is not English.
    const name = outgoing.name.toLowerCase();
    const cal = plural(Math.abs(o.dCal), 'calorie');
    if (o.dCal === 0 && o.dProtein === 0) clauses.push(`matches ${name} on calories and protein`);
    else if (o.dProtein === 0) clauses.push(`lands within ${cal} of ${name}, with the same protein`);
    else if (o.dCal === 0)
      clauses.push(`matches ${name} on calories, within ${Math.abs(o.dProtein)}g of protein`);
    else clauses.push(`lands within ${cal} and ${Math.abs(o.dProtein)}g of protein of ${name}`);
  } else if (Math.abs(o.dCal) > CAL_TOLERANCE) {
    clauses.push(
      `${plural(Math.abs(o.dCal), 'calorie')} ${o.dCal > 0 ? 'heavier' : 'lighter'} than ${outgoing.name.toLowerCase()}`,
    );
  }

  if (!clauses.length) clauses.push(`the closest match left in your ${candidate.slot.toLowerCase()} list`);

  const picked = clauses.slice(0, 2).join(', and ');
  return picked.charAt(0).toUpperCase() + picked.slice(1) + '.';
}

/**
 * Rank replacements for one meal, closest first.
 *
 * Allergens filter the pool before anything is scored — there is no rung of this
 * that trades one away, exactly as in `filtering.ts`. Dislikes and time are
 * pushed to the back rather than removed, so an athlete who has ruled out most
 * of a slot still gets offered something instead of an empty sheet.
 */
export function rankSwaps(outgoingId: string, c: SwapConstraints, limit = 6): SwapOption[] {
  const outgoing = MEALS[outgoingId];
  if (!outgoing) return [];

  const safe = swapPool(outgoingId).filter((m) => isSafe(m, c.allergens));

  const scored = safe.map((meal) => {
    const base = {
      dCal: meal.kcal - outgoing.kcal,
      dProtein: meal.p - outgoing.p,
      dCarbs: meal.c - outgoing.c,
      dFat: meal.f - outgoing.f,
      dMinutes: prepMinutes(meal) - prepMinutes(outgoing),
      match: Math.max(0, Math.min(100, Math.round((1 - distance(outgoing, meal)) * 100))),
      withinTolerance:
        Math.abs(meal.kcal - outgoing.kcal) <= CAL_TOLERANCE &&
        Math.abs(meal.p - outgoing.p) <= PROTEIN_TOLERANCE,
    };
    // Soft demerits, applied to the ordering only. A disliked meal still gets a
    // truthful match percentage — it is ranked last, not misrepresented.
    const soft =
      (matchesDislikes(meal, c.dislikes) ? 1 : 0) +
      (c.maxMinutes != null && prepMinutes(meal) > c.maxMinutes ? 0.5 : 0);
    return {
      option: { meal, ...base, why: explain(outgoing, meal, base) },
      sort: distance(outgoing, meal) + soft,
    };
  });

  // Sorted by distance, then by id so a tie renders the same way every time
  // rather than depending on object order.
  scored.sort((a, b) => a.sort - b.sort || a.option.meal.id.localeCompare(b.option.meal.id));
  return scored.slice(0, limit).map((s) => s.option);
}
