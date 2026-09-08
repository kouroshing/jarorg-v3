"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";

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

  return { success: true, message: "سفارش با موفقیت لغو شد و یادداشت اداری ثبت گردید." };
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
