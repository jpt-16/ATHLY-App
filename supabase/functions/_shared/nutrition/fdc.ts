import { ProviderError, ZERO_NUTRIENTS } from './types.ts';
import type { FoodMatch, FoodSource, Portion, ProviderNutrients, SearchQuery } from './types.ts';

/**
 * USDA FoodData Central, as a `NutritionProvider`.
 *
 * FDC because it is the reference the rest of this repo already cites
 * (`tools/usda/`), it is free, it publishes provenance, and it carries three
 * kinds of food that map onto the three things an athlete types:
 *
 * - **Branded** — a manufacturer's own label. Best when a brand is named.
 * - **Foundation / SR Legacy** — laboratory analysis of a generic food. What
 *   "2 eggs" should match.
 * - **Survey (FNDDS)** — composite dishes as actually eaten, which is the only
 *   honest answer to "chicken parm with a side of pasta".
 *
 * Everything here is pure. The fetching, the API key and the retries live in the
 * Edge Function; this file turns a JSON document into `FoodMatch` values or
 * refuses to.
 */

/** FDC nutrient numbers. Stable across data types. */
const NUTRIENT = {
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  kcal: 1008,
  kcalAtwaterGeneral: 2047,
  kcalAtwaterSpecific: 2048,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
  potassium: 1092,
  calcium: 1087,
  iron: 1089,
  vitaminC: 1162,
  /** Vitamin D (D2 + D3), in micrograms. */
  vitaminD: 1114,
} as const;

/**
 * Ceilings past which a row is wrong rather than the food being unusual.
 *
 * Same reasoning as the barcode reader in `src/data/foodDb.ts`: 900 kcal per
 * 100 g is pure fat, so a 3,000 is a units mistake in the source. A bad energy
 * value takes the whole row, because nothing else can stand in for it.
 */
const MAX: ProviderNutrients = {
  kcal: 900,
  protein: 100,
  carbs: 100,
  fat: 100,
  fiber: 100,
  sugar: 100,
  sodium: 40000,
  potassium: 20000,
  calcium: 20000,
  iron: 1000,
  vitaminC: 10000,
  vitaminD: 1000,
};

/**
 * Pull every nutrient we track out of a food's nutrient list.
 *
 * Both FDC response shapes are handled, because it uses two: a search hit
 * flattens the nutrient (`nutrientId` / `value`), a detail document nests it
 * (`nutrient.id` / `amount`). Guessing which one you have is how every food ends
 * up reported as zero calories.
 */
export function readNutrients(foodNutrients: unknown): ProviderNutrients | null {
  if (!Array.isArray(foodNutrients)) return null;

  const by = new Map<number, number>();
  for (const entry of foodNutrients as Record<string, never>[]) {
    const e = entry as unknown as {
      nutrient?: { id?: number; unitName?: string };
      nutrientId?: number;
      amount?: number;
      value?: number;
      unitName?: string;
    };
    const id = e.nutrient?.id ?? e.nutrientId;
    const amount = e.amount ?? e.value;
    const unit = String(e.nutrient?.unitName ?? e.unitName ?? '').toUpperCase();
    if (typeof id !== 'number' || typeof amount !== 'number' || !Number.isFinite(amount)) continue;
    // Energy is published in both kilocalories and kilojoules under the same
    // number. Taking the first one seen gives a bowl of oats 2,600 calories.
    if (id === NUTRIENT.kcal && unit && unit !== 'KCAL') continue;
    if (!by.has(id)) by.set(id, amount);
  }

  const kcal =
    by.get(NUTRIENT.kcal) ?? by.get(NUTRIENT.kcalAtwaterSpecific) ?? by.get(NUTRIENT.kcalAtwaterGeneral);
  // No energy is a miss, not a zero-calorie food. Everything else defaults to
  // zero, because "not measured" and "none of it" are close enough for a
  // micronutrient and nowhere near close enough for calories.
  if (typeof kcal !== 'number' || !Number.isFinite(kcal)) return null;

  const take = (id: number, cap: number) => {
    const v = by.get(id);
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= cap ? v : 0;
  };

  if (kcal < 0 || kcal > MAX.kcal) return null;

  return {
    kcal: round(kcal),
    protein: round(take(NUTRIENT.protein, MAX.protein)),
    carbs: round(take(NUTRIENT.carbs, MAX.carbs)),
    fat: round(take(NUTRIENT.fat, MAX.fat)),
    fiber: round(take(NUTRIENT.fiber, MAX.fiber)),
    sugar: round(take(NUTRIENT.sugar, MAX.sugar)),
    sodium: round(take(NUTRIENT.sodium, MAX.sodium)),
    potassium: round(take(NUTRIENT.potassium, MAX.potassium)),
    calcium: round(take(NUTRIENT.calcium, MAX.calcium)),
    iron: round(take(NUTRIENT.iron, MAX.iron)),
    vitaminC: round(take(NUTRIENT.vitaminC, MAX.vitaminC)),
    vitaminD: round(take(NUTRIENT.vitaminD, MAX.vitaminD)),
  };
}

/** FDC's `dataType` mapped onto what the athlete is being told. */
export function sourceOf(dataType: string): FoodSource {
  return /branded/i.test(dataType) ? 'branded' : 'generic';
}

/** Portions FDC publishes, and only those. */
export function readPortions(doc: Record<string, unknown>): Portion[] {
  const out: Portion[] = [];

  const portions = doc.foodPortions;
  if (Array.isArray(portions)) {
    for (const p of portions as Record<string, unknown>[]) {
      const grams = Number(p.gramWeight);
      if (!Number.isFinite(grams) || grams <= 0) continue;
      const amount = Number(p.amount) || 1;
      const unit = String((p.measureUnit as { name?: string } | undefined)?.name ?? '').replace(
        /^undetermined$/i,
        '',
      );
      const modifier = String(p.modifier ?? '');
      const label = [amount === 1 ? '' : amount, unit || modifier || 'portion'].filter(Boolean).join(' ');
      out.push({ label: label.trim() || 'portion', grams: grams / (amount || 1) });
    }
  }

  // Branded foods carry a single serving instead of a portion list.
  const servingSize = Number(doc.servingSize);
  const servingUnit = String(doc.servingSizeUnit ?? '').toLowerCase();
  if (Number.isFinite(servingSize) && servingSize > 0 && (servingUnit === 'g' || servingUnit === 'ml')) {
    const household = String(doc.householdServingFullText ?? '').trim();
    out.push({ label: household || 'serving', grams: servingSize });
  }

  return out;
}

/**
 * How well a food's description answers what was asked.
 *
 * A ranking rather than a probability, and deliberately crude: the point is to
 * separate "this is obviously it" from "this is the least bad of forty", so the
 * client can mark the second kind as worth a look. Anything cleverer would be a
 * confidence the number does not deserve.
 */
export function scoreMatch(query: SearchQuery, description: string, dataType: string): number {
  const words = terms(query.text);
  if (words.length === 0) return 0.3;

  const desc = description.toLowerCase();
  // Stems, because an athlete types "eggs" and USDA writes "Egg, whole, raw".
  // Comparing the words as typed scored that pair at zero, which sorted the
  // right answer to the bottom of the list.
  const hits = words.filter((w) => desc.includes(w)).length;

  // The text match is worth at most 0.7, so the three bonuses still separate
  // rows that all matched every word. Scoring the text out of 1 made a perfect
  // match unimprovable and left branded and generic rows tied at the ceiling.
  let score = (hits / words.length) * 0.7;

  // A composite dish asked for as a dish is best answered by the survey data,
  // which describes food as eaten rather than as an ingredient.
  if (words.length > 1 && /survey|fndds/i.test(dataType)) score += 0.12;
  // A brand was named and this row has one.
  if (query.brand && /branded/i.test(dataType)) score += 0.15;
  // A shorter description that still matched everything is a closer match:
  // "Egg, whole, raw" beats "Egg, whole, dried, stabilized, glucose reduced".
  if (hits === words.length && desc.length < 40) score += 0.08;

  return Math.max(0, Math.min(1, round(score)));
}

/**
 * The words worth matching on, stemmed.
 *
 * Crude on purpose — trailing `es` and `s` and nothing else. A real stemmer
 * would be a dependency and a source of surprises, and the only job here is to
 * stop "eggs" and "Egg" from being treated as unrelated.
 */
function terms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
    .map((w) => (w.endsWith('es') && w.length > 4 ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w));
}

/**
 * One search response, turned into ranked matches.
 *
 * Throws on a payload that is not the shape FDC documents, rather than returning
 * an empty list: an empty list means "no such food", and a changed API is a
 * different problem that deserves a different answer.
 */
export function readSearch(query: SearchQuery, doc: unknown): FoodMatch[] {
  const foods = (doc as { foods?: unknown })?.foods;
  if (!Array.isArray(foods)) {
    throw new ProviderError('FoodData Central search response has no `foods` array', 'fdc');
  }

  const matches: FoodMatch[] = [];
  for (const raw of foods as Record<string, unknown>[]) {
    const fdcId = raw.fdcId;
    const description = String(raw.description ?? '').trim();
    if (typeof fdcId !== 'number' || !description) continue;

    const per100g = readNutrients(raw.foodNutrients);
    // A food with no usable energy value is not a food this app can quote.
    if (!per100g) continue;

    const dataType = String(raw.dataType ?? '');
    matches.push({
      id: `fdc:${fdcId}`,
      name: description,
      brand: String(raw.brandOwner ?? raw.brandName ?? '').trim() || null,
      source: sourceOf(dataType),
      dataType,
      per100g,
      portions: readPortions(raw),
      confidence: scoreMatch(query, description, dataType),
    });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/** The best match, or nothing. Never the least-bad of a poor list. */
export function bestMatch(matches: FoodMatch[], floor = 0.34): FoodMatch | null {
  const top = matches[0];
  return top && top.confidence >= floor ? top : null;
}

export { ZERO_NUTRIENTS };

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
