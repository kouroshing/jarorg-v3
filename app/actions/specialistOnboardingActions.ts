"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  evaluateEligibility,
  resolveOnboardingStatus,
  specialistLandingPath,
  SPECIALIST_REVIEW_PATH,
} from "@/lib/specialists/eligibility";
import { notifyAdminsOfSpecialistSubmission } from "@/lib/specialists/review";
import { phoneToLocalDisplay } from "@/lib/auth/phone";

const detailsSchema = z.object({
  city: z.string().trim().min(2, "نام شهر الزامی است."),
  baseLat: z.number().min(24).max(40, "موقعیت باید داخل ایران باشد."),
  baseLng: z.number().min(43).max(64, "موقعیت باید داخل ایران باشد."),
  baseAddress: z.string().trim().max(300).optional().nullable(),
  workArea: z.string().trim().max(300).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  equipmentSummary: z.string().trim().max(500).optional().nullable(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "پذیرش تعهدنامه و قوانین همکاری الزامی است.",
  }),
  returnTo: z.string().optional(),
});

export type SaveSpecialistDetailsInput = z.infer<typeof detailsSchema>;

export async function saveSpecialistDetailsAction(input: SaveSpecialistDetailsInput): Promise<{
  success: boolean;
  error?: string;
  redirect?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است." };
    }

    const { city, workArea, bio, equipmentSummary, agreedToTerms, baseLat, baseLng, baseAddress, returnTo } =
      parsed.data;

    // Fetch user and profile with portfolio items
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        specialistProfile: {
          include: {
            portfolioItems: {
              select: { id: true, categorySlug: true, reviewStatus: true },
            },
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "کاربر یافت نشد." };
    }

    const eligibility = evaluateEligibility({
      city,
      baseLat,
      baseLng,
      agreedToTerms,
      portfolioItems: user.specialistProfile?.portfolioItems || [],
      selectedCategories: user.specialistProfile?.selectedCategories,
    });

    const currentStatus = user.specialistProfile?.status;
    const nextStatus = resolveOnboardingStatus(currentStatus, eligibility);

    // Submitting the file is a one-way door into the review queue; re-saving
    // the same details later must not reset the clock on the admin's desk.
    const entersReviewQueue =
      nextStatus === "PENDING_REVIEW" && currentStatus !== "PENDING_REVIEW";
    const reviewTimestamps = entersReviewQueue
      ? { submittedForReviewAt: new Date(), reviewedAt: null, reviewNote: null }
      : {};

    // Upsert specialist profile
    await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        city,
        workArea: workArea || null,
        bio: bio || null,
        equipmentSummary: equipmentSummary || null,
        baseLat,
        baseLng,
        baseAddress: baseAddress || null,
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        status: nextStatus,
        ...reviewTimestamps,
      },
      update: {
        city,
        workArea: workArea || null,
        bio: bio || null,
        equipmentSummary: equipmentSummary || null,
        baseLat,
        baseLng,
        baseAddress: baseAddress || null,
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        status: nextStatus,
        ...reviewTimestamps,
      },
    });

    // Also update User record for display and city filtering
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        city,
        equipment: equipmentSummary || undefined,
        role: user.role === "USER" ? "SPECIALIST" : user.role,
      },
    });

    if (entersReviewQueue) {
      await notifyAdminsOfSpecialistSubmission({
        specialistUserId: session.userId,
        displayName: user.displayName || phoneToLocalDisplay(user.phone),
        city,
      });
    }

    revalidatePath("/specialist/onboarding");
    revalidatePath(SPECIALIST_REVIEW_PATH);
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/portfolio");
    revalidatePath("/profile");
    revalidatePath("/admin/review");

    revalidatePath("/specialist/profile");

    let fallback = "/specialist/onboarding/portfolio";
    if (nextStatus === "ACTIVE") fallback = "/specialist/projects";
    else if (nextStatus === "PENDING_REVIEW") fallback = SPECIALIST_REVIEW_PATH;

    // An approved specialist editing their profile goes back where they came
    // from; anyone still in the queue is sent to the queue, not to the board.
    const canReturn = nextStatus === "ACTIVE";
    const targetRedirect =
      canReturn && returnTo && returnTo.startsWith("/specialist") && !returnTo.startsWith("//")
        ? returnTo
        : fallback;

    return {
      success: true,
      redirect: targetRedirect,
    };
  } catch (err: any) {
    console.error("Error in saveSpecialistDetailsAction:", err);
    return { success: false, error: "خطا در ثبت اطلاعات متخصص." };
  }
}

export async function getSpecialistOnboardingStateAction(): Promise<{
  isLoggedIn: boolean;
  status?: string;
  reviewNote?: string | null;
  submittedForReviewAt?: string | null;
  approvedPortfolioCount?: number;
  rejectedPortfolioCount?: number;
  hasCity?: boolean;
  hasNda?: boolean;
  hasEligiblePortfolio?: boolean;
  maxPortfolioInCategory?: number;
  totalPortfolioItems?: number;
  city?: string | null;
  workArea?: string | null;
  bio?: string | null;
  equipmentSummary?: string | null;
  agreedToTerms?: boolean;
  baseLat?: number | null;
  baseLng?: number | null;
  baseAddress?: string | null;
  nextStep?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { isLoggedIn: false, nextStep: "/join" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      specialistProfile: {
        include: {
          portfolioItems: {
            select: { id: true, categorySlug: true, reviewStatus: true },
          },
        },
      },
    },
  });

  if (!user || !user.specialistProfile) {
    return {
      isLoggedIn: true,
      status: "INCOMPLETE",
      hasCity: false,
      hasNda: false,
      hasEligiblePortfolio: false,
      nextStep: "/specialist/onboarding/portfolio",
    };
  }

  const profile = user.specialistProfile;
  const items = profile.portfolioItems || [];

  // Read only. This function used to activate the specialist as a side effect,
  // so whether someone could take work depended on their having loaded the
  // right page. Activation now happens where the specialist actually submits
  // their details, or when an admin approves their portfolio.
  const eligibility = evaluateEligibility({
    city: profile.city,
    baseLat: profile.baseLat,
    baseLng: profile.baseLng,
    agreedToTerms: profile.agreedToTerms,
    portfolioItems: items,
    selectedCategories: profile.selectedCategories,
  });

  // Progress through onboarding is measured in work the specialist has handed
  // over, not in work an admin has signed off — nothing is approved yet at this
  // point, and counting approvals here stranded people on step one.
  const countByCategory: Record<string, number> = {};
  for (const item of items) {
    if (item.reviewStatus === "REJECTED") continue;
    countByCategory[item.categorySlug] = (countByCategory[item.categorySlug] || 0) + 1;
  }
  const categoryCounts = Object.values(countByCategory);
  const maxPortfolioInCategory = categoryCounts.length > 0 ? Math.max(...categoryCounts) : 0;
  const hasEligiblePortfolio = eligibility.submittableCategories.length > 0;
  const hasCity = eligibility.hasCity;
  const hasNda = eligibility.hasAgreedToTerms;
  const nextStep = specialistLandingPath(profile.status, eligibility);

  return {
    isLoggedIn: true,
    status: profile.status,
    reviewNote: profile.reviewNote,
    submittedForReviewAt: profile.submittedForReviewAt?.toISOString() ?? null,
    approvedPortfolioCount: items.filter((i) => i.reviewStatus === "APPROVED").length,
    rejectedPortfolioCount: items.filter((i) => i.reviewStatus === "REJECTED").length,
    hasCity,
    hasNda,
    hasEligiblePortfolio,
    maxPortfolioInCategory,
    totalPortfolioItems: items.length,
    city: profile.city,
    workArea: profile.workArea,
    bio: profile.bio,
    equipmentSummary: profile.equipmentSummary,
    agreedToTerms: profile.agreedToTerms,
    baseLat: profile.baseLat,
    baseLng: profile.baseLng,
    baseAddress: profile.baseAddress,
    nextStep,
  };
}
