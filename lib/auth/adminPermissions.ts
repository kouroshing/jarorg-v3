/**
 * Admin RBAC — permission allowlist + role presets.
 * Never accept permission strings from the client without filtering through
 * `sanitizePermissions`. Super-admin is phone-based and bypasses the table.
 */

export const ADMIN_PERMISSIONS = [
  "dashboard",
  "orders_manage",
  "specialists_review",
  "finance_manage",
  "messages_send",
  "stats_view",
  "settings_manage",
  "admins_manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: "داشبورد کار امروز",
  orders_manage: "تایید و مدیریت سفارش‌ها",
  specialists_review: "بررسی متخصص و نمونه‌کار",
  finance_manage: "تسویه و مالی",
  messages_send: "ارسال پیام جارچی",
  stats_view: "مشاهده آمار",
  settings_manage: "CRUD کامل / تنظیمات پلتفرم",
  admins_manage: "مدیریت ادمین‌ها",
};

export const ADMIN_ROLE_KEYS = ["OPS", "FINANCE", "SUPPORT", "CUSTOM"] as const;
export type AdminRoleKey = (typeof ADMIN_ROLE_KEYS)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRoleKey, string> = {
  OPS: "عملیات (سفارش + متخصص)",
  FINANCE: "مالی و تسویه",
  SUPPORT: "پشتیبانی",
  CUSTOM: "سفارشی",
};

/** Server-side presets — only these expand to permissions for named roles. */
export const ADMIN_ROLE_PRESETS: Record<Exclude<AdminRoleKey, "CUSTOM">, readonly AdminPermission[]> = {
  OPS: [
    "dashboard",
    "orders_manage",
    "specialists_review",
    "messages_send",
    "stats_view",
  ],
  FINANCE: ["dashboard", "finance_manage", "stats_view", "orders_manage"],
  SUPPORT: ["dashboard", "messages_send", "stats_view", "orders_manage"],
};

export const ALL_ADMIN_PERMISSIONS: readonly AdminPermission[] = ADMIN_PERMISSIONS;

export function isAdminPermission(value: unknown): value is AdminPermission {
  return (
    typeof value === "string" &&
    (ADMIN_PERMISSIONS as readonly string[]).includes(value)
  );
}

export function isAdminRoleKey(value: unknown): value is AdminRoleKey {
  return typeof value === "string" && (ADMIN_ROLE_KEYS as readonly string[]).includes(value);
}

/** Drop anything not in the allowlist. Dedupes. */
export function sanitizePermissions(input: unknown): AdminPermission[] {
  if (!Array.isArray(input)) return [];
  const out: AdminPermission[] = [];
  for (const item of input) {
    if (isAdminPermission(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export function permissionsForRoleKey(
  roleKey: AdminRoleKey,
  customPermissions?: unknown
): AdminPermission[] {
  if (roleKey === "CUSTOM") {
    return sanitizePermissions(customPermissions);
  }
  return [...ADMIN_ROLE_PRESETS[roleKey]];
}

export function parseStoredPermissions(raw: string | null | undefined): AdminPermission[] {
  if (!raw) return [];
  try {
    return sanitizePermissions(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** NextAdmin model → required permission (deny if missing). */
export const NEXTADMIN_MODEL_PERMISSION: Record<string, AdminPermission> = {
  Order: "orders_manage",
  ProjectInterest: "orders_manage",
  SpecialistProfile: "specialists_review",
  PortfolioItem: "specialists_review",
  WithdrawalRequest: "finance_manage",
  Transaction: "finance_manage",
  Plan: "settings_manage",
  DiscountCode: "settings_manage",
  Course: "settings_manage",
  Purchase: "stats_view",
  GalleryProject: "settings_manage",
  GalleryPhoto: "settings_manage",
  GalleryPurchase: "settings_manage",
  Notification: "messages_send",
  NotificationTemplate: "messages_send",
  PwaSettings: "settings_manage",
  Project: "settings_manage",
  User: "settings_manage",
  AuditLog: "admins_manage",
};

export function permissionForNextAdminModel(model: string): AdminPermission {
  return NEXTADMIN_MODEL_PERMISSION[model] ?? "settings_manage";
}
