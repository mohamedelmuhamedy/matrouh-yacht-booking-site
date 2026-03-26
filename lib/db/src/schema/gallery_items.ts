import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const galleryItems = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("image"),
  caption: text("caption").notNull().default(""),
  size: text("size").notNull().default("normal"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, createdAt: true });
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type GalleryItem = typeof galleryItems.$inferSelect;
