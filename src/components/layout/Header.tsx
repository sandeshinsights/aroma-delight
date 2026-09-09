"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { getSiteConfig, getRestaurantData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount, openCart } = useCart();

  // The transparent, light-text header only makes sense floating over the
  // homepage hero photo. Every other route has a light background from the top,
  // so it stays docked there.
  const overHero = usePathname() === "/";

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { navigation, ctaButton } = getSiteConfig();
  const { name } = getRestaurantData();

  // Two states: floating over the hero photo (transparent, light text) and
  // docked (bone panel, dark text). The mobile sheet and every non-home route
  // force the docked look so the header text stays readable.
  const docked = scrolled || mobileOpen || !overHero;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 transition-all duration-300",
        docked
          ? "bg-cream/95 backdrop-blur-md border-b border-ink/10"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <span
              className={cn(
                "font-heading text-xl font-medium tracking-tight transition-colors sm:text-2xl",
                docked ? "text-ink" : "text-cream"
              )}
            >
              {name}
            </span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  docked
                    ? "text-text-light hover:text-primary"
                    : "text-cream/80 hover:text-cream"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={openCart}
              className={cn(
                "relative rounded-full p-2 transition-colors",
                docked
                  ? "text-primary hover:bg-primary/10"
                  : "text-cream hover:bg-white/10"
              )}
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-cream">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>

            <a
              href={ctaButton.href}
              className={cn(
                "hidden rounded-full px-5 py-2 text-sm font-semibold transition-colors md:inline-flex",
                docked
                  ? "bg-primary text-cream hover:bg-primary-light"
                  : "bg-cream text-ink hover:bg-white"
              )}
            >
              {ctaButton.label}
            </a>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "p-2 md:hidden",
                docked ? "text-ink" : "text-cream"
              )}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink/10 bg-cream md:hidden">
          <nav className="space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium text-text-main transition-colors hover:text-primary"
              >
                {item.label}
              </a>
            ))}
            <a
              href={ctaButton.href}
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-cream transition-colors hover:bg-primary-light"
            >
              {ctaButton.label}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
