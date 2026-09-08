"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import xss from "xss";

export async function createDiscount(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر کل امکان ثبت کد تخفیف را دارد." };
    }

    const code = xss(formData.get("code") as string)?.toUpperCase()?.trim();
    const discountPercentStr = formData.get("discountPercent") as string;
    const maxAmountStr = formData.get("maxAmount") as string | null;
    const targetPlan = formData.get("targetPlan") as string | null;
    const targetPlanId = formData.get("targetPlanId") as string | null;
    const targetPhone = formData.get("targetPhone") as string | null;
    const durationMonthsStr = formData.get("durationMonths") as string | null;
    const maxUsageStr = formData.get("maxUsage") as string;
    const expiresAtStr = formData.get("expiresAt") as string | null;

    if (!code || !discountPercentStr || !maxUsageStr) {
      return { success: false, error: "لطفاً تمامی فیلدهای الزامی را پر کنید." };
    }

    const discountPercent = parseInt(discountPercentStr, 10);
    const maxUsage = parseInt(maxUsageStr, 10);
    const maxAmount = maxAmountStr && maxAmountStr.trim() !== "" ? parseInt(maxAmountStr, 10) : null;
    const durationMonths = durationMonthsStr ? parseInt(durationMonthsStr, 10) : null;
    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

    if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return { success: false, error: "درصد تخفیف نامعتبر است." };
    }
    if (isNaN(maxUsage) || maxUsage <= 0) {
      return { success: false, error: "ظرفیت استفاده نامعتبر است." };
    }

    // Check if code already exists
    const existing = await prisma.discountCode.findUnique({
      where: { code },
    });

    if (existing) {
      return { success: false, error: "این کد تخفیف قبلاً ثبت شده است." };
    }

    await prisma.discountCode.create({
      data: {
        code,
        discountPercent,
        maxAmount: maxAmount && !isNaN(maxAmount) ? maxAmount : null,
        targetPlan: targetPlan ? targetPlan : null,
        targetPlanId: targetPlanId ? targetPlanId : null,
        targetPhone: targetPhone ? targetPhone.trim() : null,
        durationMonths,
        maxUsage,
        expiresAt,
        isActive: true,
      },
    });

    revalidatePath("/admin/discounts");
    return { success: true };
  } catch (error) {
    console.error("Error creating discount:", error);
    return { success: false, error: "خطای سرور در ثبت کد تخفیف." };
  }
}

export async function getAllDiscounts() {
  try {
    const session = await getSession();
    if (!session || !isAdminSession(session)) {
      throw new Error("Unauthorized");
    }

    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: discounts };
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return { success: false, error: "خطا در دریافت لیست کدهای تخفیف." };
  }
}

export async function toggleDiscountStatus(id: string, currentStatus: boolean) {
  try {
    const session = await getSession();
    if (!session || !isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز" };
    }

    await prisma.discountCode.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/admin/discounts");
    return { success: true };
  } catch (error) {
    console.error("Error toggling discount:", error);
    return { success: false, error: "خطا در تغییر وضعیت کد تخفیف." };
  }
}

// ---------------------------------------------------------------------------
// Client-facing: Validate a discount code against business rules
// ---------------------------------------------------------------------------
export async function validateDiscountCode(
  code: string,
  planType: string,
  months: number
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const normalised = code.toUpperCase().trim();
    if (!normalised) {
      return { success: false, error: "لطفاً کد تخفیف را وارد کنید." };
    }

    // 1. Existence & active check
    const discount = await prisma.discountCode.findUnique({
      where: { code: normalised },
    });

    if (!discount || !discount.isActive) {
      return { success: false, error: "کد تخفیف نامعتبر است." };
    }

    // 2. Expiry check
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return { success: false, error: "مهلت استفاده از این کد به پایان رسیده است." };
    }

    // 3. Capacity check (critical)
    if (discount.usedCount >= discount.maxUsage) {
      return { success: false, error: "ظرفیت استفاده از این کد تخفیف پر شده است." };
    }

    // 4. Plan match check (if restricted)
    if (discount.targetPlan && discount.targetPlan !== planType) {
      return {
        success: false,
        error: `این کد تخفیف فقط برای پلن ${discount.targetPlan} معتبر است.`,
      };
    }

    // 5. Duration match check (if restricted)
    if (discount.durationMonths && discount.durationMonths !== months) {
      return {
        success: false,
        error: `این کد تخفیف فقط برای اشتراک ${discount.durationMonths} ماهه معتبر است.`,
      };
    }

    // All checks passed
    return {
      success: true,
      discountPercent: discount.discountPercent,
      discountId: discount.id,
    };
  } catch (error) {
    console.error("Error validating discount:", error);
    return { success: false, error: "خطای سرور در بررسی کد تخفیف." };
  }
}

// ---------------------------------------------------------------------------
// Consume a discount: atomically increment usedCount inside a transaction
// ---------------------------------------------------------------------------
export async function consumeDiscount(discountId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "دسترسی غیرمجاز" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Re-read the code inside the transaction for safety
      const discount = await tx.discountCode.findUnique({
        where: { id: discountId },
      });

      if (!discount || !discount.isActive) {
        throw new Error("کد تخفیف نامعتبر یا غیرفعال است.");
      }

      if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
        throw new Error("مهلت استفاده از این کد به پایان رسیده است.");
      }

      if (discount.usedCount >= discount.maxUsage) {
        throw new Error("ظرفیت استفاده از این کد تخفیف پر شده است.");
      }

      // Atomically increment usedCount
      const updated = await tx.discountCode.update({
        where: { id: discountId },
        data: { usedCount: { increment: 1 } },
      });

      return updated;
    });

    return { success: true, usedCount: result.usedCount };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطای سرور در اعمال کد تخفیف.";
    console.error("Error consuming discount:", error);
    return { success: false, error: message };
  }
}
