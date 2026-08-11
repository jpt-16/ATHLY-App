import { MEALS } from './data';
import type { Meal } from './data';
import { ALLERGEN_BY_LABEL, ALLERGENS, DISLIKE_TAGS, INGREDIENT_FACTS } from './foodFacts';
import type { Allergen } from './foodFacts';

/**
 * Deciding what an athlete is allowed to be shown.
 *
 * Two kinds of rule, and the difference between them is the whole point of this
 * module:
 *
 * - **Allergens are hard.** A meal containing a declared allergen is never
 *   shown, never suggested as a swap, never generated into a plan, and never
 *   surfaced in the recipe list. There is no override, no warning-banner
 *   fallback, and no relaxation step that trades one away. If that leaves a slot
 *   with nothing, the slot comes back empty and says which allergen emptied it.
 *
 * - **Dislikes, time and budget are soft.** They are preferences. When they
 *   cannot all be met, they are dropped in a fixed order — budget, then time,
 *   then dislikes — until something fits.
 */

// ── deriving what is in a meal ───────────────────────────────────────

/** Ingredients whose facts are missing. Empty in a healthy build — see the test. */
export function unknownIngredients(meal: Meal): string[] {
  return meal.ingredients.map(([name]) => name).filter((name) => !INGREDIENT_FACTS[name]);
}

/**
 * Every allergen present in a meal, derived from its ingredients.
 *
 * An ingredient with no facts entry is treated as carrying **every** allergen,
 * so an untagged ingredient removes the meal from everyone with an allergy
 * rather than silently reading as safe. `foodFacts.test.ts` keeps this from ever
 * firing in practice; it is here so the failure mode is refusal, not exposure.
 */
export function mealAllergens(meal: Meal): Set<Allergen> {
  const out = new Set<Allergen>();
  for (const [name] of meal.ingredients) {
    const facts = INGREDIENT_FACTS[name];
    if (!facts) {
      for (const a of ALLERGENS) out.add(a);
      continue;
    }
    for (const a of facts.allergens) out.add(a);
  }
  return out;
}

/** Every descriptive tag in a meal, plus its ingredient names, lowercased. */
export function mealTags(meal: Meal): Set<string> {
  const out = new Set<string>();
  for (const [name] of meal.ingredients) {
    out.add(name.toLowerCase());
    for (const tag of INGREDIENT_FACTS[name]?.tags ?? []) out.add(tag.toLowerCase());
  }
  return out;
}

// ── the hard rule ────────────────────────────────────────────────────

/**
 * Turn the onboarding chips into allergens.
 *
 * Labels outside the known vocabulary are free text the athlete typed. They are
 * kept as raw strings and matched against ingredient names and tags, so a typed
 * allergy still blocks something rather than being dropped on the floor. It is
 * best-effort matching, not a guarantee — the real fix is resolving ingredients
 * against a food database, which is where this goes next.
 */
export function parseAllergens(labels: string[]): { known: Allergen[]; custom: string[] } {
  const known: Allergen[] = [];
  const custom: string[] = [];
  for (const label of labels) {
    if (label === 'None of these') continue;
    const mapped = ALLERGEN_BY_LABEL[label];
    if (mapped) known.push(mapped);
    else custom.push(label.trim().toLowerCase());
  }
  return { known, custom };
}

/** Which of the athlete's allergens a meal violates. Empty means safe. */
export function blockingAllergens(meal: Meal, labels: string[]): string[] {
  const { known, custom } = parseAllergens(labels);
  const present = mealAllergens(meal);
  const hits: string[] = known.filter((a) => present.has(a));

  if (custom.length) {
    const tags = mealTags(meal);
    for (const term of custom) {
      if (!term) continue;
      for (const tag of tags) {
        if (tag.includes(term) || term.includes(tag)) {
          hits.push(term);
          break;
        }
      }
    }
  }
  return hits;
}

/** The hard gate. A meal is safe only if it violates no declared allergen. */
export function isSafe(meal: Meal, allergenLabels: string[]): boolean {
  return blockingAllergens(meal, allergenLabels).length === 0;
}

// ── the soft rules ───────────────────────────────────────────────────

/** Whether a meal contains something the athlete said they won't eat. */
export function matchesDislikes(meal: Meal, dislikes: string[]): boolean {
  if (!dislikes.length) return false;
  const tags = mealTags(meal);
  return dislikes.some((label) => {
    const mapped = DISLIKE_TAGS[label];
    if (mapped) return mapped.some((t) => tags.has(t));
    const term = label.trim().toLowerCase();
    if (!term) return false;
    return [...tags].some((tag) => tag.includes(term));
  });
}

/** Minutes an athlete said they have on a weekday. `prep` means batch cooking. */
export function minutesAvailable(timeAnswer: string | undefined): number {
  switch (timeAnswer) {
    case '10':
      return 10;
    case '40':
      return 40;
    case 'prep':
      return 60;
    default:
      return 20;
  }
}

/** Parse the authored `prep` string ("18 min") into minutes. */
export function prepMinutes(meal: Meal): number {
  const n = parseInt(meal.prep, 10);
  return Number.isFinite(n) ? n : 0;
}

// ── slot selection ───────────────────────────────────────────────────

export interface SlotConstraints {
  /** Onboarding allergy chip labels. Hard — never relaxed. */
  allergens: string[];
  /** "Won't eat" chip labels. Soft. */
  dislikes: string[];
  /** Minutes available on a weekday. Soft. */
  maxMinutes?: number;
}

/**
 * Which soft constraints survived, named for the first one given up.
 *
 * Budget is missing on purpose: meals carry no cost today, so there is nothing
 * to enforce and a `'budget'` rung would be a step that never changes the
 * outcome. It joins the ladder ahead of `'time'` once recipes carry a cost band.
 */
export type Relaxation = 'none' | 'time' | 'dislikes';

const LADDER: Relaxation[] = ['none', 'time', 'dislikes'];

export type SlotResult =
  | { meal: Meal; relaxed: Relaxation }
  /** Nothing safe exists. `blockedBy` names the allergens responsible. */
  | { meal: null; blockedBy: string[] };

/**
 * Pick a meal for one slot.
 *
 * `candidates` is in preference order — the caller decides what "best" means,
 * and this walks the list. The first candidate that satisfies the current rung
 * of the ladder wins, so with no constraints declared the first candidate is
 * always chosen and the app shows exactly what it showed before any of this
 * existed.
 *
 * Note what the loop does *not* do: allergens are filtered once, up front, and
 * the ladder only ever loosens the soft rules underneath that filter.
 */
export function selectForSlot(candidateIds: string[], c: SlotConstraints): SlotResult {
  const candidates = candidateIds.map((id) => MEALS[id]).filter(Boolean);
  const safe = candidates.filter((meal) => isSafe(meal, c.allergens));

  if (!safe.length) {
    const blocked = new Set<string>();
    for (const meal of candidates) for (const a of blockingAllergens(meal, c.allergens)) blocked.add(a);
    return { meal: null, blockedBy: [...blocked] };
  }

  for (const relaxed of LADDER) {
    const dropTime = relaxed === 'time' || relaxed === 'dislikes';
    const dropDislikes = relaxed === 'dislikes';

    const hit = safe.find((meal) => {
      if (!dropDislikes && matchesDislikes(meal, c.dislikes)) return false;
      if (!dropTime && c.maxMinutes != null && prepMinutes(meal) > c.maxMinutes) return false;
      return true;
    });
    if (hit) return { meal: hit, relaxed };
  }

  // Safe but every soft rule exhausted — the ladder's last rung always matches.
  return { meal: safe[0], relaxed: 'dislikes' };
}

/** Filter any list of meal ids down to the ones safe for this athlete. */
export function safeMealIds(ids: string[], allergenLabels: string[]): string[] {
  return ids.filter((id) => MEALS[id] && isSafe(MEALS[id], allergenLabels));
}
