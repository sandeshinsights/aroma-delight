"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Gallery grid with a lightbox.
 *
 * The grid is deliberately uneven — two double-width tiles break up what was a
 * run of identical squares — and the spans are chosen so the tiles fill their
 * rows exactly at both breakpoints. Six photos, two of them taking two cells, is
 * eight cells: two full rows of four on desktop, four full rows of two on
 * mobile, no ragged gap at the end.
 *
 * If you change the number of images, re-check that arithmetic. WIDE_TILES is
 * indices into the array, so it has to move with the content.
 */

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Indices rendered double-width. Two wides + four singles = 8 cells, which fills
 * 4-column and 2-column grids exactly. Spread them across the rows rather than
 * side by side, or one row ends up all-wide and the rhythm is lost.
 */
const WIDE_TILES = new Set([0, 3]);

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length
      ),
    [images.length]
  );

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }

    // Stop the page behind the lightbox from scrolling. The previous value is
    // restored rather than blanked, so this cannot fight the cart drawer if both
    // ever end up open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close, step]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[minmax(9rem,1fr)] sm:auto-rows-[minmax(12rem,1fr)] lg:auto-rows-[minmax(15rem,1fr)]">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`View larger: ${image.alt}`}
            className={`group relative overflow-hidden rounded-xl bg-white/5 reveal cursor-zoom-in
              focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ink
              ${WIDE_TILES.has(index) ? "col-span-2" : ""}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes={
                WIDE_TILES.has(index)
                  ? "(max-width: 1024px) 100vw, 50vw"
                  : "(max-width: 1024px) 50vw, 25vw"
              }
              loading="lazy"
            />
            {/* Warm wash that lifts on hover, so the tiles read as one set
                against the dark band rather than eight loose photos. */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />
          </button>
        ))}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 sm:left-6 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 sm:right-6 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Stop clicks on the picture itself from closing the lightbox. */}
          {/* Sized by viewport height, not aspect ratio: a fixed ratio on a
              max-w-4xl box is taller than a laptop viewport, so the picture ran
              off the bottom and the caption landed on top of it. */}
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-4xl h-[70vh] sm:h-[75vh]"
          >
            <Image
              src={images[openIndex].src}
              alt={images[openIndex].alt}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>

          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm text-center px-4">
            {images[openIndex].alt}
          </p>
        </div>
      )}
    </>
  );
}
