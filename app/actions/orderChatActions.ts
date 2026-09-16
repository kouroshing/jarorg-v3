"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { resolveAdminAccess } from "@/lib/auth/adminAccess";
import { parseOrderStatus } from "@/lib/orders/status";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";

const orderIdSchema = z.string().uuid("شناسه سفارش نامعتبر است.");
const bodySchema = z
  .string()
  .trim()
  .min(1, "متن پیام خالی است.")
  .max(2000, "حداکثر ۲۰۰۰ نویسه مجاز است.");

export type OrderChatMessageView = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderLabel: string;
  isMine: boolean;
  /** Which party sent — useful for admin read-only coloring. */
  side: "client" | "specialist" | "other";
};

type ChatAccess =
  | {
      ok: true;
      orderId: string;
      userId: string;
      role: "client" | "specialist" | "admin";
      canSend: boolean;
      peerUserId: string | null;
      categoryTitle: string;
    }
  | { ok: false; error: string };

async function resolveChatAccess(orderId: string): Promise<ChatAccess> {
  const session = await getSession();
  if (!session?.userId) {
    return { ok: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "شناسه نامعتبر" };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      status: true,
      paidAt: true,
      userId: true,
      contactPhone: true,
      selectedSpecialistId: true,
      categoryTitle: true,
    },
  });

  if (!order) {
    return { ok: false, error: "سفارش یافت نشد." };
  }

  if (!order.paidAt) {
    return {
      ok: false,
      error: "چت پس از پرداخت و قطعی شدن رزرو فعال می‌شود.",
    };
  }

  const isClient = Boolean(
    (order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone)
  );
  const isSpecialist = order.selectedSpecialistId === session.userId;
  const adminAccess = await resolveAdminAccess(session);
  const isAdmin = Boolean(adminAccess);

  if (!isClient && !isSpecialist && !isAdmin) {
    return { ok: false, error: "دسترسی به این گفتگو ندارید." };
  }

  const status = parseOrderStatus(order.status);
  const canSend =
    (isClient || isSpecialist) &&
    status !== "CANCELLED" &&
    Boolean(order.paidAt);

  const role: "client" | "specialist" | "admin" = isAdmin
    ? "admin"
    : isSpecialist
      ? "specialist"
      : "client";

  const peerUserId = isSpecialist
    ? order.userId
    : isClient
      ? order.selectedSpecialistId
      : null;

  return {
    ok: true,
    orderId: order.id,
    userId: session.userId,
    role,
    canSend,
    peerUserId,
    categoryTitle: order.categoryTitle || "پروژه",
  };
}

function messageSide(
  senderId: string,
  order: { userId: string | null; selectedSpecialistId: string | null }
): "client" | "specialist" | "other" {
  if (order.selectedSpecialistId && senderId === order.selectedSpecialistId) {
    return "specialist";
  }
  if (order.userId && senderId === order.userId) {
    return "client";
  }
  return "other";
}

function senderLabelFor(
  senderId: string,
  order: {
    userId: string | null;
    selectedSpecialistId: string | null;
  },
  displayName: string | null
): string {
  if (order.selectedSpecialistId && senderId === order.selectedSpecialistId) {
    return formatPublicSpecialistName(displayName) || "متخصص";
  }
  if (order.userId && senderId === order.userId) {
    return "کارفرما";
  }
  return "کاربر";
}

/**
 * Lists order chat messages. Available after payment to client, selected
 * specialist, and admin (read-only for admin).
 */
export async function listOrderMessagesAction(orderId: string): Promise<{
  success: boolean;
  error?: string;
  messages?: OrderChatMessageView[];
  canSend?: boolean;
  role?: "client" | "specialist" | "admin";
}> {
  try {
    await ensurePrismaSchemaReady();
    const access = await resolveChatAccess(orderId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const order = await prisma.order.findUnique({
      where: { id: access.orderId },
      select: { userId: true, selectedSpecialistId: true },
    });
    if (!order) {
      return { success: false, error: "سفارش یافت نشد." };
    }

    const rows = await prisma.orderMessage.findMany({
      where: { orderId: access.orderId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: { select: { displayName: true } },
      },
    });

    const messages: OrderChatMessageView[] = rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      senderId: row.senderId,
      senderLabel: senderLabelFor(row.senderId, order, row.sender.displayName),
      isMine: row.senderId === access.userId,
      side: messageSide(row.senderId, order),
    }));

    return {
      success: true,
      messages,
      canSend: access.canSend,
      role: access.role,
    };
  } catch (err) {
    console.error("listOrderMessagesAction:", err);
    return { success: false, error: "خطا در دریافت پیام‌ها." };
  }
}

/**
 * Sends a text message on a paid order thread.
 */
export async function sendOrderMessageAction(input: {
  orderId: string;
  body: string;
}): Promise<{
  success: boolean;
  error?: string;
  message?: OrderChatMessageView;
}> {
  try {
    await ensurePrismaSchemaReady();
    const access = await resolveChatAccess(input.orderId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }
    if (!access.canSend) {
      return {
        success: false,
        error:
          access.role === "admin"
            ? "ادمین فقط مشاهده‌کننده گفتگو است."
            : "امکان ارسال پیام در این وضعیت وجود ندارد.",
      };
    }

    const parsedBody = bodySchema.safeParse(input.body);
    if (!parsedBody.success) {
      return {
        success: false,
        error: parsedBody.error.issues[0]?.message || "متن نامعتبر است.",
      };
    }

    // Light anti-spam: block bursts under 2 seconds from same sender on order.
    const recent = await prisma.orderMessage.findFirst({
      where: { orderId: access.orderId, senderId: access.userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 2000) {
      return { success: false, error: "لطفاً چند لحظه صبر کنید و دوباره بفرستید." };
    }

    const created = await prisma.orderMessage.create({
      data: {
        orderId: access.orderId,
        senderId: access.userId,
        body: parsedBody.data,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: { select: { displayName: true } },
      },
    });

    const orderMeta = await prisma.order.findUnique({
      where: { id: access.orderId },
      select: { userId: true, selectedSpecialistId: true },
    });

    if (access.peerUserId) {
      const fromLabel =
        access.role === "specialist"
          ? formatPublicSpecialistName(created.sender.displayName) || "متخصص"
          : "کارفرما";
      const preview =
        parsedBody.data.length > 80
          ? `${parsedBody.data.slice(0, 80)}…`
          : parsedBody.data;

      await createNotification({
        userId: access.peerUserId,
        title: `پیام جدید از ${fromLabel}`,
        message: `درباره «${access.categoryTitle}»: ${preview}`,
        type: "INFO",
        link: `/order/${access.orderId}`,
      });
    }

    revalidatePath(`/order/${access.orderId}`);

    return {
      success: true,
      message: {
        id: created.id,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        senderId: created.senderId,
        senderLabel: senderLabelFor(
          created.senderId,
          orderMeta || { userId: null, selectedSpecialistId: null },
          created.sender.displayName
        ),
        isMine: true,
        side: messageSide(
          created.senderId,
          orderMeta || { userId: null, selectedSpecialistId: null }
        ),
      },
    };
  } catch (err) {
    console.error("sendOrderMessageAction:", err);
    return { success: false, error: "خطا در ارسال پیام." };
  }
}
