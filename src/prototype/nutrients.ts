/**
 * What is in the food, per 100 g, and how much 100 g is.
 *
 * ## Why this file exists
 *
 * Every meal in `data.ts` carried four hand-written numbers — `kcal`, `p`, `c`,
 * `f` — and nothing else. Two problems followed from that:
 *
 * 1. **Micronutrients were impossible.** There is no formula that turns
 *    "780 calories" into a milligram of iron. Nutrition is *data*, not
 *    arithmetic, and the data has to exist somewhere before anything can add it
 *    up.
 * 2. **The macros did not agree with themselves.** Only 17 of the 44 authored
 *    meals had a stated calorie count within 2% of `4·protein + 4·carbs +
 *    9·fat`. "Chicken pasta" claimed 750 kcal against a breakdown worth 680.
 *    The ring was totalling numbers that contradicted their own parts.
 *
 * So the numbers move down a level. Nutrition is declared per ingredient per
 * 100 g, each recipe declares how many grams of each ingredient it uses, and a
 * meal's nutrition is the sum. A meal's calories are now derivable from its
 * ingredients rather than asserted alongside them.
 *
 * ## What these values are, and are not
 *
 * They are **authored reference values**, in the same status as the macros they
 * replace and flagged the same way in `docs/PRODUCTION_READINESS.md` — better
 * provenance, not proof. Three things make them better than what came before:
 *
 * - An ingredient is checkable in a way a composed meal is not. "Chicken breast
 *   has 31 g of protein per 100 g" is a number anyone can look up and correct;
 *   "the burrito bowl has 52 g" is a number nobody can audit.
 * - They are the shape `tools/usda/` produces. When the FoodData Central ingest
 *   finally runs, it fills this table in place — no recipe has to change.
 * - Portions are stated in grams per ingredient per quantity string, which is
 *   the same discipline the USDA plan set: **no invented gram weights**. Each
 *   entry below is a portion someone chose, not a unit conversion this file
 *   guessed at, so "1 cup" of oats and "1 cup" of rice differ as they should.
 *
 * Units: energy in kcal; protein, carbohydrate, fat, fibre and sugar in grams;
 * sodium, potassium, calcium, iron and vitamin C in milligrams; vitamin D in
 * micrograms.
 */

/** Everything ATHLY tracks about a quantity of food. */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  vitaminD: number;
}

/** The eight micronutrients, named once so every consumer agrees on the set. */
export const MICRONUTRIENTS = [
  'fiber',
  'sugar',
  'sodium',
  'potassium',
  'calcium',
  'iron',
  'vitaminC',
  'vitaminD',
] as const;

export type Micronutrient = (typeof MICRONUTRIENTS)[number];

/** The four macronutrients, in the order every screen shows them. */
export const MACRONUTRIENTS = ['protein', 'carbs', 'fat'] as const;

export const ZERO: Nutrients = {
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

/** How each nutrient is written on screen. */
export const NUTRIENT_UNIT: Record<keyof Nutrients, string> = {
  kcal: 'cal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
  sugar: 'g',
  sodium: 'mg',
  potassium: 'mg',
  calcium: 'mg',
  iron: 'mg',
  vitaminC: 'mg',
  vitaminD: 'mcg',
};

export const NUTRIENT_LABEL: Record<keyof Nutrients, string> = {
  kcal: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
  sodium: 'Sodium',
  potassium: 'Potassium',
  calcium: 'Calcium',
  iron: 'Iron',
  vitaminC: 'Vitamin C',
  vitaminD: 'Vitamin D',
};

/**
 * One ingredient: what it contains per 100 g, and what its portions weigh.
 *
 * `portions` is keyed by the exact quantity string the recipes use, so an
 * unrecognised quantity fails loudly in `nutrients.test.ts` rather than being
 * silently treated as zero.
 */
export interface IngredientNutrition {
  per100g: Nutrients;
  portions: Record<string, number>;
}

/** Shorthand so the table below is readable: values in the order of `Nutrients`. */
function n(
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  sugar: number,
  sodium: number,
  potassium: number,
  calcium: number,
  iron: number,
  vitaminC: number,
  vitaminD: number,
): Nutrients {
  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    potassium,
    calcium,
    iron,
    vitaminC,
    vitaminD,
  };
}

/**
 * The table.
 *
 * Cooked weights for anything served cooked — rice, pasta, meat — because that
 * is what a portion of it weighs on a plate. Dry weights only where the recipe
 * says "dry".
 */
export const INGREDIENT_NUTRITION: Record<string, IngredientNutrition> = {
  // ── produce ────────────────────────────────────────────────────────
  //                kcal  pro  carb  fat fib  sug   Na    K   Ca   Fe   C    D
  Apple: { per100g: n(52, 0.3, 13.8, 0.2, 2.4, 10.4, 1, 107, 6, 0.12, 4.6, 0), portions: { '1': 182 } },
  'Applesauce pouch': {
    per100g: n(68, 0.2, 17.5, 0.1, 1.3, 14.8, 2, 75, 4, 0.13, 1.5, 0),
    portions: { '1': 90 },
  },
  Avocado: {
    per100g: n(160, 2.0, 8.5, 14.7, 6.7, 0.7, 7, 485, 12, 0.55, 10.0, 0),
    portions: { '1/2': 100 },
  },
  'Baby potatoes': {
    per100g: n(87, 1.9, 20.1, 0.1, 1.8, 0.9, 4, 379, 8, 0.31, 13.0, 0),
    portions: { '10 oz': 283 },
  },
  Banana: {
    per100g: n(89, 1.1, 22.8, 0.3, 2.6, 12.2, 1, 358, 5, 0.26, 8.7, 0),
    portions: { '1': 118, '1 large': 136 },
  },
  Blueberries: {
    per100g: n(57, 0.7, 14.5, 0.3, 2.4, 10.0, 1, 77, 6, 0.28, 9.7, 0),
    portions: { '1 cup': 148 },
  },
  Broccolini: {
    per100g: n(35, 3.0, 6.0, 0.4, 3.0, 1.5, 30, 315, 60, 0.8, 65.0, 0),
    portions: { '1 bunch': 150 },
  },
  Corn: {
    per100g: n(96, 3.4, 21.0, 1.5, 2.4, 4.5, 15, 218, 2, 0.45, 5.5, 0),
    portions: { '1/2 cup': 82 },
  },
  Garlic: {
    per100g: n(149, 6.4, 33.1, 0.5, 2.1, 1.0, 17, 401, 181, 1.7, 31.2, 0),
    portions: { '3 cloves': 9 },
  },
  'Green beans': {
    per100g: n(35, 1.8, 7.9, 0.2, 3.4, 3.3, 6, 211, 37, 0.65, 12.2, 0),
    portions: { '1 cup': 100, '2 cups': 200 },
  },
  'Mixed berries': {
    per100g: n(50, 0.8, 12.0, 0.4, 3.5, 7.0, 2, 120, 20, 0.45, 25.0, 0),
    portions: { '1 cup': 144 },
  },
  Pineapple: {
    per100g: n(50, 0.5, 13.1, 0.1, 1.4, 9.9, 1, 109, 13, 0.29, 47.8, 0),
    portions: { '1 cup': 165 },
  },
  Romaine: {
    per100g: n(17, 1.2, 3.3, 0.3, 2.1, 1.2, 8, 247, 33, 0.97, 4.0, 0),
    portions: { '1 cup': 47, '2 cups': 94 },
  },
  Spinach: {
    per100g: n(23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 558, 99, 2.71, 28.1, 0),
    portions: { '2 handfuls': 60 },
  },
  'Sweet potato': {
    per100g: n(86, 1.6, 20.1, 0.1, 3.0, 4.2, 55, 337, 30, 0.61, 2.4, 0),
    portions: { '10 oz': 283 },
  },
  Zucchini: {
    per100g: n(17, 1.2, 3.1, 0.3, 1.0, 2.5, 8, 261, 16, 0.37, 17.9, 0),
    portions: { '1': 196 },
  },

  // ── meat, poultry, fish (cooked) ───────────────────────────────────
  'Chicken breast': {
    per100g: n(165, 31.0, 0, 3.6, 0, 0, 74, 256, 15, 1.04, 0, 0.1),
    portions: { '5 oz': 142, '6 oz': 170, '7 oz': 198 },
  },
  'Chicken thigh': {
    per100g: n(209, 26.0, 0, 10.9, 0, 0, 88, 230, 12, 1.26, 0, 0.1),
    portions: { '6 oz': 170, '7 oz': 198 },
  },
  'Rotisserie chicken': {
    per100g: n(190, 29.0, 0, 7.5, 0, 0, 330, 240, 14, 1.1, 0, 0.1),
    portions: { '6 oz': 170 },
  },
  'Deli turkey': {
    per100g: n(104, 17.1, 3.5, 2.0, 0.2, 2.0, 1010, 302, 9, 0.9, 0, 0.2),
    portions: { '4 oz': 113 },
  },
  'Sliced turkey': {
    per100g: n(104, 17.1, 3.5, 2.0, 0.2, 2.0, 1010, 302, 9, 0.9, 0, 0.2),
    portions: { '4 oz': 113, '5 oz': 142 },
  },
  'Ground turkey': {
    per100g: n(203, 27.0, 0, 10.4, 0, 0, 78, 291, 25, 1.6, 0, 0.2),
    portions: { '6 oz': 170 },
  },
  'Ground beef': {
    per100g: n(217, 26.1, 0, 11.9, 0, 0, 72, 318, 20, 2.6, 0, 0.1),
    portions: { '5 oz': 142, '6 oz': 170 },
  },
  Sirloin: {
    per100g: n(212, 30.6, 0, 9.1, 0, 0, 56, 340, 20, 2.5, 0, 0.1),
    portions: { '7 oz': 198 },
  },
  'Salmon fillet': {
    per100g: n(208, 20.4, 0, 13.4, 0, 0, 59, 363, 9, 0.34, 0, 11.0),
    portions: { '7 oz': 198 },
  },

  // ── dairy and eggs ─────────────────────────────────────────────────
  Eggs: {
    per100g: n(143, 12.6, 0.7, 9.5, 0, 0.4, 142, 138, 56, 1.75, 0, 2.0),
    portions: { '3': 150 },
  },
  'Whole milk': {
    per100g: n(61, 3.2, 4.8, 3.3, 0, 5.1, 43, 150, 113, 0.03, 0, 1.3),
    portions: { '1 cup': 244 },
  },
  'Chocolate milk': {
    per100g: n(83, 3.2, 10.3, 3.4, 0.5, 9.5, 60, 167, 112, 0.24, 0.9, 1.2),
    portions: { '16 oz': 488 },
  },
  'Greek yogurt': {
    per100g: n(59, 10.2, 3.6, 0.4, 0, 3.2, 36, 141, 110, 0.07, 0, 0),
    portions: { '1/2 cup': 140 },
  },
  Cheese: {
    per100g: n(371, 23.2, 2.9, 29.7, 0, 0.5, 653, 98, 710, 0.14, 0, 0.6),
    portions: { '1 slice': 21 },
  },
  'Cheese slice': {
    per100g: n(371, 23.2, 2.9, 29.7, 0, 0.5, 653, 98, 710, 0.14, 0, 0.6),
    portions: { '1': 21 },
  },
  'Shredded cheese': {
    per100g: n(371, 23.2, 2.9, 29.7, 0, 0.5, 653, 98, 710, 0.14, 0, 0.6),
    portions: { '1/4 cup': 28 },
  },
  Parmesan: {
    per100g: n(392, 35.8, 3.2, 25.8, 0, 0.8, 1529, 92, 1184, 0.82, 0, 0.5),
    portions: { '1/4 cup': 25 },
  },
  Butter: {
    per100g: n(717, 0.9, 0.1, 81.1, 0, 0.1, 11, 24, 24, 0.02, 0, 1.5),
    portions: { '1 tbsp': 14 },
  },
  'Heavy cream': {
    per100g: n(340, 2.8, 2.7, 36.1, 0, 2.7, 27, 95, 66, 0.03, 0.6, 1.1),
    portions: { '1/3 cup': 79 },
  },

  // ── dairy alternatives ─────────────────────────────────────────────
  'Coconut yogurt': {
    per100g: n(97, 1.0, 8.5, 6.6, 1.0, 6.0, 25, 90, 120, 0.3, 0, 0.8),
    portions: { '1 cup': 227 },
  },
  'Rice milk': {
    per100g: n(47, 0.3, 9.2, 1.0, 0.3, 5.3, 39, 27, 118, 0.08, 0, 1.0),
    portions: { '1 cup': 240, '12 oz': 366 },
  },

  // ── grains, breads, pasta ──────────────────────────────────────────
  'Rolled oats': {
    per100g: n(389, 16.9, 66.3, 6.9, 10.6, 0.99, 2, 429, 54, 4.72, 0, 0),
    portions: { '1 cup': 81 },
  },
  'Gluten-free oats': {
    per100g: n(379, 13.2, 67.7, 6.5, 10.1, 0.8, 6, 362, 52, 3.9, 0, 0),
    portions: { '1 cup': 81 },
  },
  Granola: {
    per100g: n(471, 10.0, 64.4, 20.0, 7.0, 21.0, 26, 336, 76, 3.2, 0.6, 0),
    portions: { '1/2 cup': 61 },
  },
  Quinoa: {
    per100g: n(120, 4.4, 21.3, 1.9, 2.8, 0.9, 7, 172, 17, 1.49, 0, 0),
    portions: { '1 cup': 185 },
  },
  'Cooked rice': {
    per100g: n(130, 2.7, 28.2, 0.3, 0.4, 0.1, 1, 35, 10, 1.2, 0, 0),
    portions: { '1 cup': 158, '1.5 cups': 237 },
  },
  'White rice': {
    per100g: n(130, 2.7, 28.2, 0.3, 0.4, 0.1, 1, 35, 10, 1.2, 0, 0),
    portions: { '1 cup': 158 },
  },
  'Jasmine rice': {
    per100g: n(130, 2.7, 28.2, 0.3, 0.4, 0.1, 1, 35, 10, 1.2, 0, 0),
    portions: { '1 cup': 158 },
  },
  Penne: {
    per100g: n(371, 13.0, 74.7, 1.5, 3.2, 2.7, 6, 223, 21, 3.3, 0, 0),
    portions: { '3 oz dry': 85 },
  },
  'Gluten-free pasta': {
    per100g: n(357, 7.1, 78.6, 1.8, 3.6, 1.8, 7, 120, 14, 1.1, 0, 0),
    portions: { '3 oz dry': 85 },
  },
  'Rice noodles': {
    per100g: n(364, 5.9, 83.2, 0.6, 1.6, 0.1, 8, 30, 18, 0.7, 0, 0),
    portions: { '3 oz dry': 85 },
  },
  'White bread': {
    per100g: n(266, 9.0, 49.0, 3.3, 2.7, 5.7, 490, 115, 144, 3.6, 0, 0),
    portions: { '2 slices': 56 },
  },
  'Whole grain bread': {
    per100g: n(247, 13.0, 41.0, 3.4, 7.0, 6.0, 450, 250, 110, 2.5, 0, 0),
    portions: { '2 slices': 64 },
  },
  'Gluten-free bread': {
    per100g: n(263, 4.5, 47.0, 6.0, 3.5, 4.0, 460, 120, 90, 1.6, 0, 0),
    portions: { '2 slices': 60 },
  },
  'Plain bagel': {
    per100g: n(257, 10.0, 50.5, 1.6, 2.2, 5.3, 439, 106, 61, 3.3, 0, 0),
    portions: { '1': 98 },
  },
  'Corn tortilla': {
    per100g: n(218, 5.7, 44.6, 2.9, 6.3, 0.8, 45, 186, 81, 1.6, 0, 0),
    portions: { '3': 78 },
  },
  'Large tortilla': {
    per100g: n(306, 8.2, 51.4, 7.5, 3.0, 2.7, 640, 140, 140, 3.2, 0, 0),
    portions: { '1': 72 },
  },
  'Rice cakes': {
    per100g: n(387, 8.2, 81.5, 2.8, 4.2, 0.7, 30, 260, 11, 1.5, 0, 0),
    portions: { '2': 18, '3': 27 },
  },
  Pretzels: {
    per100g: n(384, 10.0, 80.4, 2.9, 3.0, 2.6, 1240, 155, 26, 4.6, 0, 0),
    portions: { '2 oz': 57 },
  },

  // ── legumes, nuts, seeds ───────────────────────────────────────────
  'Black beans': {
    per100g: n(91, 6.0, 16.6, 0.3, 6.9, 0.3, 238, 240, 27, 1.8, 0, 0),
    portions: { '1/2 cup': 86 },
  },
  'Frozen edamame': {
    per100g: n(121, 11.9, 8.9, 5.2, 5.2, 2.2, 6, 436, 63, 2.27, 6.1, 0),
    portions: { '1/2 cup': 78 },
  },
  'Peanut butter': {
    per100g: n(588, 25.1, 19.6, 50.4, 6.0, 9.2, 350, 649, 43, 1.9, 0, 0),
    portions: { '2 tbsp': 32 },
  },
  'Sunflower seed butter': {
    per100g: n(617, 17.3, 23.3, 55.2, 6.0, 8.0, 3, 576, 78, 3.8, 1.0, 0),
    portions: { '1 tbsp': 16, '2 tbsp': 32 },
  },
  'Pumpkin seeds': {
    per100g: n(559, 30.2, 10.7, 49.1, 6.0, 1.4, 7, 809, 46, 8.82, 1.9, 0),
    portions: { '2 tbsp': 18 },
  },
  'Pea protein powder': {
    per100g: n(375, 80.0, 7.0, 5.0, 4.0, 1.0, 700, 100, 200, 8.0, 0, 0),
    portions: { '1 scoop': 30 },
  },

  // ── fats, sauces, sweeteners, drinks ───────────────────────────────
  'Olive oil': {
    per100g: n(884, 0, 0, 100, 0, 0, 2, 1, 1, 0.56, 0, 0),
    portions: { '1 tbsp': 13.5 },
  },
  Honey: {
    per100g: n(304, 0.3, 82.4, 0, 0.2, 82.1, 4, 52, 6, 0.42, 0.5, 0),
    portions: { '1 tbsp': 21 },
  },
  'Maple syrup': {
    per100g: n(260, 0, 67.0, 0.1, 0, 60.5, 12, 212, 102, 0.11, 0, 0),
    portions: { '1 tbsp': 20 },
  },
  'Strawberry jam': {
    per100g: n(278, 0.4, 68.9, 0.1, 1.1, 49.9, 32, 77, 20, 0.36, 8.8, 0),
    portions: { '1 tbsp': 20 },
  },
  'Caesar dressing': {
    per100g: n(542, 1.4, 3.3, 57.9, 0.3, 2.5, 1100, 34, 39, 0.36, 0, 0.3),
    portions: { '2 tbsp': 30 },
  },
  Salsa: {
    per100g: n(29, 1.5, 6.6, 0.2, 1.8, 3.6, 711, 275, 27, 0.6, 8.0, 0),
    portions: { '2 tbsp': 32, '3 tbsp': 48, '1/2 cup': 130 },
  },
  'Soy sauce': {
    per100g: n(53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493, 435, 33, 1.45, 0, 0),
    portions: { '1 tbsp': 16, '2 tbsp': 32 },
  },
  'Coconut aminos': {
    per100g: n(80, 0.7, 20.0, 0, 0, 13.3, 3667, 400, 13, 0.5, 0, 0),
    portions: { '1 tbsp': 15 },
  },
  'Orange juice': {
    per100g: n(45, 0.7, 10.4, 0.2, 0.2, 8.4, 1, 200, 11, 0.2, 50.0, 0),
    portions: { '10 oz': 305 },
  },
  'Sports drink': {
    per100g: n(25, 0, 6.0, 0, 0, 5.8, 41, 10, 1, 0, 0, 0),
    portions: { '12 oz': 360 },
  },
  Salt: {
    per100g: n(0, 0, 0, 0, 0, 0, 38758, 8, 24, 0.33, 0, 0),
    portions: { pinch: 0.4 },
  },
  'Sea salt': {
    per100g: n(0, 0, 0, 0, 0, 0, 38758, 8, 24, 0.33, 0, 0),
    portions: { pinch: 0.4 },
  },
};

/** Add `b` into `a`, scaled. Returns a new object; nothing here mutates. */
export function addScaled(a: Nutrients, b: Nutrients, factor: number): Nutrients {
  const out = {} as Nutrients;
  for (const key of Object.keys(ZERO) as (keyof Nutrients)[]) {
    out[key] = a[key] + b[key] * factor;
  }
  return out;
}

/** Round every value to the precision each nutrient is actually shown at. */
export function roundNutrients(v: Nutrients): Nutrients {
  const whole = (x: number) => Math.round(x);
  const oneDp = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: whole(v.kcal),
    protein: whole(v.protein),
    carbs: whole(v.carbs),
    fat: whole(v.fat),
    fiber: whole(v.fiber),
    sugar: whole(v.sugar),
    sodium: whole(v.sodium),
    potassium: whole(v.potassium),
    calcium: whole(v.calcium),
    // Iron and vitamin D land in single digits, where rounding to whole numbers
    // throws away most of the signal.
    iron: oneDp(v.iron),
    vitaminC: whole(v.vitaminC),
    vitaminD: oneDp(v.vitaminD),
  };
}

export interface UnknownPortion {
  ingredient: string;
  quantity: string;
}

/**
 * Add up a recipe's ingredient list.
 *
 * Anything the table does not know about is *reported*, not skipped silently:
 * a missing ingredient makes a meal look lighter than it is, which is the one
 * failure mode that would quietly corrupt every total downstream.
 * `nutrients.test.ts` asserts the list is empty for every shipped recipe.
 */
export function sumIngredients(ingredients: readonly (readonly [string, string, number])[]): {
  total: Nutrients;
  unknown: UnknownPortion[];
} {
  let total = ZERO;
  const unknown: UnknownPortion[] = [];

  for (const [name, quantity] of ingredients) {
    const entry = INGREDIENT_NUTRITION[name];
    const grams = entry?.portions[quantity];
    if (!entry || grams == null) {
      unknown.push({ ingredient: name, quantity });
      continue;
    }
    total = addScaled(total, entry.per100g, grams / 100);
  }

  return { total: roundNutrients(total), unknown };
}
