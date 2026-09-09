# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ Migration status — this repo is a fork

This codebase was forked from **Cafe of India** (Maynard, MA) on 2026-09-09 to build the
online-ordering site for **Aroma Delights**. The ordering / payment / fulfillment / delivery
engine (API routes, `src/lib`, Prisma schema, crons) is being kept as-is — it is
restaurant-agnostic and carries a long tail of already-fixed production bugs. Everything
below the "Big picture" heading still describes that engine accurately.

**What still needs doing before launch** (see `NOTES-origin.md` for the full punch list):

1. **Content swap** — `src/data/{menu,restaurant,site-config,seo}.json` still hold Cafe of
   India's menu, hours, address, testimonials, FAQ, theme palette and SEO.
2. **Hardcoded identity in code** — restaurant name / address / email are hardwired in
   several `.ts`/`.tsx` files (not just JSON): `src/lib/email.ts`, `src/lib/uber-direct.ts`,
   `src/lib/delivery.ts`, `src/app/api/delivery/quote/route.ts`, `src/context/CartContext.tsx`
   (`STORAGE_KEY`), `src/components/sections/{Hero,Menu,Contact}.tsx`,
   `src/components/CartDrawer.tsx`, `src/components/layout/Footer.tsx`,
   `src/app/{privacy,terms}/page.tsx`. Prefer moving these to `restaurant.json` / env over
   find-and-replace.
3. **UI/UX redesign** — the 9 homepage sections in `src/components/sections/` and the theme
   (`site-config.json` palette + `globals.css` `@theme`) get a fresh design. Money engine
   untouched.
4. **New third-party accounts** — Stripe, Supabase, Resend + verified domain, HP ePrint,
   Uber Direct, Vercel, domain. All env vars are new.
5. **New analytics/ads integrations** — see "Google Ads + Google Business Profile" below.

## Google Ads + Google Business Profile (new for Aroma Delights)

The Cafe of India build has **Meta Pixel + Conversions API** (`src/lib/meta-pixel.ts`,
`src/lib/meta-capi.ts`, `src/components/MetaPixel.tsx`) and **GA4 gated behind the cookie
banner** (`CookieConsent.tsx` gates gtag). Aroma Delights additionally needs:

- **Google Ads conversion tracking** — mirror the Meta dual-send design. Browser: `gtag`
  `conversion` events for `begin_checkout` / `purchase` / `generate_lead`. Server:
  **Enhanced Conversions for Leads / web** via the Google Ads API offline-conversion import
  or the gtag enhanced-conversions payload (hashed email/phone, same SHA-256 normalization
  as `meta-capi.ts` — lowercase+trim, phone digits+country code). Reuse the shared
  `event_id` / `order.id` idempotency pattern so Google and Meta don't disagree.
  New env: `NEXT_PUBLIC_GOOGLE_ADS_ID` (AW-XXXXXXX), per-conversion labels, and
  (if doing server-side) `GOOGLE_ADS_*` API credentials + developer token.
- **Consent Mode v2** — Google Ads/GA4 in the EEA needs `gtag('consent', ...)`. Wire it to
  the same `CookieConsent` banner. Decide (as the Meta Pixel decision was made) whether ads
  tags fire pre-consent for US-only traffic; document it in the privacy policy either way.
- **Google Business Profile** — off-site listing, but the site supports it via:
  `LocalBusiness` / `Restaurant` JSON-LD structured data (name, address, geo, hours, phone,
  `sameAs`, `priceRange`, `servesCuisine`, `menu` URL) in `layout.tsx` or a dedicated
  component; exact **NAP** (name/address/phone) consistency between the site, the JSON-LD,
  and the GBP listing; `hasMenu` pointing at the menu; and a reviews block whose schema
  matches. Add `AggregateRating` only if backed by real review data.

@AGENTS.md

> The line above pulls in `AGENTS.md`: **this is Next.js 16 + React 19**, which has breaking changes vs. older versions. Read the relevant guide under `node_modules/next/dist/docs/` before writing framework code.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint.config.mjs)
npx prisma generate   # regenerate Prisma client (also runs automatically on postinstall)
npx prisma migrate dev --name <name>   # create + apply a migration locally
npm run db:migrate    # prisma migrate deploy — apply pending migrations to the real DB
```

There is **no test framework** in this project — do not assume `npm test` exists. The money logic in `src/lib` has plain-Node test scripts instead, run them after touching pricing, discounts, or the offer:

```bash
node --import ./scripts/ts-alias-hooks.mjs scripts/test-free-item-offer.mjs
node --import ./scripts/ts-alias-hooks.mjs scripts/test-discount-spread.mjs
```

`scripts/ts-alias-hooks.mjs` lets plain `node` import the project's TypeScript directly (Node 24 strips types itself; the hooks only resolve the `@/` alias, extensionless imports, and JSON imports). Both scripts exit non-zero on failure.

**⚠️ Deploying a schema change is two steps, in this order:** run `npm run db:migrate`, *then* push/deploy the code. Nothing in the build applies migrations (`postinstall` only runs `prisma generate`), and that is deliberate — Vercel preview builds share the production env vars, so a `migrate deploy` in the build script would apply an unmerged branch's migration to the live database. The cost of the manual step is that deploying code which reads a column that does not exist yet takes ordering **completely** offline: every `fulfillOrder()` call throws, so no kitchen slip, no emails, no courier, while Stripe keeps taking money. Migration first, always.

Do **not** use `prisma db push` on this project any more. The database was originally managed by `db push`, which left it with no migration history; that history now exists (baselined by the `0_init` migration, generated from the live schema via `prisma migrate diff` and marked applied with `prisma migrate resolve`). `db push` would silently diverge the DB from that history.

Note on connectivity: the Supabase host is IPv6-only, and the Rust migration engine intermittently fails to reach it with `P1001` even while the Prisma Client connects fine. It is usually transient — retry the command.

## Big picture

A single-page marketing + online-ordering site for one restaurant (Cafe of India, Maynard MA). The homepage (`src/app/page.tsx`) stacks nine section components in a fixed order; there are no other content pages besides `/order/success`, `/order/cancelled`, `/privacy`, `/terms`. All real logic lives in the API routes and `src/lib`.

**Content vs. code split.** All copy, menu, hours-independent config, theme colors, and SEO live in `src/data/*.json` and are read *only* through the typed accessors in `src/lib/data.ts` (`getMenuData`, `getRestaurantData`, `getSiteConfig`, `getSeoData`). Types for every JSON shape are in `src/lib/types.ts`. To change menu items, prices, hours copy, testimonials, FAQ, etc., edit the JSON — not the components. `site-config.json` also holds `features` flags and the theme palette (which is mirrored as CSS variables in `src/app/globals.css` `@theme`).

**Styling.** Tailwind v4 (via `@tailwindcss/postcss`), configured entirely in `globals.css` with the `@theme` block — there is no `tailwind.config.js`. Brand colors exist both as Tailwind tokens (`bg-primary`, `text-secondary`, `bg-cream`) and as hardcoded hex literals (`#5C1A1B` primary, `#C4973B` secondary/gold, `#FBF8F1` cream) sprinkled through components. Fonts (Playfair Display headings, Inter body) load via Google Fonts `<link>` in `layout.tsx`.

**Cart.** `src/context/CartContext.tsx` is a client-side provider wrapping the whole app in `layout.tsx`; it persists to `localStorage` under `cafe-of-india-cart`. Tax rate is duplicated as a constant here (`0.07`) for display and independently on the server for the real charge.

## Ordering flow (the core system)

1. **Menu → cart** (`src/components/sections/Menu.tsx`): Each cart line gets a composite id: `` `${baseItemId}-${protein}-${spice}-${Date.now()}` ``. The menu item ids in `menu.json` are two dash-segments (e.g. `menu-12`); the trailing option/timestamp segments make otherwise-identical items distinct in the cart. Protein choice ("Dinner" category) and spice level (6 named categories) are required before add. Protein surcharges come from `src/lib/pricing.ts` (`PROTEIN_OPTIONS`), which is shared with checkout — the surcharge used to live only in Menu.tsx, so the client displayed it but the server never charged it.
2. **Checkout** (`src/app/api/checkout/route.ts`): **Never trusts client prices — including the delivery fee.** `getMenuItemPrice` recovers the base id by taking the first two dash-segments of the cart id and looks the price (+ Dinner-category protein surcharge) up server-side — so the composite-id format above is load-bearing. Recomputes subtotal/tax/discount server-side, validates the promo code, then creates a Stripe Checkout Session (pinned `apiVersion`, currently `2026-05-27.dahlia`) and writes an `Order` row with `status: "pending"`. Discount is applied by shrinking the first Stripe line item; tip and delivery fee are separate line items. Ordering-window / scheduled-time rules are enforced here via `src/lib/ordering-hours.ts`.
   - **Delivery is priced by a fresh server-side `getUberQuote`** at checkout; the client's `deliveryFee` is only the number the customer was shown, used to detect drift (>$1 → HTTP 409, customer re-confirms). Trusting the client fee let anyone get free delivery while the restaurant still paid Uber. Minimum order (`DELIVERY_CONFIG.minOrderAmount`) and a real address are also enforced server-side here.
   - **The stored `Order.items` snapshot is sanitized**: server prices overwrite client prices and unknown fields are dropped, because the kitchen slip and emails render from this JSON. The spice-level field is `spicyLevel` (email templates fall back to legacy `spiceLevel` for old rows).
   - **`Order.scheduledFor` stores a UTC ISO string** (`scheduledTimeToUtcIso`). It used to store the human string from `formatScheduledPickup` ("Thursday, June 19 at 4:00 PM"), which `new Date()` can't parse — so scheduled delivery orders dispatched a courier immediately and the cron's window query never matched. Humans get `formatScheduledDisplay` (ET) at render time only; never store formatted dates.
   - Checkout returns generic errors; `error.message` used to be echoed to the client, leaking Stripe/Prisma internals. Zod issues are the only messages passed through.
3. **Payment**: Stripe redirects to `/order/success?session_id=...`.
4. **Fulfillment can be triggered from two places, but runs exactly once:**
   - `src/app/api/stripe/webhook/route.ts` — verifies the Stripe signature, then on `checkout.session.completed` calls `fulfillOrder()` in `src/lib/order-fulfillment.ts`.
   - `src/app/api/verify-order/route.ts` — the success page POSTs the session id here on load. It is a thin wrapper that calls the same `fulfillOrder()`. There is no second copy of the logic; do not reintroduce one.
   - **Idempotency is an atomic claim, not a status read.** `fulfillOrder()` does `updateMany({ where: { id, fulfilledAt: null }, data: { fulfilledAt: now, status: "paid" } })` and proceeds only if `count === 1`. Everyone else gets an already-fulfilled snapshot. This is what makes the webhook/success-page race harmless — the old read-then-write guard let both callers pass and double-fulfilled.
   - **The claim is taken before the work, which makes fulfillment at-most-once.** If the function dies after claiming (Vercel timeout, cold-start kill, a hung Uber call), nothing retries: Stripe's retry hits the claim and short-circuits, and the success page gets the already-fulfilled snapshot. The recovery sweep in `/api/cron/dispatch-scheduled` is the *only* thing that notices, which is why `printedAt` and `dispatchState` exist — they are its "this never finished" predicates. Any new post-claim side effect needs a matching column the sweep can check, or it will fail silently.
   - `FulfillmentResult.retryable` marks failures that are infrastructure rather than a verdict on the order (Stripe unreachable, DB down, order row not committed yet). The Stripe webhook returns a non-2xx for those so Stripe retries — safe because of the claim. Settled failures (`"Payment not completed"`) return 200; retrying them is pointless. Note this only rescues failures *before* the claim lands.
5. **Emails**: three sent via `src/lib/email.ts` on the fulfillment pass, **kitchen slip first**, each awaited, spaced 500ms apart (Resend's default limit is 2 req/s). Each send carries a deterministic `idempotencyKey` (`print-`/`order-`/`confirm-` + order id) so a retry inside Resend's 24h window cannot produce a second slip. `printedAt` is set only on a genuine print success.

**⚠️ `Order.status` is the payment lifecycle ONLY** (`pending` → `paid`, or `pending` → `abandoned`). The row is created at Checkout Session creation, *before* payment, so **`pending` means "checkout started, not finished" — an abandoned cart leaves one behind and it is not an error**. `paid` is written by `fulfillOrder()`'s atomic claim in the same statement as `fulfilledAt`, so those two can never disagree: a `pending` row always has a null `fulfilledAt`, and no post-payment failure (print, email, courier, Meta) can produce one. `abandoned` is written only for rows that were never claimed, by the Stripe webhook's `checkout.session.expired` handler and the cron's pre-claim sweep. Delivery state lives in `Order.uberStatus` (`DRIVER_ASSIGNED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`) and raw Uber state in `Order.uberDeliveryStatus`. The Uber webhook used to overwrite `status` itself, which silently disarmed the fulfillment guard (a `DELIVERED`/`DELIVERY_FAILED` order no longer read as `"paid"`, so a success-page refresh re-printed the slip and dispatched a second courier) and corrupted the `status: "paid"` counts behind the promo "Nth order" gate and the dispatch-scheduled cron. **Never write delivery state into `status`.**

**Money/tax invariants worth preserving:** server tax rate comes from `SALES_TAX_RATE` (default `0.07`); tax is charged on the *discounted* subtotal; tip is never taxed and is deliberately omitted from the printer/kitchen slip.

## Domain-specific modules

- **`src/lib/ordering-hours.ts`** — all pickup-time logic, hardcoded to `America/New_York`. `ORDERING_CONFIG` holds open/close and lead-time constants. Handles both "order now" (window must be open) and scheduled orders (today + 7 days, 15-min slots, 30-min lead). `isValidScheduledTime` re-validates on the server; the client picker is `src/components/TimeSlotPicker.tsx`.
- **Delivery / Uber Direct — live, not mocked.** `src/lib/uber-direct.ts` is the only module that calls Uber's API directly (OAuth token caching, quote, create delivery, get status). `src/lib/delivery.ts` holds `DELIVERY_CONFIG` (min order $20, 10 mile radius, `feeType: "uber_quote"`) and is the **client-side** entry point: `getDeliveryQuote` calls our own `/api/delivery/quote` route over `fetch` rather than importing `uber-direct.ts`. The *server-side* fulfillment paths (`order-fulfillment.ts`, `cron/dispatch-scheduled/route.ts`) import `uber-direct.ts` directly, skipping the API-route hop because they already run server-side.
  - **Couriers are dispatched from exactly one place: `fulfillOrder()`, after Stripe confirms `payment_status === "paid"`, and only when the order's `uberDeliveryId` is still null.** There is deliberately no client-callable dispatch route — `/api/delivery/create` and `delivery.ts`'s `createDelivery()` were deleted (unauthenticated courier dispatch with no payment check, plus a fake-success fallback). Don't add one back.
  - `/api/delivery/quote` — address → Uber quote; on any Uber error it returns HTTP 422 and blocks checkout (no silent flat-fee fallback for quoting). Accepts an optional `scheduledFor`, which is forwarded to Uber as `pickup_ready_dt` so scheduled orders get a scheduled-delivery quote.
  - Post-payment dispatch: fulfillment **always creates the Uber delivery immediately**, regardless of pickup time. For scheduled orders it passes `pickup_ready_dt` (both `getUberQuote` and `createUberDelivery` accept it) and lets Uber own the timing, rather than deferring dispatch. On Uber failure, fulfillment records `dispatchState = "failed"` and reports `deliveryType = "manual_fallback"` instead of deferring.
  - **`Order.dispatchState` distinguishes "no courier yet" from "no courier coming":** `null` = no attempt has concluded, `"dispatched"` = Uber accepted, `"failed"` = a human has to deliver. That distinction is load-bearing for the success page. Fulfillment writes it *after* the dispatch attempt, so a success-page load that lands mid-fulfillment sees `null` and reports `dispatchPending`, and the page polls (`POLL_INTERVAL_MS`, `MAX_POLLS`) instead of concluding. Inferring `manual_fallback` from a null `uberDeliveryId`, as the code once did, told customers their order was a manual delivery while the courier request was still in flight — and the page fetched only once, so the wrong message stuck.
  - **`/api/cron/dispatch-scheduled` (`vercel.json`, `0 10 * * *` — daily, constrained by the Vercel Hobby plan's daily-cron limit; see commit `c86f01e`), guarded by a `CRON_SECRET` bearer token, does three jobs:**
    1. *Scheduled-dispatch safety net* — dispatches any `paid` delivery order scheduled within the next 30 min that still has a null `uberDeliveryId`. Because normal dispatch happens inline at fulfillment, this should rarely find work.
    2. *Pre-claim sweep* (`recoverUnclaimedOrders`) — the recovery sweep below only sees orders that were **claimed** (it filters on `status: "paid"`), so an order whose fulfillment never started is invisible to it. That happens when both triggers miss — Stripe never delivered `checkout.session.completed` *and* the customer closed the tab before the success page POSTed to `/api/verify-order` — and it is the worst failure the system has: money taken, nothing printed, nobody alerted. This pass asks Stripe about every `pending` row aged 15 min–24h: `payment_status === "paid"` → call `fulfillOrder()` (never a second copy of the logic) and alert the restaurant that the order is late; session `expired` → mark `abandoned`; still open → leave it. It runs *before* the recovery sweep and cannot collide with it, because anything it fulfills has a `fulfilledAt` of "just now" and the sweep's 10-minute min-age window excludes it.
    3. *Recovery sweep* (`recoverStuckOrders`) — finds paid orders whose post-payment work never finished, re-prints missing kitchen slips, re-dispatches couriers that were never requested, and emails the restaurant (`sendFulfillmentAlert`) about anything a human has to handle. Deliberately bounded: only orders fulfilled in the last 24h, only ones idle ≥10 min (never touching an in-flight fulfillment), and re-dispatch only within 2h of payment — past that a courier is useless, so it records `dispatchState = "failed"` and alerts instead. **The sweep's safety depends on the migration's `printed_at` / `dispatch_state` backfills**; without them every pre-existing order looks un-printed and un-dispatched, and the first run would re-print months of orders and send couriers to long-since-served addresses. A re-print uses a *different* Resend idempotency key (`print-<id>-recovery`) — reusing `print-<id>` would let Resend dedupe the retry against the failed original and print nothing at all.
    - Because the cron is daily, recovery latency is up to ~24h. If that matters, an external pinger (cron-job.org et al.) hitting the route every 10 min with the `CRON_SECRET` bearer token makes it near-real-time without leaving the Hobby plan.
  - `/api/uber/webhook` — receives Uber delivery status callbacks and writes them into `Order.uberDeliveryStatus` and `Order.uberStatus`. It must never touch `Order.status`. Verifies `X-Postmates-Signature` (HMAC-SHA256 of the raw body) when `UBER_WEBHOOK_SECRET` is set; until that env var is configured from the Uber Direct dashboard it accepts unsigned requests with a loud warning.
- **`src/lib/email.ts`** — all transactional email via Resend, as inline-HTML templates. Five senders: `sendCateringNotification`, `sendOrderNotification` (restaurant), `sendCustomerConfirmation` (customer), `sendOrderToPrinter` (HP ePrint kitchen slip), and `sendFulfillmentAlert` (ops alert, recovery sweep only). The printer path is intentionally isolated — do not wire it into other email flows, and a kitchen slip must never double as an alert.
  - **⚠️ The Resend SDK never throws** — not on 4xx, not on 5xx, not on network failure. Every result is `{ data, error }`. All sends therefore go through the local `sendOrThrow()` helper, which inspects `error` and throws. Never call `resend.emails.send()` directly: a bare call silently swallows failures, which is exactly how orders went un-printed while the logs claimed success.
  - **Every user-supplied value interpolated into email HTML goes through the local `esc()` helper** — templates are built by string interpolation, and customer-controlled fields (name, address, delivery notes, item names, catering messages) land in the restaurant's trusted inbox and the printed kitchen slip. Plain-text subjects don't need escaping; everything inside `html:` does.
- **Promo codes** (`src/app/api/promo/validate/route.ts` + checkout): codes support percentage/fixed discounts, per-customer and total use caps, min order, expiry, and an `orderNumber` "Nth order" gate that counts the customer's prior *paid* orders. Validation logic is duplicated between the validate endpoint (for UI feedback) and checkout (authoritative) — keep them in sync.

- **Spend-threshold free items** (`src/lib/free-item-offer.ts`, shared by `CartDrawer.tsx` and checkout): $50 of qualifying food earns a free Mango Lassi (`menu-102`); $100 earns a free Vegetable Samosa (`menu-1`) **and** a free Mango Lassi. Three rules make it what it is:
  - **Nothing is ever added to the cart automatically.** The item is comped only if the customer added it themselves. When they qualify and have not added it, the cart banner says so and offers a one-tap Add button — that tap is still the customer adding it.
  - **The free items' own prices do not count toward the threshold.** $46 of curry plus a $5.99 lassi is $51.99 in the cart but only $46 of qualifying food, so it does not reach $50. Each tier has its own qualifying subtotal, because each comps a different set of items.
  - **Tiers do not stack** (a $100 order is two free items, not three) and **the offer does not stack with a promo code**. Whichever saves more wins; a promo code that loses is *not* consumed — checkout clears `validPromoCodeId`, so no `PromoCodeUsage` row is written and the customer can still use the code later. This is why no schema change was needed: `Order.discountAmount` stays a single unambiguous number, and `promoCodeId` says which kind of discount it was.
  - The comped value is always looked up from `menu.json` inside the module, never taken from the caller, so the cart's number and the charged number cannot drift. Same reasoning as `pricing.ts` — see the protein-surcharge bug it documents.
- **Discounts reach Stripe through `applyDiscountToLineItems`** (`src/lib/stripe-line-items.ts`), which spreads the discount across line items and **returns what it actually removed**. Checkout applies the discount *before* computing tax and totals and then uses the returned figure, so the stored `Order` row always equals what Stripe charges. The previous code subtracted the whole discount from the first line item's `unit_amount` and floored it at 1 cent, which double-applied on any line with quantity > 1 and silently swallowed the remainder whenever the discount exceeded that one item — both routine once a $13.98 free-item discount exists. When the free-item offer wins, the comped lines are discounted first so Stripe's page shows the free item at $0.00.

- **Meta Pixel + Conversions API** (`src/lib/meta-pixel.ts` browser, `src/lib/meta-capi.ts` server, `src/components/MetaPixel.tsx` loader): six events — `PageView`, `ViewContent`, `AddToCart` (browser only) and `InitiateCheckout`, `Purchase`, `Lead` (browser **and** server).
  - **The three dual-sent events share one `event_id` across both halves**, which is the only thing stopping Meta from counting each conversion twice: `InitiateCheckout` uses an id minted in `CartDrawer.handleCheckout` and posted to `/api/checkout` in the request's `meta` block; `Lead` does the same through `CateringForm` → `/api/catering`; `Purchase` uses **`order.id`** on both sides (`fulfillOrder()` and the success page). Change the id on one side and Ads Manager silently reports double the revenue at half the CPA.
  - **`queueMetaCapiEvent()` is the only way request paths should send.** It wraps `after()` so the Graph API call runs *after* the response — checkout never waits on Meta — and swallows every error. `sendMetaCapiEvent()` never throws and returns `false` instead; that is load-bearing, because these calls hang off the ordering flow and a Meta outage must not cost a kitchen slip.
  - **The Purchase send sits deliberately last in `fulfillOrder()`, after the courier dispatch.** It is *not* a post-claim side effect the recovery sweep needs a column for (contrast `printedAt` / `dispatchState`): a lost Meta event costs an ad-reporting row, not an order, and the browser copy from the success page covers most misses anyway.
  - **`_fbp` / `_fbc` and the customer's IP + user-agent are captured at checkout and parked in Stripe session metadata** (`fb_fbp`, `fb_fbc`, `fb_client_ip`, `fb_client_ua`), because by fulfillment time the "client" is Stripe's webhook, not the customer. Stripe metadata rather than `Order` columns is deliberate — disposable marketing data is not worth a migration on the ordering flow. Values are capped at Stripe's 500-char limit.
  - **Conversion `value` is food revenue — `subtotal - discount`, not `order.total`.** Tax goes to the state, tips to staff and the delivery fee to Uber, so including them would inflate ROAS against money the restaurant never keeps. `buildPurchaseSummary()` in `order-fulfillment.ts` is the one place to change this. The browser and server halves must keep the same basis.
  - Meta `content_ids` are the **base menu id** (first two dash-segments of the composite cart id), the same recovery `getMenuItemPrice` does — so audiences and any future catalog reconcile across orders.
  - PII (`em`, `ph`, `fn`, `ln`) is SHA-256'd after lowercase+trim, phones digits-only with a US country code. Meta accepts a wrongly-normalized hash silently — it just never matches anyone — so normalization bugs here are invisible, not loud.
  - **Not gated on the cookie banner.** The banner governs GA4 only; the Pixel runs for all visitors by decision, and the privacy policy discloses Meta accordingly. To reverse that, gate the `<Script>` in `MetaPixel.tsx` the way `CookieConsent` gates gtag.
  - Unconfigured is a clean no-op on both halves — no pixel id means no script and no events; no access token means no CAPI calls.

## Data layer

- **Prisma + PostgreSQL (Supabase).** `schema.prisma` uses `DATABASE_URL` (pooled) + `DIRECT_URL` (direct, for migrations). Models: `Order`, `CateringInquiry`, `PromoCode`, `PromoCodeUsage`. Column names are snake_case in the DB via `@map` — **except `scheduledFor`, which has no `@map`**, so its column is the literal mixed-case `scheduledFor` and must be double-quoted in raw SQL. `Order.items` is a JSON blob (the cart snapshot). `Order` also carries delivery fields (`isDelivery`, `deliveryAddress`, `deliveryApt`, `deliveryInstructions`, `deliveryFee`, `uberDeliveryId`, `uberDeliveryStatus`, `uberStatus`, `dispatchState`), fulfillment tracking (`fulfilledAt`, `printedAt`), `scheduledFor`, and `tipAmount`. `src/lib/prisma.ts` is the standard hot-reload-safe singleton.
- **`src/lib/supabase.ts`** exists but the app talks to the DB through Prisma, not the Supabase JS client.

## Environment variables

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESTAURANT_EMAIL`, `HP_EPRINT_EMAIL`, `SALES_TAX_RATE`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`, `UBER_WEBHOOK_SECRET` (Uber webhook signature verification — optional until configured, then enforced), `CRON_SECRET` (required — the cron route refuses all requests when unset rather than accepting `Bearer undefined`), `NEXT_PUBLIC_META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` (Meta Pixel and Conversions API — both optional; the integration no-ops without them), `META_TEST_EVENT_CODE` (set only while validating in Events Manager → Test Events, then **remove it** — events carrying a test code do not count as conversions), `META_GRAPH_API_VERSION` (optional override; defaults to a pinned version). `.env*` is gitignored — including `.env.example`, so this list is the real reference. Deploys to Vercel (`vercel.json` also defines the dispatch-scheduled cron).
