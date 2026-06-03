import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    visibility: text("visibility").notNull().default("public"),
    category: text("category").notNull().default("general"),
    bucket: text("bucket").notNull().default(""),
    objectKey: text("object_key").notNull().default(""),
    objectPath: text("object_path").notNull().default(""),
    publicUrl: text("public_url").notNull().default(""),
    deliveryUrl: text("delivery_url").notNull().default(""),
    secureUrl: text("secure_url").notNull().default(""),
    resourceType: text("resource_type").notNull().default(""),
    contentType: text("content_type").notNull().default(""),
    sizeBytes: integer("size_bytes").notNull().default(0),
    checksum: text("checksum").notNull().default(""),
    originalFilename: text("original_filename").notNull().default(""),
    ownerType: text("owner_type").notNull().default(""),
    ownerId: text("owner_id").notNull().default(""),
    status: text("status").notNull().default("active"),
    migrationStatus: text("migration_status").notNull().default("native"),
    legacyUrl: text("legacy_url").notNull().default(""),
    legacyObjectPath: text("legacy_object_path").notNull().default(""),
    providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerObjectIdx: index("media_assets_provider_object_idx").on(table.provider, table.objectKey),
    categoryIdx: index("media_assets_category_idx").on(table.category),
    visibilityIdx: index("media_assets_visibility_idx").on(table.visibility),
    statusIdx: index("media_assets_status_idx").on(table.status),
    migrationStatusIdx: index("media_assets_migration_status_idx").on(table.migrationStatus),
    legacyUrlIdx: index("media_assets_legacy_url_idx").on(table.legacyUrl),
    legacyObjectPathIdx: index("media_assets_legacy_object_path_idx").on(table.legacyObjectPath),
    createdAtIdx: index("media_assets_created_at_idx").on(table.createdAt),
  }),
);

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
