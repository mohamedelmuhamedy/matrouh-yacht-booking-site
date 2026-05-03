import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    adminUsername: text("admin_username").notNull().default(""),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata"),
    ip: text("ip").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("admin_audit_log_created_at_idx").on(t.createdAt),
    entityIdx: index("admin_audit_log_entity_idx").on(t.entity, t.entityId),
  }),
);

export type AdminAuditLogRow = typeof adminAuditLog.$inferSelect;
