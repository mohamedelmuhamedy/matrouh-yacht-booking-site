import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const galleryAlbums = pgTable("gallery_albums", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  isVisible: boolean("is_visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGalleryAlbumSchema = createInsertSchema(galleryAlbums).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGalleryAlbum = z.infer<typeof insertGalleryAlbumSchema>;
export type GalleryAlbum = typeof galleryAlbums.$inferSelect;
