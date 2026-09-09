"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { getRestaurantData } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * FAQ Section — accordion, one answer open at a time.
 */

export default function FAQ() {
  const { faq } = getRestaurantData();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) =>
    setOpenIndex((current) => (current === index ? null : index));

  return (
    <section id="faq" className="scroll-mt-20 bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-3">Good to know</p>
          <h2 className="font-heading text-4xl text-ink sm:text-5xl">
            Questions, answered
          </h2>
        </div>

        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {faq.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="font-heading text-lg text-ink">
                    {item.question}
                  </span>
                  <Plus
                    className={cn(
                      "h-5 w-5 shrink-0 text-primary transition-transform duration-300",
                      open && "rotate-45"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                  )}
                >
                  <p className="overflow-hidden text-text-light leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
