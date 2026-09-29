/**
 * Staff delivery — TEMPORARY stand-in for Uber Direct.
 *
 * Active while DELIVERY_CONFIG.provider === "staff". Restaurant staff deliver
 * for a flat fee to addresses within DELIVERY_CONFIG.staffRadiusMiles of the
 * restaurant. The address is geocoded with the free US Census geocoder (no API
 * key) and the distance is straight-line from restaurant.json's `geo`.
 *
 * Server-only: used by /api/delivery/quote (for what the cart shows) and by
 * checkout (for what is charged), so the radius is enforced server-side exactly
 * like the Uber quote was.
 */

import { DELIVERY_CONFIG } from "@/lib/delivery";
import { getRestaurantData } from "@/lib/data";

const R = getRestaurantData();

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const GEOCODE_TIMEOUT_MS = 10_000;
const EARTH_RADIUS_MILES = 3958.8;

/** Why an address can't get staff delivery. The message is safe to show customers. */
export class StaffDeliveryError extends Error {
  readonly reason: "out_of_range" | "not_found" | "unavailable";

  constructor(reason: StaffDeliveryError["reason"], message: string) {
    super(message);
    this.name = "StaffDeliveryError";
    this.reason = reason;
  }
}

export const OUT_OF_RANGE_MESSAGE = `Contact the restaurant for delivery if you are located beyond ${DELIVERY_CONFIG.staffRadiusMiles} miles.`;

interface CensusGeocodeResponse {
  result?: { addressMatches?: { coordinates?: { x?: number; y?: number } }[] };
}

async function geocode(address: string): Promise<{ lat: number; lng: number }> {
  const url =
    `${CENSUS_GEOCODER_URL}?address=${encodeURIComponent(address)}` +
    `&benchmark=Public_AR_Current&format=json`;

  let data: CensusGeocodeResponse;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = (await res.json()) as CensusGeocodeResponse;
  } catch (err) {
    console.error("[staff-delivery] Geocoder unreachable:", err instanceof Error ? err.message : err);
    throw new StaffDeliveryError(
      "unavailable",
      `We couldn't check this address right now. Please try again, or call us at ${R.phoneDisplay} to order delivery.`
    );
  }

  const match = data?.result?.addressMatches?.[0];
  const lat = match?.coordinates?.y;
  const lng = match?.coordinates?.x;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new StaffDeliveryError(
      "not_found",
      `We couldn't find this address. Please enter the full street address, including town and ZIP code, or call us at ${R.phoneDisplay} to order delivery.`
    );
  }
  return { lat, lng };
}

function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * Flat staff-delivery fee for an address, or a StaffDeliveryError saying why
 * it can't be delivered.
 */
export async function getStaffDeliveryQuote(
  address: string
): Promise<{ fee: number; distanceMiles: number }> {
  const dropoff = await geocode(address);
  const distanceMiles = milesBetween(
    { lat: DELIVERY_CONFIG.restaurantLat, lng: DELIVERY_CONFIG.restaurantLng },
    dropoff
  );

  if (distanceMiles > DELIVERY_CONFIG.staffRadiusMiles) {
    throw new StaffDeliveryError("out_of_range", OUT_OF_RANGE_MESSAGE);
  }
  return { fee: DELIVERY_CONFIG.staffFee, distanceMiles };
}
