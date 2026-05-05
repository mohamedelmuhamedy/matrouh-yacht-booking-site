type QueryablePool = {
  query(sql: string): Promise<unknown>;
};

const BOOKING_COLUMN_MIGRATIONS = [
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_number text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_issued_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_at timestamp`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_used_by text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp`,
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
];

export async function ensureBookingSchema(pool: QueryablePool): Promise<void> {
  for (const sql of BOOKING_COLUMN_MIGRATIONS) {
    await pool.query(sql);
  }
  console.log("[db] booking schema maintenance applied");
}
