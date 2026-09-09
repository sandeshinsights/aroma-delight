import GalleryGrid, { type GalleryImage } from "@/components/GalleryGrid";

/**
 * Gallery Section
 *
 * FOOD ONLY, DELIBERATELY.
 *
 * Disabled in site-config until there are real photographs. When it comes back,
 * keep it to dish photography of things that are actually on the menu — a
 * picture of a dining room the customer will never walk into is a different
 * kind of claim. The section copy talks about the food for the same reason.
 *
 * The six slots below point at branded placeholders; swap each `src` for a real
 * dish photo and keep the alt text describing what belongs there.
 */

// Placeholder art for launch — swap each src for a real dish photo, keep the
// alt text describing what should be there.
const galleryImages: GalleryImage[] = [
  { src: "/images/placeholder/dish-1.svg", alt: "Thali platter with curries, rice and breads" },
  { src: "/images/placeholder/dish-2.svg", alt: "Garlic naan, fresh from the tandoor" },
  { src: "/images/placeholder/dish-3.svg", alt: "Chicken tikka masala in a clay pot" },
  { src: "/images/placeholder/dish-1.svg", alt: "Tandoori mixed grill platter" },
  { src: "/images/placeholder/dish-2.svg", alt: "Vegetable samosa and pakora platter" },
  { src: "/images/placeholder/dish-3.svg", alt: "Mango lassi and gulab jamun" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-20 sm:py-24 bg-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 reveal">
          <p className="text-secondary text-sm font-medium tracking-[0.2em] uppercase mb-3">
            On The Menu
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            The Food
          </h2>
          <div className="w-16 h-px bg-secondary/60 mx-auto mb-4" />
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            A closer look at some of the dishes we cook fresh to order.
          </p>
        </div>

        {/* Photo Grid + lightbox */}
        <GalleryGrid images={galleryImages} />
      </div>
    </section>
  );
}
