import "server-only";

import { prisma } from "@/lib/prisma";
import { getAdminPhoneDigits, SUPER_ADMIN_PHONE } from "@/lib/auth/admin";
import {
  evaluateEligibility,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
  parseSelectedCategories,
  SPECIALIST_REVIEW_PATH,
  type EligibilityResult,
} from "@/lib/specialists/eligibility";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";

export type SpecialistReviewCard = {
  profileId: string;
  userId: string;
  displayName: string;
  phone: string;
  city: string | null;
  workArea: string | null;
  bio: string | null;
  equipmentSummary: string | null;
  status: string;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  baseAddress: string | null;
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
  }[];
  counts: { total: number; approved: number; pending: number; rejected: number };
  /** True once enough APPROVED work exists to switch the profile to ACTIVE. */
  canActivate: boolean;
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
  statuses: string[] = ["PENDING_REVIEW"]
): Promise<SpecialistReviewCard[]> {
  const profiles = await prisma.specialistProfile.findMany({
    where: { status: { in: statuses } },
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
      portfolioItems: items,
      selectedCategories: profile.selectedCategories,
    });

    return {
      profileId: profile.id,
      userId: profile.userId,
      displayName: profile.user?.displayName || "متخصص بدون نام",
      phone: profile.user?.phone || "",
      city: profile.city,
      workArea: profile.workArea,
      bio: profile.bio,
      equipmentSummary: profile.equipmentSummary,
      status: profile.status,
      submittedForReviewAt: profile.submittedForReviewAt?.toISOString() ?? null,
      reviewedAt: profile.reviewedAt?.toISOString() ?? null,
      reviewNote: profile.reviewNote,
      baseAddress: profile.baseAddress,
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
      })),
      counts: {
        total: items.length,
        approved: items.filter((i) => i.reviewStatus === "APPROVED").length,
        pending: items.filter((i) => i.reviewStatus === "PENDING").length,
        rejected: items.filter((i) => i.reviewStatus === "REJECTED").length,
      },
      canActivate: eligibility.qualifiedCategories.length > 0 && eligibility.isSubmittable,
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
  if (eligibility.submittableCategories.length === 0) {
    missing.push(`حداقل یک شاخه با ${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار`);
  }
  if (!eligibility.hasCity) missing.push("شهر محل فعالیت");
  if (!eligibility.hasBaseLocation) missing.push("مبدأ حرکت روی نقشه");
  if (!eligibility.hasAgreedToTerms) missing.push("پذیرش تعهدنامه");
  return missing;
}

export { SPECIALIST_REVIEW_PATH };
