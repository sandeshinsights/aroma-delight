import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createUberDelivery } from "@/lib/uber-direct";
import { sendOrderToPrinter, sendFulfillmentAlert, type StuckOrderReport } from "@/lib/email";
import { fulfillOrder, isScheduledForLater } from "@/lib/order-fulfillment";

export const maxDuration = 60;

/**
 * Recovery sweep tuning.
 *
 * Fulfillment claims an order (fulfilledAt) *before* doing the work, which makes
 * it at-most-once: if the function dies between the claim and the print/dispatch,
 * nothing retries it. Stripe's retry hits the claim and short-circuits, and the
 * success page returns the already-fulfilled snapshot. This sweep is the only
 * thing that notices, so it has to be conservative about what counts as stuck.
 */
const RECOVERY_LOOKBACK_MS = 24 * 60 * 60 * 1000; // ignore anything older
const RECOVERY_MIN_AGE_MS = 10 * 60 * 1000; // never touch an in-flight fulfillment
const REDISPATCH_MAX_AGE_MS = 2 * 60 * 60 * 1000; // past this, a courier is pointless

/**
 * Pre-claim recovery tuning (see recoverUnclaimedOrders).
 *
 * Stripe expires an abandoned Checkout Session ~24h after creation, so a full
 * day of lookback is enough to reach every row that can still be settled. The
 * min age keeps the sweep off a checkout the customer is still filling in.
 */
const UNCLAIMED_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const UNCLAIMED_MIN_AGE_MS = 15 * 60 * 1000;
const UNCLAIMED_MAX_EXAMINED = 40; // one Stripe round-trip each; keep well inside maxDuration

const SEND_SPACING_MS = 500; // Resend's default limit is 2 req/s

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Settle orders that never got past `pending` — the sweep's pre-claim half.
 *
 * recoverStuckOrders below can only see orders that were *claimed*: it filters on
 * status "paid", which fulfillOrder() writes in the same statement as fulfilledAt.
 * An order whose fulfillment never started is invisible to it. That happens when
 * both triggers miss — Stripe never delivered checkout.session.completed AND the
 * customer closed the tab before /order/success POSTed to /api/verify-order — and
 * the result is the worst failure the system has: money taken, nothing printed,
 * nobody alerted.
 *
 * Almost every pending row is something far more boring: an abandoned cart. The
 * Order row is written when the Checkout Session is created, before the customer
 * has typed a card number, so every bailed-out checkout leaves one behind. Only
 * Stripe knows which is which, so ask it, one row at a time.
 */
async function recoverUnclaimedOrders(now: Date) {
  const unclaimed = await prisma.order.findMany({
    where: {
      status: "pending",
      createdAt: {
        gte: new Date(now.getTime() - UNCLAIMED_LOOKBACK_MS),
        lte: new Date(now.getTime() - UNCLAIMED_MIN_AGE_MS),
      },
    },
    orderBy: { createdAt: "asc" },
    take: UNCLAIMED_MAX_EXAMINED,
  });

  const reports: StuckOrderReport[] = [];
  let fulfilled = 0;
  let abandoned = 0;
  let untouched = 0;

  for (const order of unclaimed) {
    let session: Stripe.Checkout.Session;
    try {
      session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    } catch (err) {
      // Transient Stripe trouble. Leave the row pending and let the next run
      // decide — guessing here would either abandon a paid order or fulfill an
      // unpaid one.
      console.error(`[cron/unclaimed] Stripe lookup failed for #${order.id}:`, errMessage(err));
      untouched++;
      continue;
    }

    if (session.payment_status === "paid") {
      console.error(
        `[cron/unclaimed] Order #${order.id} was PAID but never fulfilled — fulfilling now`
      );

      // fulfillOrder() is the whole job: atomic claim, kitchen slip, both emails,
      // courier dispatch, Meta Purchase. It is idempotent and it is the same call
      // the webhook would have made. Do not reimplement any of it here.
      const result = await fulfillOrder(order.stripeSessionId);

      if (result.success) {
        fulfilled++;
        reports.push({
          orderId: order.id,
          name: order.name,
          phone: order.phone,
          total: order.total,
          fulfilledAt: order.createdAt,
          problem:
            "it was paid for but never reached the kitchen — no slip printed when the order came in",
          action:
            "the slip has just printed; check how late it is and call the customer before you start cooking",
        });
      } else {
        reports.push({
          orderId: order.id,
          name: order.name,
          phone: order.phone,
          total: order.total,
          fulfilledAt: order.createdAt,
          problem: `it was paid for, and fulfilling it just failed again (${result.message ?? "unknown error"})`,
          action: "write this order down from this email and call the customer",
        });
      }
      await sleep(SEND_SPACING_MS);
      continue;
    }

    if (session.status === "expired") {
      // Abandoned cart: the customer never paid and never will. Settle the row so
      // `pending` means "checkout in progress" rather than "nobody knows".
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "abandoned" },
      });
      abandoned++;
      continue;
    }

    // Session still open (or an unpaid state Stripe has not settled). Not our
    // business yet.
    untouched++;
  }

  if (reports.length > 0) {
    try {
      await sendFulfillmentAlert(reports);
    } catch (err) {
      console.error("[cron/unclaimed] Alert email failed:", errMessage(err));
    }
  }

  return { examined: unclaimed.length, fulfilled, abandoned, untouched };
}

/**
 * Find paid orders whose post-payment work never finished, fix what can be fixed
 * automatically, and email the restaurant about whatever needs a human.
 *
 * Deliberately bounded: only orders fulfilled in the last 24h, only ones idle for
 * at least 10 minutes, and re-dispatch only within 2h of payment. Historical rows
 * are excluded by the migration's printed_at / dispatch_state backfills — without
 * those, every pre-existing order would look un-printed and un-dispatched, and the
 * first run of this sweep would re-print months of orders and send couriers to
 * addresses that were served long ago.
 */
async function recoverStuckOrders(now: Date) {
  const stuck = await prisma.order.findMany({
    where: {
      status: "paid",
      fulfilledAt: {
        gte: new Date(now.getTime() - RECOVERY_LOOKBACK_MS),
        lte: new Date(now.getTime() - RECOVERY_MIN_AGE_MS),
      },
      OR: [
        // Kitchen never got a slip.
        { printedAt: null },
        // Delivery order whose dispatch attempt never concluded (dispatchState
        // null means "no outcome recorded", i.e. the process died mid-attempt).
        // "failed" is excluded: that outcome is settled and already reported.
        { isDelivery: true, uberDeliveryId: null, dispatchState: null },
      ],
    },
    orderBy: { fulfilledAt: "asc" },
  });

  const reports: StuckOrderReport[] = [];
  let reprinted = 0;
  let redispatched = 0;

  for (const order of stuck) {
    const fulfilledAt = order.fulfilledAt;
    const ageMs = fulfilledAt ? now.getTime() - fulfilledAt.getTime() : Infinity;
    const problems: string[] = [];
    const actions: string[] = [];

    // --- Missing kitchen slip: retry the print ---
    if (!order.printedAt) {
      try {
        const printed = await sendOrderToPrinter(
          {
            orderId: order.id, name: order.name, phone: order.phone,
            items: order.items, subtotal: order.subtotal, tax: order.tax, total: order.total,
            discountAmount: order.discountAmount ?? 0,
            scheduledFor: order.scheduledFor || undefined,
            isDelivery: order.isDelivery,
            deliveryAddress: order.deliveryAddress,
            deliveryApt: order.deliveryApt,
            deliveryInstructions: order.deliveryInstructions,
            deliveryFee: order.deliveryFee,
          },
          // A distinct key from the original send: reusing `print-<id>` would let
          // Resend dedupe the retry against the failed original and quietly print
          // nothing at all.
          { idempotencySuffix: "recovery" }
        );

        if (printed) {
          await prisma.order.update({
            where: { id: order.id },
            data: { printedAt: new Date() },
          });
          reprinted++;
          console.log(`[cron/recovery] Re-printed order #${order.id}`);
        } else {
          problems.push("the kitchen slip never printed and printing is not configured");
          actions.push("write this order down manually");
        }
      } catch (err) {
        console.error(`[cron/recovery] Re-print failed for #${order.id}:`, errMessage(err));
        problems.push("the kitchen slip never printed, and printing it again just failed");
        actions.push("write this order down manually");
      }
      await sleep(SEND_SPACING_MS);
    }

    // --- Delivery with no courier and no recorded outcome ---
    if (order.isDelivery && !order.uberDeliveryId && order.dispatchState === null) {
      if (isScheduledForLater(order.scheduledFor)) {
        // Not stuck — just not due yet. Re-dispatching here would send a courier
        // today for tomorrow's order, since this path requests an ASAP delivery.
        // The scheduled-dispatch pass above picks it up when its window arrives.
        console.log(
          `[cron/recovery] Order #${order.id} has no courier yet but is scheduled for ${order.scheduledFor} — leaving it to the scheduled pass`
        );
      } else if (!order.deliveryAddress) {
        await prisma.order.update({
          where: { id: order.id },
          data: { dispatchState: "failed" },
        });
        problems.push("it is a delivery order with no delivery address saved");
        actions.push("call the customer for their address");
      } else if (ageMs <= REDISPATCH_MAX_AGE_MS) {
        try {
          const result = await createUberDelivery({
            customerName: order.name,
            customerPhone: order.phone,
            deliveryAddress: order.deliveryAddress,
            deliveryApt: order.deliveryApt || undefined,
            deliveryInstructions: order.deliveryInstructions || undefined,
            orderDescription: `Order ${order.id}`,
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              uberDeliveryId: result.deliveryId,
              uberDeliveryStatus: result.status,
              dispatchState: "dispatched",
            },
          });
          redispatched++;
          console.log(`[cron/recovery] Re-dispatched order #${order.id} → ${result.deliveryId}`);
        } catch (err) {
          console.error(`[cron/recovery] Re-dispatch failed for #${order.id}:`, errMessage(err));
          await prisma.order.update({
            where: { id: order.id },
            data: { dispatchState: "failed" },
          });
          problems.push("no delivery driver was ever assigned, and requesting one again failed");
          actions.push(`deliver to ${order.deliveryAddress} yourselves, or call the customer`);
        }
      } else {
        // Too old for a courier to be useful. Record the settled outcome so the
        // customer's success page stops saying "arranging" and says manual.
        await prisma.order.update({
          where: { id: order.id },
          data: { dispatchState: "failed" },
        });
        problems.push("no delivery driver was ever assigned, and it is now too late to send one");
        actions.push(`deliver to ${order.deliveryAddress} yourselves, or call the customer to sort it out`);
      }
    }

    if (problems.length > 0) {
      reports.push({
        orderId: order.id,
        name: order.name,
        phone: order.phone,
        total: order.total,
        fulfilledAt: order.fulfilledAt,
        problem: problems.join("; and "),
        action: actions.join("; ") + ".",
      });
    }
  }

  if (reports.length > 0) {
    try {
      await sendFulfillmentAlert(reports);
    } catch (err) {
      console.error("[cron/recovery] Alert email failed:", errMessage(err));
    }
  }

  return {
    examined: stuck.length,
    reprinted,
    redispatched,
    needsHuman: reports.length,
  };
}

export async function GET(request: Request) {
  // The unset-secret check matters: without it, a missing CRON_SECRET means the
  // expected header is the literal string "Bearer undefined", which anyone can
  // send — turning a misconfiguration into an open endpoint.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const windowEndISO = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  const pendingOrders = await prisma.order.findMany({
    where: {
      isDelivery: true,
      status: "paid",
      scheduledFor: {
        gte: nowISO,
        lte: windowEndISO,
      },
      uberDeliveryId: null,
    },
  });

  if (pendingOrders.length > 0) {
    console.log(`[cron/dispatch-scheduled] Found ${pendingOrders.length} scheduled order(s) due within 30 min`);
  }

  const results = [];

  for (const order of pendingOrders) {
    if (!order.deliveryAddress) {
      console.warn(`[cron/dispatch-scheduled] Order #${order.id} has no delivery address, skipping`);
      results.push({ orderId: order.id, status: "skipped", reason: "no delivery address" });
      continue;
    }

    try {
      const deliveryResult = await createUberDelivery({
        customerName: order.name,
        customerPhone: order.phone,
        deliveryAddress: order.deliveryAddress,
        deliveryApt: order.deliveryApt || undefined,
        deliveryInstructions: order.deliveryInstructions || undefined,
        orderDescription: `Order ${order.id}`,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          uberDeliveryId: deliveryResult.deliveryId,
          uberDeliveryStatus: deliveryResult.status,
          dispatchState: "dispatched",
        },
      });

      console.log(`[cron/dispatch-scheduled] Dispatched order #${order.id} → ${deliveryResult.deliveryId}`);
      results.push({ orderId: order.id, status: "dispatched", deliveryId: deliveryResult.deliveryId });
    } catch (err: any) {
      console.error(`[cron/dispatch-scheduled] Failed for order #${order.id}:`, err.message);
      results.push({ orderId: order.id, status: "retry_next_cycle" });
    }
  }

  // Second job: settle orders that never got past `pending`. Runs before the
  // stuck sweep, and cannot collide with it — anything fulfilled here has a
  // fulfilledAt of "just now", which the stuck sweep's 10-minute min-age window
  // deliberately excludes.
  const unclaimed = await recoverUnclaimedOrders(new Date());
  if (unclaimed.examined > 0) {
    console.log(`[cron/unclaimed] ${JSON.stringify(unclaimed)}`);
  }

  // Third job on the same schedule: catch orders whose post-payment work died
  // half-finished. Runs after the dispatch pass so a scheduled order dispatched
  // above is not also seen as stuck.
  const recovery = await recoverStuckOrders(new Date());
  if (recovery.examined > 0) {
    console.log(`[cron/recovery] ${JSON.stringify(recovery)}`);
  }

  return NextResponse.json({
    checkedAt: nowISO,
    ordersFound: pendingOrders.length,
    results,
    unclaimed,
    recovery,
  });
}