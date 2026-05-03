import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const aiVisitorQuota = pgTable(
  "ai_visitor_quota",
  {
    visitorKey: text("visitor_key").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.visitorKey, t.day] }),
  }),
);

export type AiVisitorQuotaRow = typeof aiVisitorQuota.$inferSelect;
