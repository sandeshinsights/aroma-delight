import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 defaults to ['image/webp'] only. AVIF is ~20% smaller than WebP
    // and every browser that misses it falls back to WebP, then to the original
    // JPEG. Food photography is the whole page weight here, so the extra format
    // is worth the slower first encode (results are cached after that).
    formats: ["image/avif", "image/webp"],
    // The launch build ships branded SVG placeholders (public/images/placeholder)
    // in every photo slot; real photos replace them later. SVGs are same-origin
    // and locked down by the CSP below (no scripts, sandboxed), which is Next's
    // documented safe pattern — fine to leave on once real JPEGs are in.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
