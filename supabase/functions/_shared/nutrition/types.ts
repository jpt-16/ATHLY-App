/**
 * The contract between ATHLY IQ and whatever knows about food.
 *
 * Everything in this directory is **pure and secret-free**: no `Deno`, no
 * `fetch`, no keys. That is what lets the same code be unit-tested by Vitest and
 * imported by an Edge Function, and it is why the fetching lives in the function
 * and the parsing lives here. A provider is a thin adapter around this shape.
 *
 * Swapping FoodData Central for something else should mean writing one file that
 * produces `FoodMatch` values. Nothing above this layer knows which database
 * answered, and nothing below it knows what ATHLY IQ does with the answer.
 *
 * ## The rule this whole layer exists to enforce
 *
 * **A provider never invents a number.** A food it cannot find is a miss, and a
 * miss is reported as a miss. `docs/NUTRITION.md` §9 draws the line: targets are
 * calculated, food nutrition is data, and a figure with no source behind it is
 * neither. An athlete is entitled to ask where a number came from and get an
 * answer that is not "the app decided".
 */

/**
 * Per 100 g, in the units ATHLY IQ shows.
 *
 * Deliberately the same twelve as `src/prototype/nutrients.ts`, and deliberately
 * declared again rather than imported: this file is loaded by the Deno runtime,
 * which cannot reach into the browser bundle. `src/data/aiLog.ts` maps between
 * them in one place, and `aiLog.test.ts` fails if the two shapes drift.
 */
export interface ProviderNutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  /** Milligrams. */
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  /** Micrograms. */
  vitaminD: number;
}

export const ZERO_NUTRIENTS: ProviderNutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  potassium: 0,
  calcium: 0,
  iron: 0,
  vitaminC: 0,
  vitaminD: 0,
};

/** A weighable portion the provider itself publishes. Never one we invented. */
export interface Portion {
  /** As the source words it: "1 cup", "1 medium", "1 slice". */
  label: string;
  grams: number;
}

/**
 * Where a number came from, kept on the row so it can be shown and argued with.
 *
 * `branded` is a manufacturer's own label — the best available for a packaged
 * food. `generic` is a laboratory-analysed or survey-derived entry, which is
 * what a plate of chicken parm can realistically be matched to. `user` is a
 * figure the athlete typed, which is exactly as accurate as they typed it.
 */
export type FoodSource = 'branded' | 'generic' | 'user';

export interface FoodMatch {
  /**
   * Provider-scoped, e.g. `fdc:2341197`. Prefixed so two providers cannot
   * collide, and so a stored reference says which database to ask.
   */
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  /** The provider's own classification, for display and for ranking. */
  dataType: string;
  per100g: ProviderNutrients;
  portions: Portion[];
  /**
   * How well this matched what was asked for, 0–1.
   *
   * A ranking, not a probability. It exists so the client can mark a low match
   * as needing a look rather than presenting it with the same confidence as a
   * scanned barcode — see `needsReview` on the parsed item.
   */
  confidence: number;
}

/** What a provider is asked. */
export interface SearchQuery {
  text: string;
  /** Named by the athlete — "Chobani", "Chipotle". Biases towards branded rows. */
  brand?: string;
  limit?: number;
}

/**
 * The interface a nutrition database has to satisfy.
 *
 * Two methods, because there are two questions: "what is this thing called
 * chicken parm" and "what is barcode 0012345678905". Providers that can only
 * answer one return `null` from the other rather than pretending.
 */
export interface NutritionProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<FoodMatch[]>;
  barcode(code: string): Promise<FoodMatch | null>;
}

/**
 * A provider said no. Distinct from a thrown error, which means it broke.
 *
 * The difference matters at the top: "we could not find that food" is something
 * to tell the athlete and let them correct, and "the nutrition database is down"
 * is something to retry.
 */
export class NoMatch extends Error {
  constructor(readonly query: string) {
    super(`No nutrition data for "${query}"`);
    this.name = 'NoMatch';
  }
}

/** The provider is unreachable, rate-limited, or answering nonsense. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
