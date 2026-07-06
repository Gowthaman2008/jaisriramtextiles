# JAI SRI RAM TEXTILES — Premium Ecommerce Platform

A production-grade storefront for a traditional Indian textile manufacturer, built on Next.js 15, Supabase, Razorpay, Cloudinary and Groq. Light, luxurious "zari-gold on ivory" identity — no dark mode.

> **Status: Phase 1 (foundation) is complete and runnable.** It ships the full design system, the animated storefront shell, the entire homepage, reusable components, and the complete database schema. Phases 2–6 (auth, catalogue, cart/checkout, wallet, admin, chatbot) are specified below, each mapped to exact files and the business rules it must enforce.

---

## What's in Phase 1 (runs today)

- **Design system** — `tailwind.config.ts` + `globals.css`: the zari-gold palette, Fraunces/Manrope type, the signature `.zari-frame` woven-gold border, weave texture, skeleton shimmer, reduced-motion support, on-brand focus rings.
- **Shell** — animated glass navbar (`components/layout/navbar.tsx`), rotating announcement bar, elegant footer with policies/address/email (no phone), Lenis smooth scroll.
- **Homepage** — 8-slide hero carousel, featured categories, tabbed featured products, why-choose-us with animated counters, shipping info, cashback banner, bulk-order banner, reviews marquee, animated FAQ, newsletter.
- **First-order popup** — 15s delay, once-only, gated for eligibility (`components/providers/first-order-popup.tsx`).
- **Reusable components** — `Button` (variants + sheen), `ProductCard` (badges, discount, cashback, wishlist, skeleton), `Reveal`, `StarRating`, `AnimatedCounter`, `SectionHeading`, `Container`.
- **Data layer** — Supabase browser/server/service clients, centralised business rules (`lib/constants.ts`), `middleware.ts` (session refresh + admin/account guard).
- **Database** — `supabase/schema.sql` + `supabase/policies.sql`: every table, trigger and RLS policy for the whole platform.

Homepage renders from `src/data/mock.ts` so you see the real look **before** wiring Supabase.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in keys as you reach each phase
npm run dev                     # http://localhost:3000
```

Nothing but Next is required to preview the homepage. When ready for data:

```bash
# In Supabase SQL editor, run in order:
#   1) supabase/schema.sql
#   2) supabase/policies.sql
# Then add your Supabase URL + anon key to .env.local.
```

---

## Architecture

```
src/
├─ app/                       # App Router: routes, layouts, API routes
│  ├─ layout.tsx              # fonts, SEO metadata, JSON-LD, shell, providers
│  ├─ page.tsx                # homepage
│  └─ globals.css             # design tokens + signature utilities
├─ components/
│  ├─ ui/                     # primitives (button, container, reveal, rating…)
│  ├─ layout/                 # navbar, footer, announcement bar
│  ├─ home/                   # homepage sections + ProductCard
│  └─ providers/              # smooth scroll, first-order popup
├─ lib/
│  ├─ constants.ts            # business rules (SINGLE SOURCE OF TRUTH)
│  ├─ utils.ts                # cn(), formatINR(), slugify()
│  ├─ types.ts
│  └─ supabase/               # client / server / admin (service-role)
├─ data/mock.ts               # dev placeholder catalogue (delete in Phase 2)
└─ middleware.ts              # session refresh + route guards
supabase/
├─ schema.sql                 # tables, enums, triggers
└─ policies.sql               # RLS
```

**Money rule:** all amounts are integer **paise** everywhere (DB, API, UI). Format only at render with `formatINR(value, true)`. Never do money math in floats.

**Trust boundary:** the client may *preview* prices/coupons, but every total, discount, wallet redemption and coupon check is recomputed server-side (checkout route uses the service-role client) and re-guarded by DB constraints/triggers.

---

## Business rules (already encoded in `lib/constants.ts` + DB)

| Rule | Where enforced |
|---|---|
| Shipping ₹99; free over ₹699 | `computeShipping()`, checkout route |
| Delivery 4–7 business days | copy + order events |
| Wallet capped at 20% of order value | `maxWalletRedeemablePaise()`, `orders.wallet_within_cap` CHECK |
| Cashback credited only after delivery | `credit_cashback_on_delivery()` trigger |
| Coupons applied only at order-summary step | checkout UI (step gating) + server validation |
| First-order 10% coupon, no completed orders | `coupons.first_order_only` + server check |
| Users cannot cancel orders | no cancel path/status exposed |
| Reviews only by verified, delivered buyers | `enforce_verified_review()` trigger + RLS |
| No phone number anywhere public | footer/contact use email + address only |

---

## Roadmap — remaining phases

### Phase 2 · Auth & catalogue
- `app/(auth)/sign-in`, `sign-up`, `forgot-password`, `verify` — Supabase email + Google OAuth, remember-me, email verification. Reuse `Button`, `zari-frame`, the popup's dialog styling.
- **New-signup → Google Sheet:** create `app/api/webhooks/new-user/route.ts` (or a Supabase Edge Function on the `auth.user.created` event). Verify the Supabase webhook signature, then append `[name, email, date, time, provider]` with a Google service account (`googleapis`). Keys already stubbed in `.env.example`. The `profiles` row is created automatically by the `handle_new_user()` trigger.
- `app/shop/[category]` + `app/shop` — filters (price slider, rating, availability), sorting (`SORT_OPTIONS`), search. Swap `data/mock.ts` for Supabase queries; keep `ProductCard` as-is.
- `app/product/[slug]` — gallery + zoom (360 slot future-ready), specs, sizes/colors, stock, reviews, photo reviews, related, recently-viewed, cashback + delivery estimate.

### Phase 3 · Cart & checkout
- Cart store (Zustand or React context) with quantity, save-for-later, coupon box, wallet toggle, free-shipping progress (`computeShipping`), price breakdown, cashback preview.
- `app/checkout` multi-step: Login → Address → Delivery → Payment → **Review (coupon here only)** → Confirmation.
- `app/api/checkout/route.ts` (service role): recompute totals, validate coupon + first-order eligibility, clamp wallet to 20%, create Razorpay order, insert `orders`/`order_items`, snapshot address.
- `app/api/webhooks/razorpay/route.ts`: verify `RAZORPAY_WEBHOOK_SECRET`, flip `payment_status → paid`, add first `order_events` row.

### Phase 4 · Orders, wallet, reviews
- `app/account/*` dashboard: profile, orders, **track order** (timeline from `order_events`, progress bar, copy-tracking-ID that copies `tracking_id` and opens `courier_tracking_url`), addresses, wallet (balance, history, expiry), coupons, notifications, reviews, wishlist, settings.
- Review submission gated to delivered orders (DB already enforces); admin moderation in Phase 5.

### Phase 5 · Admin panel (`app/admin/*`, role-guarded by middleware)
Dashboard, orders (status updates → inserts `order_events`; GST invoices; printable packing slips with name/address), products/inventory/categories (multi-image Cloudinary upload), coupons, wallet/cashback config, review moderation, customers + signup history, analytics (visitors, sessions, duration, device/browser, revenue, daily/monthly/yearly, CSV/Excel export), CMS (carousel/banners/popup), storage usage (Supabase + Cloudinary), audit logs, roles/permissions. Every mutation writes an `audit_logs` row via the service client.

### Phase 6 · AI chatbot, analytics, polish
- `components/chat/*` floating widget + `app/api/chat/route.ts` streaming from Groq (`groq-sdk`), system prompt seeded with policies (shipping, returns, cashback, wallet, bulk), typing animation, history. Log to an `ai_chat_logs` table for the admin.
- Analytics ingest: `app/api/track/route.ts` writes `sessions`/`page_views` (device/browser/referrer) from a lightweight client beacon.
- SEO: `app/sitemap.ts`, `app/robots.ts`, per-product `generateMetadata` + Product/Offer/AggregateRating JSON-LD, OG images.

---

## Security checklist (wire during Phases 2–5)
RLS on every table (done) · service-role key server-only · Razorpay + Supabase **webhook signature verification** · Zod validation on all API inputs · rate limiting on auth/checkout/chat (e.g. Upstash) · CSRF-safe same-site cookies (Supabase SSR) · tightened CSP in `next.config.mjs` once third-party origins are final · audit logging on admin actions · email verification before checkout.

## Performance & accessibility
Server Components by default (only interactive leaves are `"use client"`) · `next/image` (AVIF/WebP) + skeletons · `next/font` · code-split heavy client widgets (chat, 360 viewer) via `next/dynamic` · reduced-motion respected · visible focus · ARIA on carousel, dialogs, accordion, ratings · keyboard-navigable throughout.

## Deployment
Vercel + Supabase. Set all env vars, add Razorpay + Supabase webhook URLs, then `npm run build`. Configure Cloudinary upload preset and Google service-account sharing on the target Sheet.
```
