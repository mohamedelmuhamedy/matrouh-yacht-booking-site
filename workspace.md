# Workspace

## Overview

pnpm workspace monorepo for the DR Travel booking platform. The repo contains
the public site, the admin dashboard, shared database libraries, and utility
scripts used during development and deployment.

## Stack

- Monorepo: pnpm workspaces
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod
- API codegen: Orval

## Key Packages

- `artifacts/dr-travel`: public website and admin panel
- `artifacts/api-server`: Express API server
- `lib/db`: database schema and connection layer
- `lib/api-spec`: OpenAPI source
- `lib/api-client-react`: generated React Query client
- `lib/api-zod`: generated schemas
- `scripts`: workspace utility scripts

## Notes

- Environment variables are loaded from the repo-root `.env`.
- Media uploads are handled through the API storage routes and use the
  project's configured storage provider.
- Use `pnpm run typecheck` from the repo root for cross-package validation.
