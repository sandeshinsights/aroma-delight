"use client";

import { useState } from "react";
import { ShoppingCart, Plus, Minus, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
// Shared with the checkout API so the options shown here match what the server
// records and charges.
import {
  SPICE_LEVELS,
  SHRIMP_OR_FISH,
  categoryNeedsSpice,
  categoryNeedsVariant,
} from "@/lib/pricing";
// Meta Pixel — browser-only funnel event. AddToCart has no server counterpart.
import { trackMeta } from "@/lib/meta-pixel";
import type { MenuItem } from "@/lib/types";

type Props = {
  item: MenuItem;
  categoryName: string;
  /**
   * Runs after a line is added to the cart. Given → it is called (the menu panel
   * uses it to collapse itself). Not given → the cart drawer opens instead, which
   * is what the standalone dish page wants.
   */
  onAdded?: () => void;
};

/**
 * The "pick your options and add to cart" form for one menu item. Lifted out of
 * Menu.tsx so the shareable per-dish page (`/menu/<slug>`) can add to the cart
 * directly instead of bouncing the customer back to the homepage menu.
 *
 * The cart-line id keeps the `${baseId}-${choice}-${spice}-${timestamp}` shape
 * that `/api/checkout` relies on to recover the server-side price — the first
 * two dash-segments are the menu id. Don't change it here without changing
 * `getMenuItemPrice` in the checkout route (and `baseMenuId` in CartContext,
 * and `toBaseMenuId` in free-item-offer).
 */
export default function MenuItemOrderForm({
  item,
  categoryName,
  onAdded,
}: Props) {
  const { addItem, openCart } = useCart();

  // "choice" is the shrimp-or-fish pick; it rides in the cart line's `protein`
  // field (kept for wire/back-compat) and prints as "(Shrimp)" on the slip.
  const [selectedChoice, setSelectedChoice] = useState("");
  const [selectedSpice, setSelectedSpice] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  const needsChoice = categoryNeedsVariant(categoryName);
  const needsSpice = categoryNeedsSpice(categoryName);
  const canAdd =
    (!needsChoice || selectedChoice) && (!needsSpice || selectedSpice);

  const missing = !selectedChoice && needsChoice
    ? "Choose shrimp or fish to add this to your order"
    : !selectedSpice && needsSpice
      ? "Choose a spice level to add this to your order"
      : "";

  function handleAdd() {
    if (!canAdd) return;

    addItem({
      id: `${item.id}-${selectedChoice || "none"}-${selectedSpice || "none"}-${Date.now()}`,
      name: item.name,
      price: item.price,
      protein: selectedChoice || undefined,
      spiceLevel: selectedSpice || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      quantity,
    });

    trackMeta("AddToCart", {
      content_ids: [item.id],
      content_name: item.name,
      content_type: "product",
      content_category: categoryName,
      contents: [{ id: item.id, quantity, item_price: item.price }],
      num_items: quantity,
      value: item.price * quantity,
      currency: "USD",
    });

    setSelectedChoice("");
    setSelectedSpice("");
    setSpecialInstructions("");
    setQuantity(1);

    if (onAdded) onAdded();
    else openCart();
  }

  return (
    <div className="space-y-4">
      {/* Shrimp or Fish (only on the "Shrimp or Fish" dishes) */}
      {needsChoice && (
        <div>
          <p className="text-sm font-semibold text-ink mb-2">
            Shrimp or Fish <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SHRIMP_OR_FISH.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setSelectedChoice(choice)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                  selectedChoice === choice
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-ink/15 text-text-main hover:border-ink/30"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spice Level */}
      {needsSpice && (
        <div>
          <p className="text-sm font-semibold text-ink mb-2">
            Spice Level <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-2">
            {SPICE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedSpice(level)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                  selectedSpice === level
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-ink/15 text-text-main hover:border-ink/30"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Special Instructions */}
      <div>
        <p className="text-sm font-semibold text-[#5C1A1B] mb-2">
          Special Instructions
        </p>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="Any allergies or preferences?"
          rows={2}
          className="w-full px-3 py-2 border border-ink/15 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
        />
      </div>

      {/* Quantity */}
      <div>
        <p className="text-sm font-semibold text-[#5C1A1B] mb-2">Quantity</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/20 hover:bg-ink/5"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/20 hover:bg-ink/5"
          >
            <Plus className="w-3 h-3" />
          </button>
          {quantity > 1 && (
            <span className="text-sm text-primary font-semibold ml-2">
              Total: ${(item.price * quantity).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Add to cart */}
      <div className="space-y-2">
        {!canAdd && missing && (
          <p className="flex items-center gap-2 text-sm font-semibold text-ink bg-secondary/15 border border-secondary/40 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {missing}
          </p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            canAdd
              ? "bg-primary text-cream hover:bg-primary-light shadow-sm"
              : "bg-ink/10 text-ink/40 cursor-not-allowed"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
