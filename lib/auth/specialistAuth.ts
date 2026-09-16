import { prisma } from "@/lib/prisma";
import { SPECIALIST_REVIEW_PATH } from "@/lib/specialists/eligibility";
import { isKycDeadlineSuspension } from "@/lib/kyc/gates";

export const SpecialistStatus = {
  INCOMPLETE: "INCOMPLETE",
  PENDING_REVIEW: "PENDING_REVIEW",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type SpecialistStatus = (typeof SpecialistStatus)[keyof typeof SpecialistStatus];

export interface SpecialistEligibilityResult {
  isSpecialist: boolean;
  error?: string;
  errorCode?: "UNAUTHORIZED" | "PROFILE_NOT_FOUND" | "PROFILE_INCOMPLETE" | "PENDING_REVIEW" | "SUSPENDED";
  redirectTo?: string;
  user?: {
    id: string;
    phone: string;
    role: string;
    displayName?: string | null;
  };
  specialistProfile?: {
    id: string;
    status: string;
    agreedToTerms: boolean;
    city?: string | null;
    workArea?: string | null;
    bio?: string | null;
    equipmentSummary?: string | null;
    /** Where they travel from; used to quote the travel fee on each proposal. */
    baseLat?: number | null;
    baseLng?: number | null;
  };
  portfolioStats?: {
    hasEligibleCategory: boolean;
    maxInCategory: number;
    totalItems: number;
  };
}

/**
 * Verifies if the authenticated user is an ACTIVE specialist eligible for marketplace orders.
 * Criteria:
 * 1. Valid session & User exists with role SPECIALIST (or ADMIN).
 * 2. SpecialistProfile exists.
 * 3. profile.status === "ACTIVE".
 * 4. profile.agreedToTerms === true.
 *
 * Portfolio minimum (10 per category) is an *admin activation* gate, not a
 * runtime marketplace gate — exception approvals must not redirect-loop ACTIVE
 * specialists back into onboarding.
 */
export async function getAuthorizedSpecialist(sessionUserId: string): Promise<SpecialistEligibilityResult> {
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      phone: true,
      role: true,
      displayName: true,
      specialistProfile: {
        select: {
          id: true,
          status: true,
          agreedToTerms: true,
          termsAgreedAt: true,
          city: true,
          workArea: true,
          bio: true,
          equipmentSummary: true,
          baseLat: true,
          baseLng: true,
          reviewNote: true,
          portfolioItems: {
            select: {
              id: true,
              categorySlug: true,
              reviewStatus: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      isSpecialist: false,
      error: "حساب کاربری یافت نشد.",
      errorCode: "UNAUTHORIZED",
    };
  }

  const roleUpper = (user.role || "").toUpperCase();
  const isSpecialistRole = roleUpper === "SPECIALIST" || roleUpper === "ADMIN";

  if (!isSpecialistRole && !user.specialistProfile) {
    return {
      isSpecialist: false,
      error: "دسترسی غیرمجاز. این بخش فقط مخصوص متخصصان و عکاسان پلتفرم جار است.",
      errorCode: "UNAUTHORIZED",
      redirectTo: "/profile",
    };
  }

  const profile = user.specialistProfile;
  if (!profile) {
    return {
      isSpecialist: false,
      error: "PROFILE_INCOMPLETE",
      errorCode: "PROFILE_INCOMPLETE",
      redirectTo: "/specialist/onboarding",
    };
  }

  // Only work an admin has signed off decides what a specialist can be shown
  // for. Counting raw uploads here is what let unreviewed files onto the board.
  const countByCategory: Record<string, number> = {};
  for (const item of profile.portfolioItems) {
    if (item.reviewStatus !== "APPROVED") continue;
    countByCategory[item.categorySlug] = (countByCategory[item.categorySlug] || 0) + 1;
  }
  const categoryCounts = Object.values(countByCategory);
  const maxInCategory = categoryCounts.length > 0 ? Math.max(...categoryCounts) : 0;
  const hasEligibleCategory = maxInCategory >= 10;
  const totalItems = profile.portfolioItems.length;

  const portfolioStats = {
    hasEligibleCategory,
    maxInCategory,
    totalItems,
  };

  if (profile.status === "SUSPENDED") {
    const kycDeadlineSuspend = isKycDeadlineSuspension(profile.reviewNote);
    return {
      isSpecialist: false,
      error: kycDeadlineSuspend
        ? "مهلت ۷ روزه احراز هویت تمام شده و حساب معلق است. ابتدا هویت را تکمیل کنید."
        : "حساب همکاری شما به حالت تعلیق درآمده است. لطفاً با پشتیبانی جار تماس بگیرید.",
      errorCode: "SUSPENDED",
      redirectTo: kycDeadlineSuspend
        ? "/specialist/onboarding/identity"
        : SPECIALIST_REVIEW_PATH,
    };
  }

  if (profile.status === "PENDING_REVIEW") {
    return {
      isSpecialist: false,
      error: "پروفایل و مدارک شما در حال بررسی توسط کارشناسان جار است.",
      errorCode: "PENDING_REVIEW",
      redirectTo: SPECIALIST_REVIEW_PATH,
    };
  }

  // ACTIVE + terms is enough for marketplace access. Portfolio count is for
  // admin activation only (exception approvals stay ACTIVE without looping).
  if (profile.status !== "ACTIVE" || !profile.agreedToTerms) {
    return {
      isSpecialist: false,
      error: "PROFILE_INCOMPLETE",
      errorCode: "PROFILE_INCOMPLETE",
      redirectTo: "/specialist/onboarding",
      user: { id: user.id, phone: user.phone, role: user.role, displayName: user.displayName },
      specialistProfile: {
        id: profile.id,
        status: profile.status,
        agreedToTerms: profile.agreedToTerms,
        city: profile.city,
        workArea: profile.workArea,
        bio: profile.bio,
        equipmentSummary: profile.equipmentSummary,
        baseLat: profile.baseLat,
        baseLng: profile.baseLng,
      },
      portfolioStats,
    };
  }

  return {
    isSpecialist: true,
    user: { id: user.id, phone: user.phone, role: user.role, displayName: user.displayName },
    specialistProfile: {
      id: profile.id,
      status: profile.status,
      agreedToTerms: profile.agreedToTerms,
      city: profile.city,
      workArea: profile.workArea,
      bio: profile.bio,
      equipmentSummary: profile.equipmentSummary,
      baseLat: profile.baseLat,
      baseLng: profile.baseLng,
    },
    portfolioStats,
  };
}
