# DR Travel - Travel Booking Platform

## Overview

A professional travel booking platform (Yacht Tourism & Safari - Marsa Matrouh). Features a public-facing website for browsing and booking travel packages, an admin dashboard for content management, and a dedicated backend API server.

## Architecture

pnpm monorepo with the following packages:

- `artifacts/dr-travel` — React + Vite frontend (public site + admin panel)
- `artifacts/api-server` — Express.js backend API
- `lib/db` — Shared PostgreSQL + Drizzle ORM database layer
- `lib/api-spec` — OpenAPI YAML spec (source of truth)
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod validation schemas
- `scripts` — Utility scripts

### Visual / e2e tests

`artifacts/dr-travel/tests/` holds a Playwright suite that guards the
theme system: toggle persistence + full-page screenshots of `/`,
`/trips`, and `/admin/dashboard` in light + dark. Run with
`pnpm --filter @workspace/dr-travel test:e2e`; refresh baselines with
`test:e2e:update`. Config auto-starts both servers; admin login uses
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (defaults `admin` / `drtravel2024`).
Baselines are committed under
`artifacts/dr-travel/tests/visual.spec.ts-snapshots/` and
`.github/workflows/visual-tests.yml` runs the suite on every PR. See
`artifacts/dr-travel/tests/README.md`.

## Stack

- **Frontend:** React 19, Vite v7, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Wouter
- **Backend:** Node.js 20, Express v5, TypeScript
- **Database:** Supabase PostgreSQL with Drizzle ORM
- **Auth:** JWT with bcryptjs
- **Storage:** Google Cloud Storage (local fallback)
- **API Codegen:** Orval from OpenAPI spec

## Running the App

Two workflows are configured:
1. **Start application** — Frontend on port 5000 (`PORT=5000 API_PORT=3001 pnpm --filter @workspace/dr-travel run dev`), output type webview
2. **Backend API** — API server on port 3001 (`PORT=3001 pnpm --filter @workspace/api-server run dev`), output type console

**Two-way proxy setup** (works around the Replit dev-proxy port 5000→80 bug):
- The Vite dev server proxies `/api/*` to the backend on port 3001 (so the frontend can fetch its API).
- The Express backend proxies all non-`/api/*` requests to Vite on port 5000 (so the Replit canvas/preview pane, which can only reach port 3001 reliably, can also serve the frontend with HMR).
- Implementation: `artifacts/api-server/src/app.ts` uses `http-proxy-middleware`, dev-only (`NODE_ENV !== "production"`).

## Environment Variables / Secrets

- `SUPABASE_DATABASE_URL` — Supabase Postgres connection string (preferred by `lib/db`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase client/admin
- `JWT_SECRET`, `SESSION_SECRET` — auth secrets
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — web push notifications
- `DATABASE_URL` — Replit-managed Postgres (fallback if SUPABASE_DATABASE_URL not set)

`lib/db/src/index.ts` selects the connection string in this order:
`SUPABASE_DATABASE_URL` → individual `PG*` vars → `DATABASE_URL`.

## Database

PostgreSQL hosted on Supabase. Schema managed by Drizzle ORM.
Push schema changes with: `pnpm --filter @workspace/db push`
Schema has been pushed; tables (packages, categories, testimonials, settings, etc.) are populated.

## Key Features

- Travel packages browsing and booking
- Services CRUD: each home-page service card opens its own detail page at `/services/:slug` (8 default services pre-seeded). Admin manages them at `/admin/services`. The `services_link_to_trips` setting still overrides per-service links when ON; `services_detail_pages_enabled` (default true) globally toggles whether cards open detail pages.
- ServiceDetailPage uses the site's dark navy + gold/blue palette and is wrapped with Navbar + Footer + WhatsAppFloat + AIAssistant (matching HomePage shell). Bottom CTA button + Navbar links all route back home; navigating from any non-`/` page via Navbar links goes to `/<hash>` and HomePage scrolls to the hash on mount.
- Admin dashboard (CRUD for packages, categories, hero sliders, testimonials, bookings, services)
- Arabic/English localization (RTL support)
- Currency switching
- Referral reward system
- Push notifications (VAPID)
- Media/file upload support

### Services table

`services` table on Supabase has columns: `id, slug (unique), icon, title_ar/en, description_ar/en, long_description_ar/en, image_url, about_image_url, features_image_url, cta_image_url, color, features_ar/en (JSONB string arrays), features (JSONB rich array), cta_text_ar/en, cta_link, sort_order, is_active, created_at, updated_at`.

Seed: `pnpm --filter @workspace/api-server seed-services` (idempotent — uses ON CONFLICT DO NOTHING on slug, so admin edits are preserved).

API:
- Public: `GET /api/services`, `GET /api/services/:slug` (only active services).
- Admin (Bearer JWT): `GET/POST /api/admin/services`, `GET/PUT/DELETE /api/admin/services/:id`.

The admin "toggle visibility" button refetches the full record before PUT to avoid wiping non-toggle fields.

### Rich features editor (admin → service detail page)

Per-feature visual editor lets the admin set image / icon / tint / AR+EN title for every "what's included" card on the service detail page — no code edits needed. Files:
- `artifacts/dr-travel/src/lib/featureVisuals.ts` — shared `FEATURE_VISUAL_MAP` (24+ keyword → image/icon/tint), `getFeatureVisual()`, `buildFeatureFromText()`, used by both pages.
- `artifacts/dr-travel/src/admin/AdminServiceFormPage.tsx` — per-card editor (AR/EN title, emoji, color, image upload, ▲▼ reorder, 🗑 delete, 💡 auto-suggest), bulk "↺ restore defaults" + "🗑 clear all", plus per-section image fields each with "↺ افتراضي" reset.
- `artifacts/dr-travel/src/pages/ServiceDetailPage.tsx` — `getEffectiveFeatures()` prefers rich `features[]` if present, else falls back to legacy AR/EN string arrays + auto-detected visuals.
- `artifacts/api-server/src/routes/services.ts` — `normalizeRichFeatures()` (drops empty entries, normalizes invalid hex tints to `#00AAFF`, caps at 30) + `deriveFeatureFields()` (when rich `features[]` is non-empty, server derives `featuresAr`/`featuresEn` from it so legacy stays in sync regardless of what the client sends).

### Anti-Fake Branded Tickets (2026-05-03)

Each booking ticket carries multiple anti-counterfeit features:
- **Formatted ticket number** `DR-YY-XXXXXX-CK` (year, 6-char base32 random, 2-char checksum). Generated server-side, unique constraint on `bookings.ticket_number`, validated by `verifyTicketNumberChecksum` against `^DR-\d{2}-[A-Z0-9]{6}-[A-Z0-9]{2}$`.
- **HMAC-SHA256 signature** (`signTicket`) over `bookingId|ticketToken|ticketNumber` using `SESSION_SECRET` (fallback `JWT_SECRET`). Returned as a 12-char base32 `signature`. Required as `?sig=` on the verify URL; `Ticket.tsx` appends it to the public `/verify/:token` QR target.
- **Public verify endpoint**: `GET /api/tickets/verify/:token?sig=` returns `{status, ticket}` where status ∈ `valid|used|cancelled|invalid`. Mobile-friendly page at `/verify/:token?sig=` shows status with localized colour and (for admin) a "تأكيد الدخول" button.
- **Admin mark-as-used**: `POST /api/admin/tickets/:token/use` (idempotent; blocks cancelled). Sets `ticket_used_at`, `ticket_used_by` from the JWT username.
- **Visual security**: `components/Ticket.tsx` renders SVG guilloche pattern, repeated "DR TRAVEL · AUTHENTIC" microtext stripes, full-page rotated watermark, gold seal corner, ticket number + 12-char security code shown next to the QR.
- **Ticket button gating**: `BookingsPage.tsx` only shows "إصدار/مشاركة التذكرة" when booking `status === "confirmed"`. Once used, a "✓ مستخدمة" pill is shown.

Files: `artifacts/api-server/src/lib/ticketSecurity.ts`, `artifacts/api-server/src/routes/tickets.ts`, `artifacts/api-server/src/routes/admin-bookings.ts`, `artifacts/dr-travel/src/components/Ticket.tsx`, `artifacts/dr-travel/src/pages/VerifyPage.tsx`, `artifacts/dr-travel/src/admin/BookingsPage.tsx`, schema in `lib/db/src/schema/bookings.ts` (`ticket_number unique`, `ticket_used_at`, `ticket_used_by`).

## Workaround for Replit Dev-Proxy Port 5000 Bug (resolved 2026-05-02)

The public Replit dev domain on port 5000 (`https://$REPLIT_DEV_DOMAIN/` and `:5000`) returns HTTP 502 because of a port-mapping mismatch in this Repl: `.replit` maps `localPort=5000 → externalPort=80` (old convention), but Replit's canvas/preview infrastructure expects external port 5000 directly. Both `vite` and `npx serve` reproduce the 502, proving it is not application-specific. Port 3001 (with 1:1 mapping) works fine through the same proxy.

**Fix applied:** Express on port 3001 was made into a unified gateway:
- `/api/*` → handled by Express routes (existing).
- everything else → proxied to Vite on `localhost:5000` via `http-proxy-middleware` (with `ws: true` for HMR).

The canvas/preview iframe (auto-routed to port 3001 as `__default_preview__`) now successfully serves the full frontend with HMR. No changes were needed to the frontend code.
