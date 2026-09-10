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
    features: "ثبت پروفایل متخصص\nدسترسی به پروژه‌های باز\n۱۰ توکن ماهانه برای پیشنهاد روی پروژه\n۵۰۰ مگابایت فضای نمونه‌کار",
    maxStorage: 500,
    monthlyTokens: 10,
  },
  {
    key: "pro",
    nameFa: "جار پرو (Jar Pro)",
    price3Months: 2_890_000,
    price12Months: 7_680_000,
    features: "همه امکانات بیسیک\n۴۰ توکن ماهانه\n۲ گیگابایت فضای ابری\nبج نقره‌ای در پروفایل",
    maxStorage: 2048,
    monthlyTokens: 40,
  },
  {
    key: "ultra",
    nameFa: "جار اولترا (Jar Ultra)",
    price3Months: 4_900_000,
    price12Months: 12_800_000,
    features: "همه امکانات پرو\n۱۲۰ توکن ماهانه\n۱۰۰ گیگابایت فضای ابری\nبج طلایی و اولویت نمایش\nدسترسی به آزمون تیک آبی",
    maxStorage: 102400,
    monthlyTokens: 120,
  },
];

/**
 * Gets the list of all plans from the database.
 * If no plans exist, seeds the default plans automatically.
 */
export async function getPlansList() {
  try {
    for (const def of DEFAULT_PLANS) {
      await prisma.plan.upsert({
        where: { key: def.key },
        create: def,
        update: {
          nameFa: def.nameFa,
          price3Months: def.price3Months,
          price12Months: def.price12Months,
          features: def.features,
          maxStorage: def.maxStorage,
          monthlyTokens: def.monthlyTokens,
        },
      });
    }

    const plans = await prisma.plan.findMany({
      orderBy: { price3Months: "asc" },
    });

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
 * Basic has no expiry — paid plans are the ones that run out.
 */
export async function activateBasicPlan(): Promise<PlanUpdateResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری شوید." };
    }

    const basicPlan = await prisma.plan.findUnique({
      where: { key: "basic" },
    });

    if (!basicPlan) {
      return { success: false, error: "پلن بیسیک در دیتابیس یافت نشد." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (user?.planId === basicPlan.id && !user.planExpiresAt) {
      return { success: false, error: "پلن جار بیسیک از قبل برای شما فعال است." };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        planId: basicPlan.id,
        planExpiresAt: null,
        storageLimit: basicPlan.maxStorage * 1024 * 1024,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/profile/upgrade");

    return { success: true };
  } catch (error) {
    console.error("Error in activateBasicPlan:", error);
    return { success: false, error: "خطا در فعال‌سازی پلن بیسیک." };
  }
}

