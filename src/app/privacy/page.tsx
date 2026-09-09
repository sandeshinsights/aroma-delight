import type { Metadata } from "next";
import { getRestaurantData } from "@/lib/data";

const R = getRestaurantData();

/**
 * Privacy Policy Page
 * 
 * WHAT IT DOES:
 * - Standard privacy policy for the restaurant website
 * - Covers: data collection, cookies, analytics, third-party services
 * - Required for GA4 compliance and general transparency
 */

export const metadata: Metadata = {
  title: `Privacy Policy | ${R.name}`,
  description: `Privacy policy for ${R.name} restaurant website in ${R.address.city}, ${R.address.state}.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold text-primary mb-8">
          Privacy Policy
        </h1>

        <div className="bg-white rounded-2xl p-8 md:p-12 space-y-8 text-text-main leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">1. Information We Collect</h2>
            <p>
              When you visit our website, we may collect certain information about your device, including your web browser, IP address, time zone, and some of the cookies that are installed on your device. We refer to this automatically-collected information as &ldquo;Device Information.&rdquo; Additionally, if you contact us through our catering inquiry form, we collect your name, email address, phone number, and event details.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">2. How We Use Your Information</h2>
            <p>
              We use the Device Information that we collect to help us screen for potential risk and fraud, and more generally to improve and optimize our website. If you submit a catering inquiry, we use your contact information solely to respond to your request. We do not sell, trade, or rent your personal information to third parties.
            </p>
            <p className="mt-3">
              To measure our advertising, we also share a limited set of information about completed orders, checkouts, and catering inquiries with Meta through its Conversions API. Contact details such as your name, email address, and phone number are irreversibly hashed on our servers before they are sent, so Meta receives a scrambled value it can only use to match against its own records &mdash; never your details in readable form. We do not send Meta the contents of your special instructions or catering message.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">3. Cookies</h2>
            <p>
              We use cookies to track information about your visit to our website. We use Google Analytics to understand how visitors interact with our website. Google Analytics uses cookies to collect information such as how often users visit, what pages they visit, and what other sites they used prior to coming to our website. You can opt out of Google Analytics by installing the Google Analytics opt-out browser add-on or by declining our cookie consent banner.
            </p>
            <p className="mt-3">
              We also use the Meta Pixel (Facebook and Instagram) to measure the effectiveness of our advertising. The Meta Pixel sets cookies that record actions you take on this site &mdash; such as viewing a menu item, adding an item to your cart, starting checkout, completing an order, or submitting a catering inquiry &mdash; and reports them to Meta so we can understand which ads lead to orders and show relevant ads to people likely to be interested in our restaurant. You can control how Meta uses this information through your{" "}
              <a
                href="https://www.facebook.com/adpreferences"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline hover:text-primary transition-colors"
              >
                Facebook Ad Preferences
              </a>{" "}
              and limit tracking through your browser or device settings.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">4. Third-Party Services</h2>
            <p>
              Our website integrates with third-party services including Stripe for payment processing, Uber Direct for deliveries, Google Analytics for website analytics, Meta (Facebook and Instagram) for advertising measurement, Google Maps for directions, and social media platforms for sharing features. These services have their own privacy policies governing the use of your information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">5. Data Security</h2>
            <p>
              We use commercially reasonable security measures to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure. If you have reason to believe that your interaction with us is no longer secure, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">6. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last Updated&rdquo; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-primary mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 text-text-light space-y-1">
              <p><strong>{R.name}</strong></p>
              <p>{R.address.full}</p>
              <p>Phone: {R.phoneDisplay}</p>
              <p>Email: {R.email}</p>
            </div>
          </section>

          <p className="text-sm text-text-light pt-4 border-t border-gray-200">
            Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}