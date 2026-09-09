/**
 * Delivery Configuration & Uber Direct Integration
 *
 * DELIVERY_CONFIG: All delivery settings in one place.
 * - To add restaurant subsidy later: change subsidyAmount
 * - feeType "uber_quote": calls our API route for address-based pricing from Uber Direct
 * - To switch back to flat: change feeType to "flat"
 *
 * getDeliveryQuote(): Calls /api/delivery/quote which talks to Uber Direct.
 * Blocks checkout if the address can't be quoted.
 *
 * This file is client-side only and never touches Uber directly — it only calls
 * our own API routes. Dispatching an actual courier happens server-side in
 * src/lib/order-fulfillment.ts, after Stripe confirms payment.
 */

import { getRestaurantData } from "@/lib/data";

const R = getRestaurantData();

export const DELIVERY_CONFIG = {
  enabled: true,

  // Fee configuration
  feeType: "uber_quote" as "flat" | "uber_quote" | "distance",
  flatFee: 6.99,
  subsidyAmount: 0, // Future: restaurant covers part of the fee

  // Order requirements
  minOrderAmount: 20,

  // Delivery area (used when Google Places is integrated)
  maxRadiusMiles: 10,
  restaurantAddress: R.address.full,
  restaurantLat: R.geo.lat,
  restaurantLng: R.geo.lng,
};

export interface DeliveryFeeResult {
  fee: number; // Total delivery cost
  customerPays: number; // What appears on customer receipt
  restaurantPays: number; // What restaurant subsidizes
}

/**
 * Calculate delivery fee (synchronous, used as fallback).
 * When feeType is "uber_quote", use getDeliveryQuote() instead.
 */
export function getDeliveryFee(): DeliveryFeeResult {
  const fee = DELIVERY_CONFIG.flatFee;
  const customerPays = Math.max(0, fee - DELIVERY_CONFIG.subsidyAmount);
  const restaurantPays = DELIVERY_CONFIG.subsidyAmount;
  return { fee, customerPays, restaurantPays };
}

/**
 * Get a delivery quote for a specific address.
 * Calls our own API route which talks to Uber Direct.
 *
 * CartDrawer calls this async when customer types their address. For scheduled
 * orders, pass the scheduled time (ISO string) so the displayed fee is quoted
 * on the same basis checkout re-quotes it server-side — otherwise a
 * scheduled-vs-ASAP price difference shows up as a fee-changed error at pay
 * time.
 */
export async function getDeliveryQuote(
  address: string,
  scheduledFor?: string
): Promise<DeliveryFeeResult & { error?: string }> {
  try {
    const res = await fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, ...(scheduledFor ? { scheduledFor } : {}) }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Out of delivery area or bad request
      return {
        fee: 0,
        customerPays: 0,
        restaurantPays: 0,
        error: data.error || "Could not get delivery quote",
      };
    }

    return {
      fee: data.fee,
      customerPays: data.customerPays,
      restaurantPays: data.restaurantPays,
    };
  } catch {
    // Network error — can't verify address is deliverable, block checkout
    console.error("[getDeliveryQuote] Delivery API unreachable");
    return {
      fee: 0,
      customerPays: 0,
      restaurantPays: 0,
      error: `Delivery service temporarily unavailable. Please try again or call us at ${R.phoneDisplay}.`,
    };
  }
}

/**
 * Check if cart subtotal meets the delivery minimum.
 */
export function isEligibleForDelivery(subtotal: number): {
  eligible: boolean;
  message?: string;
} {
  if (subtotal < DELIVERY_CONFIG.minOrderAmount) {
    return {
      eligible: false,
      message: `Minimum order $${DELIVERY_CONFIG.minOrderAmount} for delivery (your subtotal is $${subtotal.toFixed(2)})`,
    };
  }
  return { eligible: true };
}

/**
 * Basic address validation.
 * Enhanced with Google Places autocomplete later.
 */
export function validateDeliveryAddress(address: string): {
  valid: boolean;
  message?: string;
} {
  if (!address || address.trim().length < 10) {
    return { valid: false, message: "Please enter a full street address" };
  }
  return { valid: true };
}

// createDelivery() and its /api/delivery/create route were removed: nothing
// called them, the route dispatched a real Uber courier with no payment check
// on an unauthenticated POST, and the helper reported success with a fake
// `manual-<timestamp>` id whenever the call failed. Couriers are dispatched
// only from fulfillOrder() in src/lib/order-fulfillment.ts, after Stripe
// confirms payment.