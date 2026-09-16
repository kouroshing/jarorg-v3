"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { getMarketplaceSettings } from "@/lib/orders/settings";
import {
  UNDISMISS_SHOW_MARKER,
  canAfford,
  getTokenBalance,
  outOfTokensMessage,
} from "@/lib/orders/tokens";
import { conflictMessage, findScheduleConflict } from "@/lib/orders/conflicts";
import { listSpecialistCommittedAgenda } from "@/lib/orders/specialistAgenda";
import { proposalTotal, quoteTravel } from "@/lib/orders/travel";
import { resolveScheduledAt } from "@/lib/date/jalali";
import {
  resolveLocationCover,
  formatApproxShootArea,
  parseLocationImageUrls,
} from "@/lib/locations/photoLocation";
import { getBudgetStops } from "@/lib/pricing/budgetStops";
import {
  type OrderStatus,
  OPEN_TO_APPLICANTS_STATUSES,
  isClientCancellable,
  isOpenToApplicants,
  parseOrderStatus,
  storedValuesFor,
} from "@/lib/orders/status";
import {
  buildClientCancelNote,
  CLIENT_CANCEL_REASONS,
  type ClientCancelReasonId,
} from "@/lib/orders/cancelReasons";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";
import { getSpecialistRatingAggregates } from "@/lib/specialists/publicStats";
import {
  parseSelectedCategories,
} from "@/lib/specialists/eligibility";
import {
  formatKycDeadlineMessage,
  getKycDeadlineInfo,
  isKycMarketplaceReady,
  kycMarketplaceBlockMessage,
  kycSelectBlockMessage,
} from "@/lib/kyc/gates";
import { enforceKycDeadlineForSpecialist } from "@/lib/kyc/deadline";
import { revealDueOrderContacts } from "@/lib/orders/revealContacts";
import { applyDueNoMatches } from "@/lib/orders/noMatch";

// -------------------------------------------------------------
// Validation Schemas
// -------------------------------------------------------------

const orderIdSchema = z.string().uuid("شناسه سفارش نامعتبر است.");

const interestIdSchema = z.string().uuid("شناسه پیشنهاد نامعتبر است.");

const selectSpecialistSchema = z.object({
  orderId: z.string().uuid("شناسه سفارش نامعتبر است."),
  interestId: z.string().uuid("شناسه متقاضی نامعتبر است."),
});

const submitInterestSchema = z
  .object({
    orderId: z.string().uuid("شناسه سفارش نامعتبر است."),
    message: z
      .string()
      .trim()
      .min(5, "متن پیام معرفی باید حداقل ۵ کاراکتر باشد.")
      .max(1000, "متن پیام نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد."),
    proposedPrice: z
      .number()
      .int("مبلغ پیشنهادی باید عدد صحیح باشد.")
      .positive("مبلغ پیشنهادی باید بیشتر از صفر باشد.")
      .optional()
      .nullable(),
    travelFeeOverride: z
      .number()
      .int("هزینه ایاب‌وذهاب باید عدد صحیح باشد.")
      .min(0, "هزینه ایاب‌وذهاب نمی‌تواند منفی باشد.")
      .optional()
      .nullable(),
    travelFeeOverrideReason: z
      .string()
      .trim()
      .max(300, "توضیح نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد.")
      .optional()
      .nullable(),
    scheduleStance: z
      .enum(["ACCEPT_CLIENT", "PROPOSE"])
      .default("ACCEPT_CLIENT"),
    proposedBookingDate: z.string().trim().max(32).optional().nullable(),
    proposedTimeSlot: z.string().trim().max(80).optional().nullable(),
    proposedPhotoLocationId: z
      .string()
      .trim()
      .max(64)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine(
    (v) =>
      v.travelFeeOverride == null || (v.travelFeeOverrideReason?.length ?? 0) >= 5,
    {
      message: "برای تغییر هزینه ایاب‌وذهاب باید دلیلش را بنویسید.",
      path: ["travelFeeOverrideReason"],
    }
  )
  .refine(
    (v) =>
      v.scheduleStance !== "PROPOSE" ||
      (!!v.proposedBookingDate && !!v.proposedTimeSlot),
    {
      message: "برای پیشنهاد زمان، تاریخ و بازه الزامی است.",
      path: ["proposedBookingDate"],
    }
  );

export type SubmitProjectInterestInput = z.infer<typeof submitInterestSchema>;

// -------------------------------------------------------------
// Specialist Authorization & Eligibility Engine
export type { SpecialistEligibilityResult, SpecialistStatus } from "@/lib/auth/specialistAuth";
import { getAuthorizedSpecialist } from "@/lib/auth/specialistAuth";

export type SpecialistTokenSummary = {
  granted: number;
  spent: number;
  remaining: number;
  planName: string;
  costApply: number;
  costDismiss: number;
};

export interface AvailableOrderSpecialistView {
  id: string;
  categorySlug: string;
  categoryTitle: string;
  isFlexibleSchedule: boolean;
  bookingDate: string | null;
  timeSlot: string | null;
  durationHours: number;
  locationType: string;
  districtOrCity: string | null;
  /**
   * Shoot location context for specialists (pre-payment).
   * Exact address stays in `contact` until reveal — only an approximate area here.
   */
  locationContext: {
    kind: "JAR_LOCATION" | "CUSTOM_PIN" | "SPECIALIST_ADVICE" | "JAR_STUDIO";
    photoLocation: {
      id: string;
      name: string;
      slug: string;
      coverImageUrl: string | null;
      /** Up to 3 gallery thumbs for the open-board card (no exact map). */
      previewImageUrls: string[];
      district: string | null;
      city: string | null;
    } | null;
    /** Human-readable approximate area (never street-level). */
    approxArea: string;
    hasPinnedCoords: boolean;
  };
  /** Platform commission % on the specialist fee (for payout estimate in UI). */
  specialistCommissionPercent: number;
  referenceLink: string | null;
  moodboardUrls: string[];
  projectDescription: string | null;
  isAutoPriced: boolean;
  hourlyRate: number;
  totalEstimatedPrice: number;
  depositAmount: number;
  status: string;
  selectedSpecialistId: string | null;
  createdAt: string;
  interestsCount: number;
  hasApplied: boolean;
  /**
   * What Jar will add to this specialist's fee for getting to the shoot.
   * null when either side has no coordinates — an older order, or a specialist
   * who has not set their base — so the UI can say "not calculated" instead of
   * showing a misleading zero.
   */
  travel: {
    distanceKm: number;
    fee: number;
    isFree: boolean;
  } | null;
  /**
   * Released only to the selected specialist, and only once payment has
   * cleared. null in every other case — including for the specialist who won
   * the job but whose client has not paid yet.
   */
  contact: {
    name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  myInterest: {
    id: string;
    status: string; // PENDING, WITHDRAWN, SELECTED, ACCEPTED, DECLINED, REJECTED, CANCELLED
    message: string | null;
    proposedPrice: number | null;
    travelFee: number | null;
    travelFeeOverride: number | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface ApplicantSpecialistView {
  id: string;
  specialistId: string;
  status: string;
  message: string | null;
  /** The specialist's own fee, travel excluded. */
  proposedPrice: number | null;
  /** Travel Jar quoted, and what the specialist charges if they adjusted it. */
  travelFee: number | null;
  travelFeeOverride: number | null;
  travelFeeOverrideReason: string | null;
  distanceKm: number | null;
  /** proposedPrice plus the effective travel fee — what the client pays. */
  totalPrice: number;
  /** Jar floor for this order (client estimate); bids cannot go below. */
  jarBasePrice: number;
  scheduleStance: string;
  proposedBookingDate: string | null;
  proposedTimeSlot: string | null;
  proposedPhotoLocation: {
    id: string;
    name: string;
    slug: string;
    coverImageUrl: string | null;
    district: string | null;
    city: string | null;
  } | null;
  createdAt: string;
  specialist: {
    id: string;
    displayName: string;
    city: string;
    bio: string | null;
    equipment: string | null;
    hasStudio: boolean;
    isMobileGrapher: boolean;
    isBlueTick: boolean;
    avatarUrl: string | null;
    completedProjects: number;
    approvedPortfolio: number;
    avgRating: number | null;
    ratingCount: number;
    portfolioItems: {
      id: string;
      fileUrl: string;
      mediaType: string;
      title: string | null;
    }[];
  };
}

// -------------------------------------------------------------
// 1. Get Available Orders for Specialist Feed
// -------------------------------------------------------------
export async function getAvailableOrdersForSpecialistAction(): Promise<{
  success: boolean;
  error?: string;
  redirectTo?: string;
  orders?: AvailableOrderSpecialistView[];
  tokens?: SpecialistTokenSummary;
  /** Marketplace apply requires VERIFIED. */
  kycStatus?: string | null;
  kycReady?: boolean;
  /** Days left in post-approval KYC window (null if verified / no clock). */
  kycDeadlineDaysLeft?: number | null;
  kycDeadlineExpired?: boolean;
  kycDeadlineMessage?: string | null;
  kycDeadlineEndsAt?: string | null;
  /** Specialist home city — used to bias the open-board filter. */
  specialistCity?: string | null;
  /** True when baseLat/baseLng are set — travel quotes need this. */
  specialistHasBase?: boolean;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    // Auto-suspend if ACTIVE + past 7-day KYC window without VERIFIED.
    const deadlineGate = await enforceKycDeadlineForSpecialist(session.userId);
    // Lazy cron fallbacks so contact reveal / NO_MATCH do not depend only on jobs.
    await Promise.all([
      revealDueOrderContacts({ limit: 10 }).catch(() => 0),
      applyDueNoMatches({ limit: 8 }).catch(() => 0),
    ]);
    if (deadlineGate.suspendedNow) {
      return {
        success: false,
        error: formatKycDeadlineMessage(deadlineGate.deadline, deadlineGate.kycStatus),
        redirectTo: "/specialist/onboarding/identity",
        kycStatus: deadlineGate.kycStatus,
        kycReady: false,
        kycDeadlineDaysLeft: 0,
        kycDeadlineExpired: true,
        kycDeadlineMessage: formatKycDeadlineMessage(
          deadlineGate.deadline,
          deadlineGate.kycStatus
        ),
        kycDeadlineEndsAt: deadlineGate.deadline.endsAt?.toISOString() ?? null,
      };
    }

    // Specialist Authorization Guard
    const authCheck = await getAuthorizedSpecialist(session.userId);
    if (!authCheck.isSpecialist) {
      return {
        success: false,
        error: authCheck.error,
        redirectTo: authCheck.redirectTo,
      };
    }

    const kycRow = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { kycStatus: true, city: true, reviewedAt: true },
    });
    const kycStatus = kycRow?.kycStatus ?? "NONE";
    const kycReady = isKycMarketplaceReady(kycStatus);
    const deadline = getKycDeadlineInfo({
      reviewedAt: kycRow?.reviewedAt,
      kycStatus,
    });
    const specialistCity = kycRow?.city ?? authCheck.specialistProfile?.city ?? null;

    // Orders that are open for proposals OR where this specialist is selected/has applied
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          {
            status: { in: storedValuesFor(...OPEN_TO_APPLICANTS_STATUSES) },
            NOT: {
              OR: [
                { userId: session.userId },
                ...(session.phone ? [{ contactPhone: session.phone }] : []),
              ],
            },
          },
          {
            selectedSpecialistId: session.userId,
          },
          {
            interests: {
              some: { specialistId: session.userId },
            },
          },
        ],
        // A project the specialist dismissed stays out of their feed
        // (unless they undismissed — marker keeps the token spend).
        NOT: {
          interests: {
            some: {
              specialistId: session.userId,
              status: "NOT_INTERESTED",
              NOT: { travelFeeOverrideReason: UNDISMISS_SHOW_MARKER },
            },
          },
        },
      },
      include: {
        photoLocation: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImageUrl: true,
            imageUrls: true,
            district: true,
            city: true,
            status: true,
          },
        },
        interests: {
          where: { specialistId: session.userId },
          select: {
            id: true,
            status: true,
            message: true,
            proposedPrice: true,
            travelFee: true,
            travelFeeOverride: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            interests: {
              where: { status: { in: ["PENDING", "SELECTED", "ACCEPTED"] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const settings = await getMarketplaceSettings();
    const base =
      authCheck.specialistProfile?.baseLat != null && authCheck.specialistProfile?.baseLng != null
        ? { lat: authCheck.specialistProfile.baseLat, lng: authCheck.specialistProfile.baseLng }
        : null;

    const mapped: AvailableOrderSpecialistView[] = orders.map((o) => {
      const myInterest = o.interests[0] || null;
      let moodboardList: string[] = [];
      try {
        if (o.moodboardUrls) {
          moodboardList = JSON.parse(o.moodboardUrls);
        }
      } catch {
        moodboardList = [];
      }

      // Considered applied if an active (non-withdrawn, non-declined) interest exists
      const hasApplied = !!(
        myInterest &&
        myInterest.status !== "WITHDRAWN" &&
        myInterest.status !== "DECLINED"
      );

      const quote = quoteTravel(
        base,
        o.locationLat != null && o.locationLng != null
          ? { lat: o.locationLat, lng: o.locationLng }
          : null,
        settings
      );

      return {
        id: o.id,
        categorySlug: o.categorySlug,
        categoryTitle: o.categoryTitle || o.categorySlug,
        isFlexibleSchedule: o.isFlexibleSchedule,
        bookingDate: o.bookingDate,
        timeSlot: o.timeSlot,
        durationHours: o.durationHours,
        locationType: o.locationType,
        districtOrCity: o.districtOrCity,
        locationContext: (() => {
          const hasPinnedCoords =
            o.locationLat != null &&
            o.locationLng != null &&
            Number.isFinite(o.locationLat) &&
            Number.isFinite(o.locationLng);
          const jar =
            o.photoLocation && o.photoLocation.status === "APPROVED"
              ? (() => {
                  const gallery = parseLocationImageUrls(o.photoLocation!.imageUrls);
                  const cover = resolveLocationCover(
                    o.photoLocation!.coverImageUrl,
                    gallery
                  );
                  const previewImageUrls = Array.from(
                    new Set([cover, ...gallery].filter(Boolean) as string[])
                  ).slice(0, 3);
                  return {
                    id: o.photoLocation!.id,
                    name: o.photoLocation!.name,
                    slug: o.photoLocation!.slug,
                    coverImageUrl: cover,
                    previewImageUrls,
                    district: o.photoLocation!.district,
                    city: o.photoLocation!.city,
                  };
                })()
              : null;
          const approxArea = formatApproxShootArea({
            districtOrCity: o.districtOrCity,
            city: jar?.city,
            district: jar?.district,
          });

          if (o.locationType === "SPECIALIST_ADVICE") {
            return {
              kind: "SPECIALIST_ADVICE" as const,
              photoLocation: null,
              approxArea: formatApproxShootArea({
                districtOrCity: o.districtOrCity,
              }),
              hasPinnedCoords: false,
            };
          }
          if (o.locationType === "JAR_STUDIO") {
            return {
              kind: "JAR_STUDIO" as const,
              photoLocation: jar,
              approxArea,
              hasPinnedCoords,
            };
          }
          if (jar) {
            return {
              kind: "JAR_LOCATION" as const,
              photoLocation: jar,
              approxArea,
              hasPinnedCoords,
            };
          }
          return {
            kind: "CUSTOM_PIN" as const,
            photoLocation: null,
            approxArea,
            hasPinnedCoords,
          };
        })(),
        specialistCommissionPercent: settings.specialistCommission,
        referenceLink: o.referenceLink,
        moodboardUrls: moodboardList,
        projectDescription: o.projectDescription,
        isAutoPriced: o.isAutoPriced,
        hourlyRate: o.hourlyRate,
        totalEstimatedPrice: o.totalEstimatedPrice,
        depositAmount: o.depositAmount,
        status: o.status,
        selectedSpecialistId: o.selectedSpecialistId,
        createdAt: o.createdAt.toISOString(),
        interestsCount: o._count.interests,
        hasApplied,
        travel: quote
          ? { distanceKm: quote.distanceKm, fee: quote.fee, isFree: quote.isFree }
          : null,
        contact:
          o.contactRevealedAt && o.selectedSpecialistId === session.userId
            ? {
                name: o.contactName,
                phone: o.contactPhone,
                address: o.locationAddress,
              }
            : null,
        myInterest: myInterest
          ? {
              id: myInterest.id,
              status: myInterest.status,
              message: myInterest.message,
              proposedPrice: myInterest.proposedPrice,
              travelFee: myInterest.travelFee,
              travelFeeOverride: myInterest.travelFeeOverride,
              createdAt: myInterest.createdAt.toISOString(),
              updatedAt: myInterest.updatedAt.toISOString(),
            }
          : null,
      };
    });

    mapped.sort((a, b) => {
      const da = a.travel?.distanceKm;
      const db = b.travel?.distanceKm;
      const aHas = typeof da === "number" && Number.isFinite(da);
      const bHas = typeof db === "number" && Number.isFinite(db);
      if (aHas && bHas && da !== db) return (da as number) - (db as number);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const balance = await getTokenBalance(session.userId);

    return {
      success: true,
      orders: mapped,
      kycStatus,
      kycReady,
      kycDeadlineDaysLeft: deadline.daysLeft,
      kycDeadlineExpired: deadline.isExpired,
      kycDeadlineMessage: formatKycDeadlineMessage(deadline, kycStatus) || null,
      kycDeadlineEndsAt: deadline.endsAt?.toISOString() ?? null,
      specialistCity,
      specialistHasBase: Boolean(base),
      tokens: {
        granted: balance.granted,
        spent: balance.spent,
        remaining: balance.remaining,
        planName: balance.planName,
        costApply: balance.costApply,
        costDismiss: balance.costDismiss,
      },
    };
  } catch (error: any) {
    console.error("Error in getAvailableOrdersForSpecialistAction:", error);
    return { success: false, error: "خطا در دریافت لیست پروژه‌های فعال." };
  }
}

/** Committed shoots for the logged-in specialist (interest-modal calendar). */
export async function getSpecialistWorkAgendaAction(daysAhead = 28): Promise<{
  success: boolean;
  error?: string;
  events?: Awaited<ReturnType<typeof listSpecialistCommittedAgenda>>;
  /** Live platform commission % — for payout estimate when applying. */
  specialistCommissionPercent?: number;
}> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً وارد شوید." };
    }
    const [events, settings] = await Promise.all([
      listSpecialistCommittedAgenda(session.userId, daysAhead),
      getMarketplaceSettings(),
    ]);
    return {
      success: true,
      events,
      specialistCommissionPercent: settings.specialistCommission,
    };
  } catch (error) {
    console.error("getSpecialistWorkAgendaAction:", error);
    return { success: false, error: "خطا در دریافت تقویم کاری." };
  }
}

// -------------------------------------------------------------
// 2. Submit Project Interest / Proposal
// -------------------------------------------------------------
export async function submitProjectInterestAction(
  rawInput: SubmitProjectInterestInput
): Promise<{ success: boolean; error?: string; redirectTo?: string; interestId?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsed = submitInterestSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "اطلاعات وارد شده نامعتبر است.";
      return { success: false, error: firstErr };
    }

    // Specialist Authorization Guard
    const authCheck = await getAuthorizedSpecialist(session.userId);
    if (!authCheck.isSpecialist) {
      return {
        success: false,
        error: authCheck.error,
        redirectTo: authCheck.redirectTo,
      };
    }

    const deadlineGate = await enforceKycDeadlineForSpecialist(session.userId);
    if (deadlineGate.suspendedNow || deadlineGate.status === "SUSPENDED") {
      return {
        success: false,
        error: formatKycDeadlineMessage(deadlineGate.deadline, deadlineGate.kycStatus),
        redirectTo: "/specialist/onboarding/identity",
      };
    }

    const avatarRow = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { avatarUrl: true, kycStatus: true, reviewedAt: true },
    });
    if (!avatarRow?.avatarUrl?.trim()) {
      return {
        success: false,
        error: "عکس پروفایل الزامی است. ابتدا عکس خود را آپلود کنید.",
        redirectTo: "/specialist/onboarding/profile",
      };
    }
    if (!isKycMarketplaceReady(avatarRow.kycStatus)) {
      const deadline = getKycDeadlineInfo({
        reviewedAt: avatarRow.reviewedAt,
        kycStatus: avatarRow.kycStatus,
      });
      return {
        success: false,
        error: kycMarketplaceBlockMessage(avatarRow.kycStatus, deadline),
        redirectTo: "/specialist/onboarding/identity",
      };
    }

    const {
      orderId,
      message,
      proposedPrice,
      travelFeeOverride,
      travelFeeOverrideReason,
      scheduleStance,
      proposedBookingDate,
      proposedTimeSlot,
      proposedPhotoLocationId,
    } = parsed.data;

    // Verify order exists and is accepting applications
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        contactPhone: true,
        categoryTitle: true,
        categorySlug: true,
        locationLat: true,
        locationLng: true,
        locationType: true,
        scheduledAt: true,
        durationHours: true,
        bookingDate: true,
        timeSlot: true,
        isFlexibleSchedule: true,
        totalEstimatedPrice: true,
      },
    });

    if (!order) {
      return { success: false, error: "سفارش موردنظر یافت نشد." };
    }

    if (!isOpenToApplicants(order.status)) {
      return {
        success: false,
        error: "این پروژه در حال حاضر امکان پذیرش متقاضی جدید ندارد.",
      };
    }

    if (order.userId === session.userId || (order.contactPhone && order.contactPhone === session.phone)) {
      return { success: false, error: "شما نمی‌توانید برای سفارش ثبت‌شده توسط خودتان پیشنهاد ارسال کنید." };
    }

    // Flexible client ("best timing") → specialist must propose a concrete window.
    if (order.isFlexibleSchedule && scheduleStance !== "PROPOSE") {
      return {
        success: false,
        error: "کارفرما زمان توافقی خواسته؛ لطفاً تاریخ و بازهٔ پیشنهادی خود را انتخاب کنید.",
      };
    }

    let resolvedProposedPhotoLocationId: string | null = null;
    let proposedLocCoords: { lat: number; lng: number } | null = null;
    if (proposedPhotoLocationId) {
      const loc = await prisma.photoLocation.findFirst({
        where: { id: proposedPhotoLocationId, status: "APPROVED" },
        select: { id: true, lat: true, lng: true },
      });
      if (!loc) {
        return { success: false, error: "لوکیشن پیشنهادی معتبر نیست یا هنوز تایید نشده." };
      }
      resolvedProposedPhotoLocationId = loc.id;
      proposedLocCoords = { lat: loc.lat, lng: loc.lng };
    } else if (order.locationType === "SPECIALIST_ADVICE") {
      return {
        success: false,
        error: "کارفرما مشورت لوکیشن خواسته؛ لطفاً یک جار لوکیشن از محدودهٔ خود پیشنهاد دهید.",
      };
    }

    // Category must be one the specialist declared and was approved to offer.
    const specialistCats = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: {
        selectedCategories: true,
        portfolioItems: {
          where: { reviewStatus: "APPROVED" },
          select: { categorySlug: true },
        },
      },
    });
    const declared = parseSelectedCategories(specialistCats?.selectedCategories);
    const approvedByCat: Record<string, number> = {};
    for (const item of specialistCats?.portfolioItems || []) {
      approvedByCat[item.categorySlug] = (approvedByCat[item.categorySlug] || 0) + 1;
    }
    const orderCat = order.categorySlug || "";
    const inDeclared = Boolean(orderCat && declared.includes(orderCat));
    const approvedCount = approvedByCat[orderCat] || 0;
    if (!inDeclared) {
      return {
        success: false,
        error:
          "این پروژه در دسته تخصص‌های اعلام‌شده شما نیست. فقط برای دسته‌های پروفایل خود اعلام آمادگی کنید.",
      };
    }
    if (approvedCount < 1) {
      return {
        success: false,
        error: "برای این دسته هنوز نمونه‌کار تأییدشده ندارید.",
      };
    }

    // Jar sets the floor (client estimate). Specialist may only match or raise.
    const jarFloor = order.totalEstimatedPrice;
    if (!jarFloor || jarFloor <= 0) {
      return { success: false, error: "نرخ پایه این سفارش نامعتبر است. با پشتیبانی جار تماس بگیرید." };
    }
    const maxHourly = getBudgetStops().at(-1)?.rate ?? jarFloor;
    const jarCeiling = Math.max(
      jarFloor,
      maxHourly * Math.max(1, order.durationHours || 1)
    );
    let resolvedBasePrice =
      proposedPrice == null || proposedPrice <= 0 ? jarFloor : proposedPrice;
    if (resolvedBasePrice < jarFloor) {
      return {
        success: false,
        error: `حداقل مبلغ مجاز ${jarFloor.toLocaleString("fa-IR")} تومان (نرخ پایه جار) است. فقط افزایش مجاز است.`,
      };
    }
    if (resolvedBasePrice > jarCeiling) {
      return {
        success: false,
        error: `حداکثر مبلغ مجاز ${jarCeiling.toLocaleString("fa-IR")} تومان است.`,
      };
    }
    resolvedBasePrice = Math.min(jarCeiling, Math.max(jarFloor, resolvedBasePrice));

    // Check existing interest record
    const existing = await prisma.projectInterest.findUnique({
      where: {
        orderId_specialistId: {
          orderId,
          specialistId: session.userId,
        },
      },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "SELECTED" || existing.status === "ACCEPTED") {
        return { success: false, error: "شما قبلاً برای این پروژه اعلام آمادگی ثبت کرده‌اید." };
      }
    }

    // Enforced here rather than in the UI alone, because the action is callable
    // directly and the allowance is what keeps a few specialists from
    // blanketing every client's shortlist.
    // (Final affordability is re-checked inside the transaction below.)

    // Multiple projects are fine; two at the same time are not. Checked again
    // when the client selects, because a clash can appear in between.
    const conflictAt =
      scheduleStance === "PROPOSE"
        ? resolveScheduledAt(proposedBookingDate, proposedTimeSlot)
        : !order.isFlexibleSchedule
          ? resolveScheduledAt(order.bookingDate, order.timeSlot) || order.scheduledAt
          : order.scheduledAt;
    const clash = await findScheduleConflict(
      session.userId,
      conflictAt,
      order.durationHours,
      order.id
    );
    if (clash) {
      return { success: false, error: conflictMessage(clash) };
    }

    const scheduleData = {
      scheduleStance,
      proposedBookingDate:
        scheduleStance === "PROPOSE" ? proposedBookingDate || null : null,
      proposedTimeSlot:
        scheduleStance === "PROPOSE" ? proposedTimeSlot || null : null,
      proposedPhotoLocationId: resolvedProposedPhotoLocationId,
    };

    // Quote travel from the specialist's base to the shoot destination.
    // When they propose a جار لوکیشن, that pin is the destination — not the
    // client's original pin.
    const settings = await getMarketplaceSettings();
    const destination =
      proposedLocCoords ??
      (order.locationLat != null && order.locationLng != null
        ? { lat: order.locationLat, lng: order.locationLng }
        : null);
    const quote = quoteTravel(
      authCheck.specialistProfile?.baseLat != null && authCheck.specialistProfile?.baseLng != null
        ? { lat: authCheck.specialistProfile.baseLat, lng: authCheck.specialistProfile.baseLng }
        : null,
      destination,
      settings
    );

    const travelData = {
      distanceKm: quote?.distanceKm ?? null,
      travelFee: quote?.fee ?? null,
      travelFeeOverride: travelFeeOverride ?? null,
      travelFeeOverrideReason: travelFeeOverride != null ? travelFeeOverrideReason ?? null : null,
    };

    // Atomic creation / update and status transition using transaction
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const balance = await getTokenBalance(session.userId, new Date(), tx as typeof prisma);
        if (!canAfford(balance, "apply")) {
          throw new Error(outOfTokensMessage(balance, "apply"));
        }

        let interest;
        if (existing) {
          // Re-activate previously withdrawn or declined proposal
          interest = await tx.projectInterest.update({
            where: { id: existing.id },
            data: {
              message,
              proposedPrice: resolvedBasePrice,
              ...travelData,
              ...scheduleData,
              status: "PENDING",
              updatedAt: new Date(),
            },
          });
        } else {
          interest = await tx.projectInterest.create({
            data: {
              orderId,
              specialistId: session.userId,
              message,
              proposedPrice: resolvedBasePrice,
              ...travelData,
              ...scheduleData,
              status: "PENDING",
            },
          });
        }

        // Advance order status to HAS_APPLICANTS if it was DEPOSIT_PAID or MATCHING
        if (order.status === "DEPOSIT_PAID" || order.status === "MATCHING") {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "HAS_APPLICANTS" satisfies OrderStatus },
          });
        }

        return interest;
      });
    } catch (e: any) {
      if (typeof e?.message === "string" && e.message.includes("توکن")) {
        return { success: false, error: e.message };
      }
      throw e;
    }

    // Notify client internally if user ID is linked
    if (order.userId) {
      const specialistName = authCheck.user?.displayName || "یک متخصص و عکاس";
      const projectTitle = order.categoryTitle || "عکاسی";
      await createNotification({
        userId: order.userId,
        title: "پیشنهاد جدید برای پروژه",
        message: `${specialistName} برای سفارش «${projectTitle}» اعلام آمادگی کرد.`,
        type: "INFO",
        link: `/order/${orderId}/applicants`,
      });
    }

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    revalidatePath(`/order/${orderId}`);

    return { success: true, interestId: result.id };
  } catch (error: any) {
    console.error("Error in submitProjectInterestAction:", error);
    return { success: false, error: "خطا در ثبت اعلام علاقه‌مندی. لطفاً مجدداً تلاش کنید." };
  }
}

// -------------------------------------------------------------
// 3. Withdraw Project Interest (Specialist Action)
// -------------------------------------------------------------
/**
 * Legacy server helper — specialist UI no longer exposes withdraw.
 * Kept for admin/history; do not wire back into specialist feeds.
 */
export async function withdrawProjectInterestAction(
  interestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedId = interestIdSchema.safeParse(interestId);
    if (!parsedId.success) {
      return { success: false, error: "شناسه پیشنهاد نامعتبر است." };
    }

    const validInterestId = parsedId.data;

    const interest = await prisma.projectInterest.findUnique({
      where: { id: validInterestId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            selectedSpecialistId: true,
            categoryTitle: true,
          },
        },
      },
    });

    if (!interest) {
      return { success: false, error: "پیشنهاد موردنظر یافت نشد." };
    }

    // Ownership check: only the specialist who submitted can withdraw
    if (interest.specialistId !== session.userId) {
      return { success: false, error: "شما مجاز به لغو این پیشنهاد نیستید." };
    }

    if (interest.status === "WITHDRAWN") {
      return { success: false, error: "این پیشنهاد قبلاً لغو شده است." };
    }

    // Cannot withdraw after being selected or accepted
    if (
      interest.status === "SELECTED" ||
      interest.status === "ACCEPTED" ||
      interest.order.selectedSpecialistId === session.userId
    ) {
      return {
        success: false,
        error: "امکان لغو پیشنهاد پس از انتخاب توسط کارفرما وجود ندارد. لطفاً در صورت عدم امکان انجام، از گزینه «رد پیشنهاد» استفاده کنید.",
      };
    }

    // Atomic withdrawal transaction
    await prisma.$transaction(async (tx) => {
      await tx.projectInterest.update({
        where: { id: validInterestId },
        data: { status: "WITHDRAWN" },
      });

      // Check if there are other active PENDING interests
      const remainingActiveCount = await tx.projectInterest.count({
        where: {
          orderId: interest.orderId,
          status: "PENDING",
        },
      });

      if (remainingActiveCount === 0 && interest.order.status === "HAS_APPLICANTS") {
        await tx.order.update({
          where: { id: interest.orderId },
          data: { status: "MATCHING" satisfies OrderStatus },
        });
      }
    });

    // Notify client internally
    if (interest.order.userId) {
      await createNotification({
        userId: interest.order.userId,
        title: "انصراف متقاضی از پروژه",
        message: `یکی از متقاضیان از پیشنهاد خود برای سفارش «${interest.order.categoryTitle || "عکاسی"}» انصراف داد.`,
        type: "INFO",
        link: `/order/${interest.orderId}/applicants`,
      });
    }

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    revalidatePath(`/order/${interest.orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error in withdrawProjectInterestAction:", error);
    return { success: false, error: "خطا در لغو پیشنهاد." };
  }
}

// -------------------------------------------------------------
// 4. Get Applicants For Client's Order
// -------------------------------------------------------------
export async function getOrderApplicantsForClientAction(orderId: string): Promise<{
  success: boolean;
  error?: string;
  orderStatus?: string;
  selectedSpecialistId?: string | null;
  applicants?: ApplicantSpecialistView[];
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "برای مشاهده متقاضیان باید وارد حساب کاربری خود شوید." };
    }

    const parsedOrderId = orderIdSchema.safeParse(orderId);
    if (!parsedOrderId.success) {
      return {
        success: false,
        error: parsedOrderId.error.issues[0]?.message || "شناسه سفارش نامعتبر است.",
      };
    }

    const validOrderId = parsedOrderId.data;

    const order = await prisma.order.findUnique({
      where: { id: validOrderId },
      select: {
        id: true,
        userId: true,
        contactPhone: true,
        status: true,
        categorySlug: true,
        selectedSpecialistId: true,
        totalEstimatedPrice: true,
      },
    });

    if (!order) {
      return { success: false, error: "سفارش موردنظر یافت نشد." };
    }

    // Ownership or Admin check
    const isOwner =
      (order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone);
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return { success: false, error: "شما مجاز به مشاهده متقاضیان این سفارش نیستید." };
    }

    // Exclude WITHDRAWN and specialists who cannot be selected (not ACTIVE / KYC).
    const interests = await prisma.projectInterest.findMany({
      where: {
        orderId: validOrderId,
        status: { not: "WITHDRAWN" },
        specialist: {
          specialistProfile: {
            status: "ACTIVE",
            kycStatus: "VERIFIED",
          },
        },
      },
      include: {
        proposedPhotoLocation: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImageUrl: true,
            imageUrls: true,
            district: true,
            city: true,
            status: true,
          },
        },
        specialist: {
          select: {
            id: true,
            displayName: true,
            city: true,
            equipment: true,
            hasStudio: true,
            requestedBlueTick: true,
            specialistProfile: {
              select: {
                id: true,
                city: true,
                bio: true,
                equipmentSummary: true,
                workArea: true,
                studioName: true,
                studioLat: true,
                studioLng: true,
                isMobileGrapher: true,
                avatarUrl: true,
                status: true,
                kycStatus: true,
                _count: {
                  select: {
                    portfolioItems: { where: { reviewStatus: "APPROVED" } },
                  },
                },
                portfolioItems: {
                  where: {
                    categorySlug: order.categorySlug,
                    reviewStatus: "APPROVED",
                  },
                  orderBy: { createdAt: "desc" },
                  take: 12,
                  select: {
                    id: true,
                    fileUrl: true,
                    mediaType: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const categoryMedia = CATEGORIES_BY_SLUG[order.categorySlug || ""]?.mediaType;

    const specialistIds = interests.map((i) => i.specialistId);
    const [completedGroups, ratingBySpecialist] = await Promise.all([
      specialistIds.length > 0
        ? prisma.order.groupBy({
            by: ["selectedSpecialistId"],
            where: {
              selectedSpecialistId: { in: specialistIds },
              OR: [{ status: "COMPLETED" }, { settledAt: { not: null } }],
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      getSpecialistRatingAggregates(specialistIds),
    ]);
    const completedBySpecialist = new Map(
      completedGroups
        .filter((g) => g.selectedSpecialistId)
        .map((g) => [g.selectedSpecialistId as string, g._count._all])
    );

    const mapped: ApplicantSpecialistView[] = interests.map((item) => {
      const rawItems = item.specialist.specialistProfile?.portfolioItems || [];
      // Prefer media that matches the order's category (photo vs video),
      // but never mix in unrelated category work.
      const portfolioItems =
        categoryMedia && categoryMedia !== "ALL"
          ? [
              ...rawItems.filter((p) => p.mediaType === categoryMedia),
              ...rawItems.filter((p) => p.mediaType !== categoryMedia),
            ].slice(0, 8)
          : rawItems.slice(0, 8);

      return {
        id: item.id,
        specialistId: item.specialistId,
        status: item.status,
        message: item.message,
        proposedPrice: item.proposedPrice,
        travelFee: item.travelFee,
        travelFeeOverride: item.travelFeeOverride,
        travelFeeOverrideReason: item.travelFeeOverrideReason,
        distanceKm: item.distanceKm,
        totalPrice: proposalTotal(item),
        jarBasePrice: order.totalEstimatedPrice,
        scheduleStance: item.scheduleStance || "ACCEPT_CLIENT",
        proposedBookingDate: item.proposedBookingDate ?? null,
        proposedTimeSlot: item.proposedTimeSlot ?? null,
        proposedPhotoLocation:
          item.proposedPhotoLocation && item.proposedPhotoLocation.status === "APPROVED"
            ? {
                id: item.proposedPhotoLocation.id,
                name: item.proposedPhotoLocation.name,
                slug: item.proposedPhotoLocation.slug,
                coverImageUrl: resolveLocationCover(
                  item.proposedPhotoLocation.coverImageUrl,
                  item.proposedPhotoLocation.imageUrls
                ),
                district: item.proposedPhotoLocation.district,
                city: item.proposedPhotoLocation.city,
              }
            : null,
        createdAt: item.createdAt.toISOString(),
        specialist: {
          id: item.specialist.id,
          displayName: formatPublicSpecialistName(item.specialist.displayName),
          city:
            item.specialist.specialistProfile?.city ||
            item.specialist.city ||
            "—",
          bio: item.specialist.specialistProfile?.bio ?? null,
          equipment:
            item.specialist.specialistProfile?.equipmentSummary ??
            item.specialist.equipment,
          hasStudio: Boolean(
            item.specialist.specialistProfile?.studioName &&
              typeof item.specialist.specialistProfile.studioLat === "number" &&
              typeof item.specialist.specialistProfile.studioLng === "number"
          ),
          isMobileGrapher: Boolean(item.specialist.specialistProfile?.isMobileGrapher),
          isBlueTick: item.specialist.requestedBlueTick,
          avatarUrl: item.specialist.specialistProfile?.avatarUrl ?? null,
          completedProjects: completedBySpecialist.get(item.specialistId) || 0,
          approvedPortfolio:
            item.specialist.specialistProfile?._count?.portfolioItems || 0,
          avgRating: ratingBySpecialist.get(item.specialistId)?.avgRating ?? null,
          ratingCount: ratingBySpecialist.get(item.specialistId)?.ratingCount ?? 0,
          portfolioItems,
        },
      };
    }).filter((row) => Boolean(row.specialist.avatarUrl?.trim()));

    return {
      success: true,
      orderStatus: order.status,
      selectedSpecialistId: order.selectedSpecialistId,
      applicants: mapped,
    };
  } catch (error: any) {
    console.error("Error in getOrderApplicantsForClientAction:", error);
    return { success: false, error: "خطا در دریافت لیست متقاضیان پروژه." };
  }
}

// -------------------------------------------------------------
// 5. Select Specialist For Order (Client Action)
// -------------------------------------------------------------
/**
 * Client selects a specialist.
 * Order moves to AWAITING_PAYMENT (no second specialist confirmation).
 * Interest moves to SELECTED. Other applicants stay pending until payment.
 */
export async function selectSpecialistForOrderAction(
  orderId: string,
  interestId: string
): Promise<{
  success: boolean;
  error?: string;
  selectedSpecialistId?: string;
  agreedTotalPrice?: number;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsed = selectSpecialistSchema.safeParse({ orderId, interestId });
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "شناسه‌های ورودی نامعتبر هستند.";
      return { success: false, error: firstErr };
    }

    const { orderId: validOrderId, interestId: validInterestId } = parsed.data;

    const { specialistCommission: commission } = await getMarketplaceSettings();

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validOrderId },
        select: {
          id: true,
          userId: true,
          contactPhone: true,
          status: true,
          selectedSpecialistId: true,
          categoryTitle: true,
          totalEstimatedPrice: true,
          scheduledAt: true,
          durationHours: true,
          bookingDate: true,
          timeSlot: true,
          isFlexibleSchedule: true,
        },
      });

      if (!order) {
        throw new Error("سفارش موردنظر یافت نشد.");
      }

      const isOwner =
        (order.userId && order.userId === session.userId) ||
        (order.contactPhone && order.contactPhone === session.phone);
      const isAdmin = session.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("شما دسترسی لازم برای انتخاب متخصص این سفارش را ندارید.");
      }

      if (order.status === "CONFIRMED" || order.status === "COMPLETED" || order.status === "CANCELLED") {
        throw new Error("این سفارش در وضعیت نهایی است و امکان انتخاب مجدد وجود ندارد.");
      }

      const interest = await tx.projectInterest.findUnique({
        where: { id: validInterestId },
        select: {
          id: true,
          orderId: true,
          specialistId: true,
          status: true,
          proposedPrice: true,
          travelFee: true,
          travelFeeOverride: true,
          scheduleStance: true,
          proposedBookingDate: true,
          proposedTimeSlot: true,
          proposedPhotoLocationId: true,
          proposedPhotoLocation: {
            select: {
              id: true,
              name: true,
              lat: true,
              lng: true,
              address: true,
              city: true,
              district: true,
              status: true,
            },
          },
        },
      });

      if (!interest || interest.orderId !== validOrderId) {
        throw new Error("درخواست متقاضی معتبر نیست.");
      }

      if (interest.status === "WITHDRAWN" || interest.status === "DECLINED") {
        throw new Error("این متقاضی از انجام پروژه انصراف داده است و قابل انتخاب نیست.");
      }

      const specialistProfile = await tx.specialistProfile.findUnique({
        where: { userId: interest.specialistId },
        select: { kycStatus: true, status: true },
      });
      if (!specialistProfile || specialistProfile.status !== "ACTIVE") {
        throw new Error("این متخصص فعلاً فعال نیست و قابل انتخاب نیست.");
      }
      if (!isKycMarketplaceReady(specialistProfile.kycStatus)) {
        throw new Error(kycSelectBlockMessage(specialistProfile.kycStatus));
      }

      // Resolve the schedule that will be frozen onto the order, then re-check
      // conflicts (1h buffer) — a clash may have appeared since they applied.
      let effectiveScheduledAt: Date | null = order.scheduledAt;
      let effectiveDuration = order.durationHours || 2;
      if (
        interest.scheduleStance === "PROPOSE" &&
        interest.proposedBookingDate &&
        interest.proposedTimeSlot
      ) {
        effectiveScheduledAt = resolveScheduledAt(
          interest.proposedBookingDate,
          interest.proposedTimeSlot
        );
      }
      const clash = await findScheduleConflict(
        interest.specialistId,
        effectiveScheduledAt,
        effectiveDuration,
        validOrderId
      );
      if (clash) {
        throw new Error(conflictMessage(clash));
      }

      // Close out every other active proposal immediately — losers should not
      // keep waiting until payment. Re-selecting someone else also rejects the
      // previous SELECTED pick.
      const losers = await tx.projectInterest.findMany({
        where: {
          orderId: validOrderId,
          NOT: { id: validInterestId },
          status: { in: ["PENDING", "SELECTED"] },
        },
        select: { specialistId: true },
      });

      if (losers.length > 0) {
        await tx.projectInterest.updateMany({
          where: {
            orderId: validOrderId,
            NOT: { id: validInterestId },
            status: { in: ["PENDING", "SELECTED"] },
          },
          data: { status: "REJECTED" },
        });
      }

      await tx.projectInterest.update({
        where: { id: validInterestId },
        data: { status: "SELECTED" },
      });

      // Freeze what was agreed onto the order. The proposal can still be edited
      // afterwards; the price the client saw when they chose is the price they
      // are charged. Commission is snapshotted too, so changing the platform
      // rate later cannot re-price a deal that has already been struck.
      // Never settle below Jar's floor (client estimate on the order).
      const jarFloor = order.totalEstimatedPrice > 0 ? order.totalEstimatedPrice : 0;
      const rawBase = interest.proposedPrice ?? jarFloor;
      if (jarFloor > 0 && rawBase < jarFloor) {
        throw new Error(
          `پیشنهاد متخصص کمتر از نرخ پایه جار (${jarFloor.toLocaleString("fa-IR")} تومان) است.`
        );
      }
      const agreedBasePrice = Math.max(rawBase, jarFloor);
      const agreedTravelFee = interest.travelFeeOverride ?? interest.travelFee ?? 0;

      const schedulePatch =
        interest.scheduleStance === "PROPOSE" &&
        interest.proposedBookingDate &&
        interest.proposedTimeSlot
          ? {
              isFlexibleSchedule: false,
              bookingDate: interest.proposedBookingDate,
              timeSlot: interest.proposedTimeSlot,
              scheduledAt: resolveScheduledAt(
                interest.proposedBookingDate,
                interest.proposedTimeSlot
              ),
            }
          : {};

      // If the specialist proposed a جار لوکیشن, lock that pin onto the order
      // so travel, maps, and reveal all use the same destination that was priced.
      const loc = interest.proposedPhotoLocation;
      const locationPatch =
        loc && loc.status === "APPROVED"
          ? {
              photoLocationId: loc.id,
              locationLat: loc.lat,
              locationLng: loc.lng,
              locationAddress: loc.address?.trim() || loc.name,
              districtOrCity:
                [loc.city, loc.district].filter(Boolean).join("، ") || loc.name,
              locationType: "CLIENT_LOCATION",
            }
          : {};

      await tx.order.update({
        where: { id: validOrderId },
        data: {
          // The specialist committed by quoting a price; asking them to confirm
          // again was a second chance to drop out and bought nothing. The client
          // now goes straight to payment.
          status: "AWAITING_PAYMENT" satisfies OrderStatus,
          selectedSpecialistId: interest.specialistId,
          agreedBasePrice,
          agreedTravelFee,
          agreedTotalPrice: agreedBasePrice + agreedTravelFee,
          commissionPercent: commission,
          ...schedulePatch,
          ...locationPatch,
        },
      });

      return {
        specialistId: interest.specialistId,
        categoryTitle: order.categoryTitle || "عکاسی",
        agreedTotalPrice: agreedBasePrice + agreedTravelFee,
        loserIds: losers.map((l) => l.specialistId),
      };
    });

    // Notify selected specialist
    await createNotification({
      userId: result.specialistId,
      title: "شما برای یک پروژه انتخاب شدید!",
      message: `کارفرما شما را برای انجام پروژه «${result.categoryTitle}» انتخاب کرد. به‌محض پرداخت کارفرما، پروژه قطعی می‌شود و اطلاعات تماس در اختیارتان قرار می‌گیرد.`,
      type: "SUCCESS",
      link: `/specialist/mine`,
    });

    await Promise.all(
      result.loserIds.map((loserId) =>
        createNotification({
          userId: loserId,
          title: "پیشنهاد انتخاب نشد",
          message: `کارفرما برای پروژه «${result.categoryTitle}» متخصص دیگری را انتخاب کرد. از پروژه‌های باز می‌توانید برای سفارش‌های جدید اعلام آمادگی کنید.`,
          type: "INFO",
          link: "/specialist/mine",
        }).catch(() => undefined)
      )
    );

    revalidatePath(`/order/${validOrderId}`);
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");

    return {
      success: true,
      selectedSpecialistId: result.specialistId,
      agreedTotalPrice: result.agreedTotalPrice,
    };
  } catch (error: any) {
    console.error("Error in selectSpecialistForOrderAction:", error);
    return {
      success: false,
      error: error?.message || "خطایی در فرآیند انتخاب متخصص رخ داد.",
    };
  }
}

// -------------------------------------------------------------
// 6. Confirm Specialist Selection — LEGACY bridge only
// -------------------------------------------------------------
/**
 * Legacy orders stuck in AWAITING_SPECIALIST_CONFIRMATION.
 * New selections never enter that status; they go straight to AWAITING_PAYMENT.
 * Confirming here advances the order to AWAITING_PAYMENT so the client can pay
 * (does NOT skip payment / jump to CONFIRMED).
 */
export async function confirmSpecialistSelectionAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedId = orderIdSchema.safeParse(orderId);
    if (!parsedId.success) {
      return { success: false, error: "شناسه سفارش نامعتبر است." };
    }

    const validOrderId = parsedId.data;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validOrderId },
        select: {
          id: true,
          userId: true,
          status: true,
          selectedSpecialistId: true,
          categoryTitle: true,
        },
      });

      if (!order) {
        throw new Error("سفارش موردنظر یافت نشد.");
      }

      if (order.selectedSpecialistId !== session.userId) {
        throw new Error("شما متخصص منتخب این پروژه نیستید.");
      }

      if (order.status !== "AWAITING_SPECIALIST_CONFIRMATION") {
        throw new Error("وضعیت پروژه در انتظار تأیید شما نیست.");
      }

      // Keep SELECTED until payment; reject others only when money clears.
      await tx.projectInterest.updateMany({
        where: {
          orderId: validOrderId,
          specialistId: session.userId,
        },
        data: { status: "SELECTED" },
      });

      await tx.order.update({
        where: { id: validOrderId },
        data: { status: "AWAITING_PAYMENT" satisfies OrderStatus },
      });

      return {
        userId: order.userId,
        categoryTitle: order.categoryTitle || "عکاسی",
      };
    });

    if (result.userId) {
      await createNotification({
        userId: result.userId,
        title: "متخصص آماده است — نوبت پرداخت",
        message: `متخصص منتخب آمادگی خود برای «${result.categoryTitle}» را اعلام کرد. با پرداخت مبلغ توافق‌شده، رزرو قطعی می‌شود.`,
        type: "SUCCESS",
        link: `/order/${validOrderId}`,
      });
    }

    revalidatePath(`/order/${validOrderId}`);
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");

    return { success: true };
  } catch (error: any) {
    console.error("Error in confirmSpecialistSelectionAction:", error);
    return {
      success: false,
      error: error?.message || "خطا در تأیید نهایی پروژه.",
    };
  }
}

// -------------------------------------------------------------
// 7. Decline Specialist Selection — LEGACY only
// -------------------------------------------------------------
/**
 * Legacy ASC escape hatch: selected specialist declines.
 * New flow has no post-select specialist veto; decline only applies to
 * AWAITING_SPECIALIST_CONFIRMATION rows.
 */
export async function declineSpecialistSelectionAction(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedId = orderIdSchema.safeParse(orderId);
    if (!parsedId.success) {
      return { success: false, error: "شناسه سفارش نامعتبر است." };
    }

    const validOrderId = parsedId.data;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validOrderId },
        select: {
          id: true,
          userId: true,
          status: true,
          selectedSpecialistId: true,
          categoryTitle: true,
        },
      });

      if (!order) {
        throw new Error("سفارش موردنظر یافت نشد.");
      }

      if (order.selectedSpecialistId !== session.userId) {
        throw new Error("شما متخصص منتخب این پروژه نیستید.");
      }

      if (order.status !== "AWAITING_SPECIALIST_CONFIRMATION") {
        throw new Error("این پروژه در وضعیت در انتظار تأیید قرار ندارد.");
      }

      // Mark this interest as DECLINED
      await tx.projectInterest.updateMany({
        where: {
          orderId: validOrderId,
          specialistId: session.userId,
        },
        data: { status: "DECLINED" },
      });

      // Check remaining pending interests
      const remainingPendingCount = await tx.projectInterest.count({
        where: {
          orderId: validOrderId,
          status: "PENDING",
        },
      });

      const nextStatus = remainingPendingCount > 0 ? "HAS_APPLICANTS" : "MATCHING";

      await tx.order.update({
        where: { id: validOrderId },
        data: {
          selectedSpecialistId: null,
          status: nextStatus,
        },
      });

      return {
        userId: order.userId,
        categoryTitle: order.categoryTitle || "عکاسی",
      };
    });

    // Notify client that specialist declined so they can choose someone else
    if (result.userId) {
      await createNotification({
        userId: result.userId,
        title: "عدم پذیرش پروژه توسط متخصص",
        message: `متخصص انتخابی امکان پذیرش پروژه «${result.categoryTitle}» را نداشت. شما می‌توانید از میان سایر متقاضیان، فرد دیگری را انتخاب کنید.`,
        type: "WARNING",
        link: `/order/${validOrderId}/applicants`,
      });
    }

    revalidatePath(`/order/${validOrderId}`);
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");

    return { success: true };
  } catch (error: any) {
    console.error("Error in declineSpecialistSelectionAction:", error);
    return {
      success: false,
      error: error?.message || "خطا در رد پیشنهاد پروژه.",
    };
  }
}

// -------------------------------------------------------------
// 8. Cancel Order By Client
// -------------------------------------------------------------
/**
 * Client cancels their order.
 * Sets order to CANCELLED and marks active interests as CANCELLED.
 * A cancel reason is required for ops insight and support follow-up.
 */
export async function cancelOrderByClientAction(
  orderId: string,
  reasonId: string,
  extraNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedId = orderIdSchema.safeParse(orderId);
    if (!parsedId.success) {
      return { success: false, error: "شناسه سفارش نامعتبر است." };
    }

    const validReason = CLIENT_CANCEL_REASONS.find((r) => r.id === reasonId);
    if (!validReason) {
      return { success: false, error: "لطفاً علت لغو را انتخاب کنید." };
    }
    if (validReason.id === "OTHER" && !extraNote?.trim()) {
      return { success: false, error: "برای «دلیل دیگر» توضیح کوتاه بنویسید." };
    }

    const cancelNote = buildClientCancelNote(
      validReason.id as ClientCancelReasonId,
      extraNote
    );

    const validOrderId = parsedId.data;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validOrderId },
        select: {
          id: true,
          userId: true,
          contactPhone: true,
          status: true,
          selectedSpecialistId: true,
          categoryTitle: true,
          createdAt: true,
        },
      });

      if (!order) {
        throw new Error("سفارش موردنظر یافت نشد.");
      }

      const isOwner =
        (order.userId && order.userId === session.userId) ||
        (order.contactPhone && order.contactPhone === session.phone);
      const isAdmin = session.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("شما دسترسی لازم برای لغو این سفارش را ندارید.");
      }

      const status = parseOrderStatus(order.status);

      if (status === "COMPLETED" || status === "CANCELLED") {
        throw new Error("امکان لغو سفارشی که قبلاً تکمیل یا لغو شده است وجود ندارد.");
      }

      if (status === "CONFIRMED") {
        throw new Error(
          "این پروژه پرداخت و قطعی شده است. برای لغو با پشتیبانی جار تماس بگیرید."
        );
      }

      if (!isClientCancellable(status)) {
        throw new Error("وضعیت فعلی سفارش امکان لغو مستقیم توسط کارفرما را ندارد.");
      }

      const activeInterests = await tx.projectInterest.findMany({
        where: {
          orderId: validOrderId,
          status: { in: ["PENDING", "SELECTED", "ACCEPTED"] },
        },
        select: { specialistId: true },
      });

      await tx.order.update({
        where: { id: validOrderId },
        data: {
          status: "CANCELLED",
          selectedSpecialistId: null,
          adminCancelNote: cancelNote,
        },
      });

      await tx.projectInterest.updateMany({
        where: {
          orderId: validOrderId,
          status: { in: ["PENDING", "SELECTED"] },
        },
        data: { status: "CANCELLED" },
      });

      return {
        specialistIds: activeInterests.map((i) => i.specialistId),
        categoryTitle: order.categoryTitle || "عکاسی",
      };
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "ORDER_CANCELLED_BY_CLIENT",
        targetModel: "Order",
        targetId: validOrderId,
        note: cancelNote,
      },
    }).catch(() => undefined);

    // Never block cancel success on notification delivery.
    void Promise.all(
      result.specialistIds.map((specId) =>
        createNotification({
          userId: specId,
          title: "لغو سفارش توسط کارفرما",
          message: `سفارش «${result.categoryTitle}» توسط کارفرما لغو شد.`,
          type: "WARNING",
          link: `/specialist/mine`,
        })
      )
    ).catch((err) => {
      console.error("Cancel notifications failed (non-blocking):", err);
    });

    revalidatePath(`/order/${validOrderId}`);
    revalidatePath("/order");
    revalidatePath("/profile");
    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    console.error("Error in cancelOrderByClientAction:", error);
    return {
      success: false,
      error: error?.message || "خطا در لغو سفارش.",
    };
  }
}

// -------------------------------------------------------------
// 9. Dismiss an order ("not for me")
// -------------------------------------------------------------
/**
 * Takes a project off this specialist's board without applying to it.
 *
 * Before this there was no way to say no. WITHDRAWN means "I am taking back an
 * application I already made" and DECLINED means "I was chosen and cannot do
 * it" — neither is "this job is not for me". So a specialist's feed filled with
 * work they had already decided against, every day, forever.
 *
 * Stored as a ProjectInterest row so the unique(orderId, specialistId)
 * constraint does the deduplication, and so a dismissal can be undone.
 *
 * It costs a token. Letting a specialist clear the board for free means they
 * learn in one afternoon exactly how few projects there are.
 */
export async function dismissOrderAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedOrderId = orderIdSchema.safeParse(orderId);
    if (!parsedOrderId.success) {
      return { success: false, error: parsedOrderId.error.issues[0].message };
    }

    const authCheck = await getAuthorizedSpecialist(session.userId);
    if (!authCheck.isSpecialist) {
      return { success: false, error: authCheck.error };
    }

    const balancePre = await getTokenBalance(session.userId);
    if (!canAfford(balancePre, "dismiss")) {
      return { success: false, error: outOfTokensMessage(balancePre, "dismiss") };
    }

    const existing = await prisma.projectInterest.findUnique({
      where: {
        orderId_specialistId: { orderId: parsedOrderId.data, specialistId: session.userId },
      },
      select: { id: true, status: true },
    });

    // An active proposal has to be withdrawn deliberately, not dismissed by
    // accident — withdrawing tells the client, dismissing does not.
    if (existing && ["PENDING", "SELECTED", "ACCEPTED"].includes(existing.status)) {
      return {
        success: false,
        error: "شما برای این پروژه پیشنهاد فعال دارید. ابتدا آن را پس بگیرید.",
      };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const balance = await getTokenBalance(session.userId, new Date(), tx as typeof prisma);
        if (!canAfford(balance, "dismiss")) {
          throw new Error(outOfTokensMessage(balance, "dismiss"));
        }
        if (existing) {
          await tx.projectInterest.update({
            where: { id: existing.id },
            data: {
              status: "NOT_INTERESTED",
              travelFeeOverrideReason: null,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.projectInterest.create({
            data: {
              orderId: parsedOrderId.data,
              specialistId: session.userId,
              status: "NOT_INTERESTED",
            },
          });
        }
      });
    } catch (e: any) {
      if (typeof e?.message === "string" && e.message.includes("توکن")) {
        return { success: false, error: e.message };
      }
      throw e;
    }

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    return { success: true };
  } catch (error) {
    console.error("Error in dismissOrderAction:", error);
    return { success: false, error: "خطا در حذف پروژه از لیست شما." };
  }
}

/** Keep NOT_INTERESTED for token accounting; feed shows these again. */

/**
 * Undoes a dismissal hide without refunding the dismiss token.
 */
export async function undismissOrderAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const parsedOrderId = orderIdSchema.safeParse(orderId);
    if (!parsedOrderId.success) {
      return { success: false, error: parsedOrderId.error.issues[0].message };
    }

    const updated = await prisma.projectInterest.updateMany({
      where: {
        orderId: parsedOrderId.data,
        specialistId: session.userId,
        status: "NOT_INTERESTED",
      },
      data: {
        travelFeeOverrideReason: UNDISMISS_SHOW_MARKER,
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return { success: false, error: "رد فعالی برای بازگردانی یافت نشد." };
    }

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    return { success: true };
  } catch (error) {
    console.error("Error in undismissOrderAction:", error);
    return { success: false, error: "خطا در بازگرداندن پروژه." };
  }
}
