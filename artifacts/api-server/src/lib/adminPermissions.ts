import type { Request, Response, NextFunction } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, adminUserPermissions, adminUsers } from "@workspace/db";

export type AdminPermission =
  | "dashboard.view"
  | "stats.view"
  | "calendar.view"
  | "bookings.view"
  | "bookings.manage"
  | "bookings.delete"
  | "manual_tickets.view"
  | "manual_tickets.create"
  | "manual_tickets.edit"
  | "manual_tickets.delete"
  | "payment_gateway.view"
  | "payment_gateway.manage_settings"
  | "payment_gateway.review"
  | "payment_gateway.override"
  | "trips.manage"
  | "categories.manage"
  | "services.manage"
  | "why_us.manage"
  | "capacity.manage"
  | "waiting_list.manage"
  | "abandoned_carts.manage"
  | "customer_photos.manage"
  | "scanner.use"
  | "promo_codes.manage"
  | "rewards.manage"
  | "gallery.manage"
  | "reviews.manage"
  | "testimonials.manage"
  | "hero_slides.manage"
  | "share_card.manage"
  | "push.manage"
  | "settings.manage"
  | "users.manage"
  | "audit.view"
  | "media.upload";

export interface PermissionDefinition {
  key: AdminPermission;
  label: string;
  group: string;
}

export const ADMIN_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: "dashboard.view", label: "Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…", group: "Ø¹Ø§Ù…" },
  { key: "stats.view", label: "Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª", group: "Ø¹Ø§Ù…" },
  { key: "calendar.view", label: "ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª", group: "Ø¹Ø§Ù…" },
  { key: "bookings.view", label: "Ø¹Ø±Ø¶ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª", group: "Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª" },
  { key: "bookings.manage", label: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª ÙˆØ§Ù„ØªØ°Ø§ÙƒØ±", group: "Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª" },
  { key: "bookings.delete", label: "Ø­Ø°Ù Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª", group: "Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª" },
  { key: "manual_tickets.view", label: "Ø¹Ø±Ø¶ Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©", group: "Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" },
  { key: "manual_tickets.create", label: "Ø¥Ù†Ø´Ø§Ø¡ ØªØ°Ø§ÙƒØ± ÙŠØ¯ÙˆÙŠØ©", group: "Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" },
  { key: "manual_tickets.edit", label: "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©", group: "Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" },
  { key: "manual_tickets.delete", label: "Ø­Ø°Ù Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©", group: "Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" },
  { key: "payment_gateway.view", label: "عرض بوابة الدفع", group: "بوابة الدفع" },
  { key: "payment_gateway.manage_settings", label: "إعدادات بوابة الدفع", group: "بوابة الدفع" },
  { key: "payment_gateway.review", label: "مراجعة طلبات الدفع", group: "بوابة الدفع" },
  { key: "payment_gateway.override", label: "تجاوزات الدفع اليدوية", group: "بوابة الدفع" },
  { key: "trips.manage", label: "Ø§Ù„Ø¨Ø§Ù‚Ø§Øª / Ø§Ù„Ø±Ø­Ù„Ø§Øª", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "categories.manage", label: "Ø§Ù„ÙØ¦Ø§Øª", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "services.manage", label: "Ø§Ù„Ø®Ø¯Ù…Ø§Øª", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "why_us.manage", label: "Ù…Ù…ÙŠØ²Ø§ØªÙ†Ø§", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "capacity.manage", label: "Ø§Ù„Ø³Ø¹Ø©", group: "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" },
  { key: "waiting_list.manage", label: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±", group: "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" },
  { key: "abandoned_carts.manage", label: "Ø§Ù„Ø¹Ø±Ø¨Ø§Øª Ø§Ù„Ù…ØªØ±ÙˆÙƒØ©", group: "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" },
  { key: "customer_photos.manage", label: "ØµÙˆØ± Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡", group: "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" },
  { key: "scanner.use", label: "Ù…Ø§Ø³Ø­ Ø§Ù„ØªØ°Ø§ÙƒØ±", group: "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" },
  { key: "promo_codes.manage", label: "Ø£ÙƒÙˆØ§Ø¯ Ø§Ù„Ø®ØµÙ…", group: "Ø§Ù„ØªØ³ÙˆÙŠÙ‚" },
  { key: "rewards.manage", label: "Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª ÙˆØ§Ù„Ø¥Ø­Ø§Ù„Ø§Øª", group: "Ø§Ù„ØªØ³ÙˆÙŠÙ‚" },
  { key: "gallery.manage", label: "Ø§Ù„Ù…Ø¹Ø±Ø¶", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "reviews.manage", label: "Ø§Ù„Ø¢Ø±Ø§Ø¡ ÙˆØ§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "testimonials.manage", label: "Ø¢Ø±Ø§Ø¡ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "hero_slides.manage", label: "Ø®Ù„ÙÙŠØ© Ø§Ù„Ù‡ÙŠØ±Ùˆ", group: "Ø§Ù„Ù…Ø­ØªÙˆÙ‰" },
  { key: "share_card.manage", label: "Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ©", group: "Ø§Ù„ØªØ³ÙˆÙŠÙ‚" },
  { key: "push.manage", label: "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª", group: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" },
  { key: "settings.manage", label: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", group: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" },
  { key: "users.manage", label: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª", group: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" },
  { key: "audit.view", label: "Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚", group: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" },
  { key: "media.upload", label: "Ø±ÙØ¹ Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ù…Ù„ÙØ§Øª", group: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" },
];

export const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_DEFINITIONS.map((p) => p.key);
const ALL_PERMISSION_SET = new Set<string>(ALL_ADMIN_PERMISSIONS);
const SUPER_ONLY_PERMISSIONS = new Set<AdminPermission>(["users.manage"]);

export function sanitizePermissions(input: unknown): AdminPermission[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<AdminPermission>();
  for (const raw of input) {
    const key = String(raw ?? "").trim();
    if (ALL_PERMISSION_SET.has(key)) out.add(key as AdminPermission);
  }
  return [...out];
}

export function sanitizeAssignablePermissions(input: unknown): AdminPermission[] {
  return sanitizePermissions(input).filter((permission) => !SUPER_ONLY_PERMISSIONS.has(permission));
}

export async function getAdminAccess(userId: number): Promise<{
  id: number;
  username: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
} | null> {
  const [user] = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, userId));

  if (!user || !user.isActive) return null;
  const isSuperAdmin = user.role === "super";
  if (isSuperAdmin) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isSuperAdmin: true,
      permissions: [...ALL_ADMIN_PERMISSIONS],
    };
  }

  const rows = await db
    .select({ permission: adminUserPermissions.permission })
    .from(adminUserPermissions)
    .where(eq(adminUserPermissions.userId, userId));

  return {
    id: user.id,
    username: user.username,
    role: user.role || "admin",
    isSuperAdmin: false,
    permissions: sanitizePermissions(rows.map((r) => r.permission)),
  };
}

export async function userHasPermission(userId: number, permission: AdminPermission): Promise<boolean> {
  const access = await getAdminAccess(userId);
  if (!access) return false;
  if (SUPER_ONLY_PERMISSIONS.has(permission)) return access.isSuperAdmin;
  return access.isSuperAdmin || access.permissions.includes(permission);
}

export async function replaceUserPermissions(userId: number, permissions: AdminPermission[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(adminUserPermissions).where(eq(adminUserPermissions.userId, userId));
    if (permissions.length > 0) {
      await tx.insert(adminUserPermissions).values(
        permissions.map((permission) => ({ userId, permission })),
      );
    }
  });
}

function adminPath(req: Request): string {
  const raw = (req.originalUrl || `${req.baseUrl}${req.path}`).split("?")[0] || "";
  return (raw.replace(/^\/api(?=\/|$)/, "").replace(/\/+$/, "") || "/");
}

function permissionForAdminRequest(req: Request): AdminPermission | null {
  const path = adminPath(req);
  const method = req.method.toUpperCase();

  if (path === "/admin/whoami" || path === "/admin/permissions") return null;

  if (path.startsWith("/admin/users")) return "users.manage";
  if (path === "/admin/bookings/new-count" || path === "/admin/bookings/export/csv") return "bookings.view";
  if (path === "/admin/bookings") return "bookings.view";
  if (/^\/admin\/bookings\/\d+$/.test(path) && method === "DELETE") return "bookings.delete";
  if (path.startsWith("/admin/bookings/")) return "bookings.manage";
  if (path.startsWith("/admin/manual-tickets")) {
    if (method === "GET") return "manual_tickets.view";
    if (path === "/admin/manual-tickets" && method === "POST") return "manual_tickets.create";
    if (method === "DELETE" || path.endsWith("/delete")) return "manual_tickets.delete";
    return "manual_tickets.edit";
  }
  if (path.startsWith("/admin/payment-gateway/settings")) {
    return method === "GET" ? "payment_gateway.view" : "payment_gateway.manage_settings";
  }
  if (path.startsWith("/admin/payment-requests")) {
    if (path.endsWith("/pending-count") || method === "GET") return "payment_gateway.view";
    if (path.endsWith("/override")) return "payment_gateway.override";
    return "payment_gateway.review";
  }
  if (path.startsWith("/admin/tickets/")) return path.endsWith("/use") ? "scanner.use" : "bookings.manage";
  if (path.startsWith("/admin/packages")) return "trips.manage";
  if (path.startsWith("/admin/categories")) return "categories.manage";
  if (path.startsWith("/admin/services")) return "services.manage";
  if (path.startsWith("/admin/why-us")) return "why_us.manage";
  if (path.startsWith("/admin/capacity")) return "capacity.manage";
  if (path.startsWith("/admin/waitlist")) return "waiting_list.manage";
  if (path.startsWith("/admin/abandoned-carts")) return "abandoned_carts.manage";
  if (path.startsWith("/admin/customer-photos")) return "customer_photos.manage";
  if (path.startsWith("/admin/promo-codes")) return "promo_codes.manage";
  if (path.startsWith("/admin/reward") || path.startsWith("/admin/referral")) return "rewards.manage";
  if (path.startsWith("/admin/gallery")) return "gallery.manage";
  if (path.startsWith("/admin/reviews")) return "reviews.manage";
  if (path.startsWith("/admin/testimonials")) return "testimonials.manage";
  if (path.startsWith("/admin/hero-slides")) return "hero_slides.manage";
  if (path.startsWith("/admin/share")) return "share_card.manage";
  if (path.startsWith("/admin/push")) return "push.manage";
  if (path.startsWith("/admin/settings") || path.startsWith("/admin/ai/free-models")) return "settings.manage";
  if (path.startsWith("/admin/audit")) return "audit.view";
  if (path.startsWith("/admin/storage")) return "media.upload";

  return null;
}

export function requirePermission(permission: AdminPermission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = (req as unknown as { admin?: { userId?: number } }).admin;
      if (!admin?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const ok = await userHasPermission(admin.userId, permission);
      if (!ok) {
        res.status(403).json({ error: "Insufficient permissions", requiredPermission: permission });
        return;
      }
      next();
    } catch (err) {
      console.error("[permissions] check failed:", err);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

export async function requireAdminApiPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  const required = permissionForAdminRequest(req);
  if (!required) {
    next();
    return;
  }
  return requirePermission(required)(req, res, next);
}

export async function assertUniqueEmail(email: string, excludeUserId?: number): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return true;
  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(excludeUserId
      ? and(eq(adminUsers.email, normalized), ne(adminUsers.id, excludeUserId))
      : eq(adminUsers.email, normalized));
  return rows.length === 0;
}
