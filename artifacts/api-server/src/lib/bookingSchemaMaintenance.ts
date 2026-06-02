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
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_required boolean NOT NULL DEFAULT false`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_request_id uuid`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_expires_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_approved_at timestamp`,
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
  `INSERT INTO site_settings (key, value, updated_at)
   VALUES ('payment_default_expiration_hours', '12', now())
   ON CONFLICT (key) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS payment_methods (
     id serial PRIMARY KEY,
     key text NOT NULL UNIQUE,
     provider text NOT NULL DEFAULT 'manual_transfer',
     label_ar text NOT NULL,
     label_en text NOT NULL DEFAULT '',
     instructions_ar text NOT NULL DEFAULT '',
     instructions_en text NOT NULL DEFAULT '',
     account_identifier text NOT NULL DEFAULT '',
     active boolean NOT NULL DEFAULT true,
     sort_order integer NOT NULL DEFAULT 0,
     provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS payment_methods_active_idx ON payment_methods (active)`,
  `INSERT INTO payment_methods (key, provider, label_ar, label_en, sort_order)
   VALUES
     ('instapay', 'manual_transfer', 'Instapay', 'Instapay', 10),
     ('vodafone_cash', 'manual_transfer', 'Vodafone Cash', 'Vodafone Cash', 20),
     ('bank_account', 'manual_transfer', 'Bank Account', 'Bank Account', 30)
   ON CONFLICT (key) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS package_payment_settings (
     id serial PRIMARY KEY,
     package_id integer NOT NULL UNIQUE,
     enabled boolean NOT NULL DEFAULT false,
     method_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
     deposit_percent integer NOT NULL DEFAULT 100,
     expiration_hours integer,
     ticket_issuance_mode text NOT NULL DEFAULT 'manual',
     instructions_ar text NOT NULL DEFAULT '',
     instructions_en text NOT NULL DEFAULT '',
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS package_payment_settings_package_idx ON package_payment_settings (package_id)`,
  `CREATE INDEX IF NOT EXISTS package_payment_settings_enabled_idx ON package_payment_settings (enabled)`,
  `CREATE TABLE IF NOT EXISTS payment_requests (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     booking_id integer NOT NULL,
     package_id integer,
     portal_token text NOT NULL UNIQUE,
     provider text NOT NULL DEFAULT 'manual_transfer',
     provider_payment_id text NOT NULL DEFAULT '',
     provider_status text NOT NULL DEFAULT '',
     provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
     status text NOT NULL DEFAULT 'pending',
     method_key text NOT NULL DEFAULT '',
     currency text NOT NULL DEFAULT 'EGP',
     price_snapshot integer NOT NULL DEFAULT 0,
     discount_snapshot integer NOT NULL DEFAULT 0,
     final_amount_snapshot integer NOT NULL DEFAULT 0,
     deposit_percent_snapshot integer NOT NULL DEFAULT 100,
     expected_deposit_amount integer NOT NULL DEFAULT 0,
     payment_instructions_snapshot text NOT NULL DEFAULT '',
     expires_at timestamp,
     submitted_at timestamp,
     reviewed_at timestamp,
     reviewed_by_admin_id integer,
     reviewed_by_admin_username text NOT NULL DEFAULT '',
     admin_note text NOT NULL DEFAULT '',
     customer_note text NOT NULL DEFAULT '',
     active_attempt integer NOT NULL DEFAULT 1,
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS payment_requests_booking_idx ON payment_requests (booking_id)`,
  `CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON payment_requests (status)`,
  `CREATE INDEX IF NOT EXISTS payment_requests_expires_at_idx ON payment_requests (expires_at)`,
  `CREATE INDEX IF NOT EXISTS payment_requests_created_at_idx ON payment_requests (created_at)`,
  `CREATE TABLE IF NOT EXISTS payment_request_attachments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     payment_request_id uuid NOT NULL,
     attempt integer NOT NULL DEFAULT 1,
     object_path text NOT NULL,
     mime_type text NOT NULL,
     size_bytes integer NOT NULL DEFAULT 0,
     original_filename text NOT NULL DEFAULT '',
     sort_order integer NOT NULL DEFAULT 0,
     created_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS payment_request_attachments_request_idx ON payment_request_attachments (payment_request_id)`,
  `CREATE TABLE IF NOT EXISTS payment_request_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     payment_request_id uuid,
     booking_id integer,
     action text NOT NULL,
     actor_type text NOT NULL DEFAULT 'system',
     actor_id integer,
     actor_name text NOT NULL DEFAULT '',
     note text NOT NULL DEFAULT '',
     metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
     created_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS payment_request_events_request_idx ON payment_request_events (payment_request_id)`,
  `CREATE INDEX IF NOT EXISTS payment_request_events_booking_idx ON payment_request_events (booking_id)`,
  `CREATE TABLE IF NOT EXISTS payment_notifications (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     payment_request_id uuid,
     booking_id integer,
     type text NOT NULL,
     channel text NOT NULL DEFAULT 'internal',
     status text NOT NULL DEFAULT 'pending',
     recipient text NOT NULL DEFAULT '',
     payload jsonb NOT NULL DEFAULT '{}'::jsonb,
     attempts integer NOT NULL DEFAULT 0,
     last_error text NOT NULL DEFAULT '',
     created_at timestamp NOT NULL DEFAULT now(),
     sent_at timestamp
   )`,
  `CREATE INDEX IF NOT EXISTS payment_notifications_status_idx ON payment_notifications (status)`,
  `CREATE INDEX IF NOT EXISTS payment_notifications_booking_idx ON payment_notifications (booking_id)`,
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
