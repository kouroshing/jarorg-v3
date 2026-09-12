"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission } from "@/lib/auth/adminAccess";

const nameSchema = z
  .string()
  .trim()
  .min(1, "نام الزامی است.")
  .max(120);

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function updateUserDisplayName(
  name: string
): Promise<UpdateProfileResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "لطفاً وارد شوید." };
  }

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "نام نامعتبر است.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { displayName: parsed.data },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { success: false, error: "ذخیره ناموفق بود." };
  }
}

export async function updateUserStorageLimit(
  limitBytes: number
): Promise<UpdateProfileResult> {
  const session = await getSession();
  try {
    await requireAdminPermission(session, "settings_manage");
  } catch {
    return { success: false, error: "Unauthorized" };
  }
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { storageLimit: limitBytes },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { success: false, error: "به‌روزرسانی ناموفق بود." };
  }
}
