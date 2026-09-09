/**
 * Uber Direct API Integration
 *
 * Server-only module. Never import this in client components.
 *
 * Confirmed working endpoints:
 * - Quote:   POST /v1/customers/{customer_id}/delivery_quotes
 * - Create:  POST /v1/customers/{customer_id}/deliveries
 * - Status:  GET  /v1/customers/{customer_id}/deliveries/{delivery_id}
 */

import { getRestaurantData } from "@/lib/data";

const TOKEN_URL = "https://login.uber.com/oauth/v2/token";
const API_BASE = "https://api.uber.com/v1";

// Pickup identity for courier dispatch — single source is
// src/data/restaurant.json.
const R = getRestaurantData();
const PICKUP_ADDRESS = R.address.full;
const PICKUP_NAME = R.name;
const PICKUP_PHONE = R.phoneDisplay;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getCredentials() {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  const clientId = process.env.UBER_DIRECT_CLIENT_ID;
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;

  if (!customerId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Uber Direct credentials. Set UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET in .env"
    );
  }

  return { customerId, clientId, clientSecret };
}

export async function getUberToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Uber auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

function parseAddressToUber(address: string) {
  const cleaned = address.trim();
  const match = cleaned.match(
    /^(.+?),\s*([A-Za-z\s]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/
  );

  if (match) {
    return JSON.stringify({
      street_address: [match[1].trim()],
      city: match[2].trim(),
      state: match[3],
      zip_code: match[4],
      country: "US",
    });
  }

  return JSON.stringify({
    street_address: [cleaned],
    city: R.address.city,
    state: R.address.state,
    zip_code: R.address.zip,
    country: "US",
  });
}

export interface UberQuoteResult {
  fee: number;
  currency: string;
  estimatedDurationMinutes: number;
  quoteId: string;
  dropoffEta: string;
  expiresAt: string;
}

export async function getUberQuote(
  pickupAddress: string,
  dropoffAddress: string,
  pickupReadyDt?: string
): Promise<UberQuoteResult> {
  const token = await getUberToken();
  const { customerId } = getCredentials();

  const requestBody: Record<string, unknown> = {
    pickup_address: parseAddressToUber(pickupAddress),
    dropoff_address: parseAddressToUber(dropoffAddress),
  };

  if (pickupReadyDt) {
    requestBody.pickup_ready_dt = pickupReadyDt;
  }

  const response = await fetch(
    `${API_BASE}/customers/${customerId}/delivery_quotes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Uber quote failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    fee: data.fee / 100,
    currency: data.currency || "usd",
    estimatedDurationMinutes: data.duration || 45,
    quoteId: data.id || "",
    dropoffEta: data.dropoff_eta || "",
    expiresAt: data.expires || "",
  };
}

export interface UberDeliveryResult {
  deliveryId: string;
  status: string;
  trackingUrl?: string;
  dropoffEta?: string;
  pickupEta?: string;
  fee?: number;
  liveMode?: boolean;
}

export async function createUberDelivery(params: {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryApt?: string;
  deliveryInstructions?: string;
  orderDescription?: string;
  pickupReadyDt?: string;
}): Promise<UberDeliveryResult> {
  const token = await getUberToken();
  const { customerId } = getCredentials();

  const fullAddress = [params.deliveryAddress, params.deliveryApt]
    .filter(Boolean)
    .join(", ");

  const requestBody: Record<string, unknown> = {
    pickup_address: parseAddressToUber(PICKUP_ADDRESS),
    pickup_name: PICKUP_NAME,
    pickup_phone_number: PICKUP_PHONE,
    dropoff_address: parseAddressToUber(fullAddress),
    dropoff_name: params.customerName,
    dropoff_phone_number: params.customerPhone,
    dropoff_notes: params.deliveryInstructions || "",
    manifest_items: [
      { name: params.orderDescription || "Food Order", quantity: 1 },
    ],
  };

  if (params.pickupReadyDt) {
    requestBody.pickup_ready_dt = params.pickupReadyDt;
  }

  const response = await fetch(
    `${API_BASE}/customers/${customerId}/deliveries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Uber delivery creation failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    deliveryId: data.id || "",
    status: data.status || "pending",
    trackingUrl: data.tracking_url,
    dropoffEta: data.dropoff_eta,
    pickupEta: data.pickup_eta,
    fee: data.fee ? data.fee / 100 : undefined,
    liveMode: data.live_mode ?? false,
  };
}

export async function getUberDeliveryStatus(deliveryId: string): Promise<{
  status: string;
  trackingUrl?: string;
  driverName?: string;
  driverPhone?: string;
  dropoffEta?: string;
  pickupEta?: string;
  liveMode?: boolean;
}> {
  const token = await getUberToken();
  const { customerId } = getCredentials();

  const response = await fetch(
    `${API_BASE}/customers/${customerId}/deliveries/${deliveryId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Uber status check failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    status: data.status,
    trackingUrl: data.tracking_url,
    driverName: data.courier?.name,
    driverPhone: data.courier?.phone_number,
    dropoffEta: data.dropoff_eta,
    pickupEta: data.pickup_eta,
    liveMode: data.live_mode ?? false,
  };
}