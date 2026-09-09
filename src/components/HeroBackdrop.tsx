"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Crossfading hero backdrop.
 *
 * Replaces a CSS `background-image`, which Next's image optimizer cannot touch:
 * the original 2.6 MB JPEG was downloaded at full size, in its original format,
 * before anything painted. Going through next/image gets AVIF/WebP and a
 * responsive srcset for the same picture.
 *
 * The slow zoom and the crossfade are the only motion on the page that runs on
 * its own, so both are disabled outright under prefers-reduced-motion — the
 * first frame just sits there, which is exactly what that setting asks for.
 */

export interface HeroImage {
  src: string;
  alt: string;
}

/** Long enough that the change reads as drift rather than a slideshow. */
const FADE_INTERVAL_MS = 7000;

export default function HeroBackdrop({ images }: { images: HeroImage[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;

    // Checked at run time rather than in CSS: this decides whether a timer runs
    // at all, so an unattended tab does no work when motion is unwanted.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % images.length);
    }, FADE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {images.map((image, index) => (
        <div
          key={image.src}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out motion-safe:animate-ken-burns ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={image.src}
            alt={index === 0 ? image.alt : ""}
            fill
            className="object-cover"
            sizes="100vw"
            // The hero is the LCP element, so the first frame loads immediately;
            // the rest are not needed until the first crossfade. `priority` is
            // deprecated in Next 16 in favour of being explicit about both.
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        </div>
      ))}

      {/* Readability scrim. Deeper top and bottom so the header and the scroll
          cue keep contrast over a bright photo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/35 to-ink/80" />
      {/* Cardamom tint, so the photography sits in the brand's green/amber family
          rather than reading as a cold stock image. */}
      <div className="absolute inset-0 bg-primary/25 mix-blend-multiply" />
    </div>
  );
}
