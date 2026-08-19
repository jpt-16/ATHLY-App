import { ZERO } from '../prototype/nutrients';
import type { Nutrients } from '../prototype/nutrients';

/**
 * Looking a barcode up in Open Food Facts.
 *
 * Open Food Facts rather than a commercial database: it is free, needs no key,
 * and its data is open — which matters because a nutrition figure an athlete is
 * held to should be one anyone can go and check. The trade is coverage and
 * quality. It is crowd-sourced, so a product may be missing, and a product that
 * is present may have been typed in by hand by a stranger.
 *
 * That trade shapes this module: nothing is trusted. A product with no energy
 * value is a miss rather than a zero-calorie food, and a figure outside what
 * food can physically contain is dropped rather than logged. An athlete cutting
 * weight against a number invented by a bad row is worse served than one who is
 * told the scan did not work.
 *
 * See `docs/NUTRITION.md` §9 for why food nutrition is *data* rather than
 * something a formula can produce.
 */

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

/** One scanned product, per 100 g, in ATHLY's units. */
export interface ScannedFood {
  barcode: string;
  name: string;
  /** Grams in the manufacturer's stated serving, when they state one. */
  servingGrams: number | null;
  per100g: Nutrients;
}

/**
 * Open Food Facts stores nearly everything in grams, including the minerals and
 * vitamins ATHLY shows in milligrams and micrograms. The multipliers are the
 * whole of the conversion, and getting one wrong is how iron ends up reading a
 * thousand times its real value.
 */
const FIELD: Record<keyof Nutrients, { key: string; scale: number; max: number }> = {
  kcal: { key: 'energy-kcal_100g', scale: 1, max: 900 },
  protein: { key: 'proteins_100g', scale: 1, max: 100 },
  carbs: { key: 'carbohydrates_100g', scale: 1, max: 100 },
  fat: { key: 'fat_100g', scale: 1, max: 100 },
  fiber: { key: 'fiber_100g', scale: 1, max: 100 },
  sugar: { key: 'sugars_100g', scale: 1, max: 100 },
  sodium: { key: 'sodium_100g', scale: 1000, max: 40000 },
  potassium: { key: 'potassium_100g', scale: 1000, max: 20000 },
  calcium: { key: 'calcium_100g', scale: 1000, max: 20000 },
  iron: { key: 'iron_100g', scale: 1000, max: 1000 },
  vitaminC: { key: 'vitamin-c_100g', scale: 1000, max: 10000 },
  vitaminD: { key: 'vitamin-d_100g', scale: 1_000_000, max: 1000 },
};

/** A number, or nothing — never a guess. */
function reading(raw: unknown, scale: number, max: number): number | null {
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0) return null;
  const scaled = value * scale;
  // Above this the row is wrong, not the food. 900 kcal per 100 g is pure fat;
  // nothing edible exceeds it, so a 3,000 is a units mistake in the source data.
  return scaled > max ? null : scaled;
}

/** The name to show, assembled from whichever of the two fields exist. */
function nameOf(product: Record<string, unknown>): string {
  const brand = String(product.brands ?? '')
    .split(',')[0]
    .trim();
  const name = String(product.product_name ?? '').trim();
  if (name && brand) return `${brand} ${name}`;
  return name || brand;
}

/**
 * Turn one API product into a `ScannedFood`, or reject it.
 *
 * Exported for its own test: this is where every unit conversion and every
 * refusal lives, and it is worth checking against a real payload without a
 * network call.
 */
export function readProduct(barcode: string, product: Record<string, unknown>): ScannedFood | null {
  const name = nameOf(product);
  if (!name) return null;

  const n = (product.nutriments ?? {}) as Record<string, unknown>;
  const per100g: Nutrients = { ...ZERO };
  const kcal = reading(n[FIELD.kcal.key], 1, FIELD.kcal.max);
  // Energy is the one field that cannot be absent. Everything else defaults to
  // zero because "not measured" and "none of it" are close enough for a
  // micronutrient; for calories they are not close at all.
  if (kcal === null) return null;
  per100g.kcal = kcal;

  for (const [nutrient, field] of Object.entries(FIELD) as [
    keyof Nutrients,
    (typeof FIELD)[keyof Nutrients],
  ][]) {
    if (nutrient === 'kcal') continue;
    per100g[nutrient] = reading(n[field.key], field.scale, field.max) ?? 0;
  }

  const serving = Number(product.serving_quantity);
  return {
    barcode,
    name,
    servingGrams: Number.isFinite(serving) && serving > 0 && serving <= 2000 ? serving : null,
    per100g,
  };
}

/** Scale a per-100 g product to a portion. */
export function portionOf(food: ScannedFood, grams: number): Nutrients {
  const factor = grams / 100;
  const out = { ...ZERO };
  for (const key of Object.keys(ZERO) as (keyof Nutrients)[]) {
    out[key] = Math.round(food.per100g[key] * factor * 100) / 100;
  }
  return out;
}

/**
 * Look one barcode up. `null` means "not found or not usable", which the caller
 * should say plainly rather than dressing up as an empty food.
 */
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<ScannedFood | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;

  const fields = ['product_name', 'brands', 'serving_quantity', 'nutriments'].join(',');
  const response = await fetch(`${ENDPOINT}/${barcode}.json?fields=${fields}`, { signal });
  if (!response.ok) return null;

  const body = (await response.json()) as { status?: number; product?: Record<string, unknown> };
  if (body.status !== 1 || !body.product) return null;
  return readProduct(barcode, body.product);
}
