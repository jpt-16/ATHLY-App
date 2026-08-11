/**
 * What is actually in the food.
 *
 * Two vocabularies and one lookup table. Everything the app knows about whether
 * a meal is safe for someone is derived from here — no meal carries a
 * hand-written allergen list, because a hand-written list drifts from its
 * ingredients the first time a recipe is edited and nobody notices.
 *
 * `foodFacts.test.ts` asserts that every ingredient named by every recipe has an
 * entry below. That guard matters more than it looks: without it, a new
 * ingredient with no entry would read as "contains no allergens" and quietly
 * become safe for everyone.
 *
 * This table stands in for the USDA FoodData Central ingredient rows that will
 * replace it. It carries the same shape — a canonical name, allergen tags, and
 * descriptive tags — so recipes do not have to change when the real data lands.
 */

/**
 * The nine allergens ATHLY asks about, matching the onboarding chips exactly.
 * A controlled vocabulary, never free text: comparing typed strings is how
 * allergen checks silently stop matching.
 */
export type Allergen =
  'peanuts' | 'tree_nuts' | 'dairy' | 'gluten' | 'shellfish' | 'fish' | 'soy' | 'eggs' | 'sesame';

export const ALLERGENS: readonly Allergen[] = [
  'peanuts',
  'tree_nuts',
  'dairy',
  'gluten',
  'shellfish',
  'fish',
  'soy',
  'eggs',
  'sesame',
];

/** Onboarding chip label → allergen. `None of these` is deliberately absent. */
export const ALLERGEN_BY_LABEL: Record<string, Allergen> = {
  Peanuts: 'peanuts',
  'Tree nuts': 'tree_nuts',
  Dairy: 'dairy',
  Gluten: 'gluten',
  Shellfish: 'shellfish',
  Fish: 'fish',
  Soy: 'soy',
  Eggs: 'eggs',
  Sesame: 'sesame',
};

/** Human-readable allergen names, for the copy shown when a slot is blocked. */
export const ALLERGEN_LABEL: Record<Allergen, string> = {
  peanuts: 'peanut',
  tree_nuts: 'tree nut',
  dairy: 'dairy',
  gluten: 'gluten',
  shellfish: 'shellfish',
  fish: 'fish',
  soy: 'soy',
  eggs: 'egg',
  sesame: 'sesame',
};

export interface IngredientFacts {
  /** Allergens the ingredient contains. Conservative by design — see notes. */
  allergens: Allergen[];
  /** Descriptive tags, used for the soft "won't eat" matching. */
  tags: string[];
}

/**
 * Where this table is deliberately over-cautious, and why.
 *
 * An allergen tag that is too broad costs someone a meal they could have eaten.
 * One that is too narrow costs them a reaction. Where a generic ingredient name
 * leaves real doubt, this table takes the first cost:
 *
 * - **Oats and granola → gluten.** Oats are not gluten grains, but uncertified
 *   oats are routinely cross-contaminated in milling. Certified gluten-free oats
 *   would be a separate ingredient row.
 * - **Granola → tree nuts.** Most commercial granola contains almonds or
 *   pecans. A nut-free granola would be its own row.
 * - **Soy sauce → gluten.** Standard soy sauce is brewed with wheat. Tamari
 *   would be its own row.
 * - **Caesar dressing → fish, eggs, dairy.** Caesar is anchovy, egg yolk and
 *   parmesan. Easy to miss reading the recipe.
 *
 * Each of these resolves precisely once ingredients are real USDA rows with
 * brand-level detail instead of generic names.
 */
export const INGREDIENT_FACTS: Record<string, IngredientFacts> = {
  // ── produce ────────────────────────────────────────────────────────
  Apple: { allergens: [], tags: ['fruit', 'apple'] },
  'Applesauce pouch': { allergens: [], tags: ['fruit', 'apple'] },
  Avocado: { allergens: [], tags: ['avocado'] },
  'Baby potatoes': { allergens: [], tags: ['potato'] },
  Banana: { allergens: [], tags: ['fruit', 'banana'] },
  Blueberries: { allergens: [], tags: ['fruit', 'berries'] },
  Broccolini: { allergens: [], tags: ['vegetable', 'greens', 'broccoli'] },
  Corn: { allergens: [], tags: ['vegetable', 'corn'] },
  Cucumber: { allergens: [], tags: ['vegetable', 'cucumber'] },
  Garlic: { allergens: [], tags: ['garlic'] },
  'Green beans': { allergens: [], tags: ['vegetable', 'green beans'] },
  Lemon: { allergens: [], tags: ['fruit', 'lemon'] },
  'Mixed berries': { allergens: [], tags: ['fruit', 'berries'] },
  Orange: { allergens: [], tags: ['fruit', 'orange'] },
  Pineapple: { allergens: [], tags: ['fruit', 'pineapple'] },
  Romaine: { allergens: [], tags: ['vegetable', 'greens', 'salad', 'lettuce'] },
  Spinach: { allergens: [], tags: ['vegetable', 'greens', 'spinach'] },
  'Sweet potato': { allergens: [], tags: ['sweet potatoes', 'potato'] },
  Zucchini: { allergens: [], tags: ['vegetable', 'zucchini'] },

  // ── meat, poultry, fish ────────────────────────────────────────────
  'Chicken breast': { allergens: [], tags: ['meat', 'poultry', 'chicken'] },
  'Chicken thigh': { allergens: [], tags: ['meat', 'poultry', 'chicken'] },
  'Deli turkey': { allergens: [], tags: ['meat', 'poultry', 'turkey'] },
  'Ground beef': { allergens: [], tags: ['meat', 'beef', 'ground beef'] },
  'Ground turkey': { allergens: [], tags: ['meat', 'poultry', 'turkey'] },
  'Rotisserie chicken': { allergens: [], tags: ['meat', 'poultry', 'chicken'] },
  'Salmon fillet': { allergens: ['fish'], tags: ['fish', 'seafood', 'salmon'] },
  Sirloin: { allergens: [], tags: ['meat', 'beef', 'steak'] },
  'Sliced turkey': { allergens: [], tags: ['meat', 'poultry', 'turkey'] },
  'Flank steak': { allergens: [], tags: ['meat', 'beef', 'steak'] },

  // ── dairy ──────────────────────────────────────────────────────────
  Butter: { allergens: ['dairy'], tags: ['dairy'] },
  Cheese: { allergens: ['dairy'], tags: ['dairy', 'cheese'] },
  'Cheese slice': { allergens: ['dairy'], tags: ['dairy', 'cheese'] },
  'Chocolate milk': { allergens: ['dairy'], tags: ['dairy', 'milk'] },
  'Greek yogurt': { allergens: ['dairy'], tags: ['dairy', 'yogurt', 'greek yogurt'] },
  'Heavy cream': { allergens: ['dairy'], tags: ['dairy', 'cream'] },
  Parmesan: { allergens: ['dairy'], tags: ['dairy', 'cheese', 'parmesan'] },
  'Shredded cheese': { allergens: ['dairy'], tags: ['dairy', 'cheese'] },
  'Whole milk': { allergens: ['dairy'], tags: ['dairy', 'milk'] },

  // ── dairy alternatives ─────────────────────────────────────────────
  'Coconut yogurt': { allergens: [], tags: ['coconut', 'yogurt', 'dairy free'] },
  'Oat milk': { allergens: ['gluten'], tags: ['milk', 'oats', 'dairy free'] },
  'Rice milk': { allergens: [], tags: ['milk', 'rice', 'dairy free'] },

  // ── grains and bread ───────────────────────────────────────────────
  'Cooked rice': { allergens: [], tags: ['grain', 'rice'] },
  'Corn tortilla': { allergens: [], tags: ['grain', 'corn', 'tortilla', 'gluten free'] },
  'Gluten-free bread': { allergens: [], tags: ['grain', 'bread', 'gluten free'] },
  'Gluten-free oats': { allergens: [], tags: ['grain', 'oats', 'oatmeal', 'gluten free'] },
  'Gluten-free pasta': { allergens: [], tags: ['grain', 'pasta', 'gluten free'] },
  'Jasmine rice': { allergens: [], tags: ['grain', 'rice'] },
  'Large tortilla': { allergens: ['gluten'], tags: ['grain', 'wheat', 'tortilla'] },
  Penne: { allergens: ['gluten'], tags: ['grain', 'wheat', 'pasta'] },
  'Plain bagel': { allergens: ['gluten'], tags: ['grain', 'wheat', 'bread', 'bagel'] },
  Polenta: { allergens: [], tags: ['grain', 'corn', 'gluten free'] },
  Pretzels: { allergens: ['gluten'], tags: ['grain', 'wheat', 'pretzels'] },
  Quinoa: { allergens: [], tags: ['grain', 'quinoa', 'gluten free'] },
  'Rice cakes': { allergens: [], tags: ['grain', 'rice', 'rice cakes'] },
  'Rice noodles': { allergens: [], tags: ['grain', 'rice', 'noodles', 'gluten free'] },
  // Uncertified oats are cross-contaminated in milling — see notes above.
  'Rolled oats': { allergens: ['gluten'], tags: ['grain', 'oats', 'oatmeal'] },
  'White bread': { allergens: ['gluten'], tags: ['grain', 'wheat', 'bread'] },
  'White rice': { allergens: [], tags: ['grain', 'rice'] },
  'Whole grain bread': { allergens: ['gluten'], tags: ['grain', 'wheat', 'bread'] },

  // ── legumes, nuts, seeds ───────────────────────────────────────────
  Almonds: { allergens: ['tree_nuts'], tags: ['nuts', 'almonds'] },
  'Almond butter': { allergens: ['tree_nuts'], tags: ['nuts', 'almonds'] },
  'Black beans': { allergens: [], tags: ['beans', 'legume'] },
  Chickpeas: { allergens: [], tags: ['beans', 'legume', 'chickpeas'] },
  'Frozen edamame': { allergens: ['soy'], tags: ['soy', 'legume', 'edamame'] },
  Hummus: { allergens: ['sesame'], tags: ['beans', 'legume', 'chickpeas', 'hummus'] },
  'Peanut butter': { allergens: ['peanuts'], tags: ['peanuts', 'peanut butter'] },
  'Pumpkin seeds': { allergens: [], tags: ['seeds', 'pumpkin seeds'] },
  'Sunflower seed butter': { allergens: [], tags: ['seeds', 'sunflower'] },
  Tofu: { allergens: ['soy'], tags: ['soy', 'tofu'] },

  // ── pantry, sauces, condiments ─────────────────────────────────────
  // Caesar is anchovy, egg yolk and parmesan — see notes above.
  'Caesar dressing': { allergens: ['dairy', 'eggs', 'fish'], tags: ['dressing', 'mayo', 'cheese', 'fish'] },
  'Coconut milk': { allergens: [], tags: ['coconut'] },
  // Most commercial granola carries almonds or pecans, and oats — see notes.
  Granola: { allergens: ['gluten', 'tree_nuts'], tags: ['grain', 'oats', 'granola', 'nuts'] },
  Honey: { allergens: [], tags: ['honey'] },
  'Maple syrup': { allergens: [], tags: ['syrup'] },
  'Olive oil': { allergens: [], tags: ['oil'] },
  'Orange juice': { allergens: [], tags: ['juice', 'orange', 'fruit'] },
  Salsa: { allergens: [], tags: ['tomatoes', 'onions', 'peppers', 'spicy', 'salsa'] },
  Salt: { allergens: [], tags: [] },
  'Sea salt': { allergens: [], tags: [] },
  // Standard soy sauce is brewed with wheat — see notes above.
  'Soy sauce': { allergens: ['soy', 'gluten'], tags: ['soy', 'soy sauce'] },
  'Coconut aminos': { allergens: [], tags: ['coconut', 'soy free'] },
  'Sports drink': { allergens: [], tags: ['sports drink'] },
  'Strawberry jam': { allergens: [], tags: ['jam', 'fruit', 'strawberry'] },
  'Taco seasoning': { allergens: [], tags: ['spicy', 'seasoning'] },
  'Protein powder': { allergens: ['dairy'], tags: ['dairy', 'protein powder', 'whey'] },
  'Pea protein powder': { allergens: [], tags: ['protein powder', 'pea protein', 'dairy free'] },
  Eggs: { allergens: ['eggs'], tags: ['eggs'] },
  'Egg whites': { allergens: ['eggs'], tags: ['eggs'] },
};

/**
 * "Won't eat" chip label → the tags that satisfy it.
 *
 * Soft preferences, not safety. Anything not listed falls back to matching the
 * label against ingredient names and tags directly, which is what makes the
 * free-text "anything with cilantro" entry work.
 */
export const DISLIKE_TAGS: Record<string, string[]> = {
  Mushrooms: ['mushrooms'],
  Fish: ['fish'],
  Shellfish: ['shellfish'],
  Tofu: ['tofu'],
  Olives: ['olives'],
  'Cottage cheese': ['cottage cheese'],
  Beans: ['beans', 'legume'],
  Broccoli: ['broccoli'],
  'Brussels sprouts': ['brussels sprouts'],
  Cauliflower: ['cauliflower'],
  Onions: ['onions'],
  Peppers: ['peppers'],
  Tomatoes: ['tomatoes'],
  'Spicy food': ['spicy'],
  Mayo: ['mayo'],
  Pickles: ['pickles'],
  Eggs: ['eggs'],
  Avocado: ['avocado'],
  Salad: ['salad', 'lettuce'],
  'Sweet potatoes': ['sweet potatoes'],
  Oatmeal: ['oats', 'oatmeal'],
  Pork: ['pork'],
  Curry: ['curry'],
  Sushi: ['sushi'],
  'Greek yogurt': ['greek yogurt'],
  Cheese: ['cheese'],
  Coconut: ['coconut'],
  Raisins: ['raisins'],
  Liver: ['liver'],
  Sardines: ['sardines', 'fish'],
};
