import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const packageCapacity = pgTable(
  "package_capacity",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id").notNull(),
    date: text("date").notNull(),
    maxSeats: integer("max_seats").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pkgDateIdx: uniqueIndex("package_capacity_pkg_date_uidx").on(t.packageId, t.date),
  }),
);

export type PackageCapacity = typeof packageCapacity.$inferSelect;
