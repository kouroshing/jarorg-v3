import { prisma } from "@/lib/prisma";

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
  };
  portfolioStats?: {
    hasEligibleCategory: boolean;
    maxInCategory: number;
    totalItems: number;
  };
}

/**
 * Verifies if the authenticated user is an ACTIVE, verified specialist eligible for marketplace orders.
 * Criteria:
 * 1. Valid session & User exists with role SPECIALIST (or ADMIN).
 * 2. SpecialistProfile exists.
 * 3. profile.status === "ACTIVE".
 * 4. profile.agreedToTerms === true.
 * 5. Has at least one Category with >= 10 Portfolio items.
 * 
 * If profile is INCOMPLETE or requirements are not yet satisfied:
 * Returns { isSpecialist: false, error: "PROFILE_INCOMPLETE", redirectTo: "/specialist/onboarding" }.
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
          portfolioItems: {
            select: {
              id: true,
              categorySlug: true,
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
      redirectTo: "/join",
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

  // Count portfolio items per category
  const countByCategory: Record<string, number> = {};
  for (const item of profile.portfolioItems) {
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
    return {
      isSpecialist: false,
      error: "حساب همکاری شما به حالت تعلیق درآمده است. لطفاً با پشتیبانی جار تماس بگیرید.",
      errorCode: "SUSPENDED",
    };
  }

  if (profile.status === "PENDING_REVIEW") {
    return {
      isSpecialist: false,
      error: "پروفایل و مدارک شما در حال بررسی توسط کارشناسان جار است.",
      errorCode: "PENDING_REVIEW",
      redirectTo: "/specialist/onboarding",
    };
  }

  // Check strict eligibility requirements:
  // - status === ACTIVE
  // - agreedToTerms === true
  // - at least one category with >= 10 portfolio items
  const isEligible =
    profile.status === "ACTIVE" &&
    profile.agreedToTerms === true &&
    hasEligibleCategory;

  if (!isEligible) {
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
    },
    portfolioStats,
  };
}
