/**
 * Per-item option choices — the single source of truth, shared by the menu UI
 * (what the customer picks) and the checkout API (what actually gets charged /
 * printed).
 *
 * This file exists because an option once carried a price that lived only in
 * Menu.tsx: the client displayed the surcharge and the server never charged it.
 * Anything that affects price or the kitchen slip goes here so both halves read
 * the same thing.
 *
 * Aroma Delight's menu lists every protein as its own dish (Chicken Curry and
 * Lamb Curry are separate rows), so there is no "pick a protein" choice and no
 * surcharges. Two option types remain:
 *
 *  - Spice level, on the curry / entrée categories.
 *  - Shrimp or fish, on the "Shrimp or Fish" dishes (same price either way).
 */

export const SPICE_LEVELS = ["Mild", "Medium", "Hot"] as const;

export const SHRIMP_OR_FISH = ["Shrimp", "Fish"] as const;

/** Menu categories whose dishes take a spice-level choice. Lowercased names. */
const SPICY_CATEGORIES: ReadonlySet<string> = new Set([
  "south indian",
  "combination dinners",
  "tandoor specials",
  "modern indian",
  "chicken dishes",
  "lamb dishes",
  "beef dishes",
  "goat dishes (with bone)",
  "shrimp or fish dishes",
  "vegetarian dishes",
  "tofu (vegan)",
  "biryani",
]);

/** Menu categories whose dishes need a shrimp-or-fish choice. Lowercased names. */
const VARIANT_CATEGORIES: ReadonlySet<string> = new Set(["shrimp or fish dishes"]);

export function categoryNeedsSpice(categoryName: string): boolean {
  return SPICY_CATEGORIES.has(categoryName.trim().toLowerCase());
}

export function categoryNeedsVariant(categoryName: string): boolean {
  return VARIANT_CATEGORIES.has(categoryName.trim().toLowerCase());
}

/**
 * Surcharge for a chosen option. Nothing on the current menu carries one, but
 * checkout still calls this for every line so that a future paid option has one
 * obvious home that the UI and the server share — the whole reason this file
 * exists.
 */
export function getOptionSurcharge(): number {
  return 0;
}
