"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const detailsSchema = z.object({
  city: z.string().trim().min(2, "نام شهر الزامی است."),
  workArea: z.string().trim().max(300).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  equipmentSummary: z.string().trim().max(500).optional().nullable(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "پذیرش تعهدنامه و قوانین همکاری الزامی است.",
  }),
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

    const { city, workArea, bio, equipmentSummary, agreedToTerms } = parsed.data;

    // Fetch user and profile with portfolio items
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        specialistProfile: {
          include: {
            portfolioItems: {
              select: { id: true, categorySlug: true },
            },
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "کاربر یافت نشد." };
    }

    if (user.role === "USER") {
      return { success: false, error: "ثبت‌نام عکاسان در حال حاضر امکان‌پذیر نیست." };
    }

    // Check portfolio items per category
    const items = user.specialistProfile?.portfolioItems || [];
    const countByCategory: Record<string, number> = {};
    for (const item of items) {
      countByCategory[item.categorySlug] = (countByCategory[item.categorySlug] || 0) + 1;
    }
    const hasEligiblePortfolio = Object.values(countByCategory).some((count) => count >= 10);

    const nextStatus = hasEligiblePortfolio ? "ACTIVE" : "INCOMPLETE";

    // Upsert specialist profile
    await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        city,
        workArea: workArea || null,
        bio: bio || null,
        equipmentSummary: equipmentSummary || null,
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        status: nextStatus,
      },
      update: {
        city,
        workArea: workArea || null,
        bio: bio || null,
        equipmentSummary: equipmentSummary || null,
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        status: nextStatus,
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

    revalidatePath("/specialist/onboarding");
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/portfolio");
    revalidatePath("/profile");

    const targetRedirect = hasEligiblePortfolio
      ? "/specialist/projects"
      : "/specialist/onboarding/portfolio";

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
            select: { id: true, categorySlug: true },
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
  const countByCategory: Record<string, number> = {};
  for (const item of items) {
    countByCategory[item.categorySlug] = (countByCategory[item.categorySlug] || 0) + 1;
  }
  const categoryCounts = Object.values(countByCategory);
  const maxPortfolioInCategory = categoryCounts.length > 0 ? Math.max(...categoryCounts) : 0;
  const hasEligiblePortfolio = maxPortfolioInCategory >= 10;
  const hasCity = Boolean(profile.city && profile.city.trim().length > 0);
  const hasNda = profile.agreedToTerms === true;

  let nextStep = "/specialist/projects";
  if (!hasEligiblePortfolio) {
    nextStep = "/specialist/onboarding/portfolio";
  } else if (!hasCity || !hasNda) {
    nextStep = "/specialist/onboarding/details";
  } else if (profile.status !== "ACTIVE") {
    // Both criteria met, activate!
    await prisma.specialistProfile.update({
      where: { id: profile.id },
      data: { status: "ACTIVE" },
    });
    nextStep = "/specialist/projects";
  }

  return {
    isLoggedIn: true,
    status: profile.status,
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
    nextStep,
  };
}
