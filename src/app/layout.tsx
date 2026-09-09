import type { Metadata } from "next";
import { getSeoData } from "@/lib/data";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CookieConsent from "@/components/CookieConsent";
import CartDrawer from "@/components/CartDrawer";
import MetaPixel from "@/components/MetaPixel";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const seo = getSeoData();

export const metadata: Metadata = {
  // Makes every relative canonical / Open Graph URL below (and on the per-dish
  // pages under /menu/[slug]) resolve against the canonical production domain.
  // Without it Next falls back to localhost and warns at build time. Uses
  // seo.canonicalUrl (same source as robots.ts / sitemap.ts) rather than
  // NEXT_PUBLIC_BASE_URL so a preview deploy still points shares at the real
  // site and a malformed env var can't throw here.
  metadataBase: new URL(seo.canonicalUrl),
  title: seo.siteTitle,
  description: seo.siteDescription,
  keywords: seo.keywords,
  openGraph: {
    title: seo.siteTitle,
    description: seo.siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.siteTitle,
    description: seo.siteDescription,
  },
  robots: {
    index: seo.robots.index,
    follow: seo.robots.follow,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-cream text-text-main antialiased">
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CookieConsent />
          <CartDrawer />
          <MetaPixel />
        </CartProvider>
      </body>
    </html>
  );
}