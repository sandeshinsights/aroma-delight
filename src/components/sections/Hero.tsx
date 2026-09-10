import { getRestaurantData } from "@/lib/data";
import HeroBackdrop, { type HeroImage } from "@/components/HeroBackdrop";

/**
 * Hero Section
 *
 * - Full-height banner at the top of the homepage
 * - Headline + subheadline from restaurant.json
 * - Two CTAs: "View Menu" (scrolls to #menu) and "Call to Order" (phone)
 * - Slowly drifting image behind a dark scrim
 *
 * The backdrop is a licensed stock photo for launch (Unsplash, free commercial
 * use); swap public/images/photos/hero.jpg for the restaurant's own. Point this
 * array at more than one file and the crossfade machinery handles it.
 */
const backdrop: HeroImage[] = [
  { src: "/images/photos/hero.jpg", alt: "A spread of grilled tandoori skewers and vegetables" },
];

export default function Hero() {
  const { hero, phone } = getRestaurantData();

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-24"
    >
      <HeroBackdrop images={backdrop} />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow mb-5 text-secondary motion-safe:animate-rise [animation-delay:100ms]">
            Burlington, MA &middot; 100% Halal
          </p>

          <h1 className="font-heading text-[2.75rem] font-medium leading-[1.05] text-cream motion-safe:animate-rise [animation-delay:200ms] sm:text-6xl lg:text-7xl">
            {hero.headline}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/85 motion-safe:animate-rise [animation-delay:350ms] sm:text-xl">
            {hero.subheadline}
          </p>

          <div className="mt-9 flex flex-col gap-3 motion-safe:animate-rise [animation-delay:500ms] sm:flex-row sm:items-center">
            <a
              href="#menu"
              className="inline-flex items-center justify-center rounded-full bg-secondary px-7 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-secondary-light"
            >
              {hero.ctaPrimary}
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center rounded-full border border-cream/30 px-7 py-3.5 text-base font-semibold text-cream transition-colors hover:bg-cream/10"
            >
              {hero.ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue, anchored to the section. */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 motion-safe:animate-bounce">
        <div className="flex h-9 w-6 justify-center rounded-full border-2 border-cream/40 pt-2">
          <div className="h-2.5 w-1 rounded-full bg-cream/60" />
        </div>
      </div>
    </section>
  );
}
