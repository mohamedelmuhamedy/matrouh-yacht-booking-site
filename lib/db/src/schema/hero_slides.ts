import { pgTable, serial, text, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const heroSlides = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  type: text("type").notNull().default("image"),
  duration: integer("duration").notNull().default(6),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  videoStart: doublePrecision("video_start").default(0),
  videoEnd: doublePrecision("video_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHeroSlideSchema = createInsertSchema(heroSlides).omit({ id: true, createdAt: true });
export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;
export type HeroSlide = typeof heroSlides.$inferSelect;
