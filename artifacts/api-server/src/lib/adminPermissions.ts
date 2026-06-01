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
  { key: "dashboard.view", label: "لوحة التحكم", group: "عام" },
  { key: "stats.view", label: "الإحصائيات", group: "عام" },
  { key: "calendar.view", label: "تقويم الحجوزات", group: "عام" },
  { key: "bookings.view", label: "عرض الحجوزات", group: "الحجوزات" },
  { key: "bookings.manage", label: "إدارة الحجوزات والتذاكر", group: "الحجوزات" },
  { key: "bookings.delete", label: "حذف الحجوزات", group: "الحجوزات" },
  { key: "manual_tickets.view", label: "عرض التذاكر اليدوية", group: "التذاكر اليدوية" },
  { key: "manual_tickets.create", label: "إنشاء تذاكر يدوية", group: "التذاكر اليدوية" },
  { key: "manual_tickets.edit", label: "تعديل التذاكر اليدوية", group: "التذاكر اليدوية" },
  { key: "manual_tickets.delete", label: "حذف التذاكر اليدوية", group: "التذاكر اليدوية" },
  { key: "trips.manage", label: "الباقات / الرحلات", group: "المحتوى" },
  { key: "categories.manage", label: "الفئات", group: "المحتوى" },
  { key: "services.manage", label: "الخدمات", group: "المحتوى" },
  { key: "why_us.manage", label: "مميزاتنا", group: "المحتوى" },
  { key: "capacity.manage", label: "السعة", group: "العمليات" },
  { key: "waiting_list.manage", label: "قائمة الانتظار", group: "العمليات" },
  { key: "abandoned_carts.manage", label: "العربات المتروكة", group: "العمليات" },
  { key: "customer_photos.manage", label: "صور العملاء", group: "العمليات" },
  { key: "scanner.use", label: "ماسح التذاكر", group: "العمليات" },
  { key: "promo_codes.manage", label: "أكواد الخصم", group: "التسويق" },
  { key: "rewards.manage", label: "المكافآت والإحالات", group: "التسويق" },
  { key: "gallery.manage", label: "المعرض", group: "المحتوى" },
  { key: "reviews.manage", label: "الآراء والتقييمات", group: "المحتوى" },
  { key: "testimonials.manage", label: "آراء العملاء", group: "المحتوى" },
  { key: "hero_slides.manage", label: "خلفية الهيرو", group: "المحتوى" },
  { key: "share_card.manage", label: "بطاقة المشاركة", group: "التسويق" },
  { key: "push.manage", label: "الإشعارات", group: "الإعدادات" },
  { key: "settings.manage", label: "الإعدادات", group: "الإعدادات" },
  { key: "users.manage", label: "إدارة المستخدمين والصلاحيات", group: "الإعدادات" },
  { key: "audit.view", label: "سجل التدقيق", group: "الإعدادات" },
  { key: "media.upload", label: "رفع الصور والملفات", group: "الإعدادات" },
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
