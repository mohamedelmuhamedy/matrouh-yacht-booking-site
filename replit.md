# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/dr-travel` (`@workspace/dr-travel`)

Full-stack React + Vite tourism website for DR Travel (Marsa Matruh, Egypt) with integrated Admin Panel.

**Public Site:**
- **Routing**: `wouter` v3 — `/` (HomePage), `/trips` (TripsPage), `/packages/:slug` (PackageDetail), `/rewards` (RewardsPage), `/gallery` (GalleryPage), `/gallery/:slug` (GalleryDetailPage), `/admin/*` (AdminRouter)
- **Bilingual**: Arabic (RTL) and English (LTR) with auto-detection from browser language
- **Language system**: `src/LanguageContext.tsx` (React Context + `useLanguage` hook), persisted in `localStorage`
- **Translation files**: `src/translations/ar.ts` and `src/translations/en.ts` — `Translations` type is `typeof ar` with `dir: "rtl" | "ltr"`
- **Multi-currency**: EGP / USD / SAR — `src/data/currencies.ts` (rates, symbols, formatPrice), `src/context/CurrencyContext.tsx`, `src/components/CurrencySwitcher.tsx` in navbar
- **Rich package data**: `src/data/packages.ts` — `PackageData` interface with slugs, itineraries, why-this-trip reasons, FAQs, what-to-bring, cancellation policy; 4 packages (full-safari, luxury-yacht, all-inclusive, family-package)
- **Package Detail pages**: `src/pages/PackageDetail.tsx` — hero images, itinerary timeline, includes/excludes, FAQ accordion, sticky booking sidebar with WhatsApp Inquiry CTA
- **Trips page**: `src/pages/TripsPage.tsx` — browse-all-packages page at `/trips`; search bar, dynamic category pills from DB (via `useSiteData().categories`), sort by price/rating; mobile-first card grid
- **Package gallery**: TouchStart/touchEnd swipe, ← → keyboard nav, thumbnail strip, image counter badge (X/N), prev/next arrow buttons; all in `PackageDetail.tsx`
- **Price range display**: `priceLabel` shows "min – max" when `maxPriceEGP > 0`, else "from X"
- **PWA**: `public/manifest.json`, `public/sw.js` service worker, PWA meta tags + SW registration in `index.html`; icons at `/icon-192.png` and `/icon-512.png`
- **Booking form**: saves to `/api/bookings` (DB) and redirects to WhatsApp
- **Personalization**: `src/hooks/usePersonalization.ts` (recently viewed via localStorage), `PersonalizedSection` component showing recently viewed + recommended packages
- **Package comparison**: `src/components/CompareModal.tsx` (side-by-side grid up to 3), `CompareBar` sticky bottom; compare toggle per card
- **AI Travel Assistant**: `src/components/AIAssistant.tsx` — 5-step rule-based flow (group type → children → budget → trip type → foreigner); floating robot button; recommends top 2 packages
- **Referral/Loyalty**: `src/components/ReferralSection.tsx` — real API integration: verifies code from `/api/referral/verify`, self-registration via `/api/referral/register`, shows real usedCount/approvedCount; no localStorage mock data
- **Booking referral**: booking form has optional "كود الإحالة" field with debounced verification (green ✓ / red ✗ indicators); valid code is sent with the booking POST to trigger reward creation
- **"Why This Trip?"**: Per-package data + mini-section on cards + full section on detail page
- **Design**: glassmorphism, scroll progress bar, auto-scrolling reviews, animated counters; WhatsApp integration (01205756024)
- **Colors**: navy #0D1B2A, blue #00AAFF, gold #C9A84C
- **Fonts**: Cairo (Arabic), Montserrat (brand)
- **Social**: Facebook (Drtrave), Instagram (drtravel_marsamatrouh), TikTok (@drtravel.marsa.matrouh)

**Admin Panel (`/admin`):**
- **Auth**: JWT (7-day expiry) querying `admin_users` DB table (bcrypt). Auto-logout on 401. JWT_SECRET from env var.
- **Admin credentials**: username=`admin`, password=`drtravel2024` (seeded via node scripts/seed-admin.mjs)
- **Auth context**: `src/admin/AdminContext.tsx` — AdminProvider, useAdmin(), adminFetch()
- **AdminRouter**: `src/admin/AdminRouter.tsx` — rendered outside main LanguageProvider/CurrencyProvider
- **Toast system**: `src/admin/hooks/useToast.tsx` — `useToast()` → success/error/info/warning
- **Confirm dialog**: `src/admin/components/ConfirmDialog.tsx` — reusable confirmation modal
- **Pages**:
  - `/admin/login` — LoginPage.tsx
  - `/admin/dashboard` — DashboardPage.tsx (stats: published/draft/archived counts + recent bookings)
  - `/admin/packages` — PackagesPage.tsx (status badges, status selector, duplicate, soft-delete/archive)
  - `/admin/packages/new` & `/admin/packages/:id/edit` — PackageFormPage.tsx (4-tab: basic/media/includes/flags); status radio (draft/published/archived); image upload via Object Storage + URL fallback
  - `/admin/bookings` — BookingsPage.tsx (search by name/phone, CSV export, admin notes modal)
  - `/admin/gallery` — AdminGalleryPage.tsx (album CRUD: create/edit/delete/toggle-visibility; album item management: image upload, YouTube/video URL, item delete; masonry grid preview)
  - `/admin/testimonials` — TestimonialsPage.tsx (card grid with modal form, show/hide)
  - `/admin/settings` — SettingsPage.tsx (grouped key-value settings, logo upload via Object Storage, feature toggles: show_ai_assistant/show_compare_feature/show_testimonials, change password)
  - `/admin/rewards` — AdminRewardsPage.tsx (3 tabs: Settings / Codes / Rewards): reward settings (enabled toggle, type, value, after_x), referral codes CRUD (create/edit/deactivate/delete with auto-code generation), rewards list with approve/reject and admin notes
  - `/admin/categories` — AdminCategoriesPage.tsx: CRUD for trip categories (slug, nameAr, nameEn, sortOrder); deleting a category leaves existing packages untouched (graceful fallback)
- **Layout**: `src/admin/AdminLayout.tsx` — collapsible RTL sidebar (64px collapsed / 220px expanded); mobile bottom nav shows 5 items (excludes testimonials and settings); all pages accessible via drawer

**Public Site Data from DB:**
- `src/context/SiteDataContext.tsx` — `SiteDataProvider` wraps public routes; fetches `/api/packages`, `/api/testimonials`, `/api/settings`, `/api/categories` on mount; static fallback if API unavailable
- `useSiteData()` hook provides: `packages`, `testimonials`, `settings`, `categories`, `packagesLoading`, `refetchPackages()`, `refetchCategories()`
- `PackageDetail.tsx` — reads package from DB context first, falls back to static data; shows 404 state if not found
- `NotFoundPage.tsx` — full 404 page with home/packages CTAs (catch-all for unknown routes)
- App routing: `/` → HomePage, `/packages/:slug` → DetailPageWrapper, `/rewards` → RewardsPage, `*` → NotFoundPage

**Database Schema (lib/db):**
- `packages` — full package data (JSONB for arrays/objects); `status` col: draft/published/archived; `active` bool
- `testimonials` — review entries with visibility control
- `bookings` — customer booking records with status workflow (new→contacted→confirmed→completed→cancelled); `admin_notes` text
- `site_settings` — key-value store for editable site config
- `admin_users` — admin accounts (username, password_hash bcrypt, display_name, email, is_active)
- `gallery_albums` — photo/video album (slug, titleAr, titleEn, descriptionAr, descriptionEn, coverImage, isVisible, sortOrder)
- `gallery_items` — individual media items per album (albumId, url, type: image|video, caption, sortOrder)
- `categories` — trip category definitions (slug unique, nameAr, nameEn, sortOrder); used for TripsPage filters and PackageFormPage category dropdown

**API Server routes (artifacts/api-server):**
- Public: `GET /api/packages` (published+active only), `GET /api/packages/:slug`, `GET /api/testimonials`, `GET /api/settings`, `GET /api/categories`, `POST /api/bookings`
- Admin auth: `POST /api/admin/login`, `GET /api/admin/me`
- Admin packages: GET/POST/PUT /api/admin/packages; DELETE = soft archive; `?force=true` = hard delete; POST /api/admin/packages/:id/duplicate
- Admin bookings: search (`?q=`), CSV export (`?csv=true`), PATCH admin notes
- Admin settings: GET/PUT `/api/admin/settings`
- Gallery (public): `GET /api/gallery/albums` (visible only, includes itemCount + previewItems[4]); `GET /api/gallery/albums/:slug`
- Gallery (admin): CRUD `/api/admin/gallery/albums`; items CRUD `/api/admin/gallery/albums/:albumId/items`, `PUT/DELETE /api/admin/gallery/items/:id`
- Object Storage: POST `/api/storage/uploads/request-url` (signed URL for upload, auth required); GET `/api/storage/public-objects?path=...`; GET `/api/storage/objects?objectPath=...`
- All admin routes require Bearer JWT header
- `getJwtSecret()` throws if JWT_SECRET env var not set (no hardcoded secrets)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
