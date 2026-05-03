#!/bin/bash
set -e
pnpm install --frozen-lockfile

echo "[post-merge] Pushing schema to dev DATABASE_URL..."
pnpm --filter db push-force || pnpm --filter db push

apply_ticket_columns() {
  local URL="$1"
  local LABEL="$2"
  echo "[post-merge] Ensuring ticket columns on $LABEL via direct SQL..."
  cd lib/db && node -e "
    const pg = require('pg');
    (async () => {
      const pool = new pg.Pool({ connectionString: process.env._URL_ });
      try {
        await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_number text');
        await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_at timestamp');
        await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_by text');
        await pool.query(\`DO \$\$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_ticket_number_unique') THEN
            ALTER TABLE bookings ADD CONSTRAINT bookings_ticket_number_unique UNIQUE (ticket_number);
          END IF;
        END \$\$;\`);
        console.log('[post-merge] ticket columns ok');
      } catch (e) {
        console.error('[post-merge] WARNING: ticket column migration failed:', e.message);
      } finally {
        await pool.end();
      }
    })();
  " 2>&1 || true
  cd - >/dev/null
}

_URL_="$DATABASE_URL" apply_ticket_columns "$DATABASE_URL" "DATABASE_URL"

if [ -n "$SUPABASE_DATABASE_URL" ] && [ "$SUPABASE_DATABASE_URL" != "$DATABASE_URL" ]; then
  echo "[post-merge] Pushing schema to SUPABASE_DATABASE_URL..."
  DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm --filter db push-force \
    || DATABASE_URL="$SUPABASE_DATABASE_URL" pnpm --filter db push \
    || echo "[post-merge] WARNING: Supabase schema push failed; falling back to direct ALTER."
  _URL_="$SUPABASE_DATABASE_URL" apply_ticket_columns "$SUPABASE_DATABASE_URL" "SUPABASE_DATABASE_URL"
fi
