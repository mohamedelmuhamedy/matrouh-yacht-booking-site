import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const qrScans = pgTable(
  "qr_scans",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default(""),
    target: text("target").notNull().default("card"),
    userAgent: text("user_agent").notNull().default(""),
    referer: text("referer").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("qr_scans_created_at_idx").on(t.createdAt),
    sourceIdx: index("qr_scans_source_idx").on(t.source),
  }),
);

export type QrScan = typeof qrScans.$inferSelect;
export type InsertQrScan = typeof qrScans.$inferInsert;
