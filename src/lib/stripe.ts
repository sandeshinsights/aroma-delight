import Stripe from "stripe";

/**
 * Pinned Stripe API version. Matches the version the installed SDK targets;
 * stated explicitly so an SDK bump can't silently move it. The checkout route
 * creates sessions on this version and the webhook / fulfillment / cron paths
 * read them back on the same one.
 */
export const STRIPE_API_VERSION = "2026-05-27.dahlia" as const;

let client: Stripe | null = null;

/**
 * Lazily constructed Stripe client.
 *
 * `next build` evaluates every route module to collect page data, and the
 * Stripe constructor throws on a missing key — so constructing at module scope
 * makes STRIPE_SECRET_KEY a build-time requirement. Deferring it here keeps the
 * build green before Stripe is configured; any request path that actually calls
 * Stripe still gets a real client or a loud, immediate error.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  client = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return client;
}
