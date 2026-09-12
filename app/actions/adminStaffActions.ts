"use server";

import { revalidatePath } from "next/cache";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isSuperAdminPhone } from "@/lib/auth/admin";
import {
  adminAuthFailure,
  requireAdminPermission,
} from "@/lib/auth/adminAccess";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRoleKey,
  isAdminRoleKey,
  parseStoredPermissions,
  permissionsForRoleKey,
  sanitizePermissions,
} from "@/lib/auth/adminPermissions";
import { normalizePhoneDigits, sanitizeIranMobileInput } from "@/lib/auth/phone";

export type StaffActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

function normalizeStaffPhone(raw: string): string | null {
  const sanitized = sanitizeIranMobileInput(raw.trim());
  return normalizePhoneDigits(sanitized);
}

export async function listAdminStaffAction() {
  try {
    const session = await getSession();
    await requireAdminPermission(session, "admins_manage");
    await ensurePrismaSchemaReady();

    const rows = await prisma.adminStaff.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return {
      success: true as const,
      staff: rows.map((r) => ({
        id: r.id,
        phone: r.phone,
        label: r.label,
        roleKey: r.roleKey,
        permissions: parseStoredPermissions(r.permissions),
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        createdByPhone: r.createdByPhone,
        note: r.note,
      })),
      permissionCatalog: ADMIN_PERMISSIONS.map((key) => ({
        key,
      })),
    };
  } catch (error) {
    return { ...adminAuthFailure(error), staff: [], permissionCatalog: [] };
  }
}

export async function upsertAdminStaffAction(input: {
  phone: string;
  label?: string;
  roleKey: string;
  permissions?: string[];
  note?: string;
  isActive?: boolean;
}): Promise<StaffActionResult> {
  try {
    const session = await getSession();
    const access = await requireAdminPermission(session, "admins_manage");
    await ensurePrismaSchemaReady();

    const phone = normalizeStaffPhone(input.phone);
    if (!phone || phone.length < 12) {
      return { success: false, error: "شماره موبایل معتبر نیست." };
    }

    // Never put the super phone into staff with reduced rights — confusing & risky.
    if (isSuperAdminPhone(phone)) {
      return {
        success: false,
        error: "شماره سوپرادمین از طریق متغیر محیطی مدیریت می‌شود و در لیست کارکنان ثبت نمی‌شود.",
      };
    }

    if (!isAdminRoleKey(input.roleKey)) {
      return { success: false, error: "نقش نامعتبر است." };
    }

    const roleKey = input.roleKey as AdminRoleKey;
    const permissions = permissionsForRoleKey(roleKey, input.permissions);
    if (permissions.length === 0) {
      return { success: false, error: "حداقل یک مجوز لازم است." };
    }

    // Staff cannot grant admins_manage unless actor is super (already required).
    // Extra: non-super with admins_manage shouldn't exist; still strip if somehow.
    const safePerms: AdminPermission[] = access.isSuper
      ? permissions
      : permissions.filter((p) => p !== "admins_manage");

    if (safePerms.length === 0) {
      return { success: false, error: "مجوزهای باقی‌مانده معتبر نیست." };
    }

    const label = input.label?.trim() || null;
    const note = input.note?.trim() || null;
    const isActive = input.isActive !== false;

    await prisma.adminStaff.upsert({
      where: { phone },
      create: {
        phone,
        label,
        roleKey,
        permissions: JSON.stringify(safePerms),
        isActive,
        createdByPhone: access.phone,
        note,
      },
      update: {
        label,
        roleKey,
        permissions: JSON.stringify(safePerms),
        isActive,
        note,
      },
    });

    // Align User.role so UI badges stay consistent — never create user without OTP.
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, role: true },
    });
    if (existingUser) {
      if (isActive && existingUser.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: "ADMIN" },
        });
      }
      if (!isActive && existingUser.role === "ADMIN") {
        const specialist = await prisma.specialistProfile.findUnique({
          where: { userId: existingUser.id },
          select: { id: true },
        });
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: specialist ? "SPECIALIST" : "USER" },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: access.phone,
        action: isActive ? "ADMIN_STAFF_UPSERT" : "ADMIN_STAFF_DEACTIVATE",
        targetModel: "AdminStaff",
        targetId: phone,
        note: `${roleKey}:${safePerms.join(",")}`,
      },
    });

    revalidatePath("/admin/staff");
    revalidatePath("/admin");

    return {
      success: true,
      message: isActive
        ? "ادمین ذخیره شد. برای اعمال کامل، یک‌بار از حساب خارج و دوباره با OTP وارد شود."
        : "دسترسی ادمین غیرفعال شد.",
    };
  } catch (error) {
    return adminAuthFailure(error);
  }
}

export async function deactivateAdminStaffAction(
  staffId: string
): Promise<StaffActionResult> {
  try {
    const session = await getSession();
    const access = await requireAdminPermission(session, "admins_manage");
    await ensurePrismaSchemaReady();

    const id = typeof staffId === "string" ? staffId.trim() : "";
    if (!id) return { success: false, error: "شناسه نامعتبر است." };

    const row = await prisma.adminStaff.findUnique({ where: { id } });
    if (!row) return { success: false, error: "رکورد یافت نشد." };

    if (row.phone === access.phone) {
      return { success: false, error: "نمی‌توانید دسترسی خودتان را غیرفعال کنید." };
    }

    await prisma.adminStaff.update({
      where: { id },
      data: { isActive: false },
    });

    const user = await prisma.user.findUnique({
      where: { phone: row.phone },
      select: { id: true, role: true, specialistProfile: { select: { id: true } } },
    });
    if (user?.role === "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: user.specialistProfile ? "SPECIALIST" : "USER" },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: access.phone,
        action: "ADMIN_STAFF_DEACTIVATE",
        targetModel: "AdminStaff",
        targetId: row.id,
        note: row.phone,
      },
    });

    revalidatePath("/admin/staff");
    return { success: true, message: "دسترسی غیرفعال شد." };
  } catch (error) {
    return adminAuthFailure(error);
  }
}

/** Sanitize helper exported for UI validation mirror — server still re-sanitizes. */
export async function previewPermissionsAction(
  roleKey: string,
  permissions?: string[]
): Promise<{ success: true; permissions: AdminPermission[] } | { success: false; error: string }> {
  try {
    const session = await getSession();
    await requireAdminPermission(session, "admins_manage");
    if (!isAdminRoleKey(roleKey)) {
      return { success: false, error: "نقش نامعتبر" };
    }
    return {
      success: true,
      permissions: permissionsForRoleKey(roleKey, sanitizePermissions(permissions ?? [])),
    };
  } catch (error) {
    return adminAuthFailure(error);
  }
}
