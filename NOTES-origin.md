# Aroma Delights — origin notes

Forked from the **Cafe of India** codebase on 2026-09-09.
Local source: `C:\Projects\The-Cafe-Of-India` @ commit `85e30dc`.
Full git history was preserved (this is a `git clone`, not a squash). `origin` remote removed
— add the new GitHub repo and push before starting real work.

## Decisions made at fork time

| Question | Decision |
|---|---|
| Build approach | Fork this repo; keep checkout/fulfillment/delivery engine, redesign presentation layer only |
| Design step | Design pass as appropriate (mockups where it helps, iterate in-code otherwise) |
| Delivery scope | **Full parity** — Uber Direct + scheduled delivery in v1 (needs an Uber Direct account before launch) |
| Menu shape | Similar to Cafe of India — categories + protein choices + spice levels; existing `Menu.tsx` / cart composite-id model fits |
| Analytics/ads | Keep Meta Pixel + CAPI and GA4. **Add Google Ads conversion tracking + Enhanced Conversions, Consent Mode v2, and Google Business Profile structured data** (see CLAUDE.md) |

## Bootstrap punch list (do in the new session, in order)

1. **Repo plumbing** — `git remote add origin <url>`, `git push -u origin main`. `npm install`
   (runs `prisma generate` on postinstall). Copy `.env` shape from CLAUDE.md's env-var list;
   every value is new.
2. **Provision accounts** — Stripe, Supabase (Postgres: `DATABASE_URL` pooled + `DIRECT_URL`),
   Resend + verified from-domain, HP ePrint kitchen printer email, Uber Direct, Vercel project,
   domain. `CRON_SECRET` (required). Google Ads ID + conversion labels.
3. **Database** — new Supabase project. The `0_init` migration baselines the schema; run
   `npm run db:migrate` against the new DB. Do **not** `prisma db push`.
4. **Content swap** — replace `src/data/{menu,restaurant,site-config,seo}.json` with Aroma
   Delights' menu/prices/categories, hours, address, phone, story, testimonials, FAQ, theme
   palette, SEO. Components read these only through `src/lib/data.ts` accessors.
5. **De-hardcode identity** — pull restaurant name/address/email out of the `.ts`/`.tsx`
   files listed in CLAUDE.md into `restaurant.json` / env. Notable: `CartContext.tsx`
   `STORAGE_KEY = "cafe-of-india-cart"` → new key; `src/lib/email.ts` templates; Uber
   pickup name/address in `uber-direct.ts`; delivery-area copy in `api/delivery/quote`.
6. **Theme + UI redesign** — new palette in `site-config.json` + `globals.css` `@theme`
   (currently `#5C1A1B` primary / `#C4973B` gold / `#FBF8F1` cream, also hardcoded as hex
   literals in components — grep and replace). Redesign the 9 sections in
   `src/components/sections/`. Money engine untouched.
7. **Google Ads + GBP** — implement per the CLAUDE.md spec. New files likely:
   `src/lib/google-ads.ts` (browser gtag conversions), server-side enhanced conversions
   alongside `meta-capi.ts`, a `StructuredData` component for `Restaurant` JSON-LD,
   Consent Mode v2 in `CookieConsent.tsx`.
8. **Money-logic tests** — after any pricing/discount/offer edits, run the two plain-Node
   scripts in CLAUDE.md (`test-free-item-offer`, `test-discount-spread`).
9. **Legal pages** — rewrite `src/app/{privacy,terms}/page.tsx` for the new entity; the
   privacy policy must disclose Meta Pixel, GA4, **and** Google Ads.

## What did NOT carry over

- `.env*` files (gitignored — new secrets anyway).
- The Cafe of India auto-memory (`~/.claude/projects/C--Projects-The-Cafe-Of-India/memory/`)
  — it is keyed to that folder path and is Cafe-specific. Start fresh memory here.
- The free-item offer specifics ($50 → Mango Lassi, $100 → Samosa + Lassi, item ids
  `menu-102` / `menu-1`) are Cafe of India's — revisit whether Aroma Delights wants the
  same mechanic and which items.
