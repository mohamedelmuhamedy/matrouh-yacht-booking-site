type QueryablePool = {
  query(sql: string): Promise<unknown>;
};

const BOOKING_COLUMN_MIGRATIONS = [
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at timestamp`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()`,
  `CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique_nonempty
   ON admin_users (lower(email))
   WHERE email IS NOT NULL AND btrim(email) <> ''`,
  `CREATE TABLE IF NOT EXISTS admin_user_permissions (
     id serial PRIMARY KEY,
     user_id integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
     permission text NOT NULL,
     created_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS admin_user_permissions_user_permission_unique
   ON admin_user_permissions (user_id, permission)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_number text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_issued_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_by text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_time text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location_ar text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS supervisor_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS supervisor_phone text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remaining_balance text NOT NULL DEFAULT ''`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'bookings_ticket_number_unique'
         AND conrelid = 'bookings'::regclass
     ) THEN
       ALTER TABLE bookings ADD CONSTRAINT bookings_ticket_number_unique UNIQUE (ticket_number);
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS manual_tickets (
     id serial PRIMARY KEY,
     name text NOT NULL,
     phone text NOT NULL,
     package_id integer,
     package_name text NOT NULL DEFAULT '',
     package_name_ar text NOT NULL DEFAULT '',
     date text NOT NULL,
     passenger_count integer NOT NULL DEFAULT 1,
     pickup_location text NOT NULL DEFAULT '',
     pickup_location_ar text NOT NULL DEFAULT '',
     meeting_time text NOT NULL DEFAULT '',
     supervisor_name text NOT NULL DEFAULT '',
     supervisor_phone text NOT NULL DEFAULT '',
     remaining_balance text NOT NULL DEFAULT '',
     status text NOT NULL DEFAULT 'confirmed',
     notes text NOT NULL DEFAULT '',
     ticket_token text UNIQUE,
     ticket_number text UNIQUE,
     ticket_issued_at timestamp,
     ticket_used_at timestamp,
     ticket_used_by text,
     created_by_admin_id integer,
     created_by_admin_username text NOT NULL DEFAULT '',
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM admin_users WHERE role = 'super') THEN
       UPDATE admin_users
       SET role = 'super', is_active = true, updated_at = now()
       WHERE id = (
         SELECT id FROM admin_users
         ORDER BY created_at ASC NULLS LAST, id ASC
         LIMIT 1
       );
     END IF;
   END $$`,
  `INSERT INTO site_settings (key, value, updated_at)
   VALUES ('convert_manual_tickets_to_bookings', 'true', now())
   ON CONFLICT (key) DO NOTHING`,
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
       CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS reviews (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     customer_name text NOT NULL,
     rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
     review_text text NOT NULL,
     avatar_url text,
     photos text[] NOT NULL DEFAULT ARRAY[]::text[],
     status review_status NOT NULL DEFAULT 'pending',
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS avatar_url text`,
  `CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews (status)`,
  `CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews (created_at)`,
];

export async function ensureBookingSchema(pool: QueryablePool): Promise<void> {
  for (const sql of BOOKING_COLUMN_MIGRATIONS) {
    await pool.query(sql);
  }
  console.log("[db] booking schema maintenance applied");
}
