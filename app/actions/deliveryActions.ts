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

/**
 * The client says the work is not acceptable, which freezes the payout.
 *
 * Without this, auto-release pays out on schedule regardless of what the client
 * said — a complaint with no consequence. A dispute takes the order out of the
 * auto-release query entirely; only an admin can move it after that.
 */
export async function raiseDisputeAction(
  orderId: string,
  reason: string
): Promise<DeliveryResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const trimmed = reason.trim();
  if (trimmed.length < 15) {
    return {
      success: false,
      error: "لطفاً حداقل در ۱۵ کاراکتر توضیح دهید مشکل چیست تا بتوانیم پیگیری کنیم.",
    };
  }
  if (trimmed.length > 1500) {
    return { success: false, error: "توضیح نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد." };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      userId: true,
      contactPhone: true,
      paidAt: true,
      settledAt: true,
      disputedAt: true,
      categoryTitle: true,
      selectedSpecialistId: true,
    },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  const isOwner =
    (order.userId && order.userId === session.userId) ||
    (order.contactPhone && order.contactPhone === session.phone);

  if (!isOwner) {
    return { success: false, error: "فقط کارفرمای این سفارش می‌تواند اعتراض ثبت کند." };
  }

  if (!order.paidAt) {
    return { success: false, error: "این سفارش پرداخت نشده است." };
  }

  // Once the money has gone out, this is a refund conversation with support,
  // not something the client can reverse themselves.
  if (order.settledAt) {
    return {
      success: false,
      error: "این پروژه تسویه شده است. برای پیگیری با پشتیبانی جار تماس بگیرید.",
    };
  }

  if (order.disputedAt) {
    return { success: false, error: "اعتراض شما قبلاً ثبت شده و در حال بررسی است." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { disputedAt: new Date(), disputeReason: trimmed },
  });

  if (order.selectedSpecialistId) {
    await createNotification({
      userId: order.selectedSpecialistId,
      title: "اعتراض کارفرما ثبت شد",
      message: `کارفرمای پروژه «${
        order.categoryTitle || "عکاسی"
      }» اعتراضی ثبت کرد. تسویه تا بررسی توسط جار متوقف شده است.`,
      type: "WARNING",
      link: "/specialist/projects",
    });
  }

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/specialist/projects");

  return {
    success: true,
    message:
      "اعتراض شما ثبت شد و تسویه متوقف شد. تیم جار بررسی می‌کند و با شما تماس می‌گیرد.",
  };
}

/**
 * Admin closes a dispute, either by paying the specialist or by cancelling the
 * order for refund.
 *
 * Refunds are not automated: Zarinpal settlements are reversed by hand, so this
 * records the decision and leaves the transfer to whoever does the accounting.
 */
export async function resolveDisputeAction(
  orderId: string,
  resolution: "RELEASED" | "REFUNDED",
  note?: string
): Promise<DeliveryResult> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "دسترسی ادمین الزامی است." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: { id: true, disputedAt: true, disputeResolvedAt: true, userId: true },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };
  if (!order.disputedAt) return { success: false, error: "اعتراضی برای این سفارش ثبت نشده است." };
  if (order.disputeResolvedAt) return { success: false, error: "این اعتراض قبلاً بسته شده است." };

  if (resolution === "RELEASED") {
    const result = await settleOrder(order.id, "ADMIN_RELEASED");
    if (!result.ok) return { success: false, error: result.error };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      disputeResolvedAt: new Date(),
      disputeResolution: resolution,
      ...(resolution === "REFUNDED"
        ? { status: "CANCELLED", adminCancelNote: note?.trim() || "لغو پس از بررسی اعتراض کارفرما" }
        : {}),
    },
  });

  if (order.userId) {
    await createNotification({
      userId: order.userId,
      title: "نتیجه بررسی اعتراض",
      message:
        resolution === "RELEASED"
          ? "پس از بررسی، پروژه تکمیل تلقی شد و مبلغ برای متخصص آزاد شد."
          : "اعتراض شما پذیرفته شد. سفارش لغو و مبلغ به شما بازگردانده می‌شود؛ همکاران ما تماس می‌گیرند.",
      type: resolution === "RELEASED" ? "INFO" : "SUCCESS",
      link: `/order/${order.id}`,
    });
  }

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/dashboard/wallet");

  return {
    success: true,
    message: resolution === "RELEASED" ? "مبلغ برای متخصص آزاد شد." : "سفارش لغو شد؛ بازگشت وجه دستی است.",
  };
}

/**
 * The client sends the work back with notes instead of escalating.
 *
 * Karlancer's flow, and it is the right one: most dissatisfaction is "please
 * fix this", not "refund me". A binary accept-or-dispute forces every small
 * complaint into arbitration, which is slow for everyone and puts an admin in
 * the middle of a conversation two people could have had themselves.
 *
 * A revision reopens delivery — the auto-release clock stops until the
 * specialist reports again — but it does not freeze the order the way a dispute
 * does. Nobody has accused anyone of anything yet.
 */
export async function requestRevisionAction(
  orderId: string,
  note: string
): Promise<DeliveryResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
  }

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const trimmed = note.trim();
  if (trimmed.length < 10) {
    return {
      success: false,
      error: "لطفاً بنویسید دقیقاً چه چیزی باید اصلاح شود تا متخصص بتواند کار را درست کند.",
    };
  }
  if (trimmed.length > 1500) {
    return { success: false, error: "توضیح نمی‌تواند بیشتر از ۱۵۰۰ کاراکتر باشد." };
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      userId: true,
      contactPhone: true,
      paidAt: true,
      settledAt: true,
      deliveredAt: true,
      disputedAt: true,
      revisionCount: true,
      categoryTitle: true,
      selectedSpecialistId: true,
    },
  });

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  const isOwner =
    (order.userId && order.userId === session.userId) ||
    (order.contactPhone && order.contactPhone === session.phone);

  if (!isOwner) {
    return { success: false, error: "فقط کارفرمای این سفارش می‌تواند درخواست اصلاح بدهد." };
  }

  if (!order.deliveredAt) {
    return { success: false, error: "هنوز تحویلی برای این پروژه ثبت نشده است." };
  }
  if (order.settledAt) {
    return { success: false, error: "این پروژه تسویه شده است." };
  }
  if (order.disputedAt) {
    return { success: false, error: "برای این پروژه اعتراض ثبت شده و در حال بررسی است." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      // Clearing deliveredAt is what stops the auto-release clock: the ball is
      // back with the specialist, and the countdown restarts when they redeliver.
      deliveredAt: null,
      revisionCount: { increment: 1 },
      revisionRequestedAt: new Date(),
      revisionNote: trimmed,
    },
  });

  if (order.selectedSpecialistId) {
    await createNotification({
      userId: order.selectedSpecialistId,
      title: "کارفرما درخواست اصلاح داد",
      message: `برای پروژه «${
        order.categoryTitle || "عکاسی"
      }» اصلاحاتی خواسته شده است: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`,
      type: "WARNING",
      link: "/specialist/projects",
    });
  }

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/specialist/projects");

  return {
    success: true,
    message: `درخواست اصلاح ثبت شد (نوبت ${(order.revisionCount + 1).toLocaleString("fa-IR")}). متخصص مطلع شد.`,
  };
}
