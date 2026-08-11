/**
 * FoodData Central responses, turned into something this repo can use.
 *
 * Kept apart from `ingest.mjs` on purpose: everything here is a pure function of
 * a JSON document, so it can be tested against committed fixtures without a
 * network or an API key. `ingest.mjs` does the fetching and the file writing and
 * nothing else.
 *
 * **This has never seen a live response.** The environment these scripts were
 * written in cannot reach `api.nal.usda.gov`, so the shapes below come from the
 * FDC documentation, not from observation. That is why `normalizeFood` validates
 * instead of casting, and why every failure carries the raw payload: the first
 * real run may well find a field in a different place, and a loud crash pointing
 * at the document is worth ten times a silent zero that ends up on a meal card.
 */

/** Nutrient numbers, which are stable across FDC data types. */
const NUTRIENT = {
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  /** Energy, as reported. */
  kcal: 1008,
  /** Energy computed from Atwater factors — Foundation foods often carry these instead. */
  kcalAtwaterGeneral: 2047,
  kcalAtwaterSpecific: 2048,
};

/**
 * Pull the four numbers we need out of a food's nutrient list.
 *
 * Both response shapes are handled because FDC uses two: a search hit flattens
 * the nutrient (`nutrientId` / `value`), a detail document nests it
 * (`nutrient.id` / `amount`). Guessing which one you have is how a script ends
 * up reporting every food as zero calories.
 */
export function readNutrients(foodNutrients) {
  if (!Array.isArray(foodNutrients)) return null;

  const by = new Map();
  for (const entry of foodNutrients) {
    const id = entry?.nutrient?.id ?? entry?.nutrientId;
    const amount = entry?.amount ?? entry?.value;
    const unit = String(entry?.nutrient?.unitName ?? entry?.unitName ?? '').toUpperCase();
    if (typeof id !== 'number' || !Number.isFinite(amount)) continue;
    // Energy is published in both kilocalories and kilojoules under the same
    // number. Taking the first one you see gives you a food with 2600 calories
    // in a bowl of oats.
    if (id === NUTRIENT.kcal && unit && unit !== 'KCAL') continue;
    if (!by.has(id)) by.set(id, amount);
  }

  const kcal =
    by.get(NUTRIENT.kcal) ?? by.get(NUTRIENT.kcalAtwaterSpecific) ?? by.get(NUTRIENT.kcalAtwaterGeneral);
  if (!Number.isFinite(kcal)) return null;

  return {
    kcal,
    protein: by.get(NUTRIENT.protein) ?? 0,
    carbs: by.get(NUTRIENT.carbs) ?? 0,
    fat: by.get(NUTRIENT.fat) ?? 0,
  };
}

/**
 * A detail document, reduced to per-100g macros and the portions we can weigh
 * things with.
 *
 * Throws rather than returns a partial: a food with no usable energy figure is a
 * food this repo must not quote.
 */
export function normalizeFood(doc) {
  const fdcId = doc?.fdcId;
  if (typeof fdcId !== 'number') {
    throw new FdcShapeError('no fdcId on the food document', doc);
  }

  const per100g = readNutrients(doc.foodNutrients);
  if (!per100g) {
    throw new FdcShapeError(`food ${fdcId} has no usable energy value`, doc.foodNutrients);
  }

  return {
    fdcId,
    description: String(doc.description ?? ''),
    dataType: String(doc.dataType ?? ''),
    // FDC publishes Foundation and SR Legacy nutrients per 100g. Branded foods
    // do not always, which is one reason the ingest asks for neither.
    per100g: {
      kcal: round(per100g.kcal),
      protein: round(per100g.protein),
      carbs: round(per100g.carbs),
      fat: round(per100g.fat),
    },
    portions: normalizePortions(doc.foodPortions),
  };
}

function normalizePortions(portions) {
  if (!Array.isArray(portions)) return [];
  return portions
    .map((p) => ({
      amount: Number(p?.amount) || 1,
      gramWeight: Number(p?.gramWeight),
      unit: String(p?.measureUnit?.name ?? '').replace(/^undetermined$/i, ''),
      modifier: String(p?.modifier ?? ''),
      description: String(p?.portionDescription ?? ''),
    }))
    .filter((p) => Number.isFinite(p.gramWeight) && p.gramWeight > 0);
}

/**
 * Search hits, trimmed to what a human needs to pick one.
 *
 * Deliberately does *not* choose. The whole point of the review step is that a
 * fuzzy text match against "Cheese" is a guess, and a guess is the thing this
 * work exists to remove.
 */
export function readCandidates(doc) {
  const foods = doc?.foods;
  if (!Array.isArray(foods)) {
    throw new FdcShapeError('search response has no `foods` array', doc);
  }
  return foods.map((f) => {
    const n = readNutrients(f.foodNutrients);
    return {
      fdcId: f?.fdcId,
      description: String(f?.description ?? ''),
      dataType: String(f?.dataType ?? ''),
      kcalPer100g: n ? round(n.kcal) : null,
      proteinPer100g: n ? round(n.protein) : null,
    };
  });
}

export class FdcShapeError extends Error {
  constructor(message, payload) {
    super(
      `${message}\n\nThe response is not the shape these scripts expect. ` +
        `Raw payload follows so you can see what changed:\n${JSON.stringify(payload, null, 2).slice(0, 4000)}`,
    );
    this.name = 'FdcShapeError';
  }
}

function round(n) {
  return Math.round(n * 100) / 100;
}
