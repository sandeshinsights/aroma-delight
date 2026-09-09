/**
 * Tests for the spend-threshold free-item offer (src/lib/free-item-offer.ts).
 *
 * This project has no test framework, and this is the one module where a wrong
 * number means the restaurant gives away food it did not mean to. Run it after
 * any change to the offer, the thresholds, or the two items' menu prices:
 *
 *   node --import ./scripts/ts-alias-hooks.mjs scripts/test-free-item-offer.mjs
 *
 * Exits non-zero on failure. Prices come from the real src/data/menu.json, so a
 * price change there will show up here as a failing expectation — update the
 * expectations, do not work around them.
 */
import { calculateFreeItemOffer } from "../src/lib/free-item-offer.ts";

// Must track FREE_ITEM_IDS in src/lib/free-item-offer.ts.
// Aroma Delight menu.json: Mango Lassi $5.00, Vegetable Samosa (2) $7.00.
const LASSI = "menu-176", SAMOSA = "menu-8";
const line = (id, price, qty = 1) => ({ id: `${id}-none-none-1787000000000`, price, quantity: qty });

let pass = 0, fail = 0;
function check(label, lines, expect) {
  const r = calculateFreeItemOffer(lines);
  const got = {
    discount: r.discount,
    free: r.freeItems.map((f) => f.name).sort().join("+") || "-",
    reached: r.reachedThreshold,
    missing: r.missingItems.map((f) => f.name).sort().join("+") || "-",
    next: r.nextThreshold,
    toNext: r.amountToNext,
    qual: r.qualifyingSubtotal,
  };
  const ok = Object.entries(expect).every(([k, v]) => got[k] === v);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        expected ${JSON.stringify(expect)}`);
    console.log(`        got      ${JSON.stringify(got)}`);
    fail++;
  } else pass++;
}

// --- below any threshold ---
check("$30 curry, no lassi", [line("menu-25", 30)],
  { discount: 0, free: "-", reached: null, next: 50, toNext: 20, qual: 30 });

check("$30 curry + lassi -> lassi price must NOT count toward $50", [line("menu-25", 30), line(LASSI, 5)],
  { discount: 0, free: "-", reached: null, next: 50, toNext: 20, qual: 30 });

check("$46 curry + lassi = $51 cart but only $46 qualifying", [line("menu-25", 46), line(LASSI, 5)],
  { discount: 0, free: "-", reached: null, next: 50, toNext: 4, qual: 46 });

// --- $50 tier ---
check("$50 curry exactly + lassi -> free lassi", [line("menu-25", 50), line(LASSI, 5)],
  { discount: 5, free: "Mango Lassi", reached: 50, missing: "-", qual: 50 });

check("$60 curry, no lassi added -> qualified but nothing comped", [line("menu-25", 60)],
  { discount: 0, free: "-", reached: 50, missing: "Mango Lassi", qual: 60 });

check("$60 curry + 2 lassi -> only ONE is free", [line("menu-25", 60), line(LASSI, 5, 2)],
  { discount: 5, free: "Mango Lassi", reached: 50, qual: 65 });

check("$60 curry + samosa + lassi -> samosa NOT free below $100", [line("menu-25", 60), line(SAMOSA, 7), line(LASSI, 5)],
  { discount: 5, free: "Mango Lassi", reached: 50, qual: 67 });

// --- $100 tier ---
check("$100 curry + samosa + lassi -> both free", [line("menu-25", 100), line(SAMOSA, 7), line(LASSI, 5)],
  { discount: 12, free: "Mango Lassi+Vegetable Samosa (2)", reached: 100, missing: "-", qual: 100 });

check("$96 curry + samosa + lassi -> misses $100, falls back to free lassi", [line("menu-25", 96), line(SAMOSA, 7), line(LASSI, 5)],
  { discount: 5, free: "Mango Lassi", reached: 50, qual: 103, next: 100, toNext: 4 });

check("$100 curry + lassi only -> lassi free, samosa offered", [line("menu-25", 100), line(LASSI, 5)],
  { discount: 5, free: "Mango Lassi", reached: 100, missing: "Vegetable Samosa (2)", qual: 100 });

check("$120 curry, nothing added -> both offered, nothing comped", [line("menu-25", 120)],
  { discount: 0, free: "-", reached: 100, missing: "Mango Lassi+Vegetable Samosa (2)", qual: 120 });

check("empty cart", [],
  { discount: 0, free: "-", reached: null, next: 50, toNext: 50, qual: 0 });

console.log(`\n${pass} passed, ${fail} failed`);
// exitCode rather than exit(): a hard exit() trips a libuv assertion on
// Windows while handles are still closing, printing a scary but meaningless error.
process.exitCode = fail ? 1 : 0;
