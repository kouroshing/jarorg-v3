"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { getUploadRoot } from "@/lib/storage/uploads";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import xss from "xss";

export interface PwaSettingsResult {
  success: boolean;
  data?: any;
  error?: string;
}

const DEFAULT_PWA_SETTINGS = {
  id: "system-config",
  shortName: "جار",
  fullName: "جار | رزرو آنلاین عکاس",
  description: "ثبت سفارش عکاسی، فیلم‌برداری و خدمات بصری",
  appIcon: "/app-icon.png",
  appleTouchIcon: "/app-icon.png",
  themeColor: "#ffffff",
  splashBackgroundColor: "#ffffff",
  showIosPrompt: true
};

/**
 * Gets PWA settings. Auto-seeds default settings if not exists.
 */
export async function getPwaSettings(): Promise<PwaSettingsResult> {
  try {
    const settings = await prisma.pwaSettings.upsert({
      where: { id: "system-config" },
      update: {},
      create: DEFAULT_PWA_SETTINGS,
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error in getPwaSettings:", error);
    return { success: false, error: "خطا در دریافت تنظیمات PWA از دیتابیس." };
  }
}

/**
 * Updates PWA settings. Only accessible by super admins.
 * Supports image file uploads.
 */
export async function updatePwaSettings(formData: FormData): Promise<PwaSettingsResult> {
  try {
    const session = await getSession();
    if (!session || !isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر کل پلتفرم مجاز به انجام این عملیات است." };
    }

    const shortName = xss(formData.get("shortName") as string).trim();
    const fullName = xss(formData.get("fullName") as string).trim();
    const description = xss(formData.get("description") as string).trim();
    const themeColor = xss(formData.get("themeColor") as string).trim();
    const splashBackgroundColor = xss(formData.get("splashBackgroundColor") as string).trim();
    const showIosPrompt = formData.get("showIosPrompt") === "true";

    const appIconFile = formData.get("appIcon") as File | null;
    const appleTouchIconFile = formData.get("appleTouchIcon") as File | null;

    if (!shortName || !fullName || !description || !themeColor || !splashBackgroundColor) {
      return { success: false, error: "پر کردن تمامی فیلدهای متنی الزامی است." };
    }

    // Hex color validations
    const hexRegex = /^#([0-9a-f]{3}){1,2}$/i;
    if (!hexRegex.test(themeColor) || !hexRegex.test(splashBackgroundColor)) {
      return { success: false, error: "کدهای رنگ هگز وارد شده نامعتبر است." };
    }

    // Get current settings to retrieve previous icon URLs if no new files are uploaded
    const currentRes = await getPwaSettings();
    if (!currentRes.success) {
      return { success: false, error: "خطا در بازیابی تنظیمات فعلی." };
    }
    const currentData = currentRes.data;

    let appIconUrl = currentData.appIcon;
    let appleTouchIconUrl = currentData.appleTouchIcon;

    const uploadRoot = getUploadRoot();
    const pwaDir = path.join(uploadRoot, "pwa");

    // Process main App Icon
    if (appIconFile && appIconFile.size > 0) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(appIconFile.type)) {
        return { success: false, error: "فرمت آیکون اصلی نامعتبر است. فقط PNG، JPG یا WEBP مجاز است." };
      }
      const bytes = await appIconFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(appIconFile.name) || ".png";
      const filename = `app-icon-${Date.now()}${ext}`;
      await mkdir(pwaDir, { recursive: true });
      await writeFile(path.join(pwaDir, filename), buffer);
      appIconUrl = `/uploads/pwa/${filename}`;
    }

    // Process Apple Touch Icon
    if (appleTouchIconFile && appleTouchIconFile.size > 0) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(appleTouchIconFile.type)) {
        return { success: false, error: "فرمت آیکون اپل نامعتبر است. فقط PNG، JPG یا WEBP مجاز است." };
      }
      const bytes = await appleTouchIconFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(appleTouchIconFile.name) || ".png";
      const filename = `apple-touch-${Date.now()}${ext}`;
      await mkdir(pwaDir, { recursive: true });
      await writeFile(path.join(pwaDir, filename), buffer);
      appleTouchIconUrl = `/uploads/pwa/${filename}`;
    }

    // Update settings in database
    const updated = await prisma.pwaSettings.update({
      where: { id: "system-config" },
      data: {
        shortName,
        fullName,
        description,
        themeColor,
        splashBackgroundColor,
        showIosPrompt,
        appIcon: appIconUrl,
        appleTouchIcon: appleTouchIconUrl
      }
    });

    revalidatePath("/admin/pwa");
    
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error in updatePwaSettings:", error);
    return { success: false, error: "خطای سرور در ذخیره‌سازی اطلاعات PWA." };
  }
}
