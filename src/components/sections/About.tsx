import { Award, Leaf, Heart, Users } from "lucide-react";
import Image from "next/image";
import { getRestaurantData } from "@/lib/data";

/**
 * About Section
 * - Restaurant story + photo, two columns
 * - 2x2 / 1x4 grid of highlight cards from restaurant.json
 */

const iconMap: Record<string, React.ReactNode> = {
  "chef-hat": <Award className="h-5 w-5" />,
  "leaf": <Leaf className="h-5 w-5" />,
  "heart": <Heart className="h-5 w-5" />,
  "users": <Users className="h-5 w-5" />,
};

export default function About() {
  const { about } = getRestaurantData();

  return (
    <section id="about" className="scroll-mt-20 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text */}
          <div className="reveal">
            <p className="eyebrow mb-3">Our Story</p>
            <h2 className="font-heading text-4xl text-ink sm:text-5xl">
              {about.headline}
            </h2>
            <div className="mt-5 h-px w-16 bg-secondary" />
            <p className="mt-6 text-lg leading-relaxed text-text-light">
              {about.description}
            </p>
          </div>

          {/* Photo */}
          {about.image && (
            <div className="relative reveal">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={about.image}
                  alt={about.headline || "About our restaurant"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
              {/* thin turmeric frame, offset */}
              <div className="pointer-events-none absolute -bottom-4 -right-4 -z-0 h-24 w-24 rounded-xl border-2 border-secondary/50" />
            </div>
          )}
        </div>

        {/* Highlight cards */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          {about.highlights.map((card, index) => (
            <div
              key={index}
              className="bg-cream p-7 transition-colors hover:bg-cream-dark"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {iconMap[card.icon] || <Award className="h-5 w-5" />}
              </div>
              <h3 className="font-heading text-lg text-ink">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
