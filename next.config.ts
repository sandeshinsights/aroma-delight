import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 defaults to ['image/webp'] only. AVIF is ~20% smaller than WebP
    // and every browser that misses it falls back to WebP, then to the original
    // JPEG. Food photography is the whole page weight here, so the extra format
    // is worth the slower first encode (results are cached after that).
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
