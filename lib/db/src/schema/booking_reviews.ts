import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const bookingReviews = pgTable(
  "booking_reviews",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id").notNull(),
    rating: integer("rating").notNull().default(5),
    comment: text("comment").notNull().default(""),
    customerName: text("customer_name").notNull().default(""),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    status: text("status").notNull().default("pending"),
    adminNotes: text("admin_notes").notNull().default(""),
    publishedAsTestimonial: integer("published_as_testimonial"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    bookingIdx: index("booking_reviews_booking_idx").on(t.bookingId),
    statusIdx: index("booking_reviews_status_idx").on(t.status),
  }),
);

export type BookingReview = typeof bookingReviews.$inferSelect;
