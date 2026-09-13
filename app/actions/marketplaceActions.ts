"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { getMarketplaceSettings } from "@/lib/orders/settings";
import { canAfford, getTokenBalance, outOfTokensMessage } from "@/lib/orders/tokens";
import { conflictMessage, findScheduleConflict } from "@/lib/orders/conflicts";
import { proposalTotal, quoteTravel } from "@/lib/orders/travel";
import { resolveScheduledAt } from "@/lib/date/jalali";
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
      .enum(["ACCEPT_CLIENT", "DEFER", "PROPOSE"])
      .default("ACCEPT_CLIENT"),
    proposedBookingDate: z.string().trim().max(32).optional().nullable(),
    proposedTimeSlot: z.string().trim().max(80).optional().nullable(),
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
      message: "برای پیشنهاد زمان جایگزین، تاریخ و بازه الزامی است.",
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
  scheduleStance: string;
  proposedBookingDate: string | null;
  proposedTimeSlot: string | null;
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
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
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
        // A project the specialist dismissed stays out of their feed.
        NOT: {
          interests: {
            some: { specialistId: session.userId, status: "NOT_INTERESTED" },
          },
        },
      },
      include: {
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
            }
          : null,
      };
    });

    const balance = await getTokenBalance(session.userId);

    return {
      success: true,
      orders: mapped,
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

    const avatarRow = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { avatarUrl: true },
    });
    if (!avatarRow?.avatarUrl?.trim()) {
      return {
        success: false,
        error: "عکس پروفایل الزامی است. ابتدا عکس خود را آپلود کنید.",
        redirectTo: "/specialist/onboarding/profile",
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
        locationLat: true,
        locationLng: true,
        scheduledAt: true,
        durationHours: true,
        bookingDate: true,
        timeSlot: true,
        isFlexibleSchedule: true,
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
    const balance = await getTokenBalance(session.userId);
    if (!canAfford(balance, "apply")) {
      return { success: false, error: outOfTokensMessage(balance, "apply") };
    }

    // Multiple projects are fine; two at the same time are not. Checked again
    // when the client selects, because a clash can appear in between.
    const conflictAt =
      scheduleStance === "PROPOSE"
        ? resolveScheduledAt(proposedBookingDate, proposedTimeSlot)
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
    };

    // Quote travel from the specialist's registered base to the shoot. Computed
    // server-side so the client and the specialist always see the same figure
    // for the same trip; the specialist may override it, with a reason.
    const settings = await getMarketplaceSettings();
    const quote = quoteTravel(
      authCheck.specialistProfile?.baseLat != null && authCheck.specialistProfile?.baseLng != null
        ? { lat: authCheck.specialistProfile.baseLat, lng: authCheck.specialistProfile.baseLng }
        : null,
      order.locationLat != null && order.locationLng != null
        ? { lat: order.locationLat, lng: order.locationLng }
        : null,
      settings
    );

    const travelData = {
      distanceKm: quote?.distanceKm ?? null,
      travelFee: quote?.fee ?? null,
      travelFeeOverride: travelFeeOverride ?? null,
      travelFeeOverrideReason: travelFeeOverride != null ? travelFeeOverrideReason ?? null : null,
    };

    // Atomic creation / update and status transition using transaction
    const result = await prisma.$transaction(async (tx) => {
      let interest;
      if (existing) {
        // Re-activate previously withdrawn or declined proposal
        interest = await tx.projectInterest.update({
          where: { id: existing.id },
          data: {
            message,
            proposedPrice: proposedPrice || null,
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
            proposedPrice: proposedPrice || null,
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

    // Exclude WITHDRAWN interests from client's active applicants view
    const interests = await prisma.projectInterest.findMany({
      where: {
        orderId: validOrderId,
        status: { not: "WITHDRAWN" },
      },
      include: {
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
    const completedGroups =
      specialistIds.length > 0
        ? await prisma.order.groupBy({
            by: ["selectedSpecialistId"],
            where: {
              selectedSpecialistId: { in: specialistIds },
              OR: [{ status: "COMPLETED" }, { settledAt: { not: null } }],
            },
            _count: { _all: true },
          })
        : [];
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
        scheduleStance: item.scheduleStance || "ACCEPT_CLIENT",
        proposedBookingDate: item.proposedBookingDate ?? null,
        proposedTimeSlot: item.proposedTimeSlot ?? null,
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
// 5. Select Specialist For Order (Client Action - Step 1 of Confirmation)
// -------------------------------------------------------------
/**
 * Client selects a specialist.
 * Order moves to AWAITING_SPECIALIST_CONFIRMATION.
 * Interest moves to SELECTED.
 * Other applicants are NOT rejected yet, preserving fallback options.
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
        },
      });

      if (!interest || interest.orderId !== validOrderId) {
        throw new Error("درخواست متقاضی معتبر نیست.");
      }

      if (interest.status === "WITHDRAWN" || interest.status === "DECLINED") {
        throw new Error("این متقاضی از انجام پروژه انصراف داده است و قابل انتخاب نیست.");
      }

      await tx.projectInterest.update({
        where: { id: validInterestId },
        data: { status: "SELECTED" },
      });

      // Freeze what was agreed onto the order. The proposal can still be edited
      // afterwards; the price the client saw when they chose is the price they
      // are charged. Commission is snapshotted too, so changing the platform
      // rate later cannot re-price a deal that has already been struck.
      const agreedBasePrice = interest.proposedPrice ?? 0;
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
        },
      });

      return {
        specialistId: interest.specialistId,
        categoryTitle: order.categoryTitle || "عکاسی",
        agreedTotalPrice: agreedBasePrice + agreedTravelFee,
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
// 6. Confirm Specialist Selection (Specialist Action - Step 2 of Confirmation)
// -------------------------------------------------------------
/**
 * The selected specialist confirms that they accept the project.
 * Order moves to CONFIRMED.
 * Interest moves to ACCEPTED.
 * All other applicants for this order are now REJECTED.
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

      // Accept this specialist's interest
      await tx.projectInterest.updateMany({
        where: {
          orderId: validOrderId,
          specialistId: session.userId,
        },
        data: { status: "ACCEPTED" },
      });

      // Reject all other applicants
      await tx.projectInterest.updateMany({
        where: {
          orderId: validOrderId,
          specialistId: { not: session.userId },
          status: { in: ["PENDING", "SELECTED"] },
        },
        data: { status: "REJECTED" },
      });

      // Finalize order status to CONFIRMED
      await tx.order.update({
        where: { id: validOrderId },
        data: { status: "CONFIRMED" satisfies OrderStatus },
      });

      return {
        userId: order.userId,
        categoryTitle: order.categoryTitle || "عکاسی",
      };
    });

    // Notify client that specialist confirmed
    if (result.userId) {
      await createNotification({
        userId: result.userId,
        title: "تأیید پروژه توسط متخصص",
        message: `متخصص انتخابی انجام پروژه «${result.categoryTitle}» را تأیید کرد و هماهنگی نهایی شد.`,
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
// 7. Decline Specialist Selection (Specialist Action)
// -------------------------------------------------------------
/**
 * The selected specialist declines the project.
 * Interest moves to DECLINED.
 * selectedSpecialistId is cleared.
 * Order returns to HAS_APPLICANTS (if other active proposals exist) or MATCHING.
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

    const balance = await getTokenBalance(session.userId);
    if (!canAfford(balance, "dismiss")) {
      return { success: false, error: outOfTokensMessage(balance, "dismiss") };
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

    if (existing) {
      await prisma.projectInterest.update({
        where: { id: existing.id },
        data: { status: "NOT_INTERESTED", updatedAt: new Date() },
      });
    } else {
      await prisma.projectInterest.create({
        data: {
          orderId: parsedOrderId.data,
          specialistId: session.userId,
          status: "NOT_INTERESTED",
        },
      });
    }

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    return { success: true };
  } catch (error) {
    console.error("Error in dismissOrderAction:", error);
    return { success: false, error: "خطا در حذف پروژه از لیست شما." };
  }
}

/**
 * Undoes a dismissal, in case it was a misclick.
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

    await prisma.projectInterest.deleteMany({
      where: {
        orderId: parsedOrderId.data,
        specialistId: session.userId,
        status: "NOT_INTERESTED",
      },
    });

    revalidatePath("/specialist/projects");
    revalidatePath("/specialist/mine");
    return { success: true };
  } catch (error) {
    console.error("Error in undismissOrderAction:", error);
    return { success: false, error: "خطا در بازگرداندن پروژه." };
  }
}
