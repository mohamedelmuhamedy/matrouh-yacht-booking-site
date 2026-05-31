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

export const FALLBACK_PERMISSION_DEFS: PermissionDefinition[] = [
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
  { key: "reviews.manage", label: "تقييمات الرحلات", group: "المحتوى" },
  { key: "testimonials.manage", label: "آراء العملاء", group: "المحتوى" },
  { key: "hero_slides.manage", label: "خلفية الهيرو", group: "المحتوى" },
  { key: "share_card.manage", label: "بطاقة المشاركة", group: "التسويق" },
  { key: "push.manage", label: "الإشعارات", group: "الإعدادات" },
  { key: "settings.manage", label: "الإعدادات", group: "الإعدادات" },
  { key: "users.manage", label: "إدارة المستخدمين والصلاحيات", group: "الإعدادات" },
  { key: "audit.view", label: "سجل التدقيق", group: "الإعدادات" },
  { key: "media.upload", label: "رفع الصور والملفات", group: "الإعدادات" },
];

export function hasPermission(
  user: { isSuperAdmin?: boolean; permissions?: string[] } | null,
  permission?: AdminPermission,
): boolean {
  if (!permission) return true;
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (permission === "users.manage") return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: { isSuperAdmin?: boolean; permissions?: string[] } | null,
  permissions: AdminPermission[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
