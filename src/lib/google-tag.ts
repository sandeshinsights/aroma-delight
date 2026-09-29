"use client";

/**
 * Google tag (gtag.js) — browser-side helpers for Google Ads conversions and GA4.
 *
 * One gtag.js load serves both products; `GoogleTag.tsx` loads it and configures
 * whichever ids are set. Everything here is a no-op when neither
 * NEXT_PUBLIC_GOOGLE_ADS_ID nor NEXT_PUBLIC_GA_ID is set, and a Google Ads
 * conversion is skipped (not sent unlabelled) when its label is unset — so a
 * half-configured deploy under-reports rather than mis-reports.
 *
 * The conversion points deliberately mirror the Meta ones (see meta-pixel.ts):
 *   begin_checkout ↔ InitiateCheckout   (CartDrawer)
 *   purchase       ↔ Purchase           (success page, transaction_id = order.id)
 *   generate_lead  ↔ Lead               (CateringForm)
 *   phone call     — Google only, any tel: link click (GoogleTag.tsx)
 * and use the same value basis (food revenue: subtotal − discount), so the two
 * ad platforms report the same numbers.
 */

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

/** Conversion labels — the part after the slash in `send_to: 'AW-…/label'`. */
const LABELS = {
  purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE || "",
  beginCheckout: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_BEGIN_CHECKOUT || "",
  lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_GENERATE_LEAD || "",
  phoneCall: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PHONE_CALL || "",
} as const;

export type GoogleConversion = keyof typeof LABELS;

export function isGoogleTagConfigured(): boolean {
  return Boolean(GOOGLE_ADS_ID || GA_ID);
}

/** Where a landing page's `?gclid=` is parked — see `captureGclid` below. */
const GCLID_STORAGE_KEY = "google-gclid";
/** Google's own attribution window for a click id is 90 days. */
const GCLID_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    dataLayer?: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Push a gtag command. Unlike the Meta pixel there is no need to wait for the
 * script: `gtag` is just a dataLayer push, and gtag.js replays the queue when it
 * arrives. If the init snippet has not run yet (a click during hydration) we
 * define the same stub it would have — the snippet's `window.gtag = …` later is
 * identical, so nothing is lost either way.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gtag(...args: any[]): void {
  if (typeof window === "undefined" || !isGoogleTagConfigured()) return;
  try {
    if (typeof window.gtag !== "function") {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        // gtag.js reads the `arguments` object, not an array — keep the shape.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }
    window.gtag(...args);
  } catch {
    // A blocked or stubbed gtag must never break a click handler.
  }
}

/**
 * Enhanced Conversions user data, set immediately before the conversion it
 * belongs to. Accepts either raw values (gtag normalizes and hashes them in the
 * browser before sending) or the server's pre-hashed `sha256_*` fields — the
 * success page only ever has the latter, because verify-order never returns
 * the customer's email or phone in the clear.
 */
export interface GoogleUserData {
  email?: string;
  phone_number?: string;
  sha256_email_address?: string;
  sha256_phone_number?: string;
}

/**
 * Google wants phones in E.164 ("+19788979227"). Customers type
 * "(978) 897-9227", so strip to digits and assume US for bare 10-digit numbers —
 * the same assumption meta-capi.ts makes. Anything else unrecognisable is
 * dropped rather than sent: a wrongly-normalized value never matches anyone.
 */
function toE164(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return undefined;
}

function setUserData(userData?: GoogleUserData): void {
  if (!userData) return;
  const normalized: GoogleUserData = {
    ...userData,
    email: userData.email?.trim().toLowerCase() || undefined,
    phone_number: toE164(userData.phone_number),
  };
  const clean = Object.fromEntries(
    Object.entries(normalized).filter(([, v]) => typeof v === "string" && v)
  );
  if (Object.keys(clean).length) gtag("set", "user_data", clean);
}

/**
 * Fire a Google Ads conversion (and the matching GA4 recommended event).
 *
 * @param gaEvent GA4 event name to send alongside, e.g. "purchase". The Ads
 *                conversion itself is always sent as a `conversion` event with
 *                `send_to`, which is what the manual event-snippet setup expects.
 */
export function trackGoogleConversion(
  kind: GoogleConversion,
  params: Record<string, unknown> = {},
  options: { gaEvent?: string; userData?: GoogleUserData } = {}
): void {
  if (!isGoogleTagConfigured()) return;

  setUserData(options.userData);

  if (GOOGLE_ADS_ID && LABELS[kind]) {
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${LABELS[kind]}`,
      ...params,
    });
  }

  if (GA_ID && options.gaEvent) {
    gtag("event", options.gaEvent, { send_to: GA_ID, ...params });
  }
}

/**
 * Consent Mode v2. By decision the tags run for every visitor (US-only
 * restaurant, same as the Meta Pixel), so "granted" is the default outside the
 * EEA/UK/CH — see GoogleTag.tsx. The cookie banner calls this on Accept/Decline.
 */
export function setGoogleConsent(granted: boolean): void {
  const value = granted ? "granted" : "denied";
  gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

/**
 * Preserve the Google Ads click id across the visit, for a future server-side
 * (offline) conversion upload. gtag.js keeps its own `_gcl_aw` cookie for the
 * browser-side conversions; this copy is what checkout parks in Stripe metadata,
 * the same way `captureFbclid` feeds `fb_fbc`.
 */
export function captureGclid(): void {
  if (typeof window === "undefined") return;
  try {
    const gclid = new URLSearchParams(window.location.search).get("gclid");
    if (!gclid) return;
    window.localStorage.setItem(
      GCLID_STORAGE_KEY,
      JSON.stringify({ gclid, at: Date.now() })
    );
  } catch {
    // Private-mode storage failures are not worth surfacing.
  }
}

export function getGclid(): string | undefined {
  try {
    const raw = window.localStorage.getItem(GCLID_STORAGE_KEY);
    if (!raw) return undefined;
    const { gclid, at } = JSON.parse(raw) as { gclid?: string; at?: number };
    if (!gclid || !at || Date.now() - at > GCLID_MAX_AGE_MS) return undefined;
    return gclid;
  } catch {
    return undefined;
  }
}
