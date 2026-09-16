"use server";

import { z } from "zod";
import { promises as fs } from "fs";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { resolveUploadDiskPath } from "@/lib/storage/uploads";
import {
  evaluateEligibility,
  isPortfolioUploadComplete,
  parseSelectedCategories,
  specialistLandingPath,
  SPECIALIST_REVIEW_PATH,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
} from "@/lib/specialists/eligibility";
import { notifyAdminsOfSpecialistSubmission, missingRequirementLabels } from "@/lib/specialists/review";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { normalizeJalaliBirthDate, verifySpecialistKycWithZohal } from "@/lib/kyc/zohal";
import { isValidIranIban, normalizeShabaDigitsFromInput } from "@/lib/kyc/iban";
import {
  checkKycSubmitRateLimit,
  isValidIranianNationalId,
} from "@/lib/kyc/rateLimit";
import { getKycDeadlineInfo, isKycDeadlineSuspension, KYC_DEADLINE_DAYS } from "@/lib/kyc/gates";
import { reactivateAfterKycIfSuspended } from "@/lib/kyc/deadline";
import {
  parseEquipmentTags,
  serializeEquipmentTags,
} from "@/lib/equipment/catalog";
import { queueSpecialistProfileEdit } from "@/lib/specialists/profileEdit";

const profileBasicsSchema = z.object({
  displayName: z.string().trim().min(2, "نام الزامی است."),
  avatarUrl: z.string().trim().min(1, "عکس پروفایل الزامی است."),
  bio: z
    .string()
    .trim()
    .max(280, "بیوگرافی حداکثر ۲۸۰ کاراکتر.")
    .optional()
    .nullable(),
  returnTo: z.string().trim().max(200).optional(),
});

export async function saveSpecialistProfileBasicsAction(input: {
  displayName: string;
  avatarUrl: string;
  bio?: string | null;
  returnTo?: string;
}): Promise<{
  success: boolean;
  error?: string;
  redirect?: string;
  pendingApproval?: boolean;
}> {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً ابتدا وارد شوید." };
    }

    const parsed = profileBasicsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "نامعتبر" };
    }

    if (/[0-9۰-۹٠-٩]/.test(parsed.data.displayName)) {
      return { success: false, error: "نام نباید شامل عدد باشد." };
    }

    const safeReturnTo =
      parsed.data.returnTo &&
      parsed.data.returnTo.startsWith("/specialist/") &&
      !parsed.data.returnTo.includes("//")
        ? parsed.data.returnTo
        : null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true,
        displayName: true,
        specialistProfile: {
          select: {
            status: true,
            avatarUrl: true,
            pendingProfileEdit: true,
            city: true,
          },
        },
      },
    });
    if (!user) {
      return { success: false, error: "کاربر یافت نشد." };
    }

    const avatarUrl = parsed.data.avatarUrl;
    const avatarPrefix = `/uploads/avatars/avatar_${session.userId.slice(0, 8)}_`;
    if (!avatarUrl.startsWith(avatarPrefix)) {
      return {
        success: false,
        error: "عکس پروفایل معتبر نیست. لطفاً دوباره آپلود کنید.",
      };
    }

    // Reject path tricks and non-image extensions
    if (
      avatarUrl.includes("..") ||
      avatarUrl.includes("%") ||
      !/\.(jpe?g|png|webp)$/i.test(avatarUrl)
    ) {
      return {
        success: false,
        error: "فرمت عکس پروفایل نامعتبر است. فقط JPG، PNG یا WEBP.",
      };
    }

    const diskPath = resolveUploadDiskPath(avatarUrl);
    if (!diskPath) {
      return {
        success: false,
        error: "مسیر عکس پروفایل نامعتبر است. دوباره آپلود کنید.",
      };
    }
    try {
      await fs.access(diskPath);
    } catch {
      return {
        success: false,
        error: "فایل عکس روی سرور پیدا نشد. لطفاً دوباره آپلود کنید.",
      };
    }

    const profile = user.specialistProfile;
    const hasLiveAvatar = Boolean(profile?.avatarUrl?.trim());
    const isActive = profile?.status === "ACTIVE";
    const bioValue =
      parsed.data.bio === undefined
        ? undefined
        : parsed.data.bio?.trim()
          ? parsed.data.bio.trim()
          : null;

    // ACTIVE specialists already have a photo: edits wait for admin approval.
    // Missing avatar is a hard gate — write live so they can re-enter the market.
    if (isActive && hasLiveAvatar) {
      const patch: {
        displayName: string;
        avatarUrl: string;
        bio?: string | null;
      } = {
        displayName: parsed.data.displayName,
        avatarUrl,
      };
      if (bioValue !== undefined) patch.bio = bioValue;

      await queueSpecialistProfileEdit({
        userId: session.userId,
        existingPendingRaw: profile?.pendingProfileEdit,
        patch,
        displayNameForNotify: parsed.data.displayName,
        cityForNotify: profile?.city,
      });
      revalidatePath("/specialist/onboarding/profile");
      revalidatePath("/specialist/portfolio");
      revalidatePath("/admin/review");
      revalidatePath(`/s/${session.userId}`);
      return {
        success: true,
        pendingApproval: true,
        redirect: safeReturnTo || "/specialist/portfolio",
      };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        displayName: parsed.data.displayName,
        role: user.role === "USER" ? "SPECIALIST" : user.role,
      },
    });

    await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        avatarUrl,
        status: "INCOMPLETE",
        ...(bioValue !== undefined ? { bio: bioValue } : {}),
      },
      update: {
        avatarUrl,
        ...(bioValue !== undefined ? { bio: bioValue } : {}),
      },
    });

    revalidatePath("/specialist/onboarding");
    revalidatePath("/specialist/portfolio");
    revalidatePath("/admin/review");
    revalidatePath(`/s/${session.userId}`);

    return {
      success: true,
      redirect:
        safeReturnTo ||
        (isActive ? "/specialist/portfolio" : "/specialist/onboarding/categories"),
    };
  } catch (err) {
    console.error("saveSpecialistProfileBasicsAction:", err);
    return { success: false, error: "خطا در ذخیره اطلاعات پایه." };
  }
}


const detailsSchema = z.object({
  city: z.string().trim().min(2, "نام شهر الزامی است."),
  baseLat: z.number().min(24).max(40, "موقعیت باید داخل ایران باشد."),
  baseLng: z.number().min(43).max(64, "موقعیت باید داخل ایران باشد."),
  baseAddress: z.string().trim().max(300).optional().nullable(),
  workArea: z.string().trim().min(1, "محدوده کاری الزامی است.").max(300),
  equipmentSummary: z.string().trim().min(1, "لیست تجهیزات الزامی است.").max(4000),
  isMobileGrapher: z.boolean().optional(),
  returnTo: z.string().optional(),
});

export type SaveSpecialistDetailsInput = z.infer<typeof detailsSchema>;

export async function saveSpecialistDetailsAction(input: SaveSpecialistDetailsInput): Promise<{
  success: boolean;
  error?: string;
  redirect?: string;
  pendingApproval?: boolean;
}> {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است." };
    }

    const {
      city,
      workArea,
      equipmentSummary: equipmentRaw,
      isMobileGrapher = false,
      baseLat,
      baseLng,
      baseAddress,
      returnTo,
    } = parsed.data;

    const equipmentSummary = serializeEquipmentTags(parseEquipmentTags(equipmentRaw));
    if (!equipmentSummary) {
      return {
        success: false,
        error: isMobileGrapher
          ? "مدل گوشی و تجهیزات موبایل‌گرافی الزامی است."
          : "لیست تجهیزات الزامی است. تمام تجهیزات اصلی خود را اضافه کنید.",
      };
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

    if (!user) {
      return { success: false, error: "کاربر یافت نشد." };
    }

    const agreedToTerms = user.specialistProfile?.agreedToTerms === true;

    const eligibility = evaluateEligibility({
      city,
      baseLat,
      baseLng,
      agreedToTerms,
      avatarUrl: user.specialistProfile?.avatarUrl,
      displayName: user.displayName,
      portfolioItems: user.specialistProfile?.portfolioItems || [],
      selectedCategories: user.specialistProfile?.selectedCategories,
      hasPlan: Boolean(user.planId),
    });

    const currentStatus = user.specialistProfile?.status;

    // ACTIVE specialists: live fields stay public until admin approves the draft.
    if (currentStatus === "ACTIVE" && user.specialistProfile) {
      await queueSpecialistProfileEdit({
        userId: session.userId,
        existingPendingRaw: user.specialistProfile.pendingProfileEdit,
        patch: {
          city,
          workArea: workArea || null,
          equipmentSummary,
          isMobileGrapher,
          baseLat,
          baseLng,
          baseAddress: baseAddress || null,
        },
        displayNameForNotify: user.displayName,
        cityForNotify: city,
      });

      revalidatePath("/specialist/profile");
      revalidatePath("/admin/review");

      const targetRedirect =
        returnTo && returnTo.startsWith("/specialist") && !returnTo.startsWith("//")
          ? returnTo
          : "/specialist/profile";

      return {
        success: true,
        pendingApproval: true,
        redirect: targetRedirect,
      };
    }

    // Location save alone must not enter the review queue — NDA is a separate step.
    const statusToWrite =
      currentStatus === "SUSPENDED" || currentStatus === "PENDING_REVIEW"
        ? currentStatus
        : "INCOMPLETE";

    await prisma.specialistProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        city,
        workArea: workArea || null,
        equipmentSummary,
        isMobileGrapher,
        baseLat,
        baseLng,
        baseAddress: baseAddress || null,
        agreedToTerms: false,
        status: statusToWrite,
      },
      update: {
        city,
        workArea: workArea || null,
        equipmentSummary,
        isMobileGrapher,
        baseLat,
        baseLng,
        baseAddress: baseAddress || null,
        ...(statusToWrite === "INCOMPLETE" ? { status: "INCOMPLETE" as const } : {}),
      },
    });

    const studioRow = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { studioName: true, studioLat: true, studioLng: true },
    });
    const hasRealStudio = Boolean(
      studioRow?.studioName &&
        typeof studioRow.studioLat === "number" &&
        typeof studioRow.studioLng === "number"
    );

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        city,
        equipment: equipmentSummary,
        hasStudio: hasRealStudio,
        role: user.role === "USER" ? "SPECIALIST" : user.role,
      },
    });

    revalidatePath("/specialist/onboarding");
    revalidatePath("/specialist/onboarding/details");
    revalidatePath("/specialist/onboarding/terms");
    revalidatePath("/specialist/profile");

    return {
      success: true,
      redirect: eligibility.nextStep,
    };
  } catch (err: unknown) {
    console.error("Error in saveSpecialistDetailsAction:", err);
    return { success: false, error: "خطا در ثبت اطلاعات متخصص." };
  }
}

/**
 * Final onboarding gate: accept specialist membership terms / NDA and enqueue for admin review.
 */
export async function acceptSpecialistTermsAction(): Promise<{
  success: boolean;
  error?: string;
  redirect?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً وارد شوید." };
    }

    const { headers } = await import("next/headers");
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const ua = h.get("user-agent")?.slice(0, 240) || null;

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

    if (!user?.specialistProfile) {
      return { success: false, error: "پروفایل متخصص یافت نشد." };
    }

    const profile = user.specialistProfile;
    const eligibility = evaluateEligibility({
      city: profile.city,
      baseLat: profile.baseLat,
      baseLng: profile.baseLng,
      agreedToTerms: true,
      avatarUrl: profile.avatarUrl,
      displayName: user.displayName,
      portfolioItems: profile.portfolioItems,
      selectedCategories: profile.selectedCategories,
      hasPlan: Boolean(user.planId),
    });

    if (!eligibility.isSubmittable) {
      const missing = missingRequirementLabels(eligibility);
      return {
        success: false,
        error: missing.length
          ? `پرونده هنوز کامل نیست: ${missing.join("، ")}.`
          : "پرونده برای ارسال کامل نیست.",
        redirect: eligibility.nextStep,
      };
    }

    const currentStatus = profile.status;
    const entersReviewQueue =
      currentStatus !== "PENDING_REVIEW" &&
      currentStatus !== "ACTIVE" &&
      currentStatus !== "SUSPENDED";

    await prisma.specialistProfile.update({
      where: { id: profile.id },
      data: {
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        reviewNote: null,
        ...(currentStatus === "ACTIVE" || currentStatus === "SUSPENDED"
          ? {}
          : {
              status: "PENDING_REVIEW",
              ...(entersReviewQueue
                ? { submittedForReviewAt: new Date(), reviewedAt: null }
                : {}),
            }),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SPECIALIST_TERMS_ACCEPTED",
        targetModel: "SpecialistProfile",
        targetId: profile.id,
        note: [
          "پذیرش تعهدنامه حسن انجام کار / NDA",
          ip ? `IP:${ip}` : null,
          ua ? `UA:${ua}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    });

    if (entersReviewQueue) {
      await notifyAdminsOfSpecialistSubmission({
        specialistUserId: session.userId,
        displayName: user.displayName || phoneToLocalDisplay(user.phone),
        city: profile.city || "",
      });
    }

    revalidatePath("/specialist/onboarding");
    revalidatePath("/specialist/onboarding/terms");
    revalidatePath(SPECIALIST_REVIEW_PATH);
    revalidatePath("/admin/review");

    return {
      success: true,
      redirect:
        currentStatus === "ACTIVE"
          ? "/specialist/projects"
          : SPECIALIST_REVIEW_PATH,
    };
  } catch (err) {
    console.error("acceptSpecialistTermsAction:", err);
    return { success: false, error: "خطا در ثبت پذیرش تعهدنامه." };
  }
}

const kycSubmitSchema = z.object({
  nationalId: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  birthDate: z
    .string()
    .trim()
    .min(8, "تاریخ تولد الزامی است.")
    .refine((v) => normalizeJalaliBirthDate(v) !== null, {
      message: "فرمت تاریخ تولد نامعتبر است (مثال: ۱۳۷۰/۵/۱۷).",
    }),
  shaba: z
    .string()
    .trim()
    .transform((v) => {
      const digits = normalizeShabaDigitsFromInput(v);
      return `IR${digits}`;
    })
    .refine((v) => /^IR[0-9]{24}$/.test(v), {
      message: "شماره شبا نامعتبر است — باید IR و ۲۴ رقم باشد (خود IR را در کادر رقم ننویسید).",
    })
    .refine((v) => isValidIranIban(v), {
      message:
        "رقم‌های شبا از نظر کنترل بانکی نامعتبر است. احتمالاً یک یا چند رقم اشتباه است؛ از اپ بانک کپی کنید.",
    }),
});

function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function maskNationalId(id: string) {
  const n = toEnglishDigits(id);
  return `${n.slice(0, 3)}****${n.slice(-2)}`;
}

function maskShaba(shaba: string) {
  const s = toEnglishDigits(shaba).replace(/\s/g, "").toUpperCase();
  const withIr = s.startsWith("IR") ? s : `IR${s}`;
  return `${withIr.slice(0, 4)}****${withIr.slice(-4)}`;
}

/**
 * Collects KYC fields and runs Shahkar + identity + IBAN checks via Zohal.
 * Soft admin PENDING is no longer created — outages stay ERROR so the specialist retries.
 */
export async function submitSpecialistKycAction(input: {
  nationalId: string;
  birthDate: string;
  shaba: string;
}): Promise<{
  success: boolean;
  error?: string;
  status?: "VERIFIED" | "FAILED" | "ERROR";
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
  bankName?: string | null;
}> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً وارد شوید." };
    }

    const parsed = kycSubmitSchema.safeParse({
      nationalId: toEnglishDigits(input.nationalId),
      birthDate: input.birthDate,
      shaba: toEnglishDigits(input.shaba),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر" };
    }

    if (!isValidIranianNationalId(parsed.data.nationalId)) {
      return {
        success: false,
        error:
          "کد ملی از نظر رقم کنترلی معتبر نیست. ۱۰ رقم را با کارت ملی دوباره چک کنید (اشتباه تایپی رایج است).",
      };
    }

    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        status: true,
        kycStatus: true,
        reviewNote: true,
        reviewedAt: true,
        user: { select: { phone: true } },
      },
    });

    if (!profile) {
      return {
        success: false,
        error: "احراز هویت بعد از تایید کیفی پرونده فعال می‌شود.",
      };
    }

    const canSubmitWhileSuspended =
      profile.status === "SUSPENDED" && isKycDeadlineSuspension(profile.reviewNote);
    if (profile.status !== "ACTIVE" && !canSubmitWhileSuspended) {
      return {
        success: false,
        error: "احراز هویت بعد از تایید کیفی پرونده فعال می‌شود.",
      };
    }

    if (profile.kycStatus === "VERIFIED") {
      return { success: true, status: "VERIFIED" };
    }

    // PENDING no longer soft-locks retries (old API-glitch PENDING was a trap).
    // Rate limit still caps paid inquiries.

    if (!profile.user?.phone) {
      return { success: false, error: "شماره موبایل حساب یافت نشد." };
    }

    const rateError = await checkKycSubmitRateLimit(profile.id);
    if (rateError) {
      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: "SPECIALIST_KYC_BLOCKED",
          targetModel: "SpecialistProfile",
          targetId: profile.id,
          note: rateError,
        },
      }).catch(() => undefined);
      return { success: false, error: rateError };
    }

    let shaba = parsed.data.shaba.toUpperCase().replace(/\s/g, "");
    if (!shaba.startsWith("IR")) shaba = `IR${shaba}`;
    if (!/^IR[0-9]{24}$/.test(shaba)) {
      return { success: false, error: "شماره شبا باید IR و ۲۴ رقم باشد." };
    }

    // Count this attempt before paid inquiries (anti-spam accounting).
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SPECIALIST_KYC_ATTEMPT",
        targetModel: "SpecialistProfile",
        targetId: profile.id,
        note: `mask=${maskNationalId(parsed.data.nationalId)}/${maskShaba(shaba)}`,
      },
    });

    const verification = await verifySpecialistKycWithZohal({
      phone: profile.user.phone,
      nationalId: parsed.data.nationalId,
      birthDate: parsed.data.birthDate,
      shaba,
    });

    const now = new Date();
    const baseData = {
      kycNationalIdMask: maskNationalId(parsed.data.nationalId),
      kycShabaMask: maskShaba(shaba),
      kycSubmittedAt: now,
    };

    if (verification.status === "ERROR") {
      // Clear legacy soft-PENDING so this case leaves the admin KYC queue;
      // specialist keeps retrying Zohal on the form.
      if (profile.kycStatus === "PENDING") {
        await prisma.specialistProfile.update({
          where: { id: profile.id },
          data: {
            ...baseData,
            kycStatus: "NONE",
            kycVerifiedAt: null,
            kycFailureReason: verification.reason,
          },
        });
      }
      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: "SPECIALIST_KYC_SUBMITTED",
          targetModel: "SpecialistProfile",
          targetId: profile.id,
          note: `ERROR — ${verification.reason}`,
        },
      });
      return { success: false, error: verification.reason, status: "ERROR" };
    }

    if (verification.status === "VERIFIED") {
      await prisma.specialistProfile.update({
        where: { id: profile.id },
        data: {
          ...baseData,
          kycStatus: "VERIFIED",
          kycVerifiedAt: now,
          kycFailureReason: null,
          kycBankName: verification.bankName || null,
          kycFirstName: verification.firstName,
          kycLastName: verification.lastName,
          kycFatherName: verification.fatherName || null,
        },
      });
      await reactivateAfterKycIfSuspended(profile.id);
    } else {
      await prisma.specialistProfile.update({
        where: { id: profile.id },
        data: {
          ...baseData,
          kycStatus: "FAILED",
          kycVerifiedAt: null,
          kycFailureReason: verification.reason,
          kycBankName: null,
          kycFirstName: null,
          kycLastName: null,
          kycFatherName: null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SPECIALIST_KYC_SUBMITTED",
        targetModel: "SpecialistProfile",
        targetId: profile.id,
        note: `${verification.status}${
          verification.status === "VERIFIED"
            ? ` — ${verification.firstName} ${verification.lastName}`
            : ` — ${verification.reason}`
        }`,
      },
    });

    if (verification.status === "VERIFIED") {
      await prisma.notification.create({
        data: {
          userId: session.userId,
          title: "احراز هویت تایید شد",
          message: `هویت «${verification.firstName} ${verification.lastName}» و شبا با موفقیت تایید شد. تسویه کیف‌پول فعال است.`,
          type: "SUCCESS",
          link: "/specialist/projects",
        },
      }).catch(() => undefined);
    } else if (verification.status === "FAILED") {
      await prisma.notification.create({
        data: {
          userId: session.userId,
          title: "احراز هویت رد شد",
          message:
            verification.reason ||
            "اطلاعات واردشده با استعلام مطابقت نداشت. پس از اصلاح دوباره تلاش کنید.",
          type: "WARNING",
          link: "/specialist/onboarding/identity",
        },
      }).catch(() => undefined);
    }

    revalidatePath("/specialist/onboarding/identity");
    revalidatePath("/admin/review");
    revalidatePath("/dashboard/wallet");

    if (verification.status === "FAILED") {
      return { success: false, error: verification.reason, status: "FAILED" };
    }

    if (verification.status === "VERIFIED") {
      return {
        success: true,
        status: "VERIFIED",
        firstName: verification.firstName,
        lastName: verification.lastName,
        fatherName: verification.fatherName,
        bankName: verification.bankName || null,
      };
    }

    return { success: false, error: "نتیجه استعلام نامشخص بود.", status: "ERROR" };
  } catch (err) {
    console.error("submitSpecialistKycAction:", err);
    return { success: false, error: "خطا در ثبت احراز هویت." };
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
  hasAvatar?: boolean;
  hasCategories?: boolean;
  hasDisplayName?: boolean;
  hasEligiblePortfolio?: boolean;
  hasPlan?: boolean;
  maxPortfolioInCategory?: number;
  fulfilledPortfolioCategories?: number;
  selectedCategoryCount?: number;
  totalPortfolioItems?: number;
  city?: string | null;
  workArea?: string | null;
  bio?: string | null;
  equipmentSummary?: string | null;
  isMobileGrapher?: boolean;
  hasStudio?: boolean;
  agreedToTerms?: boolean;
  baseLat?: number | null;
  baseLng?: number | null;
  baseAddress?: string | null;
  studioName?: string | null;
  studioLat?: number | null;
  studioLng?: number | null;
  studioAddress?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  phoneDisplay?: string;
  selectedCategories?: string[];
  kycStatus?: string;
  kycNationalIdMask?: string | null;
  kycShabaMask?: string | null;
  kycFailureReason?: string | null;
  kycBankName?: string | null;
  kycFirstName?: string | null;
  kycLastName?: string | null;
  kycFatherName?: string | null;
  /** ISO start of KYC grace (admin approval). */
  reviewedAt?: string | null;
  kycDeadlineDaysLeft?: number | null;
  kycDeadlineExpired?: boolean;
  kycDeadlineEndsAt?: string | null;
  kycDeadlineDays?: number;
  profileEditStatus?: string;
  profileEditNote?: string | null;
  profileEditSubmittedAt?: string | null;
  nextStep?: string;
  currentStepId?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { isLoggedIn: false, nextStep: "/join" };
  }

  await ensurePrismaSchemaReady();

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
    return { isLoggedIn: false, nextStep: "/join" };
  }

  if (!user.specialistProfile) {
    return {
      isLoggedIn: true,
      status: "INCOMPLETE",
      hasCity: false,
      hasNda: false,
      hasAvatar: false,
      hasCategories: false,
      hasDisplayName: Boolean(user.displayName && user.displayName.length >= 2),
      hasEligiblePortfolio: false,
      displayName: user.displayName,
      phoneDisplay: phoneToLocalDisplay(user.phone),
      nextStep: "/specialist/onboarding/profile",
      currentStepId: "profile",
    };
  }

  const profile = user.specialistProfile;
  const items = profile.portfolioItems || [];

  const eligibility = evaluateEligibility({
    city: profile.city,
    baseLat: profile.baseLat,
    baseLng: profile.baseLng,
    agreedToTerms: profile.agreedToTerms,
    avatarUrl: profile.avatarUrl,
    displayName: user.displayName,
    portfolioItems: items,
    selectedCategories: profile.selectedCategories,
    hasPlan: Boolean(user.planId),
  });

  const countByCategory: Record<string, number> = {};
  for (const item of items) {
    if (item.reviewStatus === "REJECTED") continue;
    countByCategory[item.categorySlug] = (countByCategory[item.categorySlug] || 0) + 1;
  }
  const categoryCounts = Object.values(countByCategory);
  const maxPortfolioInCategory = categoryCounts.length > 0 ? Math.max(...categoryCounts) : 0;
  const nextStep = specialistLandingPath(
    profile.status,
    eligibility,
    profile.kycStatus,
    profile.reviewNote
  );

  const selectedCategories = parseSelectedCategories(profile.selectedCategories);
  const fulfilledPortfolioCategories = selectedCategories.filter(
    (slug) => (countByCategory[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  ).length;

  const kycDeadline = getKycDeadlineInfo({
    reviewedAt: profile.reviewedAt,
    kycStatus: profile.kycStatus,
  });

  return {
    isLoggedIn: true,
    status: profile.status,
    reviewNote: profile.reviewNote,
    submittedForReviewAt: profile.submittedForReviewAt?.toISOString() ?? null,
    approvedPortfolioCount: items.filter((i) => i.reviewStatus === "APPROVED").length,
    rejectedPortfolioCount: items.filter((i) => i.reviewStatus === "REJECTED").length,
    hasCity: eligibility.hasCity,
    hasNda: eligibility.hasAgreedToTerms,
    hasAvatar: eligibility.hasAvatar,
    hasCategories: eligibility.hasCategories,
    hasDisplayName: eligibility.hasDisplayName,
    hasEligiblePortfolio: isPortfolioUploadComplete(eligibility),
    hasPlan: eligibility.hasPlan,
    maxPortfolioInCategory,
    fulfilledPortfolioCategories,
    selectedCategoryCount: selectedCategories.length,
    totalPortfolioItems: items.length,
    city: profile.city,
    workArea: profile.workArea,
    bio: profile.bio,
    equipmentSummary: profile.equipmentSummary,
    isMobileGrapher: Boolean(profile.isMobileGrapher),
    hasStudio: Boolean(
      profile.studioName &&
        typeof profile.studioLat === "number" &&
        typeof profile.studioLng === "number"
    ),
    agreedToTerms: profile.agreedToTerms,
    baseLat: profile.baseLat,
    baseLng: profile.baseLng,
    baseAddress: profile.baseAddress,
    studioName: profile.studioName,
    studioLat: profile.studioLat,
    studioLng: profile.studioLng,
    studioAddress: profile.studioAddress,
    avatarUrl: profile.avatarUrl,
    displayName: user.displayName,
    phoneDisplay: phoneToLocalDisplay(user.phone),
    selectedCategories,
    kycStatus: profile.kycStatus,
    kycNationalIdMask: profile.kycNationalIdMask,
    kycShabaMask: profile.kycShabaMask,
    kycFailureReason: profile.kycFailureReason,
    kycBankName: profile.kycBankName,
    kycFirstName: profile.kycFirstName,
    kycLastName: profile.kycLastName,
    kycFatherName: profile.kycFatherName,
    reviewedAt: profile.reviewedAt?.toISOString() ?? null,
    kycDeadlineDaysLeft: kycDeadline.daysLeft,
    kycDeadlineExpired: kycDeadline.isExpired,
    kycDeadlineEndsAt: kycDeadline.endsAt?.toISOString() ?? null,
    kycDeadlineDays: KYC_DEADLINE_DAYS,
    profileEditStatus: profile.profileEditStatus,
    profileEditNote: profile.profileEditNote,
    profileEditSubmittedAt: profile.profileEditSubmittedAt?.toISOString() ?? null,
    nextStep,
    currentStepId: eligibility.currentStepId,
  };
}

const studioSchema = z.object({
  studioName: z.string().trim().max(120).optional(),
  studioLat: z.number().min(24).max(40).optional(),
  studioLng: z.number().min(43).max(64).optional(),
  studioAddress: z.string().trim().max(300).optional().nullable(),
  clear: z.boolean().optional(),
});

export type SaveSpecialistStudioInput = z.infer<typeof studioSchema>;

/** Separate from travel-base: registers the specialist's fixed studio / space. */
export async function saveSpecialistStudioAction(
  input: SaveSpecialistStudioInput
): Promise<{ success: boolean; error?: string; pendingApproval?: boolean }> {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً ابتدا وارد شوید." };
    }

    const parsed = studioSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { specialistProfile: true },
    });
    if (!user?.specialistProfile) {
      return { success: false, error: "پروفایل متخصص یافت نشد." };
    }

    const { studioName, studioLat, studioLng, studioAddress, clear } = parsed.data;
    const profile = user.specialistProfile;

    if (profile.status === "ACTIVE") {
      if (clear) {
        await queueSpecialistProfileEdit({
          userId: session.userId,
          existingPendingRaw: profile.pendingProfileEdit,
          patch: { clearStudio: true },
          displayNameForNotify: user.displayName,
          cityForNotify: profile.city,
        });
      } else {
        const name = (studioName || "").trim();
        if (name.length < 2) {
          return { success: false, error: "نام استودیو الزامی است." };
        }
        if (typeof studioLat !== "number" || typeof studioLng !== "number") {
          return { success: false, error: "لوکیشن استودیو را روی نقشه مشخص کنید." };
        }
        await queueSpecialistProfileEdit({
          userId: session.userId,
          existingPendingRaw: profile.pendingProfileEdit,
          patch: {
            studioName: name,
            studioLat,
            studioLng,
            studioAddress: studioAddress || null,
            clearStudio: false,
          },
          displayNameForNotify: user.displayName,
          cityForNotify: profile.city,
        });
      }

      revalidatePath("/specialist/studio");
      revalidatePath("/specialist/profile");
      revalidatePath("/admin/review");
      return { success: true, pendingApproval: true };
    }

    if (clear) {
      await prisma.specialistProfile.update({
        where: { userId: session.userId },
        data: {
          studioName: null,
          studioLat: null,
          studioLng: null,
          studioAddress: null,
        },
      });
      await prisma.user.update({
        where: { id: session.userId },
        data: { hasStudio: false },
      });
    } else {
      const name = (studioName || "").trim();
      if (name.length < 2) {
        return { success: false, error: "نام استودیو الزامی است." };
      }
      if (typeof studioLat !== "number" || typeof studioLng !== "number") {
        return { success: false, error: "لوکیشن استودیو را روی نقشه مشخص کنید." };
      }
      await prisma.specialistProfile.update({
        where: { userId: session.userId },
        data: {
          studioName: name,
          studioLat,
          studioLng,
          studioAddress: studioAddress || null,
        },
      });
      await prisma.user.update({
        where: { id: session.userId },
        data: { hasStudio: true },
      });
    }

    revalidatePath("/specialist/studio");
    revalidatePath("/specialist/profile");
    revalidatePath(`/s/${session.userId}`);
    return { success: true };
  } catch (err) {
    console.error("saveSpecialistStudioAction:", err);
    return { success: false, error: "خطا در ذخیره استودیو." };
  }
}
