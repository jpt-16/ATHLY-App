/**
 * ATHLY content and design tokens.
 *
 * Every value here is carried over verbatim from the ATHLY Claude Design
 * prototype (`ATHLY.dc.html`) — the meal library, the onboarding script, the
 * tile palettes and the copy that the screens render. It is deliberately static
 * sample data: the prototype ships a complete, self-contained walkthrough with
 * no backend. Swapping this module for API-backed loaders is the natural first
 * step when the real service lands.
 */

export interface Tile {
  bg: string;
  a: string;
  b: string;
  c: string;
  ink: string;
}

/** Meal record: macros, prep time, the reasons Athly gives, and the recipe. */
export interface Meal {
  id: string;
  slot: string;
  timeText: string;
  name: string;
  /**
   * Nutrition is *not* here.
   *
   * Every meal used to carry `kcal`, `p`, `c` and `f` as four hand-written
   * numbers. They disagreed with themselves — 27 of 44 stated a calorie count
   * more than 2% away from their own macro breakdown — and they could never
   * carry a micronutrient, because there is no arithmetic that turns "780
   * calories" into a milligram of iron.
   *
   * A meal's nutrition is now computed from `ingredients` via
   * `portions.ts:nutritionOf`, which reads the per-100g table in `nutrients.ts`.
   * Removing the fields rather than deprecating them is deliberate: it makes the
   * compiler find every screen that was reading an authored number.
   */
  prep: string;
  tile: Tile;
  next?: number;
  reasons: string[];
  /** `[ingredient, quantity, alreadyInYourKitchen]` */
  ingredients: [string, string, number][];
  steps: string[];
}

/** One choice in a single-select onboarding question. */
export interface ObChoice {
  v: string;
  label: string;
  hint: string;
}

interface ObStepBase {
  key: string;
  /** Rendered as the step kicker: "Step 3 · Baseline". */
  tag: string;
  title: string;
  sub: string;
  /** Placeholder for the free-text "add your own" field on chip questions. */
  hint?: string;
}

/**
 * One onboarding question. `type` selects which editor the screen renders, and
 * discriminates the shape of `options`.
 */
export type ObStep =
  | (ObStepBase & { type: 'text' | 'body' | 'target' | 'week'; options?: undefined })
  | (ObStepBase & { type: 'list'; options: ObChoice[] })
  | (ObStepBase & { type: 'chips'; options: string[] });

// ── design tokens ────────────────────────────────────────────────────

export const INK = '#111815';
export const GREEN = '#17A05E';
export const LINE = 'rgba(17,24,21,.12)';
const T = (bg: string, a: string, b: string, c: string, ink: string): Tile => ({ bg, a, b, c, ink });
export const TILES = {
  oats: T('#EDE3D2', '#C08B4A', '#F4F2ED', '#8B5E2B', '#7A4E1E'),
  bowl: T('#E4EDE0', '#5B8C4A', '#E8C15C', '#2F5233', '#2F5233'),
  snack: T('#F0E6D0', '#D9A441', '#F4F2ED', '#5BE3A0', '#8A6413'),
  steak: T('#E9DDD6', '#8A4B3C', '#D9C7A8', '#5B8C4A', '#6E3427'),
  shake: T('#E2E5EC', '#6B5B4A', '#F4F2ED', '#C08B4A', '#414B59'),
  salmon: T('#F1E1DA', '#D4735A', '#7FA88A', '#F4F2ED', '#A33F26'),
  taco: T('#EFE7D6', '#C9A227', '#7A9A5B', '#B4462F', '#875515'),
  wrap: T('#E7EAE1', '#9BAE83', '#F4F2ED', '#6B7F52', '#495837'),
  /**
   * A slot the allergy filter emptied. Drawn from the page ground rather than a
   * food palette, so it reads as an absence instead of a dish.
   */
  blocked: T('#EFEDE7', '#DFDBD1', '#E6E3DB', '#DFDBD1', '#A9A498'),
};
const WORDS: Record<string, string> = {
  breakfast: 'Oats',
  lunch: 'Burrito bowl',
  snack: 'Rice cakes',
  dinner: 'Pasta',
  recovery: 'Choc milk',
  prelift: 'Toast + jam',
  postlift: 'Bagel',
  preliftPm: 'Pretzels',
  postliftPm: 'Rice bowl',
  steakpot: 'Steak',
  salmon: 'Salmon',
  taco: 'Beef bowl',
  wrap: 'Wrap',
  pregame: 'Sandwich',

  // Allergen-free coverage.
  //
  // Tiles set these in a heavy condensed face and clip at the edge, and the
  // design deliberately lets a word bleed — "Sandwich" overhangs its 62px tile
  // by 25px, "Pretzels" by 18px. So these do not need to fit; they need to stay
  // inside that shipped range. Anything much past ~25px stops reading as a
  // cropped word and starts reading as a mistake.
  breakfastBerry: 'Berry bowl',
  breakfastOatsFree: 'Oats',
  breakfastScramble: 'Eggs + rice',
  lunchQuinoa: 'Quinoa bowl',
  lunchTurkeyRice: 'Turkey bowl',
  lunchTacos: 'Tacos',
  snackPineapple: 'Rice cakes',
  snackMaple: 'Rice cakes',
  snackToast: 'Toast',
  dinnerSteakSweet: 'Steak',
  dinnerGarlicChicken: 'Chicken',
  dinnerPastaFree: 'Pasta',
  recoveryShake: 'Shake',
  recoveryTurkey: 'Turkey',
  recoveryYogurt: 'Yogurt',
  preliftRice: 'Rice cakes',
  preliftToast: 'Toast',
  preliftSauce: 'Apple',
  postliftRice: 'Rice bowl',
  postliftWrap: 'Wrap',
  postliftShake: 'Shake',
  preliftPmRice: 'Rice cakes',
  preliftPmFruit: 'Banana',
  preliftPmToast: 'Toast',
  postliftPmBeef: 'Beef bowl',
  postliftPmQuinoa: 'Quinoa',
  postliftPmNoodles: 'Noodles',
  pregameRice: 'Chicken',
  pregameTurkey: 'Turkey',
  pregameSandwich: 'Sandwich',
};
export const field = (id: string, fs: number, pad: number) => {
  const t = MEALS[id].tile;
  return {
    word: WORDS[id] || MEALS[id].name,
    fieldStyle: `position:absolute;inset:0;background:${t.bg};display:flex;align-items:flex-end;padding:${pad}px;box-sizing:border-box`,
    wordStyle: `font-size:${fs}px;font-weight:900;font-stretch:118%;letter-spacing:-.035em;line-height:.88;color:${t.ink};text-transform:uppercase;text-wrap:balance`,
  };
};
export const shapes = (t: Tile, s: number) => ({
  tileStyle: `width:${s}px;height:${s}px;border-radius:14px;background:${t.bg};position:relative;overflow:hidden;flex:none`,
  s1: `position:absolute;left:${s * 0.16}px;bottom:${s * 0.14}px;width:${s * 0.62}px;height:${s * 0.62}px;border-radius:50%;background:${t.a}`,
  s2: `position:absolute;left:${s * 0.34}px;bottom:${s * 0.46}px;width:${s * 0.44}px;height:${s * 0.16}px;border-radius:99px;background:${t.b}`,
  s3: `position:absolute;right:${s * 0.14}px;top:${s * 0.14}px;width:${s * 0.2}px;height:${s * 0.2}px;border-radius:50%;background:${t.c}`,
});

// ── meal library ─────────────────────────────────────────────────────

const M = (o: Meal): Meal => o;
export const MEALS: Record<string, Meal> = {
  breakfast: M({
    id: 'breakfast',
    slot: 'Breakfast',
    timeText: '7:10 am',
    name: 'Peanut butter banana oats',
    prep: '8 min',
    tile: TILES.oats,
    reasons: [
      'Peanut butter and oats are both on your favorites list.',
      'Eight minutes total — you leave at 7:30.',
      'No eggs, since you keep swapping them out.',
    ],
    ingredients: [
      ['Rolled oats', '1 cup', 1],
      ['Whole milk', '1 cup', 1],
      ['Peanut butter', '2 tbsp', 1],
      ['Banana', '1 large', 0],
      ['Honey', '1 tbsp', 1],
    ],
    steps: [
      'Microwave the oats and milk for 2 minutes, stirring once.',
      'Stir the peanut butter into the hot oats so it melts through.',
      'Slice the banana on top and drizzle the honey.',
    ],
  }),
  lunch: M({
    id: 'lunch',
    slot: 'Lunch',
    timeText: '12:20 pm',
    name: 'Chicken burrito bowl',
    prep: '15 min',
    tile: TILES.bowl,
    reasons: [
      'Rice bowls are your highest-rated category.',
      'Built from Sunday prep, so lunch is assembly.',
      'Carbs land early on a training day.',
    ],
    ingredients: [
      ['Chicken thigh', '6 oz', 1],
      ['White rice', '1 cup', 1],
      ['Black beans', '1/2 cup', 0],
      ['Shredded cheese', '1/4 cup', 1],
      ['Salsa', '3 tbsp', 0],
    ],
    steps: [
      'Season and sear the chicken 5 minutes a side.',
      'Warm the rice and beans while it rests.',
      'Slice, build the bowl, top with cheese and salsa.',
    ],
  }),
  snack: M({
    id: 'snack',
    slot: 'Pre-practice',
    timeText: '2:30 pm',
    name: 'Rice cakes, honey & banana',
    prep: '5 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Fast carbs about two hours out from practice.',
      'Light on fat and fiber so it sits easy.',
      'Five minutes, no cooking.',
    ],
    ingredients: [
      ['Rice cakes', '3', 1],
      ['Honey', '1 tbsp', 1],
      ['Banana', '1', 0],
      ['Sea salt', 'pinch', 1],
    ],
    steps: [
      'Spread honey across the rice cakes.',
      'Layer banana on top with a pinch of salt.',
      'Eat about 90 minutes before you warm up.',
    ],
  }),
  dinner: M({
    id: 'dinner',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Chicken pasta',
    prep: '28 min',
    tile: TILES.steak,
    reasons: [
      'Pasta and chicken are both favorites you picked.',
      '28 minutes — a little long for a practice night.',
      'Refills carbs and protein after the session.',
    ],
    ingredients: [
      ['Chicken breast', '7 oz', 1],
      ['Penne', '3 oz dry', 1],
      ['Heavy cream', '1/3 cup', 0],
      ['Parmesan', '1/4 cup', 0],
      ['Spinach', '2 handfuls', 0],
    ],
    steps: [
      'Boil the pasta a minute short and save a mug of water.',
      'Sear the chicken, then soften garlic in the same pan.',
      'Add cream and parmesan, loosen with pasta water.',
      'Toss the sliced chicken back through.',
    ],
  }),
  recovery: M({
    id: 'recovery',
    slot: 'Post-practice',
    timeText: '6:15 pm',
    name: 'Chocolate milk & granola',
    prep: '2 min',
    tile: TILES.shake,
    reasons: [
      'Carbs and protein inside 30 minutes of finishing.',
      'Nothing to cook — you get home at 6:05.',
      'Dairy is fine for you; no restrictions on file.',
    ],
    ingredients: [
      ['Chocolate milk', '16 oz', 1],
      ['Granola', '1/2 cup', 1],
      ['Greek yogurt', '1/2 cup', 0],
    ],
    steps: [
      'Drink the chocolate milk within 30 minutes.',
      'Layer granola over yogurt to hold you to dinner.',
    ],
  }),
  prelift: M({
    id: 'prelift',
    slot: 'Pre-lift',
    timeText: '5:50 am',
    name: 'Toast, jam & banana',
    prep: '3 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Fast carbs 40 minutes out — enough to lift hard on, small enough to not sit heavy.',
      'Almost no fat or fiber, which is what you want before a barbell.',
      'Three minutes, because you lift at 6:30 am.',
    ],
    ingredients: [
      ['White bread', '2 slices', 1],
      ['Strawberry jam', '1 tbsp', 1],
      ['Banana', '1', 0],
      ['Salt', 'pinch', 1],
    ],
    steps: [
      'Toast the bread and spread the jam.',
      'Eat with the banana about 40 minutes before your first set.',
      'Sip water on the way in.',
    ],
  }),
  postlift: M({
    id: 'postlift',
    slot: 'Post-lift',
    timeText: '7:45 am',
    name: 'Turkey bagel & orange juice',
    prep: '4 min',
    tile: TILES.wrap,
    reasons: [
      'Carbs and protein together inside the 30 minutes after your last set.',
      'Bagels refill muscle glycogen faster than most breakfasts.',
      'Handheld, so you can eat it on the way to first period.',
    ],
    ingredients: [
      ['Plain bagel', '1', 1],
      ['Deli turkey', '4 oz', 0],
      ['Cheese slice', '1', 1],
      ['Orange juice', '10 oz', 1],
    ],
    steps: [
      'Toast the bagel while you change.',
      'Layer turkey and cheese.',
      'Drink the juice with it — the sugar is the point here.',
    ],
  }),
  preliftPm: M({
    id: 'preliftPm',
    slot: 'Pre-lift',
    timeText: '2:45 pm',
    name: 'Pretzels, applesauce & sports drink',
    prep: '1 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'All fast carbs, 45 minutes before an afternoon session.',
      'Nothing to cook and nothing that upsets a stomach under load.',
      'Salt and fluid before you sweat through the session.',
    ],
    ingredients: [
      ['Pretzels', '2 oz', 1],
      ['Applesauce pouch', '1', 1],
      ['Sports drink', '12 oz', 1],
    ],
    steps: [
      'Eat the pretzels and applesauce about 45 minutes out.',
      'Drink half the bottle before you start, half during.',
    ],
  }),
  postliftPm: M({
    id: 'postliftPm',
    slot: 'Post-lift',
    timeText: '5:15 pm',
    name: 'Chicken rice bowl & honey',
    prep: '6 min',
    tile: TILES.taco,
    reasons: [
      '42g of protein against the carbs you just spent.',
      'Built from the rice and chicken already in your kitchen.',
      'Six minutes, all reheating — you get home wrecked.',
    ],
    ingredients: [
      ['Cooked rice', '1.5 cups', 1],
      ['Chicken breast', '6 oz', 1],
      ['Honey', '1 tbsp', 1],
      ['Soy sauce', '1 tbsp', 1],
      ['Frozen edamame', '1/2 cup', 1],
    ],
    steps: [
      'Microwave the rice and chicken together for two minutes.',
      'Steam the edamame alongside.',
      'Drizzle honey and soy over the top.',
    ],
  }),
  steakpot: M({
    id: 'steakpot',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Steak & roast potatoes',
    prep: '22 min',
    tile: TILES.steak,
    reasons: [
      'Steak is your top-rated protein.',
      '22 minutes, mostly hands-off while potatoes roast.',
      'About $6.40, inside your range.',
    ],
    ingredients: [
      ['Sirloin', '7 oz', 0],
      ['Baby potatoes', '10 oz', 1],
      ['Butter', '1 tbsp', 1],
      ['Garlic', '3 cloves', 1],
      ['Green beans', '2 cups', 0],
    ],
    steps: [
      'Halve the potatoes and roast at 425°F for 22 minutes.',
      'Sear the steak 3 minutes a side, baste with butter.',
      'Rest 5 minutes, then slice against the grain.',
    ],
  }),
  salmon: M({
    id: 'salmon',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Honey soy salmon & rice',
    prep: '18 min',
    tile: TILES.salmon,
    reasons: [
      'Salmon is a favorite and you have rice at home.',
      '18 minutes — you rarely cook past 20 on practice days.',
      'One tray, which suits your cooking level.',
    ],
    ingredients: [
      ['Salmon fillet', '7 oz', 0],
      ['Jasmine rice', '1 cup', 1],
      ['Honey', '1 tbsp', 1],
      ['Soy sauce', '2 tbsp', 1],
      ['Broccolini', '1 bunch', 0],
    ],
    steps: [
      'Whisk honey and soy, brush half over the salmon.',
      'Roast at 425°F for 12 minutes with the greens.',
      'Spoon the rest of the glaze over and serve on rice.',
    ],
  }),
  taco: M({
    id: 'taco',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Beef & rice power bowl',
    prep: '20 min',
    tile: TILES.taco,
    reasons: [
      'Built entirely from what you already have.',
      'About $4.20 a serving.',
      'No mushrooms, no tree nuts.',
    ],
    ingredients: [
      ['Ground beef', '6 oz', 1],
      ['White rice', '1 cup', 1],
      ['Shredded cheese', '1/4 cup', 1],
      ['Corn', '1/2 cup', 1],
      ['Salsa', '3 tbsp', 0],
    ],
    steps: [
      'Brown the beef hard in a dry pan.',
      'Warm the rice and corn, then build the bowl.',
      'Top with cheese and salsa while hot.',
    ],
  }),
  wrap: M({
    id: 'wrap',
    slot: 'Lunch',
    timeText: '12:20 pm',
    name: 'Crispy chicken caesar wrap',
    prep: '15 min',
    tile: TILES.wrap,
    reasons: [
      'Sandwiches and chicken are both favorites.',
      '15 minutes, one pan.',
      'About $3.80 — under budget.',
    ],
    ingredients: [
      ['Chicken breast', '6 oz', 1],
      ['Large tortilla', '1', 0],
      ['Romaine', '2 cups', 0],
      ['Caesar dressing', '2 tbsp', 1],
    ],
    steps: [
      'Pan-fry the chicken until the crust sets, then slice.',
      'Toss the romaine with dressing.',
      'Fold tight and sear the seam for 30 seconds.',
    ],
  }),
  pregame: M({
    id: 'pregame',
    slot: 'Pre-game',
    timeText: '3 hrs out',
    name: 'Turkey sandwich & fruit',
    prep: '6 min',
    tile: TILES.wrap,
    reasons: [
      'Familiar, low-risk food three hours before kickoff.',
      'Carb-forward with just enough protein.',
      'Nothing new on a game day.',
    ],
    ingredients: [
      ['Whole grain bread', '2 slices', 1],
      ['Sliced turkey', '5 oz', 0],
      ['Cheese', '1 slice', 1],
      ['Apple', '1', 0],
    ],
    steps: ['Build the sandwich, go light on the spread.', 'Eat about three hours before the first whistle.'],
  }),

  // ── allergen-free coverage ───────────────────────────────────────────
  //
  // The fourteen meals above came from the design prototype, and between them
  // they leave an athlete who avoids dairy or gluten with nothing to eat in most
  // slots. Because allergens are a hard filter, "nothing safe" means an empty
  // slot — so every slot needs safe options or the filter makes the app useless
  // to the people it protects.
  //
  // Each block below adds at least two meals that contain **none** of the nine
  // allergens, plus one with more character. A meal free of every allergen
  // counts toward every column at once, which is why two per slot is enough.
  //
  // Macros here are authored estimates, exactly like the fourteen above. They
  // get recomputed from ingredient rows when the USDA data lands; until then no
  // number in this file should be treated as verified.

  // Breakfast
  breakfastBerry: M({
    id: 'breakfastBerry',
    slot: 'Breakfast',
    timeText: '7:10 am',
    name: 'Berry protein bowl',
    prep: '4 min',
    tile: TILES.shake,
    reasons: [
      'No dairy, no gluten, no nuts — safe against every allergy on file.',
      'Four minutes and no cooking.',
      '34g of protein before you leave the house.',
    ],
    ingredients: [
      ['Coconut yogurt', '1 cup', 1],
      ['Mixed berries', '1 cup', 0],
      ['Pea protein powder', '1 scoop', 1],
      ['Honey', '1 tbsp', 1],
      ['Pumpkin seeds', '2 tbsp', 1],
    ],
    steps: [
      'Stir the protein powder through the yogurt until it is smooth.',
      'Top with the berries, honey and seeds.',
    ],
  }),
  breakfastOatsFree: M({
    id: 'breakfastOatsFree',
    slot: 'Breakfast',
    timeText: '7:10 am',
    name: 'Sunflower butter oats',
    prep: '8 min',
    tile: TILES.oats,
    reasons: [
      'The oats you like, built without dairy, gluten or peanuts.',
      'Sunflower seed butter does what peanut butter does, minus the allergen.',
      'Eight minutes, same as your usual.',
    ],
    ingredients: [
      ['Gluten-free oats', '1 cup', 1],
      ['Rice milk', '1 cup', 1],
      ['Sunflower seed butter', '2 tbsp', 1],
      ['Banana', '1 large', 0],
      ['Honey', '1 tbsp', 1],
    ],
    steps: [
      'Microwave the oats and rice milk for 2 minutes, stirring once.',
      'Stir the sunflower butter through while it is hot.',
      'Slice the banana on top and drizzle the honey.',
    ],
  }),
  breakfastScramble: M({
    id: 'breakfastScramble',
    slot: 'Breakfast',
    timeText: '7:10 am',
    name: 'Egg and rice scramble',
    prep: '10 min',
    tile: TILES.bowl,
    reasons: [
      'Savoury, for mornings you do not want anything sweet.',
      'Built on last night’s rice, so it is mostly reheating.',
      'No dairy and no gluten.',
    ],
    ingredients: [
      ['Eggs', '3', 1],
      ['Cooked rice', '1 cup', 1],
      ['Spinach', '2 handfuls', 0],
      ['Olive oil', '1 tbsp', 1],
      ['Salt', 'pinch', 1],
    ],
    steps: [
      'Warm the rice in the oil until the edges crisp.',
      'Push it aside, scramble the eggs in the same pan.',
      'Fold the spinach through until it just wilts.',
    ],
  }),

  // Lunch
  lunchQuinoa: M({
    id: 'lunchQuinoa',
    slot: 'Lunch',
    timeText: '12:20 pm',
    name: 'Chicken quinoa bowl',
    prep: '15 min',
    tile: TILES.bowl,
    reasons: [
      'A rice bowl in everything but name, with no dairy or gluten in it.',
      '52g of protein, the same as your usual lunch.',
      'Assembles from Sunday prep.',
    ],
    ingredients: [
      ['Chicken breast', '6 oz', 1],
      ['Quinoa', '1 cup', 1],
      ['Black beans', '1/2 cup', 0],
      ['Corn', '1/2 cup', 1],
      ['Salsa', '3 tbsp', 0],
    ],
    steps: [
      'Season and sear the chicken 5 minutes a side.',
      'Warm the quinoa, beans and corn together.',
      'Slice the chicken over the top and spoon on the salsa.',
    ],
  }),
  lunchTurkeyRice: M({
    id: 'lunchTurkeyRice',
    slot: 'Lunch',
    timeText: '12:20 pm',
    name: 'Turkey rice bowl',
    prep: '14 min',
    tile: TILES.taco,
    reasons: [
      'Clears every allergy on file.',
      'Coconut aminos instead of soy sauce, so it is soy and gluten free.',
      'One pan, fourteen minutes.',
    ],
    ingredients: [
      ['Ground turkey', '6 oz', 1],
      ['White rice', '1 cup', 1],
      ['Zucchini', '1', 0],
      ['Coconut aminos', '1 tbsp', 1],
      ['Olive oil', '1 tbsp', 1],
    ],
    steps: [
      'Brown the turkey hard in the oil.',
      'Add the diced zucchini and cook until it softens.',
      'Stir the aminos through and serve over the rice.',
    ],
  }),
  lunchTacos: M({
    id: 'lunchTacos',
    slot: 'Lunch',
    timeText: '12:20 pm',
    name: 'Beef corn tacos',
    prep: '12 min',
    tile: TILES.taco,
    reasons: [
      'Corn tortillas, so there is no gluten in it.',
      'Twelve minutes and nothing to prep ahead.',
      'Cheap — beef and tortillas are the whole list.',
    ],
    ingredients: [
      ['Ground beef', '5 oz', 1],
      ['Corn tortilla', '3', 1],
      ['Salsa', '3 tbsp', 0],
      ['Romaine', '1 cup', 0],
    ],
    steps: [
      'Brown the beef in a dry pan.',
      'Warm the tortillas directly over the burner until they blister.',
      'Build with the romaine and salsa.',
    ],
  }),

  // Pre-practice
  snackPineapple: M({
    id: 'snackPineapple',
    slot: 'Pre-practice',
    timeText: '2:30 pm',
    name: 'Pineapple and rice cakes',
    prep: '3 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Fast carbs about two hours out, with nothing on the allergy list.',
      'Almost no fat or fibre, so it sits easy under load.',
      'Three minutes, no cooking.',
    ],
    ingredients: [
      ['Rice cakes', '3', 1],
      ['Pineapple', '1 cup', 0],
      ['Honey', '1 tbsp', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: [
      'Drizzle the honey over the rice cakes.',
      'Eat with the pineapple about 90 minutes before you warm up.',
    ],
  }),
  snackMaple: M({
    id: 'snackMaple',
    slot: 'Pre-practice',
    timeText: '2:30 pm',
    name: 'Banana maple rice cakes',
    prep: '2 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Two minutes, start to finish.',
      'Fast carbs and salt before you sweat.',
      'Free of all nine allergens.',
    ],
    ingredients: [
      ['Rice cakes', '2', 1],
      ['Banana', '1', 0],
      ['Maple syrup', '1 tbsp', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Slice the banana over the rice cakes.', 'Drizzle the maple syrup and add a pinch of salt.'],
  }),
  snackToast: M({
    id: 'snackToast',
    slot: 'Pre-practice',
    timeText: '2:30 pm',
    name: 'Sunflower butter toast',
    prep: '3 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Gluten-free bread and seed butter — no wheat, no nuts.',
      'A little more staying power than rice cakes.',
      'Three minutes.',
    ],
    ingredients: [
      ['Gluten-free bread', '2 slices', 1],
      ['Sunflower seed butter', '1 tbsp', 1],
      ['Strawberry jam', '1 tbsp', 1],
    ],
    steps: ['Toast the bread.', 'Spread the seed butter, then the jam.'],
  }),

  // Dinner
  dinnerSteakSweet: M({
    id: 'dinnerSteakSweet',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Sirloin and sweet potato',
    prep: '22 min',
    tile: TILES.steak,
    reasons: [
      'Steak, without the butter — no dairy in it at all.',
      '22 minutes, mostly hands-off while the potato roasts.',
      'Refills carbs and protein after a hard session.',
    ],
    ingredients: [
      ['Sirloin', '7 oz', 0],
      ['Sweet potato', '10 oz', 1],
      ['Olive oil', '1 tbsp', 1],
      ['Green beans', '2 cups', 0],
      ['Garlic', '3 cloves', 1],
    ],
    steps: [
      'Cube the sweet potato and roast at 425°F for 22 minutes.',
      'Sear the steak 3 minutes a side in the oil with the garlic.',
      'Rest 5 minutes, then slice against the grain.',
    ],
  }),
  dinnerGarlicChicken: M({
    id: 'dinnerGarlicChicken',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Garlic chicken and rice',
    prep: '18 min',
    tile: TILES.bowl,
    reasons: [
      'Clears every allergy on file.',
      '18 minutes — inside your weeknight window.',
      'One pan and a pot of rice.',
    ],
    ingredients: [
      ['Chicken thigh', '7 oz', 1],
      ['Jasmine rice', '1 cup', 1],
      ['Broccolini', '1 bunch', 0],
      ['Olive oil', '1 tbsp', 1],
      ['Garlic', '3 cloves', 1],
    ],
    steps: [
      'Start the rice.',
      'Sear the thighs skin-side down for 6 minutes, then turn.',
      'Add the garlic and broccolini to the pan for the last 4 minutes.',
    ],
  }),
  dinnerPastaFree: M({
    id: 'dinnerPastaFree',
    slot: 'Dinner',
    timeText: '7:00 pm',
    name: 'Pasta and turkey ragu',
    prep: '20 min',
    tile: TILES.taco,
    reasons: [
      'The pasta night you like, on gluten-free pasta and with no cream.',
      '20 minutes, one pot and one pan.',
      '47g of protein.',
    ],
    ingredients: [
      ['Gluten-free pasta', '3 oz dry', 1],
      ['Ground turkey', '6 oz', 1],
      ['Salsa', '1/2 cup', 0],
      ['Olive oil', '1 tbsp', 1],
      ['Spinach', '2 handfuls', 0],
    ],
    steps: [
      'Boil the pasta a minute short of the packet time.',
      'Brown the turkey in the oil, then stir the salsa through.',
      'Fold the spinach and drained pasta into the sauce.',
    ],
  }),

  // Post-practice
  recoveryShake: M({
    id: 'recoveryShake',
    slot: 'Post-practice',
    timeText: '6:15 pm',
    name: 'Recovery shake',
    prep: '2 min',
    tile: TILES.shake,
    reasons: [
      'Carbs and protein inside 30 minutes of finishing.',
      'Pea protein and rice milk, so there is no dairy in it.',
      'Two minutes — nothing to cook.',
    ],
    ingredients: [
      ['Pea protein powder', '1 scoop', 1],
      ['Rice milk', '12 oz', 1],
      ['Banana', '1', 0],
      ['Honey', '1 tbsp', 1],
    ],
    steps: ['Blend everything until smooth.', 'Drink within 30 minutes of your last rep.'],
  }),
  recoveryTurkey: M({
    id: 'recoveryTurkey',
    slot: 'Post-practice',
    timeText: '6:15 pm',
    name: 'Turkey and rice cakes',
    prep: '3 min',
    tile: TILES.shake,
    reasons: [
      'Real food rather than a shake, if you would rather chew something.',
      '28g of protein against the carbs you just spent.',
      'Free of all nine allergens.',
    ],
    ingredients: [
      ['Rice cakes', '3', 1],
      ['Sliced turkey', '4 oz', 0],
      ['Orange juice', '10 oz', 1],
    ],
    steps: [
      'Layer the turkey over the rice cakes.',
      'Drink the juice with it — the sugar is the point here.',
    ],
  }),
  recoveryYogurt: M({
    id: 'recoveryYogurt',
    slot: 'Post-practice',
    timeText: '6:15 pm',
    name: 'Coconut yogurt and berries',
    prep: '2 min',
    tile: TILES.snack,
    reasons: [
      'Dairy-free yogurt with the protein stirred in.',
      'Holds you to dinner without sitting heavy.',
      'Two minutes.',
    ],
    ingredients: [
      ['Coconut yogurt', '1 cup', 1],
      ['Blueberries', '1 cup', 0],
      ['Pea protein powder', '1 scoop', 1],
      ['Honey', '1 tbsp', 1],
      ['Pumpkin seeds', '2 tbsp', 1],
    ],
    steps: ['Stir the protein powder through the yogurt.', 'Top with the berries, honey and seeds.'],
  }),

  // Pre-lift, morning
  preliftRice: M({
    id: 'preliftRice',
    slot: 'Pre-lift',
    timeText: '5:50 am',
    name: 'Rice cakes and jam',
    prep: '2 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Fast carbs 40 minutes out, with no wheat in it.',
      'Almost no fat or fibre, which is what you want before a barbell.',
      'Two minutes, because you lift at 6:30 am.',
    ],
    ingredients: [
      ['Rice cakes', '3', 1],
      ['Strawberry jam', '1 tbsp', 1],
      ['Banana', '1', 0],
      ['Sea salt', 'pinch', 1],
    ],
    steps: [
      'Spread the jam across the rice cakes.',
      'Eat with the banana about 40 minutes before your first set.',
    ],
  }),
  preliftToast: M({
    id: 'preliftToast',
    slot: 'Pre-lift',
    timeText: '5:50 am',
    name: 'Toast and honey',
    prep: '3 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'Your usual pre-lift toast, on gluten-free bread.',
      'Fast carbs, nothing that sits heavy.',
      'Three minutes.',
    ],
    ingredients: [
      ['Gluten-free bread', '2 slices', 1],
      ['Honey', '1 tbsp', 1],
      ['Banana', '1', 0],
      ['Salt', 'pinch', 1],
    ],
    steps: ['Toast the bread and spread the honey.', 'Eat with the banana about 40 minutes out.'],
  }),
  preliftSauce: M({
    id: 'preliftSauce',
    slot: 'Pre-lift',
    timeText: '5:50 am',
    name: 'Applesauce and sports drink',
    prep: '1 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'One minute, for mornings you are already late.',
      'All fast carbs and nothing to chew at 5:50 am.',
      'Salt and fluid before you start.',
    ],
    ingredients: [
      ['Applesauce pouch', '1', 1],
      ['Sports drink', '12 oz', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Eat the pouch on the way in.', 'Sip half the bottle before you start, half during.'],
  }),

  // Post-lift, morning
  postliftRice: M({
    id: 'postliftRice',
    slot: 'Post-lift',
    timeText: '7:45 am',
    name: 'Chicken rice and orange juice',
    prep: '5 min',
    tile: TILES.wrap,
    reasons: [
      'Carbs and protein together inside 30 minutes of your last set.',
      'Rice refills glycogen as fast as a bagel, without the wheat.',
      'Five minutes of reheating.',
    ],
    ingredients: [
      ['Cooked rice', '1.5 cups', 1],
      ['Chicken breast', '5 oz', 1],
      ['Orange juice', '10 oz', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Microwave the rice and chicken together for two minutes.', 'Drink the juice alongside it.'],
  }),
  postliftWrap: M({
    id: 'postliftWrap',
    slot: 'Post-lift',
    timeText: '7:45 am',
    name: 'Turkey corn wrap',
    prep: '4 min',
    tile: TILES.wrap,
    reasons: [
      'Handheld, so you can eat it on the way to first period.',
      'Corn tortillas — no gluten, no dairy.',
      'Four minutes.',
    ],
    ingredients: [
      ['Corn tortilla', '3', 1],
      ['Deli turkey', '4 oz', 0],
      ['Avocado', '1/2', 0],
      ['Salsa', '2 tbsp', 0],
    ],
    steps: ['Warm the tortillas over the burner.', 'Layer the turkey, avocado and salsa, then fold.'],
  }),
  postliftShake: M({
    id: 'postliftShake',
    slot: 'Post-lift',
    timeText: '7:45 am',
    name: 'Post-lift shake',
    prep: '2 min',
    tile: TILES.shake,
    reasons: [
      'Two minutes, drinkable, and it travels.',
      'No dairy — pea protein and rice milk.',
      'Carbs and protein in the window that matters.',
    ],
    ingredients: [
      ['Pea protein powder', '1 scoop', 1],
      ['Rice milk', '12 oz', 1],
      ['Blueberries', '1 cup', 0],
      ['Maple syrup', '1 tbsp', 1],
    ],
    steps: ['Blend everything until smooth.', 'Drink it inside 30 minutes of finishing.'],
  }),

  // Pre-lift, afternoon
  preliftPmRice: M({
    id: 'preliftPmRice',
    slot: 'Pre-lift',
    timeText: '2:45 pm',
    name: 'Rice cakes and sports drink',
    prep: '1 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'All fast carbs, 45 minutes before an afternoon session.',
      'No wheat, no dairy, nothing that upsets a stomach under load.',
      'Salt and fluid before you sweat through it.',
    ],
    ingredients: [
      ['Rice cakes', '3', 1],
      ['Honey', '1 tbsp', 1],
      ['Sports drink', '12 oz', 1],
    ],
    steps: [
      'Eat the rice cakes about 45 minutes out.',
      'Drink half the bottle before you start, half during.',
    ],
  }),
  preliftPmFruit: M({
    id: 'preliftPmFruit',
    slot: 'Pre-lift',
    timeText: '2:45 pm',
    name: 'Banana and applesauce',
    prep: '1 min',
    tile: TILES.snack,
    next: 1,
    reasons: ['Nothing to cook and nothing to carry.', 'Pure fast carbs.', 'Free of all nine allergens.'],
    ingredients: [
      ['Banana', '1', 0],
      ['Applesauce pouch', '1', 1],
      ['Sports drink', '12 oz', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Eat the banana and pouch about 45 minutes out.', 'Sip the drink through the session.'],
  }),
  preliftPmToast: M({
    id: 'preliftPmToast',
    slot: 'Pre-lift',
    timeText: '2:45 pm',
    name: 'Toast and jam',
    prep: '3 min',
    tile: TILES.snack,
    next: 1,
    reasons: [
      'A little more solid than a pouch, if lunch was early.',
      'Gluten-free bread, no dairy.',
      'Three minutes.',
    ],
    ingredients: [
      ['Gluten-free bread', '2 slices', 1],
      ['Strawberry jam', '1 tbsp', 1],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Toast the bread and spread the jam.', 'Eat about 45 minutes before you start.'],
  }),

  // Post-lift, afternoon
  postliftPmBeef: M({
    id: 'postliftPmBeef',
    slot: 'Post-lift',
    timeText: '5:15 pm',
    name: 'Beef and rice bowl',
    prep: '6 min',
    tile: TILES.taco,
    reasons: [
      '44g of protein against the carbs you just spent.',
      'Built from the rice already in your kitchen — no soy sauce, so no soy or wheat.',
      'Six minutes, all reheating.',
    ],
    ingredients: [
      ['Ground beef', '6 oz', 1],
      ['Cooked rice', '1.5 cups', 1],
      ['Corn', '1/2 cup', 1],
      ['Salsa', '3 tbsp', 0],
    ],
    steps: ['Brown the beef in a dry pan.', 'Warm the rice and corn, then build the bowl.'],
  }),
  postliftPmQuinoa: M({
    id: 'postliftPmQuinoa',
    slot: 'Post-lift',
    timeText: '5:15 pm',
    name: 'Chicken quinoa plate',
    prep: '5 min',
    tile: TILES.bowl,
    reasons: [
      'Rotisserie chicken means five minutes and no cooking.',
      'Clears every allergy on file.',
      '46g of protein when you get home wrecked.',
    ],
    ingredients: [
      ['Rotisserie chicken', '6 oz', 0],
      ['Quinoa', '1 cup', 1],
      ['Green beans', '1 cup', 0],
      ['Olive oil', '1 tbsp', 1],
    ],
    steps: ['Warm the quinoa and beans together.', 'Pull the chicken over the top and finish with the oil.'],
  }),
  postliftPmNoodles: M({
    id: 'postliftPmNoodles',
    slot: 'Post-lift',
    timeText: '5:15 pm',
    name: 'Chicken rice noodles',
    prep: '8 min',
    tile: TILES.wrap,
    reasons: [
      'Rice noodles and coconut aminos — no wheat and no soy.',
      'Eight minutes from cold.',
      'Light enough to eat straight after a session.',
    ],
    ingredients: [
      ['Rice noodles', '3 oz dry', 1],
      ['Chicken breast', '6 oz', 1],
      ['Coconut aminos', '1 tbsp', 1],
      ['Zucchini', '1', 0],
    ],
    steps: [
      'Soak the noodles in boiling water for 5 minutes.',
      'Sear the sliced chicken with the zucchini.',
      'Toss everything with the aminos.',
    ],
  }),

  // Pre-game
  pregameRice: M({
    id: 'pregameRice',
    slot: 'Pre-game',
    timeText: '3 hrs out',
    name: 'Chicken and white rice',
    prep: '6 min',
    tile: TILES.wrap,
    reasons: [
      'The lowest-risk plate there is three hours before kickoff.',
      'No dairy, no wheat, nothing new.',
      'Carb-forward with just enough protein.',
    ],
    ingredients: [
      ['Chicken breast', '5 oz', 1],
      ['White rice', '1 cup', 1],
      ['Green beans', '1 cup', 0],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Warm the rice and chicken together.', 'Eat about three hours before the first whistle.'],
  }),
  pregameTurkey: M({
    id: 'pregameTurkey',
    slot: 'Pre-game',
    timeText: '3 hrs out',
    name: 'Turkey and rice cakes',
    prep: '4 min',
    tile: TILES.wrap,
    reasons: [
      'Familiar, low-risk food you can eat on a bus.',
      'Free of all nine allergens.',
      'Four minutes.',
    ],
    ingredients: [
      ['Sliced turkey', '5 oz', 0],
      ['Rice cakes', '3', 1],
      ['Apple', '1', 0],
      ['Sea salt', 'pinch', 1],
    ],
    steps: ['Layer the turkey over the rice cakes.', 'Eat about three hours out, with the apple.'],
  }),
  pregameSandwich: M({
    id: 'pregameSandwich',
    slot: 'Pre-game',
    timeText: '3 hrs out',
    name: 'Turkey sandwich',
    prep: '5 min',
    tile: TILES.wrap,
    reasons: [
      'Your usual pre-game sandwich, on gluten-free bread and without the cheese.',
      'Nothing new on a game day.',
      'Five minutes.',
    ],
    ingredients: [
      ['Gluten-free bread', '2 slices', 1],
      ['Sliced turkey', '5 oz', 0],
      ['Avocado', '1/2', 0],
      ['Apple', '1', 0],
    ],
    steps: [
      'Build the sandwich, go light on the avocado.',
      'Eat about three hours before the first whistle.',
    ],
  }),
};

/**
 * Meals that can fill each slot, in preference order.
 *
 * The first entry of every list is the meal the design shipped, so an athlete
 * who has declared nothing sees exactly what the prototype showed. Later entries
 * are what the filter falls back to once an allergy rules the default out.
 */
export const SLOT_CANDIDATES: Record<string, string[]> = {
  breakfast: ['breakfast', 'breakfastOatsFree', 'breakfastBerry', 'breakfastScramble'],
  lunch: ['lunch', 'wrap', 'lunchQuinoa', 'lunchTurkeyRice', 'lunchTacos'],
  snack: ['snack', 'snackPineapple', 'snackMaple', 'snackToast'],
  dinner: [
    'dinner',
    'steakpot',
    'salmon',
    'taco',
    'dinnerGarlicChicken',
    'dinnerSteakSweet',
    'dinnerPastaFree',
  ],
  recovery: ['recovery', 'recoveryShake', 'recoveryTurkey', 'recoveryYogurt'],
  prelift: ['prelift', 'preliftRice', 'preliftToast', 'preliftSauce'],
  postlift: ['postlift', 'postliftRice', 'postliftWrap', 'postliftShake'],
  preliftPm: ['preliftPm', 'preliftPmRice', 'preliftPmFruit', 'preliftPmToast'],
  postliftPm: ['postliftPm', 'postliftPmBeef', 'postliftPmQuinoa', 'postliftPmNoodles'],
  pregame: ['pregame', 'pregameRice', 'pregameTurkey', 'pregameSandwich'],
};

export const RECIPE_SETS: string[][] = [
  ['salmon', 'postliftPm', 'steakpot', 'lunch', 'postlift', 'dinner'],
  ['snack', 'preliftPm', 'prelift', 'wrap', 'recovery', 'postlift'],
  ['taco', 'wrap', 'lunch', 'preliftPm', 'breakfast', 'snack'],
  ['recovery', 'postlift', 'pregame', 'preliftPm', 'postliftPm', 'prelift'],
  ['breakfast', 'prelift', 'postlift', 'recovery', 'snack', 'lunch'],
  ['steakpot', 'salmon', 'taco', 'dinner', 'postliftPm', 'wrap'],
  ['snack', 'recovery', 'prelift', 'preliftPm', 'postlift', 'pregame'],
  ['taco', 'wrap', 'breakfast', 'pregame', 'lunch', 'snack'],
];

export const CHIPS: Record<string, string[]> = {
  breakfast: ['8 min', 'Peanut butter', 'No eggs'],
  lunch: ['From Sunday prep', 'Rice bowl', '52g protein'],
  snack: ['5 min', 'Fast carbs', 'Tree-nut free'],
  dinner: ['Favorite', '28 min', 'Post-practice'],
  recovery: ['2 min', 'Within 30 min', 'Carbs + protein'],
  prelift: ['3 min', '40 min pre-lift', 'Fast carbs'],
  postlift: ['4 min', 'Within 30 min', '34g protein'],
  preliftPm: ['1 min', 'No cooking', 'Fast carbs'],
  postliftPm: ['Uses your rice', '6 min', '42g protein'],
  steakpot: ['Top-rated', '22 min', '$6.40'],
  salmon: ['Favorite', '18 min', 'One tray'],
  taco: ['Uses your rice', '20 min', '$4.20'],
  wrap: ['One pan', '15 min', '$3.80'],
  pregame: ['3 hrs out', 'Familiar food', 'Low risk'],
};

export const RESULTS = [
  {
    id: 'taco',
    tags: ['Uses your rice', '20 min'],
    why: 'Everything in it is already in your kitchen, and it clears your no-mushroom rule.',
  },
  {
    id: 'wrap',
    tags: ['$3.80', 'One pan'],
    why: 'Cheapest option that still clears 44g protein — you set budget to $4–8.',
  },
  {
    id: 'salmon',
    tags: ['Favorite', '18 min'],
    why: 'Salmon is on your favorites and it finishes inside your weeknight window.',
  },
];
export const SWAPS = [
  {
    id: 'steakpot',
    time: '22 min',
    cost: '$6.40',
    match: '98% match',
    why: 'Steak is your highest-rated protein and this is the closest thing to your dinner\u2019s numbers.',
  },
  {
    id: 'salmon',
    time: '18 min',
    cost: '$7.10',
    match: '95% match',
    why: 'Ten minutes faster. You almost never cook past 20 minutes on a practice night.',
  },
  {
    id: 'taco',
    time: '20 min',
    cost: '$4.20',
    match: '93% match',
    why: 'Uses the beef, rice and cheese already in your kitchen, and it\u2019s the cheapest of the three.',
  },
  {
    id: 'wrap',
    time: '15 min',
    cost: '$3.80',
    match: '89% match',
    why: 'Fastest and cheapest, but 110 calories light for a hard training day.',
  },
];

// ── onboarding option pools ──────────────────────────────────────────

export const LOVE = [
  'Chicken',
  'Steak',
  'Ground beef',
  'Turkey',
  'Pork',
  'Salmon',
  'Shrimp',
  'Tuna',
  'Eggs',
  'Pasta',
  'Pizza',
  'Rice bowls',
  'Burritos',
  'Tacos',
  'Burgers',
  'Sandwiches',
  'Wraps',
  'Sushi',
  'Ramen',
  'Stir fry',
  'Curry',
  'Mac & cheese',
  'Chili',
  'Soup',
  'Oatmeal',
  'Pancakes',
  'Waffles',
  'Bagels',
  'Cereal',
  'Greek yogurt',
  'Cottage cheese',
  'Peanut butter',
  'Protein shakes',
  'Smoothies',
  'Potatoes',
  'Sweet potatoes',
  'Salad',
  'Avocado',
  'Cheese',
  'Beans',
  'Fruit',
  'Granola',
];
export const HATE = [
  'Mushrooms',
  'Fish',
  'Shellfish',
  'Tofu',
  'Olives',
  'Cottage cheese',
  'Beans',
  'Broccoli',
  'Brussels sprouts',
  'Cauliflower',
  'Onions',
  'Peppers',
  'Tomatoes',
  'Spicy food',
  'Mayo',
  'Pickles',
  'Eggs',
  'Avocado',
  'Salad',
  'Sweet potatoes',
  'Oatmeal',
  'Pork',
  'Curry',
  'Sushi',
  'Greek yogurt',
  'Cheese',
  'Coconut',
  'Raisins',
  'Liver',
  'Sardines',
];
export const SPORTS = [
  'Soccer',
  'Football',
  'Basketball',
  'Baseball',
  'Softball',
  'Track',
  'Cross country',
  'Swimming',
  'Wrestling',
  'Volleyball',
  'Tennis',
  'Lacrosse',
  'Hockey',
  'Golf',
  'Rowing',
  'Cheer',
  'Dance',
  'Weightlifting',
  'CrossFit',
  'Just the gym',
  'Nothing right now',
];
export const LIFT_TIMES = ['6:00 am', '6:30 am', '7:00 am', '3:30 pm', '5:00 pm', '7:30 pm'];
export const TIMES = ['6:00 am', '7:00 am', '3:30 pm', '4:30 pm', '5:30 pm', '6:30 pm'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── the onboarding script ────────────────────────────────────────────

export const OB: ObStep[] = [
  { key: 'name', type: 'text', tag: 'Hello', title: 'What should we call you?', sub: 'First name is fine.' },
  {
    key: 'goal',
    type: 'list',
    tag: 'Goal',
    title: "What's the mission?",
    sub: 'This sets your targets. You can change it any time.',
    options: [
      { v: 'gain', label: 'Gain lean weight', hint: 'Eat above maintenance, protein-forward' },
      { v: 'perform', label: 'Fuel my sport', hint: 'Eat around training, hold your weight' },
      { v: 'lose', label: 'Lose fat', hint: 'A deficit paced to your size, protein held high' },
      { v: 'habits', label: 'Just eat better', hint: 'More balance, less thinking about it' },
    ],
  },
  {
    key: 'sex',
    type: 'list',
    tag: 'Baseline',
    title: 'What should we base your numbers on?',
    sub: 'Used only for the calorie and protein math — bodies burn energy a little differently.',
    options: [
      { v: 'male', label: 'Male', hint: 'Higher baseline burn for the same size' },
      { v: 'female', label: 'Female', hint: 'Lower baseline burn, iron and calcium emphasised' },
      { v: 'na', label: 'Rather not say', hint: 'We use an average of the two' },
    ],
  },
  {
    key: 'body',
    type: 'body',
    tag: 'You',
    title: 'A few numbers',
    sub: "So your targets aren't guesses. Nothing here is shared.",
  },
  {
    key: 'target',
    type: 'target',
    tag: 'Target',
    title: 'Where are you headed?',
    sub: 'A goal weight and a pace. Both are editable later.',
  },
  {
    key: 'sports',
    type: 'chips',
    tag: 'Sport',
    title: 'What do you play?',
    sub: 'Pick everything that applies.',
    options: SPORTS,
    hint: 'e.g. ultimate frisbee',
  },
  {
    key: 'week',
    type: 'week',
    tag: 'Schedule',
    title: 'When do you train?',
    sub: 'Your week is pre-filled. Tap any day to change it — times matter most, duration is optional.',
  },
  {
    key: 'likes',
    type: 'chips',
    tag: 'Favorites',
    title: 'What do you actually love?',
    sub: 'Pick as many as you want. These show up the most.',
    options: LOVE,
    hint: "e.g. my mom's arroz con pollo",
  },
  {
    key: 'dislikes',
    type: 'chips',
    tag: 'Nope',
    title: "What won't you eat?",
    sub: "No judgment. We just won't put it in front of you.",
    options: HATE,
    hint: 'e.g. anything with cilantro',
  },
  {
    key: 'allergies',
    type: 'chips',
    tag: 'Safety',
    title: 'Any allergies?',
    sub: 'Hard blocks. Nothing containing them is ever suggested.',
    options: [
      'Peanuts',
      'Tree nuts',
      'Dairy',
      'Gluten',
      'Shellfish',
      'Fish',
      'Soy',
      'Eggs',
      'Sesame',
      'None of these',
    ],
    hint: 'Something else?',
  },
  {
    key: 'cook',
    type: 'list',
    tag: 'Kitchen',
    title: 'How well do you cook?',
    sub: 'Be honest — it changes every recipe you get.',
    options: [
      { v: 'micro', label: 'Microwave and toaster', hint: 'Assembly, not cooking' },
      { v: 'basic', label: 'I can follow a recipe', hint: 'Pan, oven, the basics' },
      { v: 'good', label: 'I know my way around', hint: 'Bring on the multi-step stuff' },
    ],
  },
  {
    key: 'budget',
    type: 'list',
    tag: 'Money',
    title: "What's the budget?",
    sub: 'Roughly, per meal.',
    options: [
      { v: 'low', label: 'Keep it cheap', hint: 'Under $4 a meal' },
      { v: 'mid', label: 'Middle of the road', hint: '$4–8 a meal' },
      { v: 'high', label: "Money isn't the issue", hint: 'Whatever tastes best' },
    ],
  },
  {
    key: 'time',
    type: 'list',
    tag: 'Time',
    title: 'How long do you have?',
    sub: 'On a normal weekday.',
    options: [
      { v: '10', label: '10 minutes, tops', hint: 'Fast assembly only' },
      { v: '20', label: 'About 20 minutes', hint: 'One pan, one pot' },
      { v: '40', label: '30–40 minutes', hint: 'Real cooking is fine' },
      { v: 'prep', label: 'I meal prep on Sundays', hint: 'Batch it all at once' },
    ],
  },
];
