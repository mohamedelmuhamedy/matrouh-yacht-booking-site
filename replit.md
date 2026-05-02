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

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Wouter
- **Backend:** Node.js, Express v5, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** JWT with bcryptjs
- **Storage:** Google Cloud Storage (local fallback)
- **API Codegen:** Orval from OpenAPI spec

## Running the App

Two workflows are configured:
1. **Start application** — Frontend on port 5000 (`PORT=5000 API_PORT=3001 pnpm --filter @workspace/dr-travel run dev`)
2. **Backend API** — API server on port 3001 (`PORT=3001 pnpm --filter @workspace/api-server run dev`)

The Vite dev server proxies `/api` requests to the backend on port 3001.

## Environment Variables

- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL (set by Replit)
- `SESSION_SECRET` — JWT session secret

## Database

PostgreSQL provisioned via Replit. Schema managed by Drizzle ORM.
Push schema changes with: `pnpm --filter @workspace/db push`

## Key Features

- Travel packages browsing and booking
- Admin dashboard (CRUD for packages, categories, hero sliders, testimonials, bookings)
- Arabic/English localization
- Currency switching
- Referral reward system
- Push notifications
- Media/file upload support
