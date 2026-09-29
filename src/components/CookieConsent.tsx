"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { setGoogleConsent } from "@/lib/google-tag";

/** Same key GoogleTag.tsx reads in its init snippet — keep them in sync. */
const CONSENT_KEY = "cookie-consent";

function readConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value: "accepted" | "declined"): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private mode: the choice still applies for this page view.
  }
}

/**
 * Cookie Consent Banner
 *
 * Records the visitor's choice for Google Ads + GA4 (Consent Mode v2).
 *
 * The Google tag itself is loaded by GoogleTag.tsx for every visitor — by
 * decision, the same as the Meta Pixel — with consent defaulting to "granted"
 * outside the EEA/UK/CH. This banner only *updates* that consent: Decline turns
 * Google's ad and analytics storage off, Accept turns it on (which is what
 * matters for EEA visitors, whose default is "denied"). GoogleTag.tsx also reads
 * the stored choice back on later visits, so a Decline sticks.
 *
 * It does not govern the Meta Pixel — see MetaPixel.tsx for that decision.
 */

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show banner if user hasn't already made a choice
    if (readConsent() === null) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    writeConsent("accepted");
    setShow(false);
    setGoogleConsent(true);
  };

  const handleDecline = () => {
    writeConsent("declined");
    setShow(false);
    setGoogleConsent(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-0">
      <div className="max-w-4xl mx-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-200 p-6 md:mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <Cookie className="w-6 h-6 text-secondary" />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="font-heading text-lg font-bold text-primary mb-1">
              We Use Cookies
            </h3>
            <p className="text-text-light text-sm leading-relaxed">
              We use cookies to understand how our website is used and to measure our
              advertising on Google and Meta. You can decline Google&rsquo;s cookies here.{" "}
              <a href="/privacy" className="text-secondary underline hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
            <button
              onClick={handleAccept}
              className="flex-1 md:flex-none bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 md:flex-none border border-gray-300 text-text-light hover:border-primary hover:text-primary px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}