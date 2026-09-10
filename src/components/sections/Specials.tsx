import { Star, Flame, Award } from "lucide-react";
import Image from "next/image";
import { getMenuData } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import type { ChefsSpecial, MenuCategory, MenuItem } from "@/lib/types";

interface SpecialDetail extends ChefsSpecial {
  price?: number;
  description?: string;
  photoUrl: string;
}

// Section is disabled in site-config until there is real "chef's specials"
// content. When it comes back, map each special's id to its photo here.
const specialPhotos: Record<string, string> = {};
const FALLBACK_PHOTOS = [
  "/images/photos/dish-1.jpg",
  "/images/photos/dish-2.jpg",
  "/images/photos/dish-3.jpg",
];

export default function Specials() {
  const menuData = getMenuData();

  const specialDetails: SpecialDetail[] = menuData.chefsSpecials.map(
    (special: ChefsSpecial, index: number) => {
      const category: MenuCategory | undefined = menuData.categories.find(
        (cat: MenuCategory) =>
          cat.items.some((item: MenuItem) => item.id === special.id)
      );
      const menuItem: MenuItem | undefined = category?.items.find(
        (item: MenuItem) => item.id === special.id
      );
      const photoUrl: string =
        specialPhotos[special.id] || FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];

      return {
        ...special,
        price: menuItem?.price,
        description: menuItem?.description,
        photoUrl,
      } as SpecialDetail;
    }
  );

  return (
    <section id="specials" className="relative overflow-hidden bg-ink py-20 text-cream md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-6">
            <Star className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Handpicked by Our Chef
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            Chef&apos;s Specials
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Our head chef&apos;s personal recommendations — the dishes our guests
            love the most.
          </p>
        </div>

        {/* Specials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specialDetails.map((special: SpecialDetail, index: number) => (
            <div
              key={special.id}
              className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300"
            >
              {/* Number badge */}
              <div className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-lg">
                {index + 1}
              </div>

              <div className="p-8 pt-16">
                {/* Dish Photo */}
                <div className="relative w-full h-48 bg-white/10 rounded-xl mb-6 overflow-hidden">
                  {special.photoUrl ? (
                    <Image
                      src={special.photoUrl}
                      alt={special.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                      <Star className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Badge */}
                {special.badge === "Best Seller" && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="w-5 h-5 text-secondary" />
                    <span className="text-secondary text-sm font-semibold">Best Seller</span>
                  </div>
                )}
                {special.badge === "Chef's Favorite" && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Award className="w-5 h-5 text-secondary" />
                    <span className="text-secondary text-sm font-semibold">Chef&apos;s Favorite</span>
                  </div>
                )}
                {special.badge === "House Special" && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-5 h-5 text-secondary" />
                    <span className="text-secondary text-sm font-semibold">House Special</span>
                  </div>
                )}

                {/* Dish Name */}
                <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-secondary transition-colors">
                  {special.name}
                </h3>

                {/* Price */}
                {special.price != null && (
                  <p className="text-secondary font-semibold text-lg mb-3">
                    {formatPrice(special.price)}
                  </p>
                )}

                {/* Description */}
                <p className="text-white/70 text-sm leading-relaxed">
                  {special.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}