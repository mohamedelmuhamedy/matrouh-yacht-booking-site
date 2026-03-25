import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralRewards = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id").notNull(),
  referralCode: text("referral_code").notNull(),
  bookingId: integer("booking_id"),
  bookingName: text("booking_name").notNull().default(""),
  bookingPackage: text("booking_package").notNull().default(""),
  rewardType: text("reward_type").notNull().default("fixed"),
  rewardValue: text("reward_value").notNull().default("0"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes").notNull().default(""),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;
