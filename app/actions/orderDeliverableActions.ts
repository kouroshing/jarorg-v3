"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseOrderStatus } from "@/lib/orders/status";
import { resolveAdminAccess, hasAdminPermission } from "@/lib/auth/adminAccess";
import {
  MAX_ORDER_DELIVERABLES,
  normalizeDeliverableLink,
  type OrderDeliverableView,
} from "@/lib/orders/deliverables";

const orderIdSchema = z.string().uuid("شناسه سفارش نامعتبر است.");

export type DeliverableResult =
  | { success: true; message?: string; items?: OrderDeliverableView[] }
  | { success: false; error: string };

async function resolveOrderAccess(orderId: string, userId: string, phone: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      contactPhone: true,
      selectedSpecialistId: true,
      paidAt: true,
      deliveredAt: true,
      settledAt: true,
      disputedAt: true,
      status: true,
      _count: { select: { deliverables: true } },
    },
  });
  if (!order) return { ok: false as const, error: "سفارش یافت نشد." };

  const adminAccess = await resolveAdminAccess(await getSession());
  const isAdmin = Boolean(adminAccess && hasAdminPermission(adminAccess, "orders_manage"));
  const isClient =
    (order.userId && order.userId === userId) ||
    (order.contactPhone && phone && order.contactPhone === phone);
  const isSpecialist = order.selectedSpecialistId === userId;

  if (!isAdmin && !isClient && !isSpecialist) {
    return { ok: false as const, error: "دسترسی غیرمجاز." };
  }

  return { ok: true as const, order, isAdmin, isClient, isSpecialist };
}

function mapItem(row: {
  id: string;
  kind: string;
  fileUrl: string | null;
  linkUrl: string | null;
  label: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: Date;
}): OrderDeliverableView {
  return {
    id: row.id,
    kind: row.kind === "LINK" ? "LINK" : "FILE",
    fileUrl: row.fileUrl,
    linkUrl: row.linkUrl,
    label: row.label,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listOrderDeliverablesAction(
  orderId: string
): Promise<DeliverableResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const access = await resolveOrderAccess(parsed.data, session.userId, session.phone);
  if (!access.ok) return { success: false, error: access.error };
  if (!access.order.paidAt) {
    return { success: false, error: "تا قبل از پرداخت، فایل تحویل قابل مشاهده نیست." };
  }

  const rows = await prisma.orderDeliverable.findMany({
    where: { orderId: parsed.data },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, items: rows.map(mapItem) };
}

/** Specialist (or admin) adds an external link before reporting delivery. */
export async function addOrderDeliverableLinkAction(input: {
  orderId: string;
  linkUrl: string;
  label?: string;
}): Promise<DeliverableResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(input.orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const link = normalizeDeliverableLink(input.linkUrl);
  if (!link) {
    return {
      success: false,
      error: "لینک نامعتبر است. آدرس کامل با http یا https وارد کنید (مثلاً گوگل درایو).",
    };
  }

  const label = (input.label || "").trim().slice(0, 120) || null;

  const access = await resolveOrderAccess(parsed.data, session.userId, session.phone);
  if (!access.ok) return { success: false, error: access.error };

  const { order, isAdmin, isSpecialist } = access;
  if (!isAdmin && !isSpecialist) {
    return { success: false, error: "فقط متخصص منتخب می‌تواند فایل/لینک تحویل اضافه کند." };
  }
  if (!order.paidAt) {
    return { success: false, error: "تا قبل از پرداخت امکان افزودن تحویل نیست." };
  }
  if (order.settledAt) {
    return { success: false, error: "این پروژه تسویه شده است." };
  }
  if (order.deliveredAt && !isAdmin) {
    return {
      success: false,
      error: "پس از ثبت تحویل نمی‌توان مورد جدید افزود. ابتدا درخواست اصلاح بگیرید یا با پشتیبانی هماهنگ کنید.",
    };
  }
  if (parseOrderStatus(order.status) !== "CONFIRMED" && !order.disputedAt) {
    return { success: false, error: "وضعیت سفارش اجازه افزودن تحویل نمی‌دهد." };
  }
  if (order._count.deliverables >= MAX_ORDER_DELIVERABLES) {
    return {
      success: false,
      error: `حداکثر ${MAX_ORDER_DELIVERABLES.toLocaleString("fa-IR")} مورد تحویل مجاز است.`,
    };
  }

  await prisma.orderDeliverable.create({
    data: {
      orderId: order.id,
      uploadedById: session.userId,
      kind: "LINK",
      linkUrl: link,
      label,
    },
  });

  revalidatePath(`/order/${order.id}`);
  return { success: true, message: "لینک تحویل اضافه شد." };
}

export async function removeOrderDeliverableAction(
  deliverableId: string
): Promise<DeliverableResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const idParsed = z.string().uuid().safeParse(deliverableId);
  if (!idParsed.success) {
    return { success: false, error: "شناسه نامعتبر است." };
  }

  const row = await prisma.orderDeliverable.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      orderId: true,
      uploadedById: true,
      order: {
        select: {
          selectedSpecialistId: true,
          deliveredAt: true,
          settledAt: true,
        },
      },
    },
  });

  if (!row) return { success: false, error: "مورد تحویل یافت نشد." };

  const adminAccess = await resolveAdminAccess(session);
  const isAdmin = Boolean(adminAccess && hasAdminPermission(adminAccess, "orders_manage"));
  const isOwnerUploader = row.uploadedById === session.userId;
  const isSpecialist = row.order.selectedSpecialistId === session.userId;

  if (!isAdmin && !(isSpecialist && isOwnerUploader)) {
    return { success: false, error: "مجاز به حذف این مورد نیستید." };
  }
  if (row.order.settledAt) {
    return { success: false, error: "پس از تسویه قابل حذف نیست." };
  }
  if (row.order.deliveredAt && !isAdmin) {
    return { success: false, error: "پس از ثبت تحویل فقط با درخواست اصلاح می‌توان تغییر داد." };
  }

  await prisma.orderDeliverable.delete({ where: { id: row.id } });
  revalidatePath(`/order/${row.orderId}`);
  return { success: true, message: "حذف شد." };
}

/** Admin dispute context: deliverables + recent chat snippets. */
export async function getOrderDisputeContextAction(orderId: string): Promise<
  | {
      success: true;
      deliverables: OrderDeliverableView[];
      messages: Array<{
        id: string;
        body: string;
        createdAt: string;
        senderLabel: string;
      }>;
      messageCount: number;
    }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین الزامی است." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const [deliverables, messages, messageCount] = await Promise.all([
    prisma.orderDeliverable.findMany({
      where: { orderId: parsed.data },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderMessage.findMany({
      where: { orderId: parsed.data },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        sender: { select: { displayName: true, phone: true } },
      },
    }),
    prisma.orderMessage.count({ where: { orderId: parsed.data } }),
  ]);

  return {
    success: true,
    deliverables: deliverables.map(mapItem),
    messages: messages.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderLabel: m.sender.displayName || m.sender.phone || m.senderId.slice(0, 8),
    })),
    messageCount,
  };
}
