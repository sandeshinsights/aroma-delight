import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { fulfillOrder } from "@/lib/order-fulfillment";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] Missing signature or STRIPE_WEBHOOK_SECRET env var");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // This Stripe account is shared with another restaurant's site, and Stripe
    // fans every checkout.session.* event out to every endpoint on the account.
    // Sessions we created carry metadata.site; anything else belongs to the
    // other site — ack it so Stripe stops retrying, but do nothing.
    if (session.metadata?.site !== "aroma-delights") {
      return NextResponse.json({ received: true, ignored: "different site" });
    }

    console.log(`[stripe/webhook] checkout.session.completed — session ${session.id}`);

    const result = await fulfillOrder(session.id);

    if (result.success) {
      console.log(`[stripe/webhook] Order ${result.orderId} fulfilled (alreadyFulfilled: ${!!result.alreadyFulfilled})`);
    } else {
      console.error(`[stripe/webhook] Fulfillment failed for ${session.id}:`, result.message);

      // Stripe retries non-2xx responses, and the atomic fulfillment claim makes
      // those retries safe — so hand transient failures back to Stripe instead of
      // swallowing them. A blanket 200 here meant a paid order that failed to
      // fulfill (DB down, schema drift) was dropped with no second attempt.
      // Settled failures ("Payment not completed") stay 200: retrying is pointless.
      if (result.retryable) {
        return NextResponse.json(
          { error: "Fulfillment failed, retry expected", message: result.message },
          { status: 500 }
        );
      }
    }
  }

  // An abandoned checkout leaves a `pending` Order row behind: the row is written
  // when the session is created, before the customer has typed a card number, and
  // nothing else ever settles it. Stripe expires the session ~24h later, which is
  // the signal that the sale is definitively not happening.
  //
  // Requires `checkout.session.expired` to be enabled on the webhook endpoint in
  // the Stripe dashboard; without it the daily cron sweep still settles these,
  // just a day later.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Scoped to rows that were never claimed. A paid order must never be
    // relabelled by a stray expiry event, and `status` is the payment lifecycle
    // only — this is a payment outcome, so it belongs here.
    const settled = await prisma.order.updateMany({
      where: { stripeSessionId: session.id, status: "pending", fulfilledAt: null },
      data: { status: "abandoned" },
    });

    if (settled.count > 0) {
      console.log(`[stripe/webhook] checkout.session.expired — marked ${session.id} abandoned`);
    }
  }

  return NextResponse.json({ received: true });
}