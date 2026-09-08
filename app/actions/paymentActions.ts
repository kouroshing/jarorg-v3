"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export interface DiscountValidationResult {
  success: boolean;
  discountedAmount?: number;
  discountAmount?: number;
  percent?: number;
  error?: string;
}

/**
 * Validates a discount code and calculates the discounted amount.
 * 
 * @param codeStr The input coupon string
 * @param originalAmount Original plan price
 */
export async function validateDiscountCode(
  codeStr: string,
  originalAmount: number,
  planId?: string
): Promise<DiscountValidationResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "جهت اعمال کد تخفیف باید وارد حساب خود شوید." };
    }

    const cleanCode = codeStr.toUpperCase().trim();
    if (!cleanCode) {
      return { success: false, error: "کد تخفیف نمی‌تواند خالی باشد." };
    }

    // 1. Fetch coupon code
    const discount = await prisma.discountCode.findUnique({
      where: { code: cleanCode }
    });

    if (!discount) {
      return { success: false, error: "کد تخفیف وارد شده نامعتبر است." };
    }

    // 2. Check active status
    if (!discount.isActive) {
      return { success: false, error: "این کد تخفیف غیرفعال شده است." };
    }

    // 3. Check expiration date
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return { success: false, error: "تاریخ انقضای این کد تخفیف به پایان رسیده است." };
    }

    // 4. Check usage limits
    if (discount.usedCount >= discount.maxUsage) {
      return { success: false, error: "ظرفیت استفاده از این کد تخفیف به پایان رسیده است." };
    }

    // 5. Check plan restrictions (targetPlanId)
    if (discount.targetPlanId && planId) {
      const currentPlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { id: planId },
            { key: planId }
          ]
        }
      });
      if (!currentPlan || (discount.targetPlanId !== currentPlan.id && discount.targetPlanId !== currentPlan.key)) {
        return { success: false, error: "این کد تخفیف برای این تعرفه قابل استفاده نیست." };
      }
    }

    // 6. Check user phone restrictions (targetPhone)
    if (discount.targetPhone && session.phone) {
      const normUserPhone = session.phone.replace(/^(\+98|98|0)/, "");
      const normTargetPhone = discount.targetPhone.replace(/^(\+98|98|0)/, "");
      if (normUserPhone !== normTargetPhone) {
        return { success: false, error: "این کد تخفیف مختص کاربر دیگری است." };
      }
    }

    // 7. Calculate discount amounts
    const discountPercent = discount.discountPercent;
    let discountAmount = 0;

    if (discountPercent === 100) {
      discountAmount = originalAmount;
    } else {
      discountAmount = Math.floor(originalAmount * (discountPercent / 100));
      // Apply maximum amount discount cap if set and not 100% discount
      if (discount.maxAmount && discount.maxAmount > 0) {
        discountAmount = Math.min(discountAmount, discount.maxAmount);
      }
    }

    const discountedAmount = Math.max(0, originalAmount - discountAmount);

    return {
      success: true,
      discountedAmount,
      discountAmount,
      percent: discountPercent
    };
  } catch (error) {
    console.error("Error in validateDiscountCode:", error);
    return { success: false, error: "خطای سرور در بررسی کد تخفیف." };
  }
}
