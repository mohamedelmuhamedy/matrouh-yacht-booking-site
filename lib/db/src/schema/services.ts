import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("✨"),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  longDescriptionAr: text("long_description_ar").notNull().default(""),
  longDescriptionEn: text("long_description_en").notNull().default(""),
  imageUrl: text("image_url"),
  color: text("color").notNull().default("#00AAFF"),
  featuresAr: jsonb("features_ar").$type<string[]>().notNull().default([]),
  featuresEn: jsonb("features_en").$type<string[]>().notNull().default([]),
  ctaTextAr: text("cta_text_ar").notNull().default("احجز الآن"),
  ctaTextEn: text("cta_text_en").notNull().default("Book Now"),
  ctaLink: text("cta_link").notNull().default("/trips"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
