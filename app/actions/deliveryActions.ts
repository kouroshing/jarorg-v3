"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { parseOrderStatus } from "@/lib/orders/status";
import { AUTO_RELEASE_DAYS, settleOrder } from "@/lib/orders/settlement";
import { settlementAmount } from "@/lib/orders/settings";

/**
 * Closing out a paid project.
 *
 *   specialist reports delivery  ->  client confirms  ->  Jar releases the money
 *
 * If the client never answers, the auto-release script pays out after
 * AUTO_RELEASE_DAYS so a specialist is not left waiting on someone who has
 * stopped replying. An admin can release early when something needs sorting.
 */

const orderIdSchema = z.string().uuid("شناسه سفارش نامعتبر است.");

export type DeliveryResult =
  | { success: true; message: string; settledAmount?: number }
  | { success: false; error: string };

/** The specialist says the work is done. */
export async function reportDeliveryAction(orderId: string): Promise<DeliveryResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      status: true,
      paidAt: true,
      deliveredAt: true,
      selectedSpecialistId: true,
      userId: true,
      categoryTitle: true,
    },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  if (order.selectedSpecialistId !== session.userId) {
    return { success: false, error: "این پروژه به شما واگذار نشده است." };
  }

  if (!order.paidAt) {
    return {
      success: false,
      error: "تا زمانی که کارفرما هزینه پروژه را پرداخت نکرده، امکان ثبت تحویل وجود ندارد.",
    };
  }

  if (order.deliveredAt) {
    return { success: false, error: "تحویل این پروژه قبلاً ثبت شده است." };
  }

  if (parseOrderStatus(order.status) !== "CONFIRMED") {
    return { success: false, error: "وضعیت این پروژه اجازه ثبت تحویل نمی‌دهد." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { deliveredAt: new Date() },
  });

  if (order.userId) {
    await createNotification({
      userId: order.userId,
      title: "پروژه شما تحویل داده شد",
      message: `متخصص، تحویل پروژه «${
        order.categoryTitle || "عکاسی"
      }» را ثبت کرد. لطفاً آن را تأیید کنید تا تسویه انجام شود. در صورت عدم پاسخ، پس از ${AUTO_RELEASE_DAYS} روز به‌صورت خودکار تسویه می‌شود.`,
      type: "INFO",
      link: `/order/${order.id}`,
    });
  }

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/specialist/projects");

  return {
    success: true,
    message: "تحویل ثبت شد. پس از تأیید کارفرما، مبلغ به کیف پول شما واریز می‌شود.",
  };
}

/** The client confirms delivery, which releases the money. */
export async function confirmDeliveryAction(orderId: string): Promise<DeliveryResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: { id: true, userId: true, contactPhone: true, paidAt: true, settledAt: true },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  const isOwner =
    (order.userId && order.userId === session.userId) ||
    (order.contactPhone && order.contactPhone === session.phone);
  const isAdmin = session.role === "admin";

  if (!isOwner && !isAdmin) {
    return { success: false, error: "شما مجاز به تأیید این سفارش نیستید." };
  }

  if (order.settledAt) {
    return { success: false, error: "این پروژه قبلاً تسویه شده است." };
  }

  const result = await settleOrder(order.id, isAdmin && !isOwner ? "ADMIN_RELEASED" : "CLIENT_CONFIRMED");
  if (!result.ok) return { success: false, error: result.error };

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/specialist/projects");
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message: "پروژه تکمیل شد و مبلغ متخصص تسویه شد.",
    settledAmount: result.amount,
  };
}

/** Admin releases escrow without waiting on the client. */
export async function adminReleaseEscrowAction(orderId: string): Promise<DeliveryResult> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "دسترسی ادمین الزامی است." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const result = await settleOrder(parsed.data, "ADMIN_RELEASED");
  if (!result.ok) return { success: false, error: result.error };

  revalidatePath(`/order/${parsed.data}`);
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message: result.alreadySettled
      ? "این سفارش از قبل تسویه شده بود."
      : "تسویه انجام شد.",
    settledAmount: result.amount,
  };
}

/** What the specialist will receive, shown before anyone commits to anything. */
export async function getSettlementPreviewAction(orderId: string): Promise<
  | { success: true; total: number; commission: number; travel: number; payout: number }
  | { success: false; error: string }
> {
  const session = await getSession();
  if (!session?.userId) return { success: false, error: "احراز هویت لازم است." };

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: {
      userId: true,
      contactPhone: true,
      selectedSpecialistId: true,
      agreedBasePrice: true,
      agreedTravelFee: true,
      agreedTotalPrice: true,
      commissionPercent: true,
    },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  const maySee =
    order.userId === session.userId ||
    order.contactPhone === session.phone ||
    order.selectedSpecialistId === session.userId ||
    session.role === "admin";

  if (!maySee) return { success: false, error: "دسترسی غیرمجاز." };

  const base = order.agreedBasePrice ?? 0;
  const travel = order.agreedTravelFee ?? 0;
  const payout = settlementAmount(order);

  return {
    success: true,
    total: order.agreedTotalPrice ?? base + travel,
    commission: base + travel - payout,
    travel,
    payout,
  };
}
