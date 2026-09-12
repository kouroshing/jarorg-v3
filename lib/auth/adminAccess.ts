import "server-only";

import type { SessionPayload } from "./session";
import { normalizePhoneDigits } from "./phone";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { isSuperAdminPhone } from "./admin";
import {
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRoleKey,
  parseStoredPermissions,
  permissionForNextAdminModel,
} from "./adminPermissions";

export type AdminAccess = {
  phone: string;
  userId: string;
  isSuper: boolean;
  roleKey: "SUPER" | AdminRoleKey;
  permissions: ReadonlySet<AdminPermission>;
  label: string | null;
  staffId: string | null;
};

export function hasAdminPermission(
  access: AdminAccess | null | undefined,
  permission: AdminPermission
): boolean {
  if (!access) return false;
  if (access.isSuper) return true;
  return access.permissions.has(permission);
}

export function hasAnyAdminPermission(
  access: AdminAccess | null | undefined,
  permissions: readonly AdminPermission[]
): boolean {
  if (!access) return false;
  if (access.isSuper) return true;
  return permissions.some((p) => access.permissions.has(p));
}

/**
 * Authoritative admin resolution — always hits DB for staff rows.
 * Super-admin phone never depends on AdminStaff.
 */
export async function resolveAdminAccess(
  session: SessionPayload | null
): Promise<AdminAccess | null> {
  if (!session?.userId || !session.phone) return null;

  const phone = normalizePhoneDigits(session.phone);
  if (!phone) return null;

  if (isSuperAdminPhone(phone)) {
    return {
      phone,
      userId: session.userId,
      isSuper: true,
      roleKey: "SUPER",
      permissions: new Set(ALL_ADMIN_PERMISSIONS),
      label: "سوپرادمین",
      staffId: null,
    };
  }

  await ensurePrismaSchemaReady();

  const staff = await prisma.adminStaff.findUnique({
    where: { phone },
  });

  if (!staff || !staff.isActive) {
    return null;
  }

  const permissions = parseStoredPermissions(staff.permissions);
  if (permissions.length === 0) {
    return null;
  }

  return {
    phone,
    userId: session.userId,
    isSuper: false,
    roleKey: (staff.roleKey as AdminRoleKey) || "CUSTOM",
    permissions: new Set(permissions),
    label: staff.label,
    staffId: staff.id,
  };
}

/** Used at login to decide session.role. */
export async function resolveAdminAccessByPhone(
  phoneDigits: string
): Promise<{ isAdmin: boolean; isSuper: boolean } | null> {
  const phone = normalizePhoneDigits(phoneDigits);
  if (!phone) return null;

  if (isSuperAdminPhone(phone)) {
    return { isAdmin: true, isSuper: true };
  }

  await ensurePrismaSchemaReady();
  const staff = await prisma.adminStaff.findUnique({
    where: { phone },
    select: { isActive: true, permissions: true },
  });
  if (!staff?.isActive) return null;
  const perms = parseStoredPermissions(staff.permissions);
  if (perms.length === 0) return null;
  return { isAdmin: true, isSuper: false };
}

export async function requireAdminAccess(
  session: SessionPayload | null
): Promise<AdminAccess> {
  const access = await resolveAdminAccess(session);
  if (!access) {
    throw new AdminAuthError("دسترسی ادمین ندارید.");
  }
  return access;
}

export async function requireAdminPermission(
  session: SessionPayload | null,
  permission: AdminPermission
): Promise<AdminAccess> {
  const access = await requireAdminAccess(session);
  if (!hasAdminPermission(access, permission)) {
    throw new AdminAuthError("مجوز لازم برای این عملیات را ندارید.");
  }
  return access;
}

export function canAccessNextAdminModel(
  access: AdminAccess,
  model: string
): boolean {
  if (access.isSuper) return true;
  return hasAdminPermission(access, permissionForNextAdminModel(model));
}

export class AdminAuthError extends Error {
  readonly code = "ADMIN_AUTH";
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function adminAuthFailure(
  error: unknown
): { success: false; error: string } {
  if (error instanceof AdminAuthError) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "خطای دسترسی ادمین." };
}
