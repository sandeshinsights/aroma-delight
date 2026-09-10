import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import menuData from "@/data/menu.json";
import {
  isOrderingWindowOpen,
  getOrderingClosedReason,
  isValidScheduledTime,
  formatScheduledPickup,
  scheduledTimeToUtcIso,
} from "@/lib/ordering-hours";
import { DELIVERY_CONFIG } from "@/lib/delivery";
import { getUberQuote } from "@/lib/uber-direct";
import { getOptionSurcharge } from "@/lib/pricing";
import { calculateFreeItemOffer } from "@/lib/free-item-offer";
import { isOnlineOrderingEnabled } from "@/lib/data";
import { applyDiscountToLineItems } from "@/lib/stripe-line-items";
import {
  queueMetaCapiEvent,
  getClientIp,
  getClientUserAgent,
} from "@/lib/meta-capi";

// Matches the webhook, verify-order and cron routes. Without it this route gets
// the platform default, and a slow Uber quote or Stripe call reads to the
// customer as their own connection failing mid-payment.
export const maxDuration = 60;

// Max lengths are deliberate: every string here ends up in email HTML, the
// kitchen slip, and Stripe metadata (500-char cap per value) — unbounded input
// is both an abuse vector and a checkout-breaking one.
const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Valid email is required").max(254),
  phone: z.string().min(7, "Valid phone is required").max(25, "Phone number is too long"),
  items: z.array(
    z.object({
      id: z.string().max(120),
      name: z.string().max(150),
      price: z.number(),
      quantity: z.number().int("Whole numbers only").min(1).max(20, "Maximum 20 per item"),
      protein: z.string().max(60).optional(),
      spicyLevel: z.string().max(60).optional(),
      specialInstructions: z.string().max(200, "Special instructions are too long").optional(),
    })
  ).min(1, "At least one item is required").max(50, "Too many items in cart"),
  promoCodeId: z.string().max(100).optional(),
  scheduledDate: z.string().max(20).optional(),
  scheduledTime: z.string().max(10).optional(),
  tipAmount: z.number().min(0).max(500, "Tip is too large").optional(),
  // DELIVERY — deliveryFee here is only what the customer was SHOWN. The fee
  // actually charged comes from a fresh server-side Uber quote below; trusting
  // this number let anyone edit the request and get free delivery while the
  // restaurant still paid Uber the real fare.
  isDelivery: z.boolean().optional(),
  deliveryAddress: z.string().max(300).optional(),
  deliveryApt: z.string().max(100).optional(),
  deliveryInstructions: z.string().max(300, "Delivery instructions are too long").optional(),
  deliveryFee: z.number().min(0).max(200).optional(),
  // Meta Pixel handoff. Optional and never load-bearing: an old cached client,
  // a blocked pixel, or a curl request simply produces a lower-quality
  // conversion event, never a failed checkout.
  meta: z
    .object({
      eventId: z.string().max(100).optional(),
      fbp: z.string().max(200).optional(),
      fbc: z.string().max(400).optional(),
    })
    .optional(),
});

function getMenuItemPrice(itemId: string): { price: number; category: string } | null {
  const baseId = itemId.split("-").slice(0, 2).join("-");

  for (const category of menuData.categories) {
    const item = (category.items as any[]).find((i: any) => i.id === baseId);
    if (item) return { price: item.price, category: category.name };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // The off switch is enforced here, not just in the UI. A disabled button is
    // a suggestion; a saved cart, a stale tab, or a direct request all reach
    // this route, and any of them would otherwise take money the kitchen is not
    // going to cook.
    if (!isOnlineOrderingEnabled()) {
      return NextResponse.json(
        { error: "Online ordering is paused right now. Please call the restaurant to place your order." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = checkoutSchema.parse(body);

    const { name, email, phone, items, promoCodeId, scheduledDate, scheduledTime, tipAmount, isDelivery, deliveryAddress, deliveryApt, deliveryInstructions, deliveryFee, meta } = parsed;

    // Meta attribution signals. IP and user-agent must be the CUSTOMER's, which
    // is only true here — by the time fulfillment runs, the "client" is Stripe's
    // webhook or our own cron. That is why they get carried on the session below
    // rather than re-read later.
    const metaFbp = meta?.fbp;
    const metaFbc = meta?.fbc;
    const metaClientIp = getClientIp(req.headers);
    const metaClientUserAgent = getClientUserAgent(req.headers);
    const metaSourceUrl =
      req.headers.get("referer") || process.env.NEXT_PUBLIC_BASE_URL || undefined;

    // --- Handle ordering window vs scheduled time ---
    const hasScheduledDate = typeof scheduledDate === "string" && scheduledDate.trim() !== "";
    const hasScheduledTime = typeof scheduledTime === "string" && scheduledTime.trim() !== "";

    let scheduledForFormatted: string | undefined;
    let scheduledForIso: string | undefined;

    if (hasScheduledDate && hasScheduledTime) {
      if (!isValidScheduledTime(scheduledDate, scheduledTime)) {
        return NextResponse.json(
          { error: "Invalid scheduled time. Please choose a different time slot." },
          { status: 400 }
        );
      }
      scheduledForFormatted = formatScheduledPickup(scheduledDate, scheduledTime);
      // The DB stores machine time (UTC ISO); humans get the formatted string
      // only at display time. Storing the formatted string here is what broke
      // scheduled delivery — new Date("Thursday, June 19 at 4:00 PM") is
      // Invalid Date, so couriers dispatched immediately.
      scheduledForIso = scheduledTimeToUtcIso(scheduledDate, scheduledTime);
    } else {
      if (!isOrderingWindowOpen()) {
        return NextResponse.json(
          { error: getOrderingClosedReason() || "Orders are not available at this time." },
          { status: 403 }
        );
      }
    }

    // 1. Calculate totals using SERVER prices (ignore client-sent prices)
    let subtotal = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    // The cart snapshot persisted on the order (and later rendered into the
    // kitchen slip and emails). Client-sent prices are replaced with server
    // prices and unknown fields are dropped — otherwise the slip would print
    // whatever numbers the request body claimed.
    const sanitizedItems: Array<Record<string, unknown>> = [];

    for (const item of items) {
      const menuItem = getMenuItemPrice(item.id);
      if (!menuItem || !menuItem.price) {
        // Name it. The cart now self-heals on load, so reaching here means a tab
        // left open since before the menu changed. "Invalid item in cart" told
        // the customer nothing they could act on.
        const label =
          typeof item.name === "string" && item.name ? item.name : "An item";
        return NextResponse.json(
          {
            error: `${label} is no longer available. Please remove it from your cart and try again.`,
          },
          { status: 400 }
        );
      }
      // Option surcharge, from the same shared module the menu UI uses. Nothing
      // on the current menu carries one, but the call stays so a future paid
      // option can't be shown to the customer without also being charged.
      const serverPrice = menuItem.price + getOptionSurcharge();
      sanitizedItems.push({
        id: item.id,
        name: item.name,
        price: serverPrice,
        quantity: item.quantity,
        protein: item.protein || undefined,
        spicyLevel: item.spicyLevel || undefined,
        specialInstructions: item.specialInstructions || undefined,
      });
      const unitPrice = Math.round(serverPrice * 100); // cents
      const lineItemTotal = unitPrice * item.quantity;
      subtotal += lineItemTotal / 100;

      const descParts: string[] = [];
      if (item.protein && item.protein.trim() !== "") descParts.push(item.protein.trim());
      if (item.spicyLevel && item.spicyLevel.trim() !== "") descParts.push(item.spicyLevel.trim());
      if (item.specialInstructions && item.specialInstructions.trim() !== "") {
        descParts.push(`Note: ${item.specialInstructions.trim()}`);
      }
      const description = descParts.length > 0
        ? descParts.join(" | ")
        : isDelivery ? "Delivery order" : "Pickup order";

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description,
          },
          unit_amount: unitPrice,
        },
        quantity: item.quantity,
      });
    }

    // 2. Validate promo code (server-side)
    let discountAmount = 0;
    let validPromoCodeId: string | null = null;
    let promoDescription: string | null = null;

    if (promoCodeId) {
      const promo = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });

      if (promo && promo.active) {
        if (promo.expiresAt && new Date() > promo.expiresAt) {
          // silently ignore expired
        } else if (promo.maxTotalUses && promo.usedCount >= promo.maxTotalUses) {
          // silently ignore max reached
        } else {
          const normalizedEmail = email.toLowerCase().trim();

          const customerUsageCount = await prisma.promoCodeUsage.count({
            where: { promoCodeId: promo.id, customerEmail: normalizedEmail },
          });

          if (!promo.maxUsesPerCustomer || customerUsageCount < promo.maxUsesPerCustomer) {
            let sequenceValid = true;
            if (promo.orderNumber) {
              const totalPaidOrders = await prisma.order.count({
                where: { email: normalizedEmail, status: "paid" },
              });
              if (totalPaidOrders + 1 !== promo.orderNumber) {
                sequenceValid = false;
              }
            }

            if (sequenceValid) {
              if (promo.discountType === "PERCENTAGE") {
                discountAmount = parseFloat((subtotal * promo.discountValue / 100).toFixed(2));
              } else {
                discountAmount = Math.min(promo.discountValue, subtotal);
              }
              validPromoCodeId = promo.id;
              promoDescription = promo.description;
            }
          }
        }
      }
    }

    // 2b. Spend-threshold free-item offer: $50 of qualifying food earns a free
    //     Mango Lassi, $100 earns a free Vegetable Samosa and Mango Lassi. Only
    //     items the customer already added are comped — nothing is added to the
    //     cart for them — and the free items' own prices do not count toward the
    //     threshold. Computed from the SAME sanitized server prices the charge is
    //     built from, so the client cannot buy its way past a threshold.
    //
    //     Deliberately does NOT stack with a promo code. Order.discountAmount is
    //     a single number and PromoCodeUsage bills its discount against the code,
    //     so combining them would report free food as part of the promo's cost.
    //     The customer gets whichever saves more; a promo code that loses is not
    //     consumed (validPromoCodeId is cleared), so it still works next time.
    const freeItemOffer = calculateFreeItemOffer(
      sanitizedItems.map((item) => ({
        id: String(item.id),
        price: Number(item.price),
        quantity: Number(item.quantity),
      }))
    );

    let discountLabel = promoDescription || "Promo";
    const freeItemWon = freeItemOffer.discount > discountAmount;
    if (freeItemWon) {
      discountAmount = freeItemOffer.discount;
      validPromoCodeId = null;
      discountLabel = `Free ${freeItemOffer.freeItems.map((i) => i.name).join(" + ")}`;
    }

    // A discount can never exceed the food it applies to. Without this a
    // percentage promo above 100 would push the Stripe total negative.
    discountAmount = Math.min(discountAmount, subtotal);

    // 3. Delivery: enforce requirements and price the fee SERVER-SIDE.
    //    The client's deliveryFee is only the number the customer was shown;
    //    the charge comes from a fresh Uber quote. Minimum order and a real
    //    address are enforced here too — previously both were client-side only.
    let deliveryFeeAmount = 0;
    if (isDelivery) {
      if (!deliveryAddress || deliveryAddress.trim().length < 10) {
        return NextResponse.json(
          { error: "Please enter a full delivery address." },
          { status: 400 }
        );
      }
      if (subtotal < DELIVERY_CONFIG.minOrderAmount) {
        return NextResponse.json(
          { error: `Delivery requires a minimum order of $${DELIVERY_CONFIG.minOrderAmount}.` },
          { status: 400 }
        );
      }

      let serverFee: number;
      try {
        const quote = await getUberQuote(
          DELIVERY_CONFIG.restaurantAddress,
          deliveryAddress.trim(),
          scheduledForIso
        );
        serverFee = quote.fee;
      } catch (err) {
        console.error("[Checkout] Delivery quote failed:", err instanceof Error ? err.message : err);
        return NextResponse.json(
          { error: "We couldn't confirm delivery to this address. Please check the address or choose pickup." },
          { status: 422 }
        );
      }

      // If Uber's price moved past what the customer was shown, make them
      // re-confirm instead of silently charging more.
      const displayedFee = deliveryFee ?? 0;
      if (serverFee > displayedFee + 1) {
        return NextResponse.json(
          {
            error: `The delivery fee for this address is $${serverFee.toFixed(2)}. Please review and try again.`,
            fee: serverFee,
          },
          { status: 409 }
        );
      }
      deliveryFeeAmount = serverFee;
    }

    // Meta content ids are the stable menu item (first two dash-segments), not
    // the composite cart line id, so audiences and reporting line up across
    // orders — the same recovery getMenuItemPrice does for pricing.
    const metaContents = sanitizedItems.map((item) => ({
      id: String(item.id).split("-").slice(0, 2).join("-"),
      quantity: item.quantity as number,
      item_price: item.price as number,
    }));
    const metaContentIds = metaContents.map((c) => c.id);
    const metaNumItems = metaContents.reduce((sum, c) => sum + c.quantity, 0);

    // 4. Apply the discount to the Stripe line items FIRST, then build the
    //    totals from what was actually taken off. Doing it in this order is what
    //    keeps the stored order row equal to what Stripe charges — the helper can
    //    differ from the requested discount by a cent or two on integer rounding,
    //    and the row has to reflect the charge, not the intent.
    if (discountAmount > 0) {
      // Take the money off the comped items first, so Stripe's checkout page
      // shows "Mango Lassi $0.00" rather than a mystery reduction on whatever
      // happened to be first in the cart. This reorders only the view handed to
      // the helper — lineItems keeps its cart order for Stripe, and the helper
      // mutates the shared line-item objects either way.
      const freeIds = new Set(freeItemOffer.freeItems.map((i) => i.name));
      const discountTargets = freeItemWon
        ? [
            ...lineItems.filter((li) => freeIds.has(li.price_data?.product_data?.name ?? "")),
            ...lineItems.filter((li) => !freeIds.has(li.price_data?.product_data?.name ?? "")),
          ]
        : lineItems;

      const appliedCents = applyDiscountToLineItems(
        discountTargets,
        Math.round(discountAmount * 100),
        discountLabel
      );
      discountAmount = parseFloat((appliedCents / 100).toFixed(2));
    }

    // 5. Calculate final totals with discount. Tax is charged on the discounted
    //    subtotal; tip is never taxed.
    const discountedSubtotal = parseFloat((subtotal - discountAmount).toFixed(2));
    const taxRate = parseFloat(process.env.SALES_TAX_RATE || "0.07");
    const tax = parseFloat((discountedSubtotal * taxRate).toFixed(2));
    const tip = parseFloat((tipAmount || 0).toFixed(2));
    const total = parseFloat((discountedSubtotal + tax + tip + deliveryFeeAmount).toFixed(2));

    // Add tip as separate Stripe line item
    if (tip > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tip / Gratuity",
            description: "Thank you for your generosity!",
          },
          unit_amount: Math.round(tip * 100),
        },
        quantity: 1,
      });
    }

    // DELIVERY: Add delivery fee as separate Stripe line item
    if (isDelivery && deliveryFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Fee",
            description: "Delivery to your address",
          },
          unit_amount: Math.round(deliveryFeeAmount * 100),
        },
        quantity: 1,
      });
    }

    // 6. Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/order/cancelled`,
      metadata: {
        // This Stripe account is shared with another restaurant's site. Both
        // sites' webhook endpoints receive every checkout.session.* event for
        // the account, so the webhook filters on this tag and ignores sessions
        // that aren't ours.
        site: "aroma-delights",
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        promo_code_id: validPromoCodeId || "",
        discount_amount: discountAmount.toFixed(2),
        tip_amount: tip.toFixed(2),
        is_delivery: isDelivery ? "true" : "false",
        delivery_address: deliveryAddress || "",
        delivery_apt: deliveryApt || "",
        delivery_instructions: deliveryInstructions || "",
        delivery_fee: deliveryFeeAmount.toFixed(2),
        ...(scheduledForFormatted ? { scheduled_for: scheduledForFormatted } : {}),
        // Meta attribution, parked on the session so fulfillOrder() can send a
        // fully-matched Purchase event. Stripe metadata rather than an Order
        // column deliberately: this is disposable marketing data and it is not
        // worth a schema migration on the ordering flow (see CLAUDE.md on the
        // two-step migrate-then-deploy cost). Stripe caps values at 500 chars.
        ...(metaFbp ? { fb_fbp: metaFbp.slice(0, 500) } : {}),
        ...(metaFbc ? { fb_fbc: metaFbc.slice(0, 500) } : {}),
        ...(metaClientIp ? { fb_client_ip: metaClientIp.slice(0, 100) } : {}),
        ...(metaClientUserAgent && metaClientUserAgent.length <= 500
          ? { fb_client_ua: metaClientUserAgent }
          : {}),
      },
    });

    // 7. Save order to database. items is the sanitized snapshot (server
    //    prices), scheduledFor is machine time — see notes above.
    await prisma.order.create({
      data: {
        name,
        email,
        phone,
        items: sanitizedItems as any,
        subtotal,
        tax,
        total,
        discountAmount,
        tipAmount: tip,
        stripeSessionId: session.id,
        status: "pending",
        promoCodeId: validPromoCodeId,
        isDelivery: isDelivery || false,
        deliveryAddress: isDelivery ? (deliveryAddress || null) : null,
        deliveryApt: isDelivery ? (deliveryApt || null) : null,
        deliveryInstructions: isDelivery ? (deliveryInstructions || null) : null,
        deliveryFee: deliveryFeeAmount,
        ...(scheduledForIso ? { scheduledFor: scheduledForIso } : {}),
      },
    });

    // 8. Meta InitiateCheckout (server copy). Runs after the response via
    //    `after()`, so a slow Graph API call cannot delay the redirect to
    //    Stripe. The browser fired the same event id; Meta dedups the pair.
    if (meta?.eventId) {
      queueMetaCapiEvent({
        eventName: "InitiateCheckout",
        eventId: meta.eventId,
        eventSourceUrl: metaSourceUrl,
        userData: {
          email,
          phone,
          name,
          fbp: metaFbp,
          fbc: metaFbc,
          clientIpAddress: metaClientIp,
          clientUserAgent: metaClientUserAgent,
        },
        customData: {
          // Same basis as the browser event and as Purchase: food revenue only,
          // excluding tax, tip and the pass-through delivery fee.
          value: discountedSubtotal,
          currency: "USD",
          content_type: "product",
          content_ids: metaContentIds,
          contents: metaContents,
          num_items: metaNumItems,
        },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Validation problems get a helpful message; everything else gets a generic
    // one. Echoing error.message here leaked Stripe/Prisma internals (and once,
    // schema details) to whoever poked the endpoint.
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid order data." },
        { status: 400 }
      );
    }
    console.error("Checkout API error:", error);
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}