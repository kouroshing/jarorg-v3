"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { ALL_CATEGORIES, CATEGORIES_BY_SLUG, CategoryType, MediaType } from "@/lib/categories";
import { getUploadRoot, resolveUploadDiskPath } from "@/lib/storage/uploads";
import {
  evaluateEligibility,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
  MIN_SELECTED_CATEGORIES,
  SPECIALIST_REVIEW_PATH,
} from "@/lib/specialists/eligibility";
import { notifyAdminsOfSpecialistSubmission } from "@/lib/specialists/review";
import { queueSpecialistProfileEdit } from "@/lib/specialists/profileEdit";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { checkPortfolioUploadLimits } from "@/lib/portfolio/uploadLimits";

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
  reviewStatus: string;
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
      // Auto initialize empty profile — categories are chosen in onboarding step 2.
      specialist = await prisma.specialistProfile.create({
        data: {
          userId: session.userId,
          selectedCategories: JSON.stringify([]),
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
      reviewStatus: item.reviewStatus || "PENDING",
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
): Promise<{
  success: boolean;
  error?: string;
  selectedCategories?: string[];
  pendingApproval?: boolean;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    // Filter valid slugs against ALL_CATEGORIES
    const validSlugs = categorySlugs.filter((slug) => CATEGORIES_BY_SLUG[slug] !== undefined);

    if (validSlugs.length < MIN_SELECTED_CATEGORIES) {
      return {
        success: false,
        error: `حداقل ${MIN_SELECTED_CATEGORIES} دسته‌بندی انتخاب کنید.`,
      };
    }

    const existing = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: {
        status: true,
        pendingProfileEdit: true,
        city: true,
        user: { select: { displayName: true } },
      },
    });

    if (existing?.status === "ACTIVE") {
      await queueSpecialistProfileEdit({
        userId: session.userId,
        existingPendingRaw: existing.pendingProfileEdit,
        patch: { selectedCategories: validSlugs },
        displayNameForNotify: existing.user?.displayName,
        cityForNotify: existing.city,
      });
      revalidatePath("/specialist/portfolio");
      revalidatePath("/admin/review");
      return {
        success: true,
        selectedCategories: validSlugs,
        pendingApproval: true,
      };
    }

    await prisma.specialistProfile.upsert({
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
    revalidatePath("/specialist/onboarding/categories");
    revalidatePath("/specialist/onboarding/portfolio");
    revalidatePath("/profile");
    revalidatePath("/admin/review");

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
    ];
    const blockedAppleStill = [
      "image/heic",
      "image/heif",
      "image/heic-sequence",
      "image/heif-sequence",
    ];
    const allowedVideoMimes = [
      "video/mp4",
      "video/webm",
      "video/mpeg",
    ];
    // MOV often uploads OK but Chrome desktop cannot preview it in admin.
    const blockedAppleVideo = ["video/quicktime"];

    const lowerName = file.name.toLowerCase();
    if (
      blockedAppleStill.includes(mimeType) ||
      /\.hei[cf]$/i.test(lowerName)
    ) {
      return {
        success: false,
        error:
          "فرمت HEIC/HEIF آیفون در مرورگر و پنل ادمین نمایش داده نمی‌شود. لطفاً از Photos گزینهٔ «Most Compatible» را بزنید یا فایل را به JPG تبدیل کنید.",
      };
    }
    if (blockedAppleVideo.includes(mimeType) || /\.mov$/i.test(lowerName)) {
      return {
        success: false,
        error:
          "فایل MOV روی پنل ادمین درست پیش‌نمایش نمی‌شود. لطفاً ویدیو را به MP4 تبدیل کنید و دوباره بارگذاری کنید.",
      };
    }

    if (allowedImageMimes.includes(mimeType)) {
      mediaType = "IMAGE";
    } else if (allowedVideoMimes.includes(mimeType)) {
      mediaType = "VIDEO";
    } else {
      return {
        success: false,
        error: "فرمت فایل پشتیبانی نمی‌شود. لطفاً فایل عکس (JPG, PNG, WebP) یا ویدیو (MP4, WebM) بارگذاری کنید.",
      };
    }

    const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
    const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
    if (mediaType === "IMAGE" && file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: "حجم تصویر نباید بیشتر از ۲۵ مگابایت باشد." };
    }
    if (mediaType === "VIDEO" && file.size > MAX_VIDEO_BYTES) {
      return { success: false, error: "حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد." };
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

    const limitError = await checkPortfolioUploadLimits(specialist.id, categorySlug);
    if (limitError) {
      return { success: false, error: limitError };
    }

    // Persist under UPLOAD_ROOT (Liara disk) / public/uploads
    const ext = path.extname(file.name) || (mediaType === "IMAGE" ? ".jpg" : ".mp4");
    const cleanFilename = `portfolio_${categorySlug}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}${ext}`;

    const uploadDir = path.join(getUploadRoot(), "portfolio");
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
        reviewStatus: newItem.reviewStatus || "PENDING",
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

    // Delete physical file from UPLOAD_ROOT / public/uploads
    if (item.fileUrl.startsWith("/uploads/")) {
      const diskPath = resolveUploadDiskPath(item.fileUrl);
      if (diskPath) {
        await fs.unlink(diskPath).catch(() => {});
      }
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
 * Hands the specialist's file to the review queue.
 *
 * This used to write `agreedToTerms` and report "your profile is published"
 * without touching `status`, so nobody was ever actually reviewed and nobody
 * was ever actually activated.
 */
export async function publishSpecialistProfile(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  redirect?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const specialist = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      include: {
        portfolioItems: { select: { categorySlug: true, reviewStatus: true } },
        user: { select: { displayName: true, phone: true, planId: true } },
      },
    });

    if (!specialist) {
      return { success: false, error: "پروفایل متخصص یافت نشد." };
    }

    const eligibility = evaluateEligibility({
      city: specialist.city,
      baseLat: specialist.baseLat,
      baseLng: specialist.baseLng,
      agreedToTerms: specialist.agreedToTerms,
      avatarUrl: specialist.avatarUrl,
      displayName: specialist.user?.displayName,
      portfolioItems: specialist.portfolioItems,
      selectedCategories: specialist.selectedCategories,
      hasPlan: Boolean(specialist.user?.planId),
    });

    if (eligibility.submittableCategories.length === 0) {
      const details = eligibility.incompleteCategories
        .map((c) => `«${CATEGORIES_BY_SLUG[c.slug]?.title || c.slug}» (${c.count}/۱۰ فایل)`)
        .join("، ");

      return {
        success: false,
        error: details
          ? `برای ارسال پرونده باید حداقل یک شاخه تخصصی با ۱۰ نمونه‌کار کامل داشته باشید. وضعیت فعلی: ${details}`
          : `برای ارسال پرونده ابتدا حداقل ${MIN_SELECTED_CATEGORIES} شاخه انتخاب و در یکی از آن‌ها ۱۰ نمونه‌کار بارگذاری کنید.`,
      };
    }

    if (!eligibility.hasCategories) {
      return {
        success: false,
        error: `حداقل ${MIN_SELECTED_CATEGORIES} دسته‌بندی انتخاب کنید.`,
        redirect: "/specialist/onboarding/categories",
      };
    }

    if (!eligibility.hasPlan) {
      return {
        success: false,
        error: "ابتدا اشتراک خود را انتخاب کنید.",
        redirect: "/specialist/onboarding/subscription",
      };
    }

    if (!eligibility.hasCity || !eligibility.hasBaseLocation) {
      return {
        success: false,
        error: "برای ارسال پرونده، شهر و مبدأ حرکت روی نقشه را در گام بعدی تکمیل کنید.",
        redirect: "/specialist/onboarding/details",
      };
    }

    if (!eligibility.hasAgreedToTerms) {
      return {
        success: false,
        error: "برای ارسال پرونده، تعهدنامه عضویت را در گام بعدی بپذیرید.",
        redirect: "/specialist/onboarding/terms",
      };
    }

    if (!eligibility.hasAvatar || !eligibility.hasDisplayName) {
      return {
        success: false,
        error: "نام نمایشی و عکس پروفایل الزامی است.",
        redirect: "/specialist/onboarding/profile",
      };
    }

    if (!eligibility.isSubmittable) {
      return {
        success: false,
        error: "پرونده هنوز برای ارسال کامل نیست.",
        redirect: eligibility.nextStep,
      };
    }

    const entersReviewQueue = specialist.status === "INCOMPLETE";

    await prisma.specialistProfile.update({
      where: { id: specialist.id },
      data: {
        reviewNote: null,
        ...(specialist.status === "ACTIVE" || specialist.status === "SUSPENDED"
          ? {}
          : {
              status: "PENDING_REVIEW",
              ...(entersReviewQueue
                ? { submittedForReviewAt: new Date(), reviewedAt: null }
                : {}),
            }),
      },
    });

    if (entersReviewQueue) {
      await notifyAdminsOfSpecialistSubmission({
        specialistUserId: session.userId,
        displayName: specialist.user?.displayName || phoneToLocalDisplay(specialist.user?.phone || ""),
        city: specialist.city || "",
      });
    }

    revalidatePath("/specialist/onboarding");
    revalidatePath(SPECIALIST_REVIEW_PATH);
    revalidatePath("/specialist/portfolio");
    revalidatePath("/admin/review");

    return {
      success: true,
      message: entersReviewQueue
        ? "پرونده شما برای بررسی کارشناسان جار ارسال شد."
        : "وضعیت پرونده به‌روز شد.",
      redirect: specialist.status === "ACTIVE" ? "/specialist/projects" : SPECIALIST_REVIEW_PATH,
    };
  } catch (error: unknown) {
    console.error("[publishSpecialistProfile error]", error);
    return { success: false, error: "خطا در ارسال پرونده برای بررسی." };
  }
}

