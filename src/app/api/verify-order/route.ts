import { NextRequest, NextResponse } from "next/server";
import { fulfillOrder } from "@/lib/order-fulfillment";

export const maxDuration = 60;

/**
 * The success page POSTs its Stripe session id here on load.
 *
 * This route used to re-implement the whole fulfillment sequence inline, which
 * drifted from order-fulfillment.ts and raced the Stripe webhook. It now shares
 * the single implementation, whose atomic claim makes the race harmless: one
 * caller fulfills, the other gets the already-fulfilled snapshot.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Missing session ID" },
        { status: 400 }
      );
    }

    const result = await fulfillOrder(sessionId);

    if (!result.success) {
      const status =
        result.message === "Order not found" ? 404 :
        result.message === "Payment not completed" ? 400 :
        500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      isDelivery: result.isDelivery,
      deliveryType: result.deliveryType,
      scheduledFor: result.scheduledFor,
      uberDeliveryId: result.uberDeliveryId,
      uberDeliveryStatus: result.uberDeliveryStatus,
      trackingUrl: result.trackingUrl,
      dropoffEta: result.dropoffEta,
      // Tells the success page the courier outcome is not settled yet, so it
      // polls instead of announcing a manual delivery.
      dispatchPending: result.dispatchPending,
      // Values for the browser half of the Meta Purchase event. The page fires
      // it with eventID = orderId, matching the server copy sent from
      // fulfillOrder(), so Meta records one conversion rather than two.
      purchase: result.purchase,
      // Pre-hashed email/phone for the Google Ads purchase conversion
      // (Enhanced Conversions). Never the plain values.
      googleUserData: result.googleUserData,
    });
  } catch (error) {
    console.error("Verify order error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: 500 }
    );
  }
}
