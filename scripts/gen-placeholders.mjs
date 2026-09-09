import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "C:/Projects/aroma-delights/public/images/placeholder";
mkdirSync(OUT, { recursive: true });

/**
 * Branded placeholder art. Warm dark ground, turmeric dot-lattice and a Mughal
 * arch outline — an intentional brand pattern, not a broken image. Swap each
 * file for a real photo later; keep the path.
 *
 * `mark`: draw the "AROMA DELIGHT / <label> PLACEHOLDER" wordmark.
 * `quiet`: scale every accent down (for art that sits behind headline text).
 */
function svg({ w, h, label, hue = "#E0952A", pop = "#C4552D", mark = true, quiet = false }) {
  const cx = w / 2;
  const cy = h / 2;
  const o = quiet ? 0.45 : 1;
  const archW = Math.min(w, h) * 0.62;
  const archH = archW * 1.15;
  const ax = cx - archW / 2;
  const ay = cy - archH / 2;
  const arch = (inset, stroke, op) => {
    const x = ax + inset;
    const y = ay + inset;
    const ww = archW - inset * 2;
    const hh = archH - inset * 2;
    const r = ww / 2;
    return `<path d="M${x} ${y + hh} L${x} ${y + r} C ${x} ${y + r * 0.28} ${x + r * 0.42} ${y} ${x + r} ${y} C ${x + ww - r * 0.42} ${y} ${x + ww} ${y + r * 0.28} ${x + ww} ${y + r} L${x + ww} ${y + hh} Z" fill="none" stroke="${stroke}" stroke-opacity="${op}" stroke-width="2.5"/>`;
  };
  const min = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label} — image placeholder">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="#213028"/>
      <stop offset="1" stop-color="#141110"/>
    </linearGradient>
    <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <circle cx="6" cy="6" r="2.1" fill="${hue}" fill-opacity="${(0.11 * o).toFixed(3)}"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#dots)"/>
  ${arch(0, hue, (0.22 * o).toFixed(3))}
  ${arch(Math.round(archW * 0.06), pop, (0.28 * o).toFixed(3))}
  <circle cx="${cx}" cy="${cy - archH * 0.06}" r="${Math.round(archW * 0.12)}" fill="none" stroke="${hue}" stroke-opacity="${(0.3 * o).toFixed(3)}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy - archH * 0.06}" r="4" fill="${hue}" fill-opacity="${(0.55 * o).toFixed(3)}"/>${
    mark
      ? `
  <text x="${cx}" y="${cy + archH * 0.12}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${Math.round(min * 0.062)}" letter-spacing="${Math.round(min * 0.012)}" fill="#F6F1E8" fill-opacity="0.9">AROMA DELIGHT</text>
  <text x="${cx}" y="${cy + archH * 0.12 + Math.round(min * 0.05)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(min * 0.024)}" letter-spacing="${Math.round(min * 0.006)}" fill="#F6F1E8" fill-opacity="0.4">${label.toUpperCase()} &#183; PLACEHOLDER</text>`
      : ""
  }
</svg>
`;
}

const files = {
  "hero.svg": { w: 1600, h: 1000, label: "Hero", mark: false, quiet: true },
  "interior.svg": { w: 1200, h: 900, label: "Restaurant" },
  "banner.svg": { w: 2100, h: 900, label: "Catering" },
  "dish-1.svg": { w: 900, h: 900, label: "Dish", hue: "#E0952A", pop: "#C4552D" },
  "dish-2.svg": { w: 900, h: 900, label: "Dish", hue: "#EDB65C", pop: "#7C9A5B" },
  "dish-3.svg": { w: 900, h: 900, label: "Dish", hue: "#D9784F", pop: "#E0952A" },
};

for (const [name, cfg] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}`, svg(cfg));
}
console.log("wrote", Object.keys(files).length, "placeholders");
