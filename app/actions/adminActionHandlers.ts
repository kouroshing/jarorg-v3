"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  adminAuthFailure,
  requireAdminPermission,
} from "@/lib/auth/adminAccess";
import type { AdminPermission } from "@/lib/auth/adminPermissions";
import {
  evaluateEligibility,
  isPortfolioApprovalComplete,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
  SPECIALIST_REVIEW_PATH,
} from "@/lib/specialists/eligibility";
import { missingRequirementLabels } from "@/lib/specialists/review";
import {
  applyPendingProfileEdit,
  parsePendingProfileEdit,
} from "@/lib/specialists/profileEdit";
import { parseOrderStatus, type OrderStatus } from "@/lib/orders/status";
import { createNotification } from "@/lib/notifications";
import { reactivateAfterKycIfSuspended } from "@/lib/kyc/deadline";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

async function requirePerm(
  permission: AdminPermission
): Promise<
  | { ok: true; actorId: string }
  | { ok: false; error: { success: false; error: string } }
> {
  try {
    const session = await getSession();
    const access = await requireAdminPermission(session, permission);
    return { ok: true, actorId: access.phone || access.userId || "admin" };
  } catch (error) {
    return { ok: false, error: adminAuthFailure(error) };
  }
}

/**
 * Cancels an order and stores the administrative cancellation reason/note.
 * Strictly internal record keeping; no external payment gateway calls.
 */
export async function cancelOrderAction({
  orderId,
  reason,
}: {
  orderId: string;
  reason: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("orders_manage");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  if (!orderId || !reason.trim()) {
    return { success: false, error: "شناسه سفارش و دلیل لغو الزامی است." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, error: "سفارش مورد نظر یافت نشد." };
  }

  if (order.status === "CANCELLED") {
    return { success: false, error: "این سفارش قبلاً لغو شده است." };
  }

  if (order.status === "COMPLETED") {
    return { success: false, error: "سفارش تکمیل‌شده قابل لغو نیست." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      adminCancelNote: reason.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "ORDER_CANCELLED",
      targetModel: "Order",
      targetId: orderId,
      note: `علت لغو: ${reason.trim()}`,
    },
  });

  revalidatePath(`/order/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/Order");
  revalidatePath("/specialist/projects");

  return { success: true, message: "سفارش با موفقیت لغو شد و یادداشت اداری ثبت گردید." };
}

/**
 * Admin approves a new order → publish to specialist board (MATCHING).
 */
export async function approveOrderAction({
  orderId,
}: {
  orderId: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("orders_manage");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  if (!orderId) {
    return { success: false, error: "شناسه سفارش الزامی است." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, userId: true, categoryTitle: true },
  });

  if (!order) {
    return { success: false, error: "سفارش مورد نظر یافت نشد." };
  }

  const status = parseOrderStatus(order.status);
  if (status !== "PENDING_REVIEW" && status !== "NEEDS_CLIENT_EDIT") {
    return {
      success: false,
      error: "فقط سفارش‌های در صف بررسی قابل تایید و انتشار هستند.",
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "MATCHING" satisfies OrderStatus,
      adminNote: null,
      publishedAt: new Date(),
      noMatchAt: null,
    },
  });

  if (order.userId) {
    void createNotification({
      userId: order.userId,
      title: "درخواست شما تایید شد",
      message: `پروژه «${order.categoryTitle || "عکاسی"}» منتشر شد و متخصصان در حال بررسی‌اند.`,
      type: "SUCCESS",
      link: `/order/${orderId}`,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "ORDER_APPROVED",
      targetModel: "Order",
      targetId: orderId,
      note: "تایید و انتشار سفارش برای متخصصان",
    },
  });

  revalidatePath(`/order/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/Order");
  revalidatePath("/specialist/projects");

  return { success: true, message: "سفارش تایید و برای متخصصان منتشر شد." };
}

/**
 * Admin asks the client to edit the order before publishing.
 */
export async function requestOrderEditAction({
  orderId,
  note,
}: {
  orderId: string;
  note: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("orders_manage");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  if (!orderId || !note.trim()) {
    return { success: false, error: "شناسه سفارش و پیام ویرایش الزامی است." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, userId: true, categoryTitle: true },
  });

  if (!order) {
    return { success: false, error: "سفارش مورد نظر یافت نشد." };
  }

  const status = parseOrderStatus(order.status);
  if (status === "CANCELLED" || status === "COMPLETED" || status === "CONFIRMED") {
    return { success: false, error: "این سفارش قابل بازگرداندن برای ویرایش نیست." };
  }

  if (
    status !== "PENDING_REVIEW" &&
    status !== "NEEDS_CLIENT_EDIT" &&
    status !== "CONTACTED"
  ) {
    return {
      success: false,
      error: "در این وضعیت امکان درخواست ویرایش وجود ندارد.",
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "NEEDS_CLIENT_EDIT" satisfies OrderStatus,
      adminNote: note.trim(),
    },
  });

  if (order.userId) {
    void createNotification({
      userId: order.userId,
      title: "نیاز به ویرایش درخواست",
      message: `تیم جار برای پروژه «${order.categoryTitle || "عکاسی"}» درخواست اصلاح داده است.`,
      type: "WARNING",
      link: `/order/${orderId}`,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "ORDER_EDIT_REQUESTED",
      targetModel: "Order",
      targetId: orderId,
      note: note.trim(),
    },
  });

  revalidatePath(`/order/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/Order");

  return { success: true, message: "درخواست ویرایش برای کارفرما ارسال شد." };
}

/**
 * Rejects a specialist's portfolio item, stores the reason,
 * and automatically notifies the specialist suggesting Jaramooz academy (/jaramooz).
 */
export async function rejectPortfolioAction({
  portfolioItemId,
  reason,
}: {
  portfolioItemId: string;
  reason: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  if (!portfolioItemId || !reason.trim()) {
    return { success: false, error: "شناسه نمونه‌کار و علت رد اثر الزامی است." };
  }

  const item = await prisma.portfolioItem.findUnique({
    where: { id: portfolioItemId },
    include: {
      specialist: true,
    },
  });

  if (!item) {
    return { success: false, error: "نمونه‌کار مورد نظر یافت نشد." };
  }

  const specialistUserId = item.specialist?.userId;
  if (!specialistUserId) {
    return { success: false, error: "کاربر صاحب این نمونه‌کار یافت نشد." };
  }

  // Ensure notification template exists
  const templateSlug = "portfolio-rejected-jaramooz";
  let template = await prisma.notificationTemplate.findUnique({
    where: { slug: templateSlug },
  });

  if (!template) {
    template = await prisma.notificationTemplate.create({
      data: {
        slug: templateSlug,
        title: "بررسی نمونه‌کار در جار",
        content:
          "متخصص گرامی، متأسفانه نمونه‌کار ارسالی شما پس از بررسی توسط ناظر کیفی تایید نشد. علت: {{reason}}. برای ارتقای استانداردهای فنی و پذیرش قطعی در سفارش‌ها، پیشنهاد می‌کنیم دوره‌های تخصصی جارآموز را مشاهده فرمایید.",
      },
    });
  }

  const messageText = template.content.replace("{{reason}}", reason.trim());

  // Update portfolio item
  await prisma.portfolioItem.update({
    where: { id: portfolioItemId },
    data: {
      reviewStatus: "REJECTED",
      rejectionReason: reason.trim(),
    },
  });

  // Create notification for specialist
  await prisma.notification.create({
    data: {
      userId: specialistUserId,
      title: template.title,
      message: messageText,
      type: "WARNING",
      channel: "IN_APP",
      link: "/jaramooz",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "PORTFOLIO_REJECTED",
      targetModel: "PortfolioItem",
      targetId: portfolioItemId,
      note: `علت رد: ${reason.trim()}`,
    },
  });

  revalidateSpecialistSurfaces();
  revalidatePath("/admin");
  revalidatePath("/admin/PortfolioItem");

  return { success: true, message: "نمونه‌کار با موفقیت رد شد و اعلان راهنما برای متخصص ارسال گردید." };
}

/**
 * Server action to approve one or multiple portfolio items directly.
 */
export async function approvePortfolioAction(ids: (string | number)[]) {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) {
    return {
      type: "error" as const,
      message: gate.error.error,
    };
  }
  const actorId = gate.actorId;

  const stringIds = [...new Set(ids.map(String).map((id) => id.trim()).filter(Boolean))];
  if (stringIds.length === 0) {
    return { type: "info" as const, message: "هیچ رکوردی انتخاب نشده است." };
  }

  const existing = await prisma.portfolioItem.findMany({
    where: { id: { in: stringIds } },
    select: { id: true, reviewStatus: true },
  });

  if (existing.length === 0) {
    return { type: "error" as const, message: "نمونه‌کار مورد نظر یافت نشد." };
  }

  const rejected = existing.filter((i) => i.reviewStatus === "REJECTED");
  if (rejected.length > 0) {
    return {
      type: "error" as const,
      message: "نمونه‌کار ردشده قابل تایید مجدد نیست.",
    };
  }

  const alreadyApproved = existing.filter((i) => i.reviewStatus === "APPROVED");
  const toApprove = existing.filter((i) => i.reviewStatus === "PENDING");

  if (toApprove.length === 0) {
    return {
      type: alreadyApproved.length > 0 ? ("success" as const) : ("info" as const),
      message:
        alreadyApproved.length > 0
          ? "این نمونه‌کار از قبل تایید شده است."
          : "نمونه‌کاری برای تایید باقی نمانده است.",
    };
  }

  const result = await prisma.portfolioItem.updateMany({
    where: {
      id: { in: toApprove.map((i) => i.id) },
      reviewStatus: "PENDING",
    },
    data: {
      reviewStatus: "APPROVED",
      rejectionReason: null,
    },
  });

  if (result.count === 0) {
    return {
      type: "error" as const,
      message: "تایید انجام نشد. وضعیت نمونه‌کار تغییر کرده؛ صفحه را تازه کنید.",
    };
  }

  await Promise.all(
    toApprove.map((item) =>
      prisma.auditLog.create({
        data: {
          actorId: actorId,
          action: "PORTFOLIO_APPROVED",
          targetModel: "PortfolioItem",
          targetId: item.id,
          note: "تایید نمونه‌کار توسط ادمین",
        },
      })
    )
  );

  revalidateSpecialistSurfaces();
  revalidatePath("/admin");
  revalidatePath("/admin/PortfolioItem");

  return {
    type: "success" as const,
    message: `${result.count.toLocaleString("fa-IR")} نمونه‌کار با موفقیت تایید شد.`,
  };
}

/**
 * Mark / unmark portfolio items as already curated for Instagram.
 */
export async function setPortfolioInstagramPickedAction({
  ids,
  picked,
}: {
  ids: string[];
  picked: boolean;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;

  const stringIds = [...new Set(ids.map(String).map((id) => id.trim()).filter(Boolean))];
  if (stringIds.length === 0) {
    return { success: false, error: "هیچ نمونه‌کاری انتخاب نشده است." };
  }
  if (stringIds.length > 40) {
    return { success: false, error: "حداکثر ۴۰ فایل در هر بار مجاز است." };
  }

  const result = await prisma.portfolioItem.updateMany({
    where: { id: { in: stringIds } },
    data: { instagramPickedAt: picked ? new Date() : null },
  });

  if (result.count === 0) {
    return { success: false, error: "نمونه‌کاری به‌روز نشد." };
  }

  await Promise.all(
    stringIds.map((id) =>
      prisma.auditLog.create({
        data: {
          actorId: gate.actorId,
          action: picked ? "PORTFOLIO_INSTAGRAM_PICKED" : "PORTFOLIO_INSTAGRAM_UNPICKED",
          targetModel: "PortfolioItem",
          targetId: id,
          note: picked ? "علامت‌گذاری برای اینستا" : "برداشتن علامت اینستا",
        },
      })
    )
  );

  revalidatePath("/admin/review");
  revalidatePath("/admin/PortfolioItem");

  return {
    success: true,
    message: picked
      ? `${result.count.toLocaleString("fa-IR")} مورد به‌عنوان برداشته‌شده برای اینستا علامت خورد.`
      : `علامت اینستا از ${result.count.toLocaleString("fa-IR")} مورد برداشته شد.`,
  };
}

function revalidateSpecialistSurfaces() {
  revalidatePath("/admin/review");
  revalidatePath(SPECIALIST_REVIEW_PATH);
  revalidatePath("/specialist/projects");
  revalidatePath("/specialist/mine");
  revalidatePath("/specialist/portfolio");
  revalidatePath("/specialist/profile");
}

async function loadProfileForReview(specialistId: string) {
  return prisma.specialistProfile.findUnique({
    where: { id: specialistId },
    include: {
      user: { select: { id: true, displayName: true } },
      portfolioItems: { select: { id: true, categorySlug: true, reviewStatus: true } },
    },
  });
}

/**
 * Approves a specialist so they can take work. This is the only place a profile
 * becomes ACTIVE — onboarding deliberately stops at PENDING_REVIEW.
 *
 * `approveAllPending` is the common case: the admin has looked through the
 * gallery and wants to accept the remaining shots in one go.
 */
export async function approveSpecialistAction({
  specialistId,
  approveAllPending = false,
  allowUnderMinimum = false,
  note,
}: {
  specialistId: string;
  approveAllPending?: boolean;
  /** Explicit admin override when approved portfolio is under the usual 10-item bar. */
  allowUnderMinimum?: boolean;
  note?: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  const profile = await loadProfileForReview(specialistId);
  if (!profile) {
    return { success: false, error: "پروفایل متخصص یافت نشد." };
  }

  if (approveAllPending) {
    await prisma.portfolioItem.updateMany({
      where: { specialistId, reviewStatus: "PENDING" },
      data: { reviewStatus: "APPROVED", rejectionReason: null },
    });
  }

  const items = approveAllPending
    ? profile.portfolioItems.map((item) =>
        item.reviewStatus === "PENDING" ? { ...item, reviewStatus: "APPROVED" } : item
      )
    : profile.portfolioItems;

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

  const coreReady =
    eligibility.hasCity &&
    eligibility.hasBaseLocation &&
    eligibility.hasAgreedToTerms &&
    eligibility.hasAvatar &&
    eligibility.hasDisplayName;

  const hasMinApproved = isPortfolioApprovalComplete(eligibility);
  const activationReady = coreReady && (hasMinApproved || allowUnderMinimum);

  if (!activationReady) {
    if (!eligibility.hasAvatar) {
      return {
        success: false,
        error: "عکس پروفایل متخصص الزامی است. بدون عکس نمی‌توان فعال کرد.",
      };
    }
    const missing = missingRequirementLabels(eligibility);
    if (!hasMinApproved && !allowUnderMinimum) {
      missing.push(
        `${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار تاییدشده در هر دسته‌بندی انتخاب‌شده (یا تایید استثنایی)`
      );
    }
    return {
      success: false,
      error: missing.length
        ? `این پرونده هنوز کامل نیست: ${[...new Set(missing)].join("، ")}.`
        : `برای فعال‌سازی، ${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار تاییدشده در هر دسته لازم است.`,
    };
  }

  const underMinimumNote = !hasMinApproved
    ? `تایید استثنایی با کمتر از ${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار تاییدشده در هر دسته`
    : null;
  const reviewNote = [note?.trim(), underMinimumNote].filter(Boolean).join(" · ") || null;

  // Do not reset the KYC 7-day clock when re-approving an already-ACTIVE profile.
  const keepReviewedAt =
    profile.status === "ACTIVE" && profile.reviewedAt
      ? profile.reviewedAt
      : new Date();

  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      status: "ACTIVE",
      reviewedAt: keepReviewedAt,
      reviewedBy: actorId,
      reviewNote,
    },
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: "پرونده شما تایید شد",
      message:
        "پرونده متخصص شما تایید شد. از همین حالا می‌توانید پروژه‌ها را ببینید؛ برای تسویه کیف‌پول، احراز هویت را تکمیل کنید.",
      type: "SUCCESS",
      link: "/specialist/onboarding/identity",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "SPECIALIST_APPROVED",
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note: reviewNote || "تایید و فعال‌سازی متخصص",
    },
  });

  revalidateSpecialistSurfaces();

  return {
    success: true,
    message: !hasMinApproved
      ? `«${profile.user?.displayName || "متخصص"}» با تایید استثنایی (کمتر از ۱۰ نمونه‌کار) فعال شد.`
      : `«${profile.user?.displayName || "متخصص"}» تایید شد و کارتابل او باز است.`,
  };
}

/**
 * Sends a file back to the specialist with a reason. The profile drops to
 * INCOMPLETE so they can fix what was wrong and submit again.
 */
export async function rejectSpecialistAction({
  specialistId,
  reason,
}: {
  specialistId: string;
  reason: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  if (!reason.trim()) {
    return { success: false, error: "نوشتن دلیل بازگرداندن پرونده الزامی است." };
  }

  const profile = await loadProfileForReview(specialistId);
  if (!profile) {
    return { success: false, error: "پروفایل متخصص یافت نشد." };
  }

  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      status: "INCOMPLETE",
      reviewedAt: new Date(),
      reviewedBy: actorId,
      reviewNote: reason.trim(),
      submittedForReviewAt: null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: "پرونده شما نیاز به اصلاح دارد",
      message: `کارشناسان جار پرونده شما را بازگرداندند. دلیل: ${reason.trim()}`,
      type: "WARNING",
      link: SPECIALIST_REVIEW_PATH,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "SPECIALIST_REJECTED",
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note: `علت بازگرداندن: ${reason.trim()}`,
    },
  });

  revalidateSpecialistSurfaces();

  return { success: true, message: "پرونده به متخصص بازگردانده شد و دلیل برای او ارسال گردید." };
}

/**
 * Server action to fetch all portfolio items for a specific specialist profile.
 */
export async function getSpecialistPortfolioItems(specialistId: string) {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) {
    return { success: false, error: gate.error.error, items: [] };
  }

  if (!specialistId) {
    return { success: false, error: "شناسه متخصص الزامی است", items: [] };
  }

  const items = await prisma.portfolioItem.findMany({
    where: { specialistId },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

/** Manual KYC override for legacy PENDING rows only — normal path is Zohal auto-verify. */
export async function setSpecialistKycStatusAction({
  specialistId,
  status,
  reason,
}: {
  specialistId: string;
  status: "VERIFIED" | "FAILED" | "NONE";
  reason?: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  const profile = await prisma.specialistProfile.findUnique({
    where: { id: specialistId },
    select: { id: true, userId: true, kycStatus: true },
  });
  if (!profile) {
    return { success: false, error: "پروفایل یافت نشد." };
  }

  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      kycStatus: status,
      kycVerifiedAt: status === "VERIFIED" ? new Date() : null,
      kycFailureReason: status === "FAILED" ? reason?.trim() || "رد احراز هویت" : null,
      ...(status !== "VERIFIED"
        ? {
            kycFirstName: null,
            kycLastName: null,
            kycFatherName: null,
            kycBankName: status === "NONE" ? null : undefined,
          }
        : {}),
    },
  });

  if (status === "VERIFIED") {
    await reactivateAfterKycIfSuspended(specialistId);
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        title: "احراز هویت تایید شد",
        message: "هویت و شبا شما تایید شد. از این پس تسویه پروژه ممکن است.",
        type: "SUCCESS",
        link: "/specialist/projects",
      },
    });
  } else if (status === "FAILED") {
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        title: "احراز هویت نیاز به اصلاح دارد",
        message: reason?.trim() || "اطلاعات هویتی/شبا تایید نشد. دوباره ارسال کنید.",
        type: "WARNING",
        link: "/specialist/onboarding/identity",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: `SPECIALIST_KYC_${status}`,
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note: reason?.trim() || null,
    },
  });

  revalidatePath("/admin/review");
  revalidatePath("/specialist/onboarding/identity");
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message:
      status === "VERIFIED"
        ? "احراز هویت تایید شد."
        : status === "FAILED"
          ? "احراز هویت رد شد."
          : "وضعیت احراز هویت بازنشانی شد.",
  };
}

/** Interests for an order — used by admin order edit widget. */
export async function getOrderInterestsForAdmin(orderId: string) {
  const gate = await requirePerm("orders_manage");
  if (!gate.ok) {
    return { success: false as const, error: gate.error.error };
  }

  const interests = await prisma.projectInterest.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: {
      specialist: {
        select: {
          id: true,
          displayName: true,
          phone: true,
          city: true,
        },
      },
    },
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { selectedSpecialistId: true, status: true },
  });

  return {
    success: true as const,
    selectedSpecialistId: order?.selectedSpecialistId ?? null,
    orderStatus: order?.status ?? null,
    interests: interests.map((i) => ({
      id: i.id,
      status: i.status,
      proposedPrice: i.proposedPrice,
      travelFee: i.travelFeeOverride ?? i.travelFee,
      message: i.message,
      createdAt: i.createdAt.toISOString(),
      specialist: i.specialist,
    })),
  };
}

/**
 * Admin picks an applicant for an order (same outcome as client selection,
 * without requiring client session).
 */
export async function adminSelectInterestAction({
  orderId,
  interestId,
}: {
  orderId: string;
  interestId: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("orders_manage");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  const interest = await prisma.projectInterest.findFirst({
    where: { id: interestId, orderId },
    include: {
      specialist: { select: { id: true, displayName: true } },
    },
  });
  if (!interest) {
    return { success: false, error: "پیشنهاد یافت نشد." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      categoryTitle: true,
      totalEstimatedPrice: true,
    },
  });
  if (!order) {
    return { success: false, error: "سفارش یافت نشد." };
  }

  const jarFloor = order.totalEstimatedPrice > 0 ? order.totalEstimatedPrice : 0;
  const travel = interest.travelFeeOverride ?? interest.travelFee ?? 0;
  const rawBase = interest.proposedPrice ?? jarFloor;
  if (jarFloor > 0 && rawBase < jarFloor) {
    return {
      success: false,
      error: `پیشنهاد متخصص کمتر از نرخ پایه جار (${jarFloor.toLocaleString("fa-IR")} تومان) است.`,
    };
  }
  const base = Math.max(rawBase, jarFloor);
  const total = base + travel;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        selectedSpecialistId: interest.specialistId,
        status: "AWAITING_PAYMENT",
        agreedBasePrice: base,
        agreedTravelFee: travel,
        agreedTotalPrice: total,
      },
    });

    await tx.projectInterest.update({
      where: { id: interestId },
      data: { status: "SELECTED" },
    });

    await tx.projectInterest.updateMany({
      where: {
        orderId,
        id: { not: interestId },
        status: { in: ["PENDING", "SELECTED"] },
      },
      data: { status: "REJECTED" },
    });
  });

  if (order.userId) {
    void createNotification({
      userId: order.userId,
      title: "متخصص توسط جار انتخاب شد",
      message: `برای «${order.categoryTitle || "پروژه"}» متخصص انتخاب شد. لطفاً پرداخت را تکمیل کنید.`,
      type: "SUCCESS",
      link: `/order/${orderId}`,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "ORDER_SPECIALIST_ASSIGNED_BY_ADMIN",
      targetModel: "Order",
      targetId: orderId,
      note: `interest=${interestId}; specialist=${interest.specialistId}`,
    },
  });

  revalidatePath(`/order/${orderId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/Order/${orderId}`);
  revalidatePath("/specialist/projects");
  revalidatePath("/specialist/mine");

  return {
    success: true,
    message: `متخصص «${interest.specialist.displayName || "انتخاب‌شده"}» ثبت شد؛ سفارش در انتظار پرداخت است.`,
  };
}

/** Apply a queued ACTIVE-specialist profile draft to live fields. */
export async function approveProfileEditAction({
  specialistId,
}: {
  specialistId: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  const profile = await prisma.specialistProfile.findUnique({
    where: { id: specialistId },
    select: {
      id: true,
      userId: true,
      profileEditStatus: true,
      pendingProfileEdit: true,
    },
  });
  if (!profile) {
    return { success: false, error: "پروفایل یافت نشد." };
  }
  if (profile.profileEditStatus !== "PENDING") {
    return { success: false, error: "ویرایش در انتظاری وجود ندارد." };
  }

  const draft = parsePendingProfileEdit(profile.pendingProfileEdit);
  if (!draft) {
    return { success: false, error: "پیش‌نویس ویرایش نامعتبر است." };
  }

  await applyPendingProfileEdit({
    profileId: profile.id,
    userId: profile.userId,
    draft,
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: "ویرایش پروفایل تایید شد",
      message: "تغییرات پروفایل کاری شما اعمال شد.",
      type: "SUCCESS",
      link: "/specialist/profile",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "SPECIALIST_PROFILE_EDIT_APPROVED",
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note: profile.pendingProfileEdit,
    },
  });

  revalidatePath("/admin/review");
  revalidatePath("/specialist/profile");
  revalidatePath("/specialist/studio");
  revalidatePath("/specialist/portfolio");
  revalidatePath("/profile");
  revalidatePath(`/s/${profile.userId}`);

  return { success: true, message: "ویرایش پروفایل اعمال شد." };
}

/** Reject a queued profile draft; live fields stay unchanged. */
export async function rejectProfileEditAction({
  specialistId,
  reason,
}: {
  specialistId: string;
  reason?: string;
}): Promise<AdminActionResult> {
  const gate = await requirePerm("specialists_review");
  if (!gate.ok) return gate.error;
  const actorId = gate.actorId;

  const profile = await prisma.specialistProfile.findUnique({
    where: { id: specialistId },
    select: { id: true, userId: true, profileEditStatus: true },
  });
  if (!profile) {
    return { success: false, error: "پروفایل یافت نشد." };
  }
  if (profile.profileEditStatus !== "PENDING") {
    return { success: false, error: "ویرایش در انتظاری وجود ندارد." };
  }

  const note = reason?.trim() || "ویرایش پروفایل رد شد.";

  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      pendingProfileEdit: null,
      profileEditStatus: "REJECTED",
      profileEditNote: note,
      profileEditSubmittedAt: null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: "ویرایش پروفایل رد شد",
      message: note,
      type: "WARNING",
      link: "/specialist/profile",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "SPECIALIST_PROFILE_EDIT_REJECTED",
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note,
    },
  });

  revalidatePath("/admin/review");
  revalidatePath("/specialist/profile");
  revalidatePath("/specialist/studio");
  revalidatePath("/profile");

  return { success: true, message: "ویرایش پروفایل رد شد." };
}
