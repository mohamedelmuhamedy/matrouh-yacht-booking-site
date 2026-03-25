import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  packageId: integer("package_id"),
  packageName: text("package_name").notNull().default(""),
  packageNameAr: text("package_name_ar").notNull().default(""),
  date: text("date").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  infants: integer("infants").notNull().default(0),
  notes: text("notes").notNull().default(""),
  adminNotes: text("admin_notes").notNull().default(""),
  currency: text("currency").notNull().default("EGP"),
  priceAtBooking: integer("price_at_booking"),
  status: text("status").notNull().default("new"),
  referralCode: text("referral_code").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
