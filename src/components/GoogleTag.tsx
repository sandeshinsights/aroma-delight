"use client";

import Script from "next/script";
import { useEffect } from "react";
import {
  GOOGLE_ADS_ID,
  GA_ID,
  isGoogleTagConfigured,
  captureGclid,
  trackGoogleConversion,
} from "@/lib/google-tag";

/**
 * Loads gtag.js once for Google Ads and GA4, with Consent Mode v2.
 *
 * Consent decision (same as the Meta Pixel): the tags run for every visitor.
 * The defaults below are therefore "granted", except
 *   - for visitors in the EEA/UK/Switzerland, where the law requires opt-in, so
 *     the default there is "denied" until they click Accept; and
 *   - for anyone who already clicked Decline, whose choice is read back from the
 *     same localStorage key the cookie banner writes.
 * The banner (CookieConsent.tsx) sends a `consent update` on each click. The
 * defaults have to be set inside this snippet, before the `config` calls — a
 * default issued after the tags have fired does not apply to them.
 *
 * GA4 page views: the `config` call sends the first one, and GA4's Enhanced
 * Measurement (on by default) records client-side navigations from the history
 * API, so there is no per-route effect here the way MetaPixel.tsx has one.
 */

// EEA + UK + Switzerland, as ISO 3166-1 alpha-2 codes, for the region default.
const OPT_IN_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "GB", "CH",
];

export default function GoogleTag() {
  // Runs once per visit; banks an ad click's gclid for checkout even if the
  // visitor browses around before ordering.
  useEffect(() => {
    captureGclid();
  }, []);

  // Phone-call conversion: any tel: link, wherever it is on the site (header,
  // footer, contact, catering, cart, success page). One delegated listener
  // rather than an onClick on each link, so a new phone link is counted without
  // anyone remembering to wire it up.
  useEffect(() => {
    if (!isGoogleTagConfigured()) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
      if (!link) return;
      trackGoogleConversion("phoneCall", {}, { gaEvent: "click_to_call" });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!isGoogleTagConfigured()) return null;

  // gtag.js is loaded against whichever id exists; the other is added by its
  // own `config` call below.
  const loaderId = GOOGLE_ADS_ID || GA_ID;

  return (
    <>
      <Script
        id="google-tag-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`}
      />
      <Script
        id="google-tag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var choice = null;
try { choice = localStorage.getItem('cookie-consent'); } catch (e) {}
var all = function (v) { return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v }; };
if (choice === 'declined') {
  gtag('consent', 'default', all('denied'));
} else if (choice === 'accepted') {
  gtag('consent', 'default', all('granted'));
} else {
  var eea = all('denied'); eea.region = ${JSON.stringify(OPT_IN_REGIONS)}; eea.wait_for_update = 500;
  gtag('consent', 'default', eea);
  gtag('consent', 'default', all('granted'));
}
gtag('js', new Date());
${GOOGLE_ADS_ID ? `gtag('config', ${JSON.stringify(GOOGLE_ADS_ID)}, { allow_enhanced_conversions: true });` : ""}
${GA_ID ? `gtag('config', ${JSON.stringify(GA_ID)});` : ""}
          `.trim(),
        }}
      />
    </>
  );
}
