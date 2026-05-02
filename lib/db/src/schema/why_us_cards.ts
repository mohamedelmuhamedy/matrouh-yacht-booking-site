import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export type WhyUsBullet = {
  icon: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
};

export type WhyUsStat = {
  icon: string;
  value: string;
  labelAr: string;
  labelEn: string;
};

export const whyUsCards = pgTable("why_us_cards", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("✨"),
  color: text("color").notNull().default("#00AAFF"),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull().default(""),
  shortDescAr: text("short_desc_ar").notNull().default(""),
  shortDescEn: text("short_desc_en").notNull().default(""),
  heroImageUrl: text("hero_image_url"),
  accentImageUrl: text("accent_image_url"),
  introAr: text("intro_ar").notNull().default(""),
  introEn: text("intro_en").notNull().default(""),
  bodyAr: text("body_ar").notNull().default(""),
  bodyEn: text("body_en").notNull().default(""),
  bullets: jsonb("bullets").$type<WhyUsBullet[]>().notNull().default([]),
  stats: jsonb("stats").$type<WhyUsStat[]>().notNull().default([]),
  galleryImages: jsonb("gallery_images").$type<string[]>().notNull().default([]),
  ctaTextAr: text("cta_text_ar").notNull().default("احجز رحلتك الآن"),
  ctaTextEn: text("cta_text_en").notNull().default("Book Your Trip Now"),
  ctaLink: text("cta_link").notNull().default("/trips"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WhyUsCard = typeof whyUsCards.$inferSelect;
export type InsertWhyUsCard = typeof whyUsCards.$inferInsert;
