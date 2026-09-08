"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { ALL_CATEGORIES, CATEGORIES_BY_SLUG, CategoryType, MediaType } from "@/lib/categories";

export interface PortfolioItemData {
  id: string;
  specialistId: string;
  categorySlug: string;
  categoryType: CategoryType;
  fileUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  title: string | null;
  caption: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface SpecialistCategoryPortfolioResult {
  success: boolean;
  error?: string;
  profileId?: string;
  selectedCategories?: string[];
  agreedToTerms?: boolean;
  termsAgreedAt?: string | null;
  portfolioItems?: PortfolioItemData[];
}

/**
 * Gets or initializes the specialist profile, selected categories, and uploaded portfolio items.
 */
export async function getSpecialistCategoriesAndPortfolio(): Promise<SpecialistCategoryPortfolioResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    let specialist = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      include: {
        portfolioItems: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!specialist) {
      // Auto initialize specialist profile
      specialist = await prisma.specialistProfile.create({
        data: {
          userId: session.userId,
          selectedCategories: JSON.stringify([
            "wedding-ceremony",
            "portrait-avatar",
            "commercial-arrangement",
            "modeling",
          ]),
        },
        include: {
          portfolioItems: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    let selectedCategories: string[] = [];
    try {
      if (specialist.selectedCategories) {
        selectedCategories = JSON.parse(specialist.selectedCategories);
      }
    } catch {
      selectedCategories = [];
    }

    const items: PortfolioItemData[] = (specialist.portfolioItems || []).map((item) => ({
      id: item.id,
      specialistId: item.specialistId,
      categorySlug: item.categorySlug,
      categoryType: item.categoryType as CategoryType,
      fileUrl: item.fileUrl,
      mediaType: item.mediaType as "IMAGE" | "VIDEO",
      title: item.title,
      caption: item.caption,
      fileSize: item.fileSize,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      success: true,
      profileId: specialist.id,
      selectedCategories,
      agreedToTerms: Boolean(specialist.agreedToTerms),
      termsAgreedAt: specialist.termsAgreedAt ? specialist.termsAgreedAt.toISOString() : null,
      portfolioItems: items,
    };
  } catch (error: any) {
    console.error("[getSpecialistCategoriesAndPortfolio error]", error);
    return { success: false, error: "خطا در دریافت اطلاعات دسته‌بندی‌ها و نمونه‌کارها." };
  }
}

/**
 * Updates selected category slugs for the current specialist.
 */
export async function updateSpecialistCategories(
  categorySlugs: string[]
): Promise<{ success: boolean; error?: string; selectedCategories?: string[] }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    // Filter valid slugs against ALL_CATEGORIES
    const validSlugs = categorySlugs.filter((slug) => CATEGORIES_BY_SLUG[slug] !== undefined);

    const specialist = await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        selectedCategories: JSON.stringify(validSlugs),
      },
      update: {
        selectedCategories: JSON.stringify(validSlugs),
      },
    });

    revalidatePath("/specialist/portfolio");
    revalidatePath("/profile");

    return {
      success: true,
      selectedCategories: validSlugs,
    };
  } catch (error: any) {
    console.error("[updateSpecialistCategories error]", error);
    return { success: false, error: "خطا در ذخیره‌سازی دسته‌بندی‌های انتخابی." };
  }
}

/**
 * Uploads a portfolio file (image/video) categorized under a specific slug.
 */
export async function uploadPortfolioItem(
  formData: FormData
): Promise<{ success: boolean; error?: string; item?: PortfolioItemData }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری شوید." };
    }

    const file = formData.get("file") as File | null;
    const categorySlug = (formData.get("categorySlug") as string)?.trim();
    const title = (formData.get("title") as string)?.trim() || null;
    const caption = (formData.get("caption") as string)?.trim() || null;

    if (!file) {
      return { success: false, error: "فایلی برای آپلود انتخاب نشده است." };
    }

    if (!categorySlug || !CATEGORIES_BY_SLUG[categorySlug]) {
      return { success: false, error: "دسته‌بندی نامعتبر است." };
    }

    const categoryDef = CATEGORIES_BY_SLUG[categorySlug];
    const categoryType: CategoryType = categoryDef.type;

    // Detect mediaType
    const mimeType = file.type.toLowerCase();
    let mediaType: "IMAGE" | "VIDEO" = "IMAGE";

    const allowedImageMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    const allowedVideoMimes = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
      "video/mpeg",
    ];

    if (allowedImageMimes.includes(mimeType)) {
      mediaType = "IMAGE";
    } else if (allowedVideoMimes.includes(mimeType)) {
      mediaType = "VIDEO";
    } else {
      return {
        success: false,
        error: "فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل عکس (JPG, PNG, WebP) یا ویدیو (MP4, MOV, WebM) بارگذاری کنید.",
      };
    }

    // Ensure specialist profile exists
    const specialist = await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        selectedCategories: JSON.stringify([categorySlug]),
      },
      update: {},
    });

    // Save file locally to public/uploads/portfolio
    const ext = path.extname(file.name) || (mediaType === "IMAGE" ? ".jpg" : ".mp4");
    const cleanFilename = `portfolio_${categorySlug}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "portfolio");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, cleanFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/portfolio/${cleanFilename}`;
    const fileSize = buffer.length;

    // Create PortfolioItem in DB
    const newItem = await prisma.portfolioItem.create({
      data: {
        specialistId: specialist.id,
        categorySlug,
        categoryType,
        fileUrl,
        mediaType,
        title,
        caption,
        fileSize,
      },
    });

    revalidatePath("/specialist/portfolio");
    revalidatePath("/profile");

    return {
      success: true,
      item: {
        id: newItem.id,
        specialistId: newItem.specialistId,
        categorySlug: newItem.categorySlug,
        categoryType: newItem.categoryType as CategoryType,
        fileUrl: newItem.fileUrl,
        mediaType: newItem.mediaType as "IMAGE" | "VIDEO",
        title: newItem.title,
        caption: newItem.caption,
        fileSize: newItem.fileSize,
        createdAt: newItem.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[uploadPortfolioItem error]", error);
    return { success: false, error: "خطای سرور در آپلود فایل نمونه‌کار." };
  }
}

/**
 * Deletes a portfolio item.
 */
export async function deletePortfolioItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const item = await prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: {
        specialist: true,
      },
    });

    if (!item) {
      return { success: false, error: "فایل مورد نظر یافت نشد." };
    }

    if (item.specialist.userId !== session.userId) {
      return { success: false, error: "شما دسترسی حذف این فایل را ندارید." };
    }

    // Try deleting physical file from disk if local
    if (item.fileUrl.startsWith("/uploads/")) {
      const diskPath = path.join(process.cwd(), "public", item.fileUrl);
      await fs.unlink(diskPath).catch(() => {});
    }

    await prisma.portfolioItem.delete({
      where: { id: itemId },
    });

    revalidatePath("/specialist/portfolio");
    revalidatePath("/profile");

    return { success: true };
  } catch (error: any) {
    console.error("[deletePortfolioItem error]", error);
    return { success: false, error: "خطا در حذف فایل نمونه‌کار." };
  }
}

/**
 * Validates that all selected categories have at least 10 items before final confirmation.
 */
export async function publishSpecialistProfile(agreedToTerms?: boolean): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    if (agreedToTerms === false) {
      return {
        success: false,
        error: "پذیرش تعهدنامه حفظ محرمانگی اطلاعات و حریم خصوصی کارفرمایان الزامی است.",
      };
    }

    const specialist = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      include: {
        portfolioItems: true,
      },
    });

    if (!specialist) {
      return { success: false, error: "پروفایل متخصص یافت نشد." };
    }

    let selectedCategories: string[] = [];
    try {
      if (specialist.selectedCategories) {
        selectedCategories = JSON.parse(specialist.selectedCategories);
      }
    } catch {
      selectedCategories = [];
    }

    if (selectedCategories.length < 3) {
      return {
        success: false,
        error: `برای انتشار پرونده، باید حداقل ۳ شاخه تخصصی انتخاب کنید (تعداد فعلی: ${selectedCategories.length}).`,
      };
    }

    // Count items per category
    const itemsCountBySlug: Record<string, number> = {};
    for (const item of specialist.portfolioItems) {
      itemsCountBySlug[item.categorySlug] = (itemsCountBySlug[item.categorySlug] || 0) + 1;
    }

    const incompleteCategories: { slug: string; title: string; count: number }[] = [];

    for (const slug of selectedCategories) {
      const count = itemsCountBySlug[slug] || 0;
      if (count < 10) {
        const catDef = CATEGORIES_BY_SLUG[slug];
        incompleteCategories.push({
          slug,
          title: catDef?.title || slug,
          count,
        });
      }
    }

    if (incompleteCategories.length > 0) {
      const details = incompleteCategories
        .map((c) => `«${c.title}» (${c.count}/۱۰ فایل)`)
        .join("، ");

      return {
        success: false,
        error: `برای انتشار پروفایل، باید برای تمام دسته‌بندی‌های انتخابی حداقل ۱۰ نمونه‌کار آپلود شده باشد (یا دسته‌های ناقص را غیرفعال کنید). شاخه‌های ناقص: ${details}`,
      };
    }

    // Update agreedToTerms and termsAgreedAt
    await prisma.specialistProfile.update({
      where: { id: specialist.id },
      data: {
        agreedToTerms: true,
        termsAgreedAt: new Date(),
      },
    });

    revalidatePath("/specialist/portfolio");
    revalidatePath("/specialist/profile");
    revalidatePath("/profile");

    return {
      success: true,
      message: "پرونده شما با موفقیت تایید و منتشر شد.",
    };
  } catch (error: any) {
    console.error("[publishSpecialistProfile error]", error);
    return { success: false, error: "خطای سرور در تایید نهایی و انتشار پرونده." };
  }
}

