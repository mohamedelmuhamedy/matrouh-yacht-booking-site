import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    rating: integer("rating").notNull(),
    reviewText: text("review_text").notNull(),
    photos: text("photos").array().notNull().default(sql`ARRAY[]::text[]`),
    status: reviewStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("reviews_status_idx").on(table.status),
    createdAtIdx: index("reviews_created_at_idx").on(table.createdAt),
  }),
);

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
