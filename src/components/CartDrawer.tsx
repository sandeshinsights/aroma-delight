"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft, Truck, MapPin, Tag, XCircle, Gift, Info } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { isOrderingWindowOpen, getOrderingClosedReason, formatMinutesTo12h, scheduledTimeToUtcIso } from "@/lib/ordering-hours";
import { getDeliveryFee, getDeliveryQuote, isEligibleForDelivery, validateDeliveryAddress } from "@/lib/delivery";
import TimeSlotPicker from "./TimeSlotPicker";
import {
  calculateFreeItemOffer,
  type FreeItemOffer,
  type FreeItem,
} from "@/lib/free-item-offer";
import { isOnlineOrderingEnabled, getRestaurantData } from "@/lib/data";

const R = getRestaurantData();
// Meta Pixel — InitiateCheckout is sent from BOTH here and /api/checkout, so the
// event id generated below has to travel with the request or Meta counts two.
import {
  trackMeta,
  newMetaEventId,
  getMetaBrowserIds,
  toMetaContentId,
} from "@/lib/meta-pixel";

/**
 * The spend-threshold offer, shown in the cart.
 *
 * Three states, and the middle one is the point of the whole feature: the
 * customer has earned a free item but has not added it, so we say so and give
 * them a one-tap way to claim it. Nothing is ever added to their cart for them.
 */
function FreeItemBanner({
  offer,
  onAdd,
}: {
  offer: FreeItemOffer;
  onAdd: (item: FreeItem) => void;
}) {
  const claimed = offer.freeItems;
  const unclaimed = offer.missingItems;

  if (claimed.length === 0 && unclaimed.length === 0 && !offer.nextThreshold) {
    return null;
  }

  const names = (list: FreeItem[]) => list.map((f) => f.name).join(" + ");

  return (
    <div className="space-y-2">
      {claimed.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <Gift className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">
            <span className="font-semibold">{names(claimed)}</span> on the house &mdash; $
            {offer.discount.toFixed(2)} off your order.
          </p>
        </div>
      )}

      {unclaimed.length > 0 && (
        <div className="rounded-lg bg-cream border border-secondary/40 px-3 py-2">
          <div className="flex items-start gap-2">
            <Gift className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-primary">
              You&rsquo;ve unlocked a free{" "}
              <span className="font-semibold">{names(unclaimed)}</span>. Add
              {unclaimed.length > 1 ? " them" : " it"} to your order to claim
              {unclaimed.length > 1 ? " them" : " it"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {unclaimed.map((freeItem) => (
              <button
                key={freeItem.id}
                type="button"
                onClick={() => onAdd(freeItem)}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary text-cream hover:bg-secondary-light transition-colors"
              >
                Add {freeItem.name} &mdash; free
              </button>
            ))}
          </div>
        </div>
      )}

      {offer.nextThreshold !== null && offer.amountToNext > 0 && (
        <p className="text-xs text-gray-500 px-1">
          Spend ${offer.amountToNext.toFixed(2)} more to unlock a free{" "}
          {offer.nextThreshold >= 100
            ? "Vegetable Samosa + Mango Lassi"
            : "Mango Lassi"}
          .
        </p>
      )}
    </div>
  );
}

interface AppliedPromo {
  promoCodeId: string;
  discountType: string;
  discountValue: number;
  description: string;
  message: string;
}

export default function CartDrawer() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    subtotal,
    tax,
    total,
    itemCount,
    isCartOpen,
    closeCart,
    droppedItems,
    dismissDroppedItems,
  } = useCart();

  const [step, setStep] = useState<"review" | "fulfillment" | "checkout">("review");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Scheduling state
  const [orderMode, setOrderMode] = useState<"now" | "scheduled">("now");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Tip state
  const [selectedTip, setSelectedTip] = useState<string>("none");
  const [customTipInput, setCustomTipInput] = useState("");

  // DELIVERY: Delivery state
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryApt, setDeliveryApt] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // DELIVERY: Quote state
  const [quotedFee, setQuotedFee] = useState<number>(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const handleClose = () => {
    closeCart();
    setTimeout(() => {
      setStep("review");
      setPromoInput("");
      setAppliedPromo(null);
      setPromoError("");
      setOrderMode("now");
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setSelectedTip("none");
      setCustomTipInput("");
      // DELIVERY: reset delivery state
      setFulfillmentType("pickup");
      setDeliveryAddress("");
      setDeliveryApt("");
      setDeliveryInstructions("");
      setQuotedFee(0);
      setQuoteLoading(false);
      setDeliveryError("");
    }, 300);
  };

  // Free-item offer, from the same module /api/checkout charges from. If these
  // two ever disagree the customer is shown one number and billed another.
  const freeItemOffer = useMemo(
    () =>
      calculateFreeItemOffer(
        items.map((item) => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
        }))
      ),
    [items]
  );

  // Calculate discount. The free item and a promo code do NOT stack — whichever
  // saves more wins, which is exactly how checkout decides it. A promo code that
  // loses stays applied in the UI but contributes nothing; the server does not
  // consume it either, so it still works on a later order.
  const promoDiscount = appliedPromo
    ? parseFloat(
        appliedPromo.discountType === "PERCENTAGE"
          ? (subtotal * appliedPromo.discountValue / 100).toFixed(2)
          : Math.min(appliedPromo.discountValue, subtotal).toFixed(2)
      )
    : 0;

  const freeItemWins = freeItemOffer.discount > promoDiscount;
  const discountAmount = freeItemWins ? freeItemOffer.discount : promoDiscount;
  const discountLabel = freeItemWins
    ? `Free ${freeItemOffer.freeItems.map((f) => f.name).join(" + ")}`
    : appliedPromo?.message || "";
  const hasDiscount = discountAmount > 0;

  const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
  const discountTax = parseFloat((discountedSubtotal * 0.07).toFixed(2));
  const discountTotal = parseFloat((discountedSubtotal + discountTax).toFixed(2));

  const displaySubtotal = hasDiscount ? discountedSubtotal : subtotal;
  const displayTax = hasDiscount ? discountTax : tax;
  const displayTotal = hasDiscount ? discountTotal : total;

  // The review step shows totals before any promo code has been entered, so
  // it reflects the free-item discount only.
  const reviewSubtotal = parseFloat(
    (subtotal - freeItemOffer.discount).toFixed(2)
  );
  const reviewTax = parseFloat((reviewSubtotal * 0.07).toFixed(2));
  const reviewTotal = parseFloat((reviewSubtotal + reviewTax).toFixed(2));

  /**
   * Add a free item to the cart, only ever from an explicit tap on the banner.
   * The composite id format is load-bearing — checkout recovers the menu id from
   * the first two dash-segments — and these two items take no protein or spice
   * choice, matching how Menu.tsx builds ids for option-less items.
   */
  function handleAddFreeItem(freeItem: FreeItem) {
    addItem({
      id: `${freeItem.id}-none-none-${Date.now()}`,
      name: freeItem.name,
      price: freeItem.price,
    });
  }

  // Calculate tip
  const tipAmount = selectedTip === "custom"
    ? Math.max(0, parseFloat(customTipInput) || 0)
    : selectedTip === "none"
    ? 0
    : parseFloat((displaySubtotal * parseFloat(selectedTip) / 100).toFixed(2));

  // DELIVERY: Calculate delivery fee (from quote, not sync)
  const deliveryFee = fulfillmentType === "delivery" ? quotedFee : 0;
  const orderTotal = parseFloat((displayTotal + deliveryFee).toFixed(2));
  const finalTotal = parseFloat((orderTotal + tipAmount).toFixed(2));

  const orderingEnabled = isOnlineOrderingEnabled();
  const orderingAvailable = isOrderingWindowOpen();

  // DELIVERY: Delivery eligibility check
  const deliveryEligibility = isEligibleForDelivery(displaySubtotal);
  const addressValidation = validateDeliveryAddress(deliveryAddress);

  // Scheduled time as UTC ISO — the quote and checkout both use this so the
  // fee the customer sees is quoted on the same basis the server re-quotes.
  const scheduledForIso =
    orderMode === "scheduled" && selectedDate && selectedTimeSlot
      ? scheduledTimeToUtcIso(
          selectedDate.toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
          selectedTimeSlot
        )
      : undefined;

  // DELIVERY: Get delivery quote when address is valid
  useEffect(() => {
    if (fulfillmentType !== "delivery" || !addressValidation.valid) {
      setQuotedFee(0);
      return;
    }

    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const quote = await getDeliveryQuote(deliveryAddress, scheduledForIso);
        if (quote.error) {
          setQuotedFee(0);
          setDeliveryError(quote.error);
        } else {
          setQuotedFee(quote.customerPays);
          setDeliveryError("");
        }
      } catch {
        setQuotedFee(0);
        setDeliveryError("Could not get delivery quote. Please try again.");
      } finally {
        setQuoteLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fulfillmentType, deliveryAddress, addressValidation.valid, scheduledForIso]);

  const scheduledDisplayLabel =
    orderMode === "scheduled" && selectedDate && selectedTimeSlot
      ? `${selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: "America/New_York",
        })} at ${formatMinutesTo12h(
          parseInt(selectedTimeSlot.split(":")[0]) * 60 +
            parseInt(selectedTimeSlot.split(":")[1])
        )}`
      : null;

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setPromoError("Enter your email first to apply a promo code");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim(),
          email: customerEmail.trim(),
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setAppliedPromo({
          promoCodeId: data.promoCodeId,
          discountType: data.discountType,
          discountValue: data.discountValue,
          description: data.description,
          message: data.message,
        });
        setPromoError("");
      } else {
        setAppliedPromo(null);
        setPromoError(data.message || "Invalid promo code");
      }
    } catch {
      setPromoError("Network error. Try again.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  async function handleCheckout() {
    if (!customerName.trim()) {
      setCheckoutError("Please enter your name");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setCheckoutError("Please enter a valid email");
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 7) {
      setCheckoutError("Please enter a valid phone number");
      return;
    }
    // DELIVERY: validate delivery address if delivery selected
    if (fulfillmentType === "delivery" && !addressValidation.valid) {
      setCheckoutError(addressValidation.message || "Please enter a valid delivery address");
      return;
    }
    if (items.length === 0) return;

    setIsCheckingOut(true);
    setCheckoutError("");

    // One id, two copies of the event: the browser's below and the server's in
    // /api/checkout. Meta collapses them on (event_name, event_id).
    const metaEventId = newMetaEventId();
    const metaBrowserIds = getMetaBrowserIds();
    const metaContents = items.map((ci) => ({
      id: toMetaContentId(ci.id),
      quantity: ci.quantity,
      item_price: ci.price,
    }));

    trackMeta(
      "InitiateCheckout",
      {
        content_ids: metaContents.map((c) => c.id),
        contents: metaContents,
        content_type: "product",
        num_items: itemCount,
        // Food revenue only — tax, tip and the delivery fee are pass-through and
        // would inflate ROAS in Ads Manager. The server sends the same basis.
        value: discountedSubtotal,
        currency: "USD",
      },
      metaEventId
    );

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
          items: items.map((ci) => ({
            id: ci.id,
            name: ci.name,
            price: ci.price,
            quantity: ci.quantity,
            protein: ci.protein || undefined,
            spicyLevel: ci.spiceLevel || undefined,
            specialInstructions: ci.specialInstructions || undefined,
          })),
          promoCodeId: appliedPromo?.promoCodeId || undefined,
          tipAmount: tipAmount > 0 ? tipAmount : undefined,
          // DELIVERY: send delivery info
          ...(fulfillmentType === "delivery"
            ? {
                isDelivery: true,
                deliveryAddress: deliveryAddress.trim(),
                deliveryApt: deliveryApt.trim() || undefined,
                deliveryInstructions: deliveryInstructions.trim() || undefined,
                deliveryFee,
              }
            : {}),
          // Meta: dedup id plus the browser's _fbp/_fbc, which the server has no
          // other way to read for the InitiateCheckout and later Purchase events.
          meta: {
            eventId: metaEventId,
            fbp: metaBrowserIds.fbp,
            fbc: metaBrowserIds.fbc,
          },
          ...(orderMode === "scheduled" && selectedDate && selectedTimeSlot
            ? {
                scheduledDate: selectedDate.toLocaleDateString("en-CA", {
                  timeZone: "America/New_York",
                }),
                scheduledTime: selectedTimeSlot,
              }
            : {}),
        }),
      });

      const data = await response.json();
      if (data.url) {
        // The cart is deliberately NOT cleared here. Clearing before the
        // redirect meant that backing out of Stripe — or any failed payment —
        // dropped the customer on an empty cart and forced them to re-add every
        // item, while /order/cancelled told them their cart was still saved.
        // Real customers rebuilt whole orders by hand before paying, and the
        // ones who gave up never showed up in the orders table at all.
        // /order/success clears it once the payment is actually confirmed.
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || "Checkout failed. Please try again.");
      }
    } catch {
      setCheckoutError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* panel */}
      <div className="relative w-full max-w-md bg-cream shadow-2xl flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {step !== "review" && (
              <button
                onClick={() => {
                  if (step === "checkout") setStep("fulfillment");
                  else setStep("review");
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              {step === "review" && `Your Cart (${itemCount})`}
              {step === "fulfillment" && "Pickup or Delivery"}
              {step === "checkout" && "Checkout Details"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Step 1: Cart items review + order timing choice */}
        {step === "review" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {droppedItems.length > 0 && (
              <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="flex-1 text-xs text-amber-800">
                  <span className="font-semibold">{droppedItems.join(", ")}</span>{" "}
                  {droppedItems.length === 1 ? "is" : "are"} no longer on our menu, so
                  we&rsquo;ve removed {droppedItems.length === 1 ? "it" : "them"} from
                  your cart.
                </p>
                <button
                  type="button"
                  onClick={dismissDroppedItems}
                  aria-label="Dismiss"
                  className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {items.length > 0 && (
              <div className="sticky top-0 z-10 bg-cream px-4 pt-4 pb-3 border-b border-gray-200">
                <FreeItemBanner offer={freeItemOffer} onAdd={handleAddFreeItem} />
              </div>
            )}
            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Add items from the menu to get started
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {item.name}
                        </p>
                        {item.protein && (
                          <p className="text-xs text-gray-500">
                            Choice: {item.protein}
                          </p>
                        )}
                        {item.spiceLevel && (
                          <p className="text-xs text-gray-500">
                            Spice: {item.spiceLevel}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-400 italic">
                            {item.specialInstructions}
                          </p>
                        )}
                        <p className="text-sm font-bold text-secondary mt-1">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-1 p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                {/* Totals. A promo code is not applied until the checkout step,
                    so only the free-item discount can show here. */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className={freeItemOffer.discount > 0 ? "line-through text-gray-400" : ""}>
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  {freeItemOffer.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        Free {freeItemOffer.freeItems.map((f) => f.name).join(" + ")}
                      </span>
                      <span>-${freeItemOffer.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (7%)</span>
                    <span>${reviewTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary text-base pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>${reviewTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Ordering switched off entirely. Shown instead of the hours
                    notice, because "closed until 11:15" would be a lie and
                    would send the customer to the scheduler, which is also
                    off. */}
                {!orderingEnabled && (
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center space-y-1">
                    <p className="font-semibold">Online ordering is paused</p>
                    <p className="text-xs">
                      We&rsquo;re not taking online orders at the moment. Please call us
                      on{" "}
                      <a href={`tel:${R.phone}`} className="underline font-medium">
                        {R.phoneDisplay}
                      </a>{" "}
                      and we&rsquo;ll take your order over the phone.
                    </p>
                  </div>
                )}

                {/* Outside ordering hours warning */}
                {orderingEnabled && !orderingAvailable && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-center">
                    {getOrderingClosedReason()}. You can schedule for a later time.
                  </p>
                )}

                {/* Order timing choice */}
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      orderMode === "now"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    } ${!orderingAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="orderMode"
                      checked={orderMode === "now"}
                      onChange={() => setOrderMode("now")}
                      disabled={!orderingEnabled || !orderingAvailable}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-primary">Order Now</p>
                      <p className="text-xs text-gray-500">
                        {orderingAvailable
                          ? "Ready in 25-40 minutes"
                          : getOrderingClosedReason()}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      orderMode === "scheduled"
                        ? "border-secondary bg-secondary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderMode"
                      checked={orderMode === "scheduled"}
                      onChange={() => setOrderMode("scheduled")}
                      disabled={!orderingEnabled}
                      className="accent-secondary"
                    />
                    <div>
                      <p className="text-sm font-medium text-primary">Schedule for Later</p>
                      <p className="text-xs text-gray-500">Pick a future date and time</p>
                    </div>
                  </label>
                </div>

                {/* Time picker (only when "Schedule for Later" selected) */}
                {orderMode === "scheduled" && (
                  <TimeSlotPicker
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    selectedTime={selectedTimeSlot}
                    onTimeChange={setSelectedTimeSlot}
                  />
                )}

                {/* Continue button */}
                <button
                  disabled={
                    !orderingEnabled ||
                    (orderMode === "now" && !orderingAvailable) ||
                    (orderMode === "scheduled" && (!selectedDate || !selectedTimeSlot))
                  }
                  onClick={() => setStep("fulfillment")}
                  className={`w-full font-bold py-3 rounded-lg transition-colors ${
                    !orderingEnabled ||
                    (orderMode === "now" && !orderingAvailable) ||
                    (orderMode === "scheduled" && (!selectedDate || !selectedTimeSlot))
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-secondary text-cream hover:bg-secondary-light"
                  }`}
                >
                  {orderMode === "scheduled" && (!selectedDate || !selectedTimeSlot)
                    ? "Select date & time"
                    : "Continue"}
                </button>

                <p className="text-xs text-center text-gray-400">
                  7% MA sales tax applies &middot; Secure payment by Stripe
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pickup or Delivery selection */}
        {step === "fulfillment" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4">
            {/* Scheduled banner */}
            {orderMode === "scheduled" && scheduledDisplayLabel && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-amber-800">
                  {fulfillmentType === "delivery" ? "Scheduled Delivery" : "Scheduled Pickup"}
                </p>
                <p className="text-sm text-amber-700 font-medium">{scheduledDisplayLabel}</p>
              </div>
            )}

            {/* DELIVERY: Two option buttons side by side */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setFulfillmentType("pickup"); setStep("checkout"); }}
                className={`border-2 rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  fulfillmentType === "pickup"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-base font-bold text-primary">Pickup</p>
                <p className="text-xs text-gray-500 mt-1">{R.address.street}, {R.address.city}</p>
              </button>

              <button
                onClick={() => setFulfillmentType("delivery")}
                className={`border-2 rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  fulfillmentType === "delivery"
                    ? "border-secondary bg-secondary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Truck className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-base font-bold text-primary">Delivery</p>
                <p className="text-xs text-gray-500 mt-1">
                  {fulfillmentType === "delivery"
                    ? quoteLoading
                      ? "Calculating..."
                      : quotedFee > 0
                        ? `$${quotedFee.toFixed(2)} fee`
                        : "Enter address"
                    : "To your door"}
                </p>
              </button>
            </div>

            {/* DELIVERY: Address form (only when delivery selected) */}
            {fulfillmentType === "delivery" && (
              <div className="space-y-3 pt-1">
                {/* Min order warning */}
                {!deliveryEligibility.eligible && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    {deliveryEligibility.message}
                  </p>
                )}

                {/* Delivery quote error (out of zone, etc.) */}
                {deliveryError && (
                  <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {deliveryError}
                  </p>
                )}

                <input
                  type="text"
                  placeholder="Street address *"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                />
                <input
                  type="text"
                  placeholder="Apt / Suite / Floor (optional)"
                  value={deliveryApt}
                  onChange={(e) => setDeliveryApt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                />
                <input
                  type="text"
                  placeholder="Delivery instructions (optional)"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                />

                <button
                  disabled={
                    !deliveryEligibility.eligible ||
                    !addressValidation.valid ||
                    quoteLoading ||
                    quotedFee === 0
                  }
                  onClick={() => setStep("checkout")}
                  className={`w-full font-bold py-3 rounded-lg transition-colors ${
                    !deliveryEligibility.eligible ||
                    !addressValidation.valid ||
                    quoteLoading ||
                    quotedFee === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-secondary text-cream hover:bg-secondary-light"
                  }`}
                >
                  {quoteLoading ? "Calculating fee..." : "Continue"}
                </button>
              </div>
            )}

            <p className="text-xs text-center text-gray-400">
              7% MA sales tax applies &middot; Secure payment by Stripe
            </p>
          </div>
        )}

        {/* Step 3: Customer form + Pay */}
        {step === "checkout" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 border-t border-gray-200 space-y-3">
            {/* Price breakdown */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className={hasDiscount ? "line-through text-gray-400" : ""}>
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    {freeItemWins ? <Gift className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                    {freeItemWins ? discountLabel : `Discount (${discountLabel})`}
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax (7%)</span>
                <span>${displayTax.toFixed(2)}</span>
              </div>
              {/* DELIVERY: Delivery fee line */}
              {fulfillmentType === "delivery" && deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Delivery Fee
                  </span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-primary text-base pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>${orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tip / Gratuity */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tip / Gratuity</p>
              <div className="grid grid-cols-5 gap-1.5">
                {["10", "15", "20", "25"].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setSelectedTip(pct); setCustomTipInput(""); }}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTip === pct
                        ? "bg-primary text-cream"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { setSelectedTip("none"); setCustomTipInput(""); }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTip === "none"
                      ? "bg-gray-300 text-gray-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  No Tip
                </button>
                <button
                  onClick={() => setSelectedTip("custom")}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTip === "custom"
                      ? "bg-primary text-cream"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Custom
                </button>
              </div>
              {selectedTip === "custom" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="0.00"
                    value={customTipInput}
                    onChange={(e) => setCustomTipInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  />
                </div>
              )}
              {tipAmount > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  Tip: ${tipAmount.toFixed(2)} &middot; Grand Total: ${finalTotal.toFixed(2)}
                </p>
              )}
            </div>

            {/* Scheduled order info */}
            {scheduledDisplayLabel && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-800">
                  {fulfillmentType === "delivery" ? "Scheduled Delivery" : "Scheduled Pickup"}
                </p>
                <p className="text-sm text-amber-700 font-medium">{scheduledDisplayLabel}</p>
              </div>
            )}

            {/* DELIVERY: Delivery address summary */}
            {fulfillmentType === "delivery" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-800">Delivering to</p>
                    <p className="text-sm text-blue-700 font-medium">
                      {deliveryAddress}{deliveryApt ? `, ${deliveryApt}` : ""}
                    </p>
                    {deliveryInstructions && (
                      <p className="text-xs text-blue-600 mt-0.5">{deliveryInstructions}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep("fulfillment")}
                    className="text-xs text-blue-600 hover:text-blue-800 underline shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Promo code section */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Promo Code</p>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-green-700">{appliedPromo.message}</span>
                    <p className="text-xs text-green-600">{appliedPromo.description}</p>
                  </div>
                  <button onClick={handleRemovePromo} className="text-green-600 hover:text-green-800">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary uppercase"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2 bg-primary text-cream text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-xs text-red-500">{promoError}</p>
              )}
            </div>

            {/* Customer info form */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Your name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              />
              <input
                type="email"
                placeholder="Email *"
                value={customerEmail}
                onChange={(e) => { setCustomerEmail(e.target.value); if (appliedPromo) { setAppliedPromo(null); setPromoError("Promo removed — re-apply after changing email"); } }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
              />
            </div>

            {checkoutError && (
              <p className="text-red-500 text-sm text-center">{checkoutError}</p>
            )}

            <button
              disabled={
                isCheckingOut ||
                !customerName.trim() ||
                !customerEmail.trim() ||
                !customerPhone.trim()
              }
              onClick={handleCheckout}
              className={`w-full font-bold py-3 rounded-lg transition-colors ${
                isCheckingOut ||
                !customerName.trim() ||
                !customerEmail.trim() ||
                !customerPhone.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-secondary text-cream hover:bg-secondary-light"
              }`}
            >
              {isCheckingOut
                ? "Processing..."
                : `Pay $${finalTotal.toFixed(2)} with Stripe`}
            </button>
            <p className="text-xs text-center text-gray-400">
              {fulfillmentType === "delivery" ? "Delivery" : orderMode === "scheduled" ? "Scheduled pickup" : "Pickup only"} &middot; 7% MA tax &middot; Secure payment by Stripe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}