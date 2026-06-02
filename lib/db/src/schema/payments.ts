import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    provider: text("provider").notNull().default("manual_transfer"),
    labelAr: text("label_ar").notNull(),
    labelEn: text("label_en").notNull().default(""),
    instructionsAr: text("instructions_ar").notNull().default(""),
    instructionsEn: text("instructions_en").notNull().default(""),
    accountIdentifier: text("account_identifier").notNull().default(""),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index("payment_methods_active_idx").on(table.active),
  }),
);

export const packagePaymentSettings = pgTable(
  "package_payment_settings",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id").notNull().unique(),
    enabled: boolean("enabled").notNull().default(false),
    methodKeys: text("method_keys").array().notNull().default(sql`ARRAY[]::text[]`),
    depositPercent: integer("deposit_percent").notNull().default(100),
    expirationHours: integer("expiration_hours"),
    ticketIssuanceMode: text("ticket_issuance_mode").notNull().default("manual"),
    instructionsAr: text("instructions_ar").notNull().default(""),
    instructionsEn: text("instructions_en").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    packageIdx: index("package_payment_settings_package_idx").on(table.packageId),
    enabledIdx: index("package_payment_settings_enabled_idx").on(table.enabled),
  }),
);

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: integer("booking_id").notNull(),
    packageId: integer("package_id"),
    portalToken: text("portal_token").notNull().unique(),
    provider: text("provider").notNull().default("manual_transfer"),
    providerPaymentId: text("provider_payment_id").notNull().default(""),
    providerStatus: text("provider_status").notNull().default(""),
    providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    methodKey: text("method_key").notNull().default(""),
    currency: text("currency").notNull().default("EGP"),
    priceSnapshot: integer("price_snapshot").notNull().default(0),
    discountSnapshot: integer("discount_snapshot").notNull().default(0),
    finalAmountSnapshot: integer("final_amount_snapshot").notNull().default(0),
    depositPercentSnapshot: integer("deposit_percent_snapshot").notNull().default(100),
    expectedDepositAmount: integer("expected_deposit_amount").notNull().default(0),
    paymentInstructionsSnapshot: text("payment_instructions_snapshot").notNull().default(""),
    expiresAt: timestamp("expires_at"),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByAdminId: integer("reviewed_by_admin_id"),
    reviewedByAdminUsername: text("reviewed_by_admin_username").notNull().default(""),
    adminNote: text("admin_note").notNull().default(""),
    customerNote: text("customer_note").notNull().default(""),
    activeAttempt: integer("active_attempt").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    bookingIdx: index("payment_requests_booking_idx").on(table.bookingId),
    statusIdx: index("payment_requests_status_idx").on(table.status),
    expiresAtIdx: index("payment_requests_expires_at_idx").on(table.expiresAt),
    createdAtIdx: index("payment_requests_created_at_idx").on(table.createdAt),
  }),
);

export const paymentRequestAttachments = pgTable(
  "payment_request_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentRequestId: uuid("payment_request_id").notNull(),
    attempt: integer("attempt").notNull().default(1),
    objectPath: text("object_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    originalFilename: text("original_filename").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("payment_request_attachments_request_idx").on(table.paymentRequestId),
  }),
);

export const paymentRequestEvents = pgTable(
  "payment_request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentRequestId: uuid("payment_request_id"),
    bookingId: integer("booking_id"),
    action: text("action").notNull(),
    actorType: text("actor_type").notNull().default("system"),
    actorId: integer("actor_id"),
    actorName: text("actor_name").notNull().default(""),
    note: text("note").notNull().default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("payment_request_events_request_idx").on(table.paymentRequestId),
    bookingIdx: index("payment_request_events_booking_idx").on(table.bookingId),
  }),
);

export const paymentNotifications = pgTable(
  "payment_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentRequestId: uuid("payment_request_id"),
    bookingId: integer("booking_id"),
    type: text("type").notNull(),
    channel: text("channel").notNull().default("internal"),
    status: text("status").notNull().default("pending"),
    recipient: text("recipient").notNull().default(""),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
  },
  (table) => ({
    statusIdx: index("payment_notifications_status_idx").on(table.status),
    bookingIdx: index("payment_notifications_booking_idx").on(table.bookingId),
  }),
);

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackagePaymentSettingSchema = createInsertSchema(packagePaymentSettings).omit({ id: true, createdAt: true, updatedAt: true });

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type PackagePaymentSetting = typeof packagePaymentSettings.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type PaymentRequestAttachment = typeof paymentRequestAttachments.$inferSelect;
export type PaymentRequestEvent = typeof paymentRequestEvents.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertPackagePaymentSetting = z.infer<typeof insertPackagePaymentSettingSchema>;
