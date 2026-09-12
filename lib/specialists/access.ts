import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { isSpecialistRole } from "@/lib/auth/roles";
import {
  specialistLandingPath,
  evaluateEligibility,
  type SpecialistStatus,
} from "@/lib/specialists/eligibility";

export type SpecialistAccessKind =
  | "none"
  | "onboarding"
  | "pending"
  | "active"
  | "suspended";

export type SpecialistAccessSnapshot = {
  kind: SpecialistAccessKind;
  roleIsSpecialist: boolean;
  status: SpecialistStatus | null;
  /** Where intentional specialist entry should send them. */
  landingPath: string;
  /** True when /profile should auto-open the specialist app. */
  preferSpecialistHome: boolean;
};

/**
 * Resolve how this account relates to the specialist product.
 * Role alone is not enough — abandoned join OTPs used to stamp SPECIALIST
 * without a profile and then hijack the customer dashboard.
 */
export async function getSpecialistAccess(
  userId: string
): Promise<SpecialistAccessSnapshot> {
  await ensurePrismaSchemaReady();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      displayName: true,
      planId: true,
      specialistProfile: {
        select: {
          status: true,
          avatarUrl: true,
          city: true,
          baseLat: true,
          baseLng: true,
          agreedToTerms: true,
          selectedCategories: true,
          reviewNote: true,
          kycStatus: true,
          portfolioItems: {
            select: { categorySlug: true, reviewStatus: true },
          },
        },
      },
    },
  });

  const roleIsSpecialist = isSpecialistRole(user?.role);
  const profile = user?.specialistProfile ?? null;

  if (!profile) {
    return {
      kind: "none",
      roleIsSpecialist,
      status: null,
      landingPath: "/join",
      preferSpecialistHome: false,
    };
  }

  const status = (profile.status || "INCOMPLETE") as SpecialistStatus;
  const eligibility = evaluateEligibility({
    city: profile.city,
    baseLat: profile.baseLat,
    baseLng: profile.baseLng,
    agreedToTerms: profile.agreedToTerms,
    avatarUrl: profile.avatarUrl,
    displayName: user?.displayName,
    portfolioItems: profile.portfolioItems,
    selectedCategories: profile.selectedCategories,
    hasPlan: Boolean(user?.planId),
  });

  const landingPath = specialistLandingPath(
    status,
    eligibility,
    profile.kycStatus,
    profile.reviewNote
  );

  if (status === "ACTIVE") {
    return {
      kind: "active",
      roleIsSpecialist,
      status,
      landingPath,
      preferSpecialistHome: true,
    };
  }
  if (status === "SUSPENDED") {
    return {
      kind: "suspended",
      roleIsSpecialist,
      status,
      landingPath,
      preferSpecialistHome: false,
    };
  }
  if (status === "PENDING_REVIEW") {
    return {
      kind: "pending",
      roleIsSpecialist,
      status,
      landingPath,
      preferSpecialistHome: false,
    };
  }

  return {
    kind: "onboarding",
    roleIsSpecialist,
    status,
    landingPath,
    preferSpecialistHome: false,
  };
}

/**
 * Customers who only verified OTP on /join used to keep SPECIALIST forever.
 * Demote orphan SPECIALIST roles (no profile row) back to USER so customer
 * login lands on the customer dashboard.
 */
export async function repairOrphanSpecialistRole(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      specialistProfile: { select: { id: true } },
    },
  });

  if (!user) return;
  if (!isSpecialistRole(user.role)) return;
  if (user.specialistProfile) return;
  if ((user.role || "").toUpperCase() === "ADMIN") return;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "USER" },
  });
}

