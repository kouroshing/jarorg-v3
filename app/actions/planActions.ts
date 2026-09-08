"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import xss from "xss";

export interface PlanUpdateResult {
  success: boolean;
  error?: string;
}

// Initial default plans data
const DEFAULT_PLANS = [
  {
    key: "basic",
    nameFa: "جار بیسیک (Basic)",
    price3Months: 0,
    price12Months: 0,
    features: "ثبت پروفایل کاربری\nدسترسی به لوکیشن‌ها\n- فضای ابری اختصاصی",
    maxStorage: 500
  },
  {
    key: "pro",
    nameFa: "جار پرو (Jar Pro)",
    price3Months: 2890000,
    price12Months: 7680000,
    features: "ثبت پروفایل کاربری\nدسترسی لوکیشن استاندارد\n۲ گیگابایت فضای ابری اختصاصی\nبج تاییدیه نقره‌ای در پروفایل",
    maxStorage: 2048
  },
  {
    key: "ultra",
    nameFa: "جار اولترا (Jar Ultra)",
    price3Months: 4900000,
    price12Months: 12800000,
    features: "ثبت پروفایل کاربری\nدسترسی لوکیشن اولویت‌دار (VIP)\n۱۰۰ گیگابایت فضای ابری اختصاصی\nبج تاییدیه طلایی در پروفایل\nنمایش در رتبه اول لیست منتخب پلتفرم جار در صفحه اصلی (هوم‌پیج)\nدسترسی کاملاً رایگان به آزمون تخصصی دریافت تیک آبی پلتفرم (بدون هزینه اضافی)",
    maxStorage: 102400
  }
];

/**
 * Gets the list of all plans from the database.
 * If no plans exist, seeds the default plans automatically.
 */
export async function getPlansList() {
  try {
    let plans = await prisma.plan.findMany({
      orderBy: { price3Months: "asc" }
    });

    if (plans.length === 0) {
      // Auto-seed
      await prisma.plan.createMany({
        data: DEFAULT_PLANS
      });
      plans = await prisma.plan.findMany({
        orderBy: { price3Months: "asc" }
      });
    }

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error in getPlansList:", error);
    return { success: false, error: "خطا در دریافت لیست پلن‌ها از دیتابیس." };
  }
}

/**
 * Updates a plan's details. Only accessible by super admins.
 */
export async function updatePlan(
  id: string,
  nameFa: string,
  price3Months: number,
  price12Months: number,
  features: string,
  maxStorage: number
): Promise<PlanUpdateResult> {
  try {
    const session = await getSession();
    if (!session || !isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر کل پلتفرم مجاز به انجام این عملیات است." };
    }

    const sanitizedName = xss(nameFa).trim();
    const sanitizedFeatures = xss(features).trim();

    if (!sanitizedName || !sanitizedFeatures) {
      return { success: false, error: "پر کردن تمامی فیلدهای الزامی است." };
    }

    if (price3Months < 0 || price12Months < 0 || maxStorage < 0) {
      return { success: false, error: "قیمت‌ها و فضا نمی‌توانند مقادیر منفی باشند." };
    }

    await prisma.plan.update({
      where: { id },
      data: {
        nameFa: sanitizedName,
        price3Months: Math.floor(price3Months),
        price12Months: Math.floor(price12Months),
        features: sanitizedFeatures,
        maxStorage: Math.floor(maxStorage)
      }
    });

    revalidatePath("/profile/upgrade");
    revalidatePath("/admin/plans");
    
    return { success: true };
  } catch (error) {
    console.error("Error in updatePlan:", error);
    return { success: false, error: "خطای سرور در ذخیره‌سازی اطلاعات پلن." };
  }
}

/**
 * Activates the free Basic plan for the current logged-in user.
 * Sets planId to the basic plan's id and planExpiresAt to 30 days from now.
 */
export async function activateBasicPlan(): Promise<PlanUpdateResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری شوید." };
    }

    // Find the basic plan
    const basicPlan = await prisma.plan.findUnique({
      where: { key: "basic" }
    });

    if (!basicPlan) {
      return { success: false, error: "پلن بیسیک در دیتابیس یافت نشد." };
    }

    // Check if user already has this plan active
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (user?.planId === basicPlan.id && user?.planExpiresAt && user.planExpiresAt > new Date()) {
      return { success: false, error: "پلن جار بیسیک از قبل برای شما فعال است." };
    }

    // Activate: set planId and 30-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        planId: basicPlan.id,
        planExpiresAt: expiresAt
      }
    });

    revalidatePath("/profile");
    revalidatePath("/profile/upgrade");

    return { success: true };
  } catch (error) {
    console.error("Error in activateBasicPlan:", error);
    return { success: false, error: "خطا در فعال‌سازی پلن بیسیک." };
  }
}

