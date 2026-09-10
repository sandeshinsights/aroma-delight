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
 * The slots below use licensed stock photos for launch (Unsplash, free
 * commercial use); swap each `src` for a real photo of the restaurant's food.
 */
const galleryImages: GalleryImage[] = [
  { src: "/images/photos/dish-1.jpg", alt: "Curries served in karahi bowls with basmati rice" },
  { src: "/images/photos/dish-2.jpg", alt: "Golden vegetable samosas with mint chutney" },
  { src: "/images/photos/dish-3.jpg", alt: "Chicken biryani with saffron rice and fried onions" },
  { src: "/images/photos/banner.jpg", alt: "Paneer tikka masala, naan and fresh herbs" },
  { src: "/images/photos/interior.jpg", alt: "Butter chicken in a copper karahi with naan" },
  { src: "/images/photos/hero.jpg", alt: "Grilled tandoori skewers and charred vegetables" },
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
