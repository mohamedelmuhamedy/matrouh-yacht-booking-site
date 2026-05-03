import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    discountType: text("discount_type").notNull().default("percent"),
    discountValue: integer("discount_value").notNull().default(0),
    maxUses: integer("max_uses").notNull().default(0),
    usedCount: integer("used_count").notNull().default(0),
    minBookingValue: integer("min_booking_value").notNull().default(0),
    packageId: integer("package_id"),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    active: boolean("active").notNull().default(true),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: index("promo_codes_code_idx").on(t.code),
    activeIdx: index("promo_codes_active_idx").on(t.active),
  }),
);

export type PromoCode = typeof promoCodes.$inferSelect;
