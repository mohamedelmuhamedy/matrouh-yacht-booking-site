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
  ticketToken: text("ticket_token").unique(),
  ticketNumber: text("ticket_number").unique(),
  ticketIssuedAt: timestamp("ticket_issued_at"),
  ticketUsedAt: timestamp("ticket_used_at"),
  ticketUsedBy: text("ticket_used_by"),
  reminderSentAt: timestamp("reminder_sent_at"),
  meetingTime: text("meeting_time").notNull().default(""),
  pickupLocation: text("pickup_location").notNull().default(""),
  pickupLocationAr: text("pickup_location_ar").notNull().default(""),
  supervisorName: text("supervisor_name").notNull().default(""),
  supervisorPhone: text("supervisor_phone").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
