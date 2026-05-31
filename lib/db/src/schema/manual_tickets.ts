import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manualTickets = pgTable("manual_tickets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  packageId: integer("package_id"),
  packageName: text("package_name").notNull().default(""),
  packageNameAr: text("package_name_ar").notNull().default(""),
  date: text("date").notNull(),
  passengerCount: integer("passenger_count").notNull().default(1),
  pickupLocation: text("pickup_location").notNull().default(""),
  pickupLocationAr: text("pickup_location_ar").notNull().default(""),
  meetingTime: text("meeting_time").notNull().default(""),
  supervisorName: text("supervisor_name").notNull().default(""),
  supervisorPhone: text("supervisor_phone").notNull().default(""),
  remainingBalance: text("remaining_balance").notNull().default(""),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes").notNull().default(""),
  ticketToken: text("ticket_token").unique(),
  ticketNumber: text("ticket_number").unique(),
  ticketIssuedAt: timestamp("ticket_issued_at"),
  ticketUsedAt: timestamp("ticket_used_at"),
  ticketUsedBy: text("ticket_used_by"),
  createdByAdminId: integer("created_by_admin_id"),
  createdByAdminUsername: text("created_by_admin_username").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertManualTicketSchema = createInsertSchema(manualTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManualTicket = z.infer<typeof insertManualTicketSchema>;
export type ManualTicket = typeof manualTickets.$inferSelect;
