import "server-only";

import { prisma } from "@/lib/prisma";
import { getAdminPhoneDigits, SUPER_ADMIN_PHONE } from "@/lib/auth/admin";
import {
  evaluateEligibility,
  isPortfolioApprovalComplete,
  isPortfolioUploadComplete,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
  MIN_SELECTED_CATEGORIES,
  parseSelectedCategories,
  SPECIALIST_REVIEW_PATH,
  type EligibilityResult,
} from "@/lib/specialists/eligibility";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";
import {
  parsePendingProfileEdit,
  type PendingProfileEditDraft,
} from "@/lib/specialists/profileEditShared";

export type SpecialistReviewCard = {
  profileId: string;
  userId: string;
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  city: string | null;
  workArea: string | null;
  bio: string | null;
  equipmentSummary: string | null;
  isMobileGrapher: boolean;
  status: string;
  kycStatus: string;
  kycNationalIdMask: string | null;
  kycShabaMask: string | null;
  kycSubmittedAt: string | null;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  baseAddress: string | null;
  profileEditStatus: string;
  profileEditSubmittedAt: string | null;
  profileEditNote: string | null;
  pendingProfileEdit: PendingProfileEditDraft | null;
  categories: { slug: string; title: string; total: number; approved: number; pending: number; rejected: number }[];
  items: {
    id: string;
    categorySlug: string;
    categoryTitle: string;
    fileUrl: string;
    mediaType: string;
    title: string | null;
    reviewStatus: string;
    rejectionReason: string | null;
    instagramPickedAt: string | null;
  }[];
  counts: { total: number; approved: number; pending: number; rejected: number };
  /** True once enough APPROVED work exists to switch the profile to ACTIVE. */
  canActivate: boolean;
  /**
   * Core profile fields ready (city/base/NDA/avatar/name) even if approved
   * portfolio is still under the usual 10-item bar.
   */
  canActivateCore: boolean;
  /** True when core is ready but not every category has ≥10 approved items. */
  belowPortfolioMinimum: boolean;
  eligibility: EligibilityResult;
};

function categoryTitle(slug: string): string {
  return CATEGORIES_BY_SLUG[slug]?.title || slug;
}

/**
 * Everything the admin review screen shows for one specialist: the file they
 * submitted, and whether approving it now would actually let them take work.
 */
export async function getSpecialistReviewCards(
  statuses: string[] = ["PENDING_REVIEW"],
  options?: { includeKycPending?: boolean; includeProfileEditPending?: boolean }
): Promise<SpecialistReviewCard[]> {
  const orClauses: Record<string, unknown>[] = [{ status: { in: statuses } }];
  if (options?.includeKycPending) {
    orClauses.push({ status: "ACTIVE", kycStatus: "PENDING" });
  }
  if (options?.includeProfileEditPending) {
    orClauses.push({ status: "ACTIVE", profileEditStatus: "PENDING" });
  }

  const profiles = await prisma.specialistProfile.findMany({
    where: orClauses.length > 1 ? { OR: orClauses } : { status: { in: statuses } },
    include: {
      user: { select: { id: true, phone: true, displayName: true } },
      portfolioItems: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ submittedForReviewAt: "asc" }, { createdAt: "asc" }],
  });

  return profiles.map((profile) => {
    const items = profile.portfolioItems;
    const declared = parseSelectedCategories(profile.selectedCategories);
    const slugs = declared.length > 0 ? declared : Array.from(new Set(items.map((i) => i.categorySlug)));

    const categories = slugs.map((slug) => {
      const forSlug = items.filter((i) => i.categorySlug === slug);
      return {
        slug,
        title: categoryTitle(slug),
        total: forSlug.length,
        approved: forSlug.filter((i) => i.reviewStatus === "APPROVED").length,
        pending: forSlug.filter((i) => i.reviewStatus === "PENDING").length,
        rejected: forSlug.filter((i) => i.reviewStatus === "REJECTED").length,
      };
    });

    const eligibility = evaluateEligibility({
      city: profile.city,
      baseLat: profile.baseLat,
      baseLng: profile.baseLng,
      agreedToTerms: profile.agreedToTerms,
      avatarUrl: profile.avatarUrl,
      displayName: profile.user?.displayName,
      portfolioItems: items,
      selectedCategories: profile.selectedCategories,
    });

    return {
      profileId: profile.id,
      userId: profile.userId,
      displayName: profile.user?.displayName || "متخصص بدون نام",
      phone: profile.user?.phone || "",
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      workArea: profile.workArea,
      bio: profile.bio,
      equipmentSummary: profile.equipmentSummary,
      isMobileGrapher: Boolean(profile.isMobileGrapher),
      status: profile.status,
      kycStatus: profile.kycStatus,
      kycNationalIdMask: profile.kycNationalIdMask,
      kycShabaMask: profile.kycShabaMask,
      kycSubmittedAt: profile.kycSubmittedAt?.toISOString() ?? null,
      submittedForReviewAt: profile.submittedForReviewAt?.toISOString() ?? null,
      reviewedAt: profile.reviewedAt?.toISOString() ?? null,
      reviewNote: profile.reviewNote,
      baseAddress: profile.baseAddress,
      profileEditStatus: profile.profileEditStatus,
      profileEditSubmittedAt: profile.profileEditSubmittedAt?.toISOString() ?? null,
      profileEditNote: profile.profileEditNote,
      pendingProfileEdit: parsePendingProfileEdit(profile.pendingProfileEdit),
      categories,
      items: items.map((item) => ({
        id: item.id,
        categorySlug: item.categorySlug,
        categoryTitle: categoryTitle(item.categorySlug),
        fileUrl: item.fileUrl,
        mediaType: item.mediaType,
        title: item.title,
        reviewStatus: item.reviewStatus,
        rejectionReason: item.rejectionReason,
        instagramPickedAt: item.instagramPickedAt?.toISOString() ?? null,
      })),
      counts: {
        total: items.length,
        approved: items.filter((i) => i.reviewStatus === "APPROVED").length,
        pending: items.filter((i) => i.reviewStatus === "PENDING").length,
        rejected: items.filter((i) => i.reviewStatus === "REJECTED").length,
      },
      canActivate:
        isPortfolioApprovalComplete(eligibility) &&
        eligibility.hasCity &&
        eligibility.hasBaseLocation &&
        eligibility.hasAgreedToTerms &&
        eligibility.hasAvatar &&
        eligibility.hasDisplayName,
      canActivateCore:
        eligibility.hasCity &&
        eligibility.hasBaseLocation &&
        eligibility.hasAgreedToTerms &&
        eligibility.hasAvatar &&
        eligibility.hasDisplayName,
      belowPortfolioMinimum:
        eligibility.hasCity &&
        eligibility.hasBaseLocation &&
        eligibility.hasAgreedToTerms &&
        eligibility.hasAvatar &&
        eligibility.hasDisplayName &&
        !isPortfolioApprovalComplete(eligibility),
      eligibility,
    };
  });
}

/**
 * Tells whoever runs the admin panel that a file is waiting. Without this the
 * review queue is something a human has to remember to open.
 */
export async function notifyAdminsOfSpecialistSubmission({
  specialistUserId,
  displayName,
  city,
}: {
  specialistUserId: string;
  displayName: string;
  city?: string | null;
}): Promise<void> {
  const adminPhones = Array.from(new Set([getAdminPhoneDigits(), SUPER_ADMIN_PHONE]));
  const admins = await prisma.user.findMany({
    where: { phone: { in: adminPhones } },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          title: "پرونده متخصص جدید در انتظار بررسی",
          message: `«${displayName}»${city ? ` از ${city}` : ""} پرونده خود را برای بررسی ارسال کرد.`,
          type: "INFO",
          link: "/admin/review",
        },
      })
    )
  ).catch((error) => {
    console.error("[notifyAdminsOfSpecialistSubmission] failed:", error);
  });

  void specialistUserId;
}

export function missingRequirementLabels(eligibility: EligibilityResult): string[] {
  const missing: string[] = [];
  if (!eligibility.hasDisplayName) missing.push("نام نمایشی");
  if (!eligibility.hasAvatar) missing.push("عکس پروفایل");
  if (!eligibility.hasCategories) {
    missing.push(`انتخاب حداقل ${MIN_SELECTED_CATEGORIES} دسته‌بندی`);
  }
  if (!isPortfolioUploadComplete(eligibility)) {
    missing.push(
      `${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار در هر دسته‌بندی انتخاب‌شده`
    );
  }
  if (!eligibility.hasCity) missing.push("شهر محل فعالیت");
  if (!eligibility.hasBaseLocation) missing.push("مبدأ حرکت روی نقشه");
  if (!eligibility.hasPlan) missing.push("انتخاب اشتراک");
  if (!eligibility.hasAgreedToTerms) missing.push("پذیرش تعهدنامه");
  return missing;
}

export { SPECIALIST_REVIEW_PATH };
