#!/bin/bash
set -e
pnpm install --frozen-lockfile

echo "[post-merge] Pushing schema to dev DATABASE_URL..."
pnpm --filter db push-force || pnpm --filter db push

if [ -n "$SUPABASE_DATABASE_URL" ] && [ "$SUPABASE_DATABASE_URL" != "$DATABASE_URL" ]; then
  echo "[post-merge] Pushing schema to SUPABASE_DATABASE_URL..."
  DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm --filter db push-force \
    || DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm --filter db push \
    || echo "[post-merge] WARNING: Supabase schema push failed; manual migration may be required."
fi
