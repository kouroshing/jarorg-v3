"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";
import {
  REVIEW_DIRECTION,
  REVIEW_WINDOW_DAYS,
  type ReviewDirection,
} from "@/lib/orders/reviews";

export { REVIEW_WINDOW_DAYS, REVIEW_DIRECTION };
export type { ReviewDirection };

const orderIdSchema = z.string().uuid("شناسه سفارش نامعتبر است.");
const submitSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500, "نظر حداکثر ۵۰۰ نویسه است.")
    .optional()
    .nullable(),
});

export type OrderReviewState = {
  canReview: boolean;
  alreadySubmitted: boolean;
  windowExpired: boolean;
  myReview: {
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  peerReview: {
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  direction: ReviewDirection | null;
  revieweeLabel: string;
  daysLeft: number | null;
};

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Loads review eligibility + existing rows for the current party on an order.
 */
export async function getOrderReviewStateAction(orderId: string): Promise<{
  success: boolean;
  error?: string;
  state?: OrderReviewState;
}> {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً وارد شوید." };
    }

    const parsed = orderIdSchema.safeParse(orderId);
    if (!parsed.success) {
      return { success: false, error: "شناسه سفارش نامعتبر است." };
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data },
      select: {
        id: true,
        settledAt: true,
        userId: true,
        contactPhone: true,
        selectedSpecialistId: true,
        selectedSpecialist: { select: { displayName: true } },
      },
    });

    if (!order) {
      return { success: false, error: "سفارش یافت نشد." };
    }

    if (!order.settledAt) {
      return {
        success: true,
        state: {
          canReview: false,
          alreadySubmitted: false,
          windowExpired: false,
          myReview: null,
          peerReview: null,
          direction: null,
          revieweeLabel: "",
          daysLeft: null,
        },
      };
    }

    const isClient = Boolean(
      (order.userId && order.userId === session.userId) ||
        (order.contactPhone && order.contactPhone === session.phone)
    );
    const isSpecialist = order.selectedSpecialistId === session.userId;

    if (!isClient && !isSpecialist) {
      return { success: false, error: "دسترسی به نظرسنجی این سفارش ندارید." };
    }

    const direction: ReviewDirection = isClient
      ? REVIEW_DIRECTION.CLIENT_TO_SPECIALIST
      : REVIEW_DIRECTION.SPECIALIST_TO_CLIENT;
    const peerDirection: ReviewDirection = isClient
      ? REVIEW_DIRECTION.SPECIALIST_TO_CLIENT
      : REVIEW_DIRECTION.CLIENT_TO_SPECIALIST;

    const elapsed = daysSince(order.settledAt);
    const windowExpired = elapsed > REVIEW_WINDOW_DAYS;
    const daysLeft = Math.max(0, Math.ceil(REVIEW_WINDOW_DAYS - elapsed));

    const [mine, peer] = await Promise.all([
      prisma.orderReview.findUnique({
        where: {
          orderId_direction: { orderId: order.id, direction },
        },
        select: { rating: true, comment: true, createdAt: true },
      }),
      prisma.orderReview.findUnique({
        where: {
          orderId_direction: { orderId: order.id, direction: peerDirection },
        },
        select: { rating: true, comment: true, createdAt: true },
      }),
    ]);

    const revieweeLabel = isClient
      ? formatPublicSpecialistName(order.selectedSpecialist?.displayName)
      : "کارفرما";

    return {
      success: true,
      state: {
        canReview: !mine && !windowExpired,
        alreadySubmitted: Boolean(mine),
        windowExpired: !mine && windowExpired,
        myReview: mine
          ? {
              rating: mine.rating,
              comment: mine.comment,
              createdAt: mine.createdAt.toISOString(),
            }
          : null,
        peerReview: peer
          ? {
              rating: peer.rating,
              comment: peer.comment,
              createdAt: peer.createdAt.toISOString(),
            }
          : null,
        direction,
        revieweeLabel,
        daysLeft: mine ? null : daysLeft,
      },
    };
  } catch (err) {
    console.error("getOrderReviewStateAction:", err);
    return { success: false, error: "خطا در دریافت وضعیت نظرسنجی." };
  }
}

/**
 * Submits a 1–5 star review after settlement. One per direction per order.
 */
export async function submitOrderReviewAction(input: {
  orderId: string;
  rating: number;
  comment?: string | null;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً وارد شوید." };
    }

    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است.",
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: {
        id: true,
        settledAt: true,
        userId: true,
        contactPhone: true,
        selectedSpecialistId: true,
        categoryTitle: true,
      },
    });

    if (!order) {
      return { success: false, error: "سفارش یافت نشد." };
    }
    if (!order.settledAt) {
      return {
        success: false,
        error: "نظرسنجی فقط بعد از تسویه پروژه فعال است.",
      };
    }
    if (daysSince(order.settledAt) > REVIEW_WINDOW_DAYS) {
      return {
        success: false,
        error: `مهلت نظرسنجی (${REVIEW_WINDOW_DAYS} روز پس از تسویه) به پایان رسیده است.`,
      };
    }

    const isClient = Boolean(
      (order.userId && order.userId === session.userId) ||
        (order.contactPhone && order.contactPhone === session.phone)
    );
    const isSpecialist = order.selectedSpecialistId === session.userId;

    if (!isClient && !isSpecialist) {
      return { success: false, error: "اجازه ثبت نظر برای این سفارش را ندارید." };
    }

    if (isClient && !order.selectedSpecialistId) {
      return { success: false, error: "متخصص این سفارش مشخص نیست." };
    }
    if (isSpecialist && !order.userId) {
      return { success: false, error: "کارفرمای این سفارش مشخص نیست." };
    }

    const direction: ReviewDirection = isClient
      ? REVIEW_DIRECTION.CLIENT_TO_SPECIALIST
      : REVIEW_DIRECTION.SPECIALIST_TO_CLIENT;
    const revieweeId = isClient
      ? (order.selectedSpecialistId as string)
      : (order.userId as string);

    const existing = await prisma.orderReview.findUnique({
      where: {
        orderId_direction: { orderId: order.id, direction },
      },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "قبلاً برای این پروژه نظر ثبت کرده‌اید." };
    }

    const comment =
      parsed.data.comment && parsed.data.comment.trim().length > 0
        ? parsed.data.comment.trim()
        : null;

    await prisma.orderReview.create({
      data: {
        orderId: order.id,
        direction,
        reviewerId: session.userId,
        revieweeId,
        rating: parsed.data.rating,
        comment,
      },
    });

    const stars = "★".repeat(parsed.data.rating) + "☆".repeat(5 - parsed.data.rating);
    await createNotification({
      userId: revieweeId,
      title: "نظر جدید برای پروژه",
      message: `برای «${order.categoryTitle || "پروژه"}» امتیاز ${stars} دریافت کردید.`,
      type: "INFO",
      link: `/order/${order.id}`,
    });

    revalidatePath(`/order/${order.id}`);
    revalidatePath(`/s/${revieweeId}`);
    if (order.userId) revalidatePath(`/order/${order.id}`);

    return { success: true, message: "نظر شما ثبت شد. ممنون از بازخوردتان." };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "P2002") {
      return { success: false, error: "قبلاً برای این پروژه نظر ثبت کرده‌اید." };
    }
    console.error("submitOrderReviewAction:", err);
    return { success: false, error: "خطا در ثبت نظر." };
  }
}
