import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { adminUsers } from "./admin_users";

export const adminUserPermissions = pgTable(
  "admin_user_permissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userPermissionUnique: uniqueIndex("admin_user_permissions_user_permission_unique")
      .on(table.userId, table.permission),
  }),
);

export const insertAdminUserPermissionSchema = createInsertSchema(adminUserPermissions).omit({ id: true, createdAt: true });
export type InsertAdminUserPermission = z.infer<typeof insertAdminUserPermissionSchema>;
export type AdminUserPermission = typeof adminUserPermissions.$inferSelect;
