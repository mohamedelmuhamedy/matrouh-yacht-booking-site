import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const waitlist = pgTable(
  "waitlist",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    packageId: integer("package_id"),
    packageName: text("package_name").notNull().default(""),
    date: text("date").notNull(),
    groupSize: integer("group_size").notNull().default(1),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("pending"),
    notifiedAt: timestamp("notified_at"),
    convertedBookingId: integer("converted_booking_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    packageDateIdx: index("waitlist_package_date_idx").on(t.packageId, t.date),
    statusIdx: index("waitlist_status_idx").on(t.status),
  }),
);

export type WaitlistEntry = typeof waitlist.$inferSelect;
