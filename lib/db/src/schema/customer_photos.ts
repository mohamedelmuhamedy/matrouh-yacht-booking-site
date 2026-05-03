import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const customerPhotos = pgTable(
  "customer_photos",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id").notNull(),
    photoUrl: text("photo_url").notNull(),
    caption: text("caption").notNull().default(""),
    customerName: text("customer_name").notNull().default(""),
    packageId: integer("package_id"),
    tripDate: text("trip_date").notNull().default(""),
    status: text("status").notNull().default("pending"),
    featured: integer("featured").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    bookingIdx: index("customer_photos_booking_idx").on(t.bookingId),
    statusIdx: index("customer_photos_status_idx").on(t.status),
    tripDateIdx: index("customer_photos_trip_date_idx").on(t.tripDate),
  }),
);

export type CustomerPhoto = typeof customerPhotos.$inferSelect;
