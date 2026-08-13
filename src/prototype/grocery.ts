import type { Meal } from './data';
import { INGREDIENT_FACTS } from './foodFacts';

/**
 * The shopping list, derived from the week that was actually planned.
 *
 * It used to be fourteen hand-written rows — bananas, sirloin, jasmine rice —
 * shown to every athlete whatever their week contained, whatever they were
 * allergic to, and unchanged by every swap they made. An athlete who had
 * replaced three dinners still got the pasta ingredients.
 *
 * Now it is the ingredients of the meals on the plan, deduplicated and counted.
 * That makes it wrong in a way a person can see and fix — a missing item means a
 * missing recipe line — rather than wrong in a way nobody can check.
 *
 * ## What this deliberately does not do
 *
 * Recipes carry an "already in your kitchen" flag on every ingredient, and this
 * ignores it. The app has never asked what is in anyone's kitchen: the flag is
 * authored per recipe, identical for everyone, and using it would quietly drop
 * real items off a real shopping list on the strength of a guess. It stays where
 * the design already uses it — the recipe detail — and does not get to decide
 * what an athlete does not need to buy.
 */

export interface GroceryItem {
  name: string;
  /** The quantity line, e.g. `1 cup` or `1 cup × 3` when a week repeats it. */
  qty: string;
  /** How many planned meals call for it. */
  count: number;
}

export interface GroceryAisle {
  title: string;
  items: GroceryItem[];
}

/**
 * Which part of a shop an ingredient is found in, from the tags it already
 * carries. A tag table rather than a per-ingredient field, so a new ingredient
 * lands somewhere sensible the day it is added instead of the day someone
 * remembers to categorise it. Anything unrecognised falls to the pantry, which
 * is where the long tail of oats, honey and rice genuinely belongs.
 */
const AISLES: [string, string[]][] = [
  ['Produce', ['fruit', 'vegetable', 'greens', 'potato', 'sweet potatoes', 'avocado', 'garlic']],
  ['Meat & fish', ['meat', 'poultry', 'fish']],
  ['Dairy & eggs', ['dairy', 'cheese', 'milk', 'yogurt', 'eggs']],
];

/**
 * Tags that disqualify an aisle whatever else matched.
 *
 * Coconut yogurt is tagged `yogurt`, oat milk is tagged `milk`, and both would
 * otherwise file under Dairy & eggs — which is where an athlete avoiding dairy
 * would least like to find the one thing on the list they can drink. The recipe
 * data already distinguishes them; the aisle should not throw that away.
 */
const VETO: Record<string, string> = { 'Dairy & eggs': 'dairy free' };

const PANTRY = 'Grains & pantry';

export function aisleFor(ingredient: string): string {
  const tags = INGREDIENT_FACTS[ingredient]?.tags ?? [];
  for (const [title, keys] of AISLES) {
    const veto = VETO[title];
    if (veto && tags.includes(veto)) continue;
    if (keys.some((k) => tags.includes(k))) return title;
  }
  return PANTRY;
}

/** Aisle order, so the list reads the way a shop is walked. */
const ORDER = [...AISLES.map(([title]) => title), PANTRY];

/**
 * Turn a set of planned meals into a shopping list.
 *
 * Case-folded on the ingredient name so "Whole milk" from three recipes is one
 * line rather than three, and counted so the athlete can see it is three.
 */
export function groceryFor(meals: Meal[]): GroceryAisle[] {
  const byName = new Map<string, { name: string; qty: string; count: number }>();

  for (const meal of meals) {
    for (const [name, qty] of meal.ingredients) {
      const key = name.toLowerCase();
      const seen = byName.get(key);
      if (seen) seen.count += 1;
      else byName.set(key, { name, qty, count: 1 });
    }
  }

  const aisles = new Map<string, GroceryItem[]>();
  for (const item of byName.values()) {
    const title = aisleFor(item.name);
    const list = aisles.get(title) ?? [];
    list.push({
      name: item.name,
      qty: item.count > 1 ? `${item.qty} × ${item.count}` : item.qty,
      count: item.count,
    });
    aisles.set(title, list);
  }

  return ORDER.filter((title) => aisles.get(title)?.length).map((title) => ({
    title,
    items: (aisles.get(title) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

/** Every line on the list, for the count on the Profile card. */
export function groceryCount(aisles: GroceryAisle[]): number {
  return aisles.reduce((n, a) => n + a.items.length, 0);
}
