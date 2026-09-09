"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getMenuData, getMenuItemSlug } from "@/lib/data";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { ShoppingCart, ChevronRight, Link2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
// Meta Pixel — browser-only funnel event. ViewContent has no server counterpart.
import { trackMeta } from "@/lib/meta-pixel";
// The pick-options-and-add form, shared with the standalone /menu/<slug> page.
import MenuItemOrderForm from "@/components/MenuItemOrderForm";

/* ─── component ─── */

export default function Menu() {
  const menuData = getMenuData();
  const categories = menuData.categories;
  const { itemCount, openCart } = useCart();

  /* state */
  const [selectedCategory, setSelectedCategory] = useState(
    categories[0]?.id || ""
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  /* shareable-link copy feedback, keyed by menu item id */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ─── deep link ─── */
  // Open a specific dish on arrival when the URL carries ?item=menu-115 (with
  // or without #menu): switch to its category, expand it, then let the effect
  // below scroll to it once it has rendered. The per-dish pages now add to the
  // cart themselves, but external ?item= links (and any shared before that
  // change) still land here. Runs once; an unknown id is ignored.
  const pendingScrollId = useRef<string | null>(null);
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    const wanted = new URLSearchParams(window.location.search).get("item");
    if (!wanted) return;

    const cat = categories.find((c) =>
      c.items?.some((i) => i.id === wanted)
    );
    if (!cat) return;
    const target = cat.items.find((i) => i.id === wanted);

    pendingScrollId.current = wanted;
    // Deferred a frame so the state updates land as their own render pass
    // rather than cascading straight off this effect.
    const raf = requestAnimationFrame(() => {
      setSelectedCategory(cat.id);
      setExpandedItemId(wanted);
    });

    if (target) {
      trackMeta("ViewContent", {
        content_ids: [target.id],
        content_name: target.name,
        content_type: "product",
        content_category: cat.name,
        value: target.price,
        currency: "USD",
      });
    }

    return () => cancelAnimationFrame(raf);
  }, [categories]);

  // Scroll to the deep-linked dish once its category has rendered and the node
  // exists — deterministic, unlike a fixed timeout that can fire too early on a
  // slow render.
  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id || expandedItemId !== id) return;
    const el = document.getElementById(`menu-item-${id}`);
    if (!el) return;
    pendingScrollId.current = null;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedItemId, selectedCategory]);

  function handleCopyLink(id: string) {
    const url = `${window.location.origin}/menu/${getMenuItemSlug(id) ?? id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopiedId(id);
        setTimeout(
          () => setCopiedId((current) => (current === id ? null : current)),
          2000
        );
      })
      .catch(() => {
        /* clipboard blocked (insecure context, denied permission) — no-op */
      });
  }

  /* derived */
  const activeCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategory),
    [categories, selectedCategory]
  );

  /* ─── helpers ─── */

  function handleToggleExpand(item: MenuItem, categoryName?: string) {
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      return;
    }

    setExpandedItemId(item.id);

    // Opening the detail panel is the closest thing this menu has to viewing a
    // product page — it is where the customer reads the description and picks
    // options, so it is what Meta should see as ViewContent.
    trackMeta("ViewContent", {
      content_ids: [item.id],
      content_name: item.name,
      content_type: "product",
      content_category: categoryName,
      value: item.price,
      currency: "USD",
    });
  }

  /* ─── render ─── */

  return (
    <section id="menu" className="scroll-mt-20 bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* heading */}
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">The Menu</p>
          <h2 className="font-heading text-4xl text-ink sm:text-5xl">
            Cooked fresh, to order
          </h2>
          <div className="mx-auto mt-5 h-px w-16 bg-secondary" />
        </div>

        {/* sticky category nav */}
        <div className="sticky top-[4.5rem] z-20 -mx-4 mb-8 border-y border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-full sm:border sm:px-3">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat: MenuCategory) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setExpandedItemId(null);
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-primary text-cream"
                    : "text-text-light hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* category title + description */}
        <div className="mb-5">
          <h3 className="font-heading text-2xl text-ink">
            {activeCategory?.name}
          </h3>
          {activeCategory?.description && (
            <p className="mt-1 text-sm text-text-light">
              {activeCategory.description}
            </p>
          )}
        </div>

        {/* items list */}
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {activeCategory?.items?.map((item: MenuItem) => {
            const isExpanded = expandedItemId === item.id;

            return (
              <div
                key={item.id}
                id={`menu-item-${item.id}`}
                className="scroll-mt-40"
              >
                {/* header row */}
                <button
                  onClick={() => handleToggleExpand(item, activeCategory.name)}
                  className="flex w-full items-baseline gap-4 py-4 text-left transition-colors hover:bg-primary/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading text-lg text-ink">
                      {item.name}
                      {item.tags?.includes("Vegan") && (
                        <span className="ml-2 align-middle text-[0.65rem] font-semibold uppercase tracking-wider text-primary/70">
                          Vegan
                        </span>
                      )}
                      {!item.tags?.includes("Vegan") &&
                        item.tags?.includes("Vegetarian") && (
                          <span className="ml-2 align-middle text-[0.65rem] font-semibold uppercase tracking-wider text-primary/60">
                            Veg
                          </span>
                        )}
                    </h4>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-text-light">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden
                    className="mb-1 hidden flex-1 border-b border-dotted border-ink/20 sm:block"
                  />
                  <span className="font-heading text-lg tabular-nums text-primary">
                    ${item.price.toFixed(2)}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 self-center text-text-light transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* expanded details */}
                {isExpanded && (
                  <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-ink/5">
                    {item.description && (
                      <p className="text-sm text-text-main">{item.description}</p>
                    )}

                    <MenuItemOrderForm
                      item={item}
                      categoryName={activeCategory.name}
                      onAdded={() => setExpandedItemId(null)}
                    />

                    {/* Shareable link to this dish */}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.id)}
                      className="flex items-center gap-1.5 text-xs text-text-light transition-colors hover:text-primary"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {copiedId === item.id ? "Link copied" : "Copy shareable link"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* footnote */}
        <p className="mt-8 text-center text-sm text-text-light">
          Pickup &amp; delivery &middot; 7% MA tax &middot; every dish 100% halal
        </p>
      </div>

      {/* Floating cart button */}
      <button
        onClick={openCart}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-cream shadow-lg transition-all hover:bg-primary-light"
      >
        <ShoppingCart className="h-5 w-5" />
        Cart
        {itemCount > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-ink">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
    </section>
  );
}
