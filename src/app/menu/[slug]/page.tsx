import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getMenuItemBySlug,
  getAllMenuItems,
  getRestaurantData,
} from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import MenuItemOrderForm from "@/components/MenuItemOrderForm";

/**
 * Shareable per-dish page: `/menu/butter-chicken` → Butter Chicken.
 *
 * Its job is to give a social post (Facebook, Instagram, WhatsApp) a link that
 * unfurls with the dish name and description, and a landing page where the
 * customer can pick their options and add to the cart right here — same
 * `<MenuItemOrderForm>` the homepage menu uses, so the cart line and the
 * checkout price stay identical. Adding opens the cart drawer.
 *
 * The URL slug comes from the dish name (see `slugMaps` in lib/data.ts). Photos
 * / generated Open Graph image cards are a separate, later job; for now every
 * dish gets a clean text unfurl, plus its photo here if `menu.json` has one.
 */

// Only the slugs we know about render; anything else 404s at the routing layer.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllMenuItems().map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getMenuItemBySlug(slug);
  if (!found) return {};

  const { item } = found;
  const restaurant = getRestaurantData();
  // Price is deliberately not in the title: a menu price change would rewrite
  // 100+ page titles and leave stale prices in already-scraped social cards
  // until they re-fetch. It lives in the page body instead.
  const title = `${item.name} | ${restaurant.name}`;
  const description =
    item.description ||
    `Order ${item.name} for pickup or delivery from ${restaurant.name}, ${restaurant.address.city}, ${restaurant.address.state}.`;
  const url = `/menu/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // These pages exist to be shared, not ranked: 100+ short dish pages that all
    // point back to the homepage look like doorway pages to Google. Social
    // scrapers (Facebook, WhatsApp, Twitter) ignore robots meta, so unfurls
    // still work. Revisit if real content (photos, reviews, JSON-LD) is added.
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: restaurant.name,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function MenuItemPage({ params }: Props) {
  const { slug } = await params;
  const found = getMenuItemBySlug(slug);
  if (!found) notFound();

  const { item, category } = found;
  const restaurant = getRestaurantData();

  return (
    <div className="min-h-screen bg-cream pt-28 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/#menu"
          className="text-sm text-primary hover:underline"
        >
          &larr; Full menu
        </Link>

        <article className="mt-4 bg-white rounded-xl border border-ink/10 shadow-sm overflow-hidden">
          {item.image && (
            <div className="relative w-full aspect-[16/9] bg-ink/5">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary font-semibold">
                  {category.name}
                </p>
                <h1 className="font-heading text-3xl text-ink mt-1">
                  {item.name}
                </h1>
              </div>
              <span className="font-heading text-2xl text-primary whitespace-nowrap">
                {formatPrice(item.price)}
              </span>
            </div>

            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {item.description && (
              <p className="text-text-light leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="border-t border-ink/10 pt-4">
              <MenuItemOrderForm item={item} categoryName={category.name} />
            </div>

            <Link
              href="/#menu"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline pt-1"
            >
              Browse the full menu &rarr;
            </Link>

            <p className="text-sm text-text-light pt-2">
              {`${restaurant.name} · ${restaurant.address.full} · Pickup & delivery`}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
