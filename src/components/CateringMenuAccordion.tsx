"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { CateringMenuItem } from "@/lib/types";

function groupByCategory(items: CateringMenuItem[]) {
  const groups = new Map<string, CateringMenuItem[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.category, [item]);
    }
  }
  return groups;
}

export default function CateringMenuAccordion({
  items,
}: {
  items: CateringMenuItem[];
}) {
  const categories = Array.from(groupByCategory(items));
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (category: string) =>
    setOpenCategory((current) => (current === category ? null : category));

  return (
    <div className="space-y-10">
      <h3 className="text-center font-heading text-2xl text-ink">
        Catering Menu
      </h3>
      <div className="space-y-3">
        {categories.map(([category, categoryItems]) => {
          const open = openCategory === category;
          return (
            <div
              key={category}
              className="overflow-hidden rounded-lg border border-ink/10 bg-cream"
            >
              <button
                onClick={() => toggle(category)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-heading text-lg text-ink">
                    {category}
                  </span>
                  <span className="text-sm text-text-light">
                    {categoryItems.length}{" "}
                    {categoryItems.length === 1 ? "item" : "items"}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-primary transition-transform duration-300",
                    open && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="grid grid-cols-1 gap-4 border-t border-ink/10 p-5 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-ink/10 bg-white p-5"
                      >
                        <p className="font-heading text-base text-ink">
                          {item.name}
                        </p>
                        <div className="mt-3 space-y-1.5 text-sm">
                          {item.priceSmall !== undefined && (
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-text-light">
                                Small Tray
                                {item.servesSmall
                                  ? ` · ${item.servesSmall}`
                                  : ""}
                              </span>
                              <span className="shrink-0 font-semibold text-primary">
                                {formatPrice(item.priceSmall)}
                              </span>
                            </div>
                          )}
                          {item.priceLarge !== undefined && (
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-text-light">
                                Large Tray
                                {item.servesLarge
                                  ? ` · ${item.servesLarge}`
                                  : ""}
                              </span>
                              <span className="shrink-0 font-semibold text-primary">
                                {formatPrice(item.priceLarge)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
