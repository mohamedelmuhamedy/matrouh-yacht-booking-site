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

The Vite dev server proxies `/api` requests to the backend on port 3001.

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
- Admin dashboard (CRUD for packages, categories, hero sliders, testimonials, bookings)
- Arabic/English localization (RTL support)
- Currency switching
- Referral reward system
- Push notifications (VAPID)
- Media/file upload support

## Known Environment Issue: Public Dev Domain Returns 502

**Known issue still active as of 2026-05-02.**

The public Replit dev domain (`https://$REPLIT_DEV_DOMAIN/`) currently returns HTTP 502 for port 5000 (the frontend). This was verified to be **infrastructure-level**, not application code:

- `curl http://localhost:5000/` → **200 OK** with full HTML
- `curl https://$REPLIT_DEV_DOMAIN/` → **502 Bad Gateway**
- The same 502 occurs even when port 5000 is served by an unrelated tool (`npx serve`), proving it is not Vite-specific.
- Port 3001 (Backend API) on its own external port works fine through the public domain.
- The workflow correctly reports `OpenPorts: [80]` and `.replit` contains the mapping `localPort=5000 → externalPort=80`.

The internal screenshot tool reaches the app via `http://localhost:5000` directly and successfully renders the splash → home page transition. End-to-end traces show all 4 site-data fetches resolving in ~1.1 s and the splash being removed as expected.

**Resolution paths if the user's preview still shows the splash / blank page:**
1. Hard-refresh the preview pane (Ctrl/Cmd-Shift-R) to bust any stale service-worker cache.
2. Restart the Replit workspace (refreshes the dev proxy state).
3. Roll back to a previous checkpoint if the issue persists.
4. Deploy the app — the production proxy is independent of the dev proxy and should serve the app correctly on the `.replit.app` domain.
