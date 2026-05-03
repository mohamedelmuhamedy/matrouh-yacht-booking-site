import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const abandonedCarts = pgTable(
  "abandoned_carts",
  {
    id: serial("id").primaryKey(),
    sessionKey: text("session_key").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    packageId: integer("package_id"),
    packageName: text("package_name").notNull().default(""),
    date: text("date").notNull().default(""),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    notes: text("notes").notNull().default(""),
    estimatedValue: integer("estimated_value").notNull().default(0),
    status: text("status").notNull().default("active"),
    contactedAt: timestamp("contacted_at"),
    recoveredBookingId: integer("recovered_booking_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("abandoned_carts_session_idx").on(t.sessionKey),
    statusIdx: index("abandoned_carts_status_idx").on(t.status),
    phoneIdx: index("abandoned_carts_phone_idx").on(t.phone),
  }),
);

export type AbandonedCart = typeof abandonedCarts.$inferSelect;
