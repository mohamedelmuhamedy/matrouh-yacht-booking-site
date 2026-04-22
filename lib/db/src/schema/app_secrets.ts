import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const appSecrets = pgTable("app_secrets", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSecret = typeof appSecrets.$inferSelect;
