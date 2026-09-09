import { NextRequest, NextResponse } from "next/server";
import { getUberQuote } from "@/lib/uber-direct";
import { getRestaurantData } from "@/lib/data";

const R = getRestaurantData();

// This route waits on Uber's quote API, which is the slowest external call in
// the ordering flow and the one that blocks the address form.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { address, scheduledFor } = await req.json();

    if (typeof address !== "string" || address.trim().length < 10 || address.length > 300) {
      return NextResponse.json(
        { error: "Please enter a full street address" },
        { status: 400 }
      );
    }

    // Only forward a parseable date — an invalid one would throw inside
    // toISOString() and surface as a bogus "outside our delivery area" error.
    let pickupReadyDt: string | undefined;
    if (typeof scheduledFor === "string" && scheduledFor) {
      const d = new Date(scheduledFor);
      if (!isNaN(d.getTime())) pickupReadyDt = d.toISOString();
    }

    const quote = await getUberQuote(
      R.address.full,
      address.trim(),
      pickupReadyDt
    );

    return NextResponse.json({
      fee: quote.fee,
      customerPays: quote.fee,
      restaurantPays: 0,
      estimatedDurationMinutes: quote.estimatedDurationMinutes,
    });
  } catch (error: any) {
    console.error("[Delivery Quote Error]", error.message);

    return NextResponse.json(
      {
        error: `Sorry, this address is outside our delivery area. We currently deliver within ~10 miles of ${R.name} (${R.address.street}, ${R.address.city}, ${R.address.state}). Please try a different address or choose pickup.`,
        fee: 0,
        customerPays: 0,
        restaurantPays: 0,
      },
      { status: 422 }
    );
  }
}