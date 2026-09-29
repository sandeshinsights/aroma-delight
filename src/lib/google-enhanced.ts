import { createHash } from "node:crypto";

/**
 * Google Ads Enhanced Conversions — server-side hashing for the Purchase event.
 *
 * The success page fires the Google `purchase` conversion, but it only knows the
 * Stripe session id; the customer's email and phone live on the Order row. Rather
 * than send those back to the browser in the clear, verify-order returns them
 * pre-hashed in the shape gtag accepts (`sha256_email_address`,
 * `sha256_phone_number`).
 *
 * Google's normalization is NOT identical to Meta's (meta-capi.ts), so the
 * hashes are not shared:
 *   - email: trim + lowercase, and for gmail.com / googlemail.com also drop the
 *     dots in the local part ("j.doe@gmail.com" → "jdoe@gmail.com");
 *   - phone: E.164 *with* the leading "+" ("+19788979227"), where Meta hashes
 *     bare digits.
 * A wrongly-normalized hash is accepted silently and simply never matches, so
 * keep to Google's spec here even though it differs from the Meta helper.
 */

export interface GoogleHashedUserData {
  sha256_email_address?: string;
  sha256_phone_number?: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string | null | undefined): string | undefined {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return undefined;
  const [local, domain] = trimmed.split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return trimmed;
}

function normalizePhone(phone: string | null | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return undefined;
}

export function buildGoogleHashedUserData(input: {
  email?: string | null;
  phone?: string | null;
}): GoogleHashedUserData | undefined {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!email && !phone) return undefined;
  return {
    ...(email ? { sha256_email_address: sha256(email) } : {}),
    ...(phone ? { sha256_phone_number: sha256(phone) } : {}),
  };
}
