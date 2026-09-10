"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import {
  evaluateEligibility,
  MIN_PORTFOLIO_ITEMS_PER_CATEGORY,
  SPECIALIST_REVIEW_PATH,
} from "@/lib/specialists/eligibility";
import { missingRequirementLabels } from "@/lib/specialists/review";
import { parseOrderStatus, type OrderStatus } from "@/lib/orders/status";
import { createNotification } from "@/lib/notifications";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
      actorId: session.phone || session.userId || "admin",
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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
      actorId: session.phone || session.userId || "admin",
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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
      actorId: session.phone || session.userId || "admin",
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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
      actorId: session.phone || session.userId || "admin",
      action: "PORTFOLIO_REJECTED",
      targetModel: "PortfolioItem",
      targetId: portfolioItemId,
      note: `علت رد: ${reason.trim()}`,
    },
  });

  return { success: true, message: "نمونه‌کار با موفقیت رد شد و اعلان راهنما برای متخصص ارسال گردید." };
}

/**
 * Server action to approve one or multiple portfolio items directly.
 */
export async function approvePortfolioAction(ids: (string | number)[]) {
  const session = await getSession();
  if (!isAdminSession(session)) {
    throw new Error("دسترسی غیرمجاز");
  }

  const stringIds = ids.map(String);
  if (stringIds.length === 0) return { type: "info" as const, message: "هیچ رکوردی انتخاب نشده است." };

  await prisma.portfolioItem.updateMany({
    where: {
      id: { in: stringIds },
    },
    data: {
      reviewStatus: "APPROVED",
      rejectionReason: null,
    },
  });

  await Promise.all(
    stringIds.map((id) =>
      prisma.auditLog.create({
        data: {
          actorId: session.phone || session.userId || "admin",
          action: "PORTFOLIO_APPROVED",
          targetModel: "PortfolioItem",
          targetId: id,
          note: "تایید نمونه‌کار توسط ادمین",
        },
      })
    )
  );

  return {
    type: "success" as const,
    message: `${stringIds.length} نمونه‌کار با موفقیت تایید شد.`,
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
  note,
}: {
  specialistId: string;
  approveAllPending?: boolean;
  note?: string;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
    portfolioItems: items,
    selectedCategories: profile.selectedCategories,
  });

  if (eligibility.qualifiedCategories.length === 0) {
    const missing = missingRequirementLabels(eligibility);
    return {
      success: false,
      error: missing.length
        ? `این پرونده هنوز کامل نیست: ${missing.join("، ")}.`
        : `برای فعال‌سازی، حداقل ${MIN_PORTFOLIO_ITEMS_PER_CATEGORY} نمونه‌کار تاییدشده در یک شاخه لازم است.`,
    };
  }

  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      status: "ACTIVE",
      reviewedAt: new Date(),
      reviewedBy: session.phone || session.userId || "admin",
      reviewNote: note?.trim() || null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: "پرونده شما تایید شد",
      message:
        "پرونده متخصص شما توسط کارشناسان جار تایید شد. از همین حالا می‌توانید پروژه‌های باز را ببینید و اعلام آمادگی کنید.",
      type: "SUCCESS",
      link: "/specialist/projects",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.phone || session.userId || "admin",
      action: "SPECIALIST_APPROVED",
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      note: note?.trim() || "تایید و فعال‌سازی متخصص",
    },
  });

  revalidateSpecialistSurfaces();

  return {
    success: true,
    message: `«${profile.user?.displayName || "متخصص"}» تایید شد و کارتابل او باز است.`,
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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند." };
  }

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
      reviewedBy: session.phone || session.userId || "admin",
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
      actorId: session.phone || session.userId || "admin",
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
  const session = await getSession();
  if (!isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز", items: [] };
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
