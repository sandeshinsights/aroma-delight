/**
 * Spend-threshold free-item offer.
 *
 *   Spend $50  → one free Mango Lassi
 *   Spend $100 → one free Vegetable Samosa AND one free Mango Lassi
 *
 * Two rules shape everything below:
 *
 * 1. **We never add anything to the cart.** The customer only gets the free item
 *    if they added it themselves. If they qualify and have not added it, the UI
 *    nudges them; the discount stays $0 until they do.
 *
 * 2. **The free items' own prices do not count toward the threshold.** A $46
 *    curry plus a $5 lassi is $51 in the cart but only $46 of qualifying
 *    food, so it does not reach $50. The customer has to spend the threshold on
 *    *other* food.
 *
 * Tiers do not stack: the highest tier the customer reaches is the only one that
 * applies, so a $100 order is two free items, not three.
 *
 * This module is shared by the cart UI (what the customer is shown) and
 * /api/checkout (what they are actually charged), the same way pricing.ts is
 * shared for protein surcharges. Both halves must compute the same number — the
 * surcharge bug this project already had came from exactly that kind of split.
 * The comped value is always looked up from menu.json here, never taken from the
 * caller, so the two halves cannot drift even if a client sends junk prices.
 */
import { getMenuData } from "./data";
import type { MenuItem } from "./types";

/**
 * Base menu ids of the items this offer can comp.
 *
 * NOTE (Aroma Delight): these point at the current menu.json ids for Mango Lassi
 * and Vegetable Samosa (2). The whole mechanic — thresholds, which items, whether
 * to run it at all — is a marketing decision the owner has not made yet
 * (see NOTES-origin.md). Kept working with equivalent items for now.
 */
export const FREE_ITEM_IDS = {
  mangoLassi: "menu-176",
  vegetableSamosa: "menu-8",
} as const;

export interface OfferTier {
  /** Qualifying food (free items excluded) needed to reach this tier. */
  threshold: number;
  /** Base menu ids comped at this tier. */
  itemIds: string[];
}

/**
 * Highest threshold first — `calculateFreeItemOffer` takes the first tier the
 * customer reaches and stops.
 */
export const OFFER_TIERS: OfferTier[] = [
  {
    threshold: 100,
    itemIds: [FREE_ITEM_IDS.vegetableSamosa, FREE_ITEM_IDS.mangoLassi],
  },
  {
    threshold: 50,
    itemIds: [FREE_ITEM_IDS.mangoLassi],
  },
];

/** A cart line, as either half of the app has it. */
export interface OfferCartLine {
  /** Composite cart id (`menu-102-none-none-1787…`) or a bare base id. */
  id: string;
  price: number;
  quantity: number;
}

export interface FreeItem {
  /** Base menu id. */
  id: string;
  name: string;
  /** Menu price of the one comped unit. */
  price: number;
}

export interface FreeItemOffer {
  /** Dollars to take off the order. 0 when nothing is comped. */
  discount: number;
  /** The units being given free. Empty if the customer has not added them. */
  freeItems: FreeItem[];
  /** Threshold reached, whether or not anything was actually comped. */
  reachedThreshold: number | null;
  /**
   * Items free at the reached tier that are NOT in the cart yet. Non-empty means
   * "you have earned this — add it and it costs you nothing".
   */
  missingItems: FreeItem[];
  /** Next tier up, for the "spend $X more" nudge. Null at the top tier. */
  nextThreshold: number | null;
  /** Qualifying food still needed to reach nextThreshold. 0 when none. */
  amountToNext: number;
  /** Cart subtotal minus the comped units — what the thresholds are tested against. */
  qualifyingSubtotal: number;
}

/** Recover the stable menu id from a composite cart line id (`menu-102-none-…`). */
export function toBaseMenuId(cartId: string): string {
  return cartId.split("-").slice(0, 2).join("-");
}

let menuIndex: Map<string, MenuItem> | null = null;

/** Lazy flat index of every menu item by id. Menu data is a static import. */
function findMenuItem(baseId: string): MenuItem | undefined {
  if (!menuIndex) {
    menuIndex = new Map();
    for (const category of getMenuData().categories) {
      for (const item of category.items) menuIndex.set(item.id, item);
    }
  }
  return menuIndex.get(baseId);
}

function round(n: number): number {
  return parseFloat(n.toFixed(2));
}

/**
 * Work out what is free, given the cart.
 *
 * Pass server prices on the server and cart prices on the client; only the
 * qualifying subtotal is derived from them, and the server recomputes it from
 * sanitized prices anyway. The comped value itself always comes from menu.json.
 */
export function calculateFreeItemOffer(lines: OfferCartLine[]): FreeItemOffer {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );

  const idsInCart = new Set(lines.map((line) => toBaseMenuId(line.id)));

  // Evaluate every tier up front. Each one has its own qualifying subtotal,
  // because each comps a different set of items and a comped item never counts
  // toward the threshold that earned it.
  const evaluated = OFFER_TIERS.map((tier) => {
    const present: FreeItem[] = [];
    const missing: FreeItem[] = [];

    for (const itemId of tier.itemIds) {
      const menuItem = findMenuItem(itemId);
      if (!menuItem) continue; // item pulled from the menu — offer silently drops it
      const freeItem: FreeItem = {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
      };
      if (idsInCart.has(itemId)) present.push(freeItem);
      else missing.push(freeItem);
    }

    // Only what the customer actually receives free is excluded. An item they
    // have not added is still theirs to pay for, so it counts toward the
    // threshold — and adding it later raises the subtotal and the comped value
    // by the same amount, leaving the qualifying subtotal unchanged. That is
    // what makes the "spend $X more" number below stay honest.
    const compedValue = present.reduce((sum, item) => sum + item.price, 0);

    return {
      tier,
      present,
      missing,
      compedValue,
      qualifyingSubtotal: round(subtotal - compedValue),
    };
  });

  // Tiers are ordered highest-first and do not stack, so the first match wins.
  const reachedIndex = evaluated.findIndex(
    (e) => e.qualifyingSubtotal >= e.tier.threshold
  );

  // What to point the customer at next: the tier above the one they reached, or
  // the lowest tier if they have not reached any.
  const nextIndex = reachedIndex === -1 ? evaluated.length - 1 : reachedIndex - 1;
  const next = nextIndex >= 0 ? evaluated[nextIndex] : null;

  if (reachedIndex === -1) {
    return {
      discount: 0,
      freeItems: [],
      reachedThreshold: null,
      missingItems: [],
      nextThreshold: next ? next.tier.threshold : null,
      amountToNext: next
        ? round(Math.max(0, next.tier.threshold - next.qualifyingSubtotal))
        : 0,
      // The tier being nudged toward decides what counts: a lassi already in the
      // cart is excluded here even though it is not free yet, because it will be
      // the moment the threshold is crossed. Reporting the raw subtotal instead
      // would contradict amountToNext above and overstate the customer's progress.
      qualifyingSubtotal: next ? next.qualifyingSubtotal : round(subtotal),
    };
  }

  const reached = evaluated[reachedIndex];

  return {
    discount: round(reached.compedValue),
    freeItems: reached.present,
    reachedThreshold: reached.tier.threshold,
    missingItems: reached.missing,
    nextThreshold: next ? next.tier.threshold : null,
    amountToNext: next
      ? round(Math.max(0, next.tier.threshold - next.qualifyingSubtotal))
      : 0,
    qualifyingSubtotal: reached.qualifyingSubtotal,
  };
}
