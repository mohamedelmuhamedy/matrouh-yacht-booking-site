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
- Admin dashboard (CRUD for packages, categories, hero sliders, testimonials, bookings)
- Arabic/English localization (RTL support)
- Currency switching
- Referral reward system
- Push notifications (VAPID)
- Media/file upload support

## Workaround for Replit Dev-Proxy Port 5000 Bug (resolved 2026-05-02)

The public Replit dev domain on port 5000 (`https://$REPLIT_DEV_DOMAIN/` and `:5000`) returns HTTP 502 because of a port-mapping mismatch in this Repl: `.replit` maps `localPort=5000 → externalPort=80` (old convention), but Replit's canvas/preview infrastructure expects external port 5000 directly. Both `vite` and `npx serve` reproduce the 502, proving it is not application-specific. Port 3001 (with 1:1 mapping) works fine through the same proxy.

**Fix applied:** Express on port 3001 was made into a unified gateway:
- `/api/*` → handled by Express routes (existing).
- everything else → proxied to Vite on `localhost:5000` via `http-proxy-middleware` (with `ws: true` for HMR).

The canvas/preview iframe (auto-routed to port 3001 as `__default_preview__`) now successfully serves the full frontend with HMR. No changes were needed to the frontend code.
