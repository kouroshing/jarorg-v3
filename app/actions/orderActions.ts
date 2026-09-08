"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";
import { sendOrderCreatedSmsNotification } from "@/lib/sms/order-created";
import type { OrderStatus } from "@/lib/orders/status";

export interface CreateOrderInput {
  categorySlug: string;
  isFlexibleSchedule?: boolean;
  bookingDate?: string;
  timeSlot?: string;
  durationHours: number;
  locationType: "CLIENT_LOCATION" | "SPECIALIST_ADVICE" | "JAR_STUDIO";
  locationAddress?: string;
  districtOrCity?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  referenceLink?: string;
  moodboardUrls?: string[];
  projectDescription?: string;
  isAutoPriced?: boolean;
  hourlyRate: number;
  contactName?: string;
  contactPhone?: string;
}

export async function createOrderAction(input: CreateOrderInput) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return {
        success: false,
        error: "برای ثبت سفارش، لطفاً ابتدا با شماره همراه خود وارد حساب شوید.",
      };
    }

    if (!input.categorySlug) {
      return { success: false, error: "لطفاً دسته‌بندی خدمت را انتخاب کنید." };
    }

    const isFlexibleSchedule = input.isFlexibleSchedule ?? true;
    const isAutoPriced = input.isAutoPriced ?? true;

    // Only validate specific date/timeslot if user chose custom scheduling
    if (!isFlexibleSchedule) {
      if (!input.bookingDate) {
        return { success: false, error: "لطفاً تاریخ مدنظر برای پروژه را مشخص کنید." };
      }
      if (!input.timeSlot) {
        return { success: false, error: "لطفاً ساعت یا بازه زمانی پروژه را انتخاب کنید." };
      }
    }

    if (input.durationHours < 1) {
      return { success: false, error: "مدت زمان پروژه باید حداقل ۱ ساعت باشد." };
    }

    if (!input.hourlyRate || input.hourlyRate < 500000) {
      return { success: false, error: "نرخ ساعتی انتخاب‌شده نامعتبر است." };
    }

    const totalEstimatedPrice = input.hourlyRate * input.durationHours;
    const depositAmount = 0; // Deposit is completely removed from upfront flow

    const categoryDef = CATEGORIES_BY_SLUG[input.categorySlug];
    const categoryTitle = categoryDef ? categoryDef.title : input.categorySlug;

    const order = await prisma.order.create({
      data: {
        categorySlug: input.categorySlug,
        categoryTitle,
        isFlexibleSchedule,
        bookingDate: isFlexibleSchedule ? (input.bookingDate || null) : input.bookingDate,
        timeSlot: isFlexibleSchedule ? (input.timeSlot || null) : input.timeSlot,
        durationHours: input.durationHours,
        locationType: input.locationType,
        locationAddress: input.locationAddress || null,
        districtOrCity: input.districtOrCity || null,
        locationLat: input.locationLat ?? null,
        locationLng: input.locationLng ?? null,
        referenceLink: input.referenceLink || null,
        moodboardUrls: input.moodboardUrls ? JSON.stringify(input.moodboardUrls) : null,
        projectDescription: input.projectDescription || null,
        isAutoPriced,
        hourlyRate: input.hourlyRate,
        totalEstimatedPrice,
        depositAmount,
        // Straight onto the specialist board. This used to be PENDING_REVIEW,
        // which nothing moved an order out of and no query looked for: the job
        // board, the admin dashboard, and the cancel button all filtered it out,
        // so every new order landed somewhere no one could see it.
        status: "MATCHING" satisfies OrderStatus,
        contactName: input.contactName || null,
        contactPhone: input.contactPhone || session.phone || null,
        userId: session.userId,
      },
    });

    // Non-blocking fire-and-forget SMS notification to admin 09100138383
    sendOrderCreatedSmsNotification({
      orderId: order.id,
      categoryTitle,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      durationHours: order.durationHours,
      locationType: order.locationType,
      districtOrCity: order.districtOrCity,
      isFlexibleSchedule: order.isFlexibleSchedule,
      bookingDate: order.bookingDate,
      timeSlot: order.timeSlot,
      totalEstimatedPrice: order.totalEstimatedPrice,
      projectDescription: order.projectDescription,
    });

    return {
      success: true,
      orderId: order.id,
      totalEstimatedPrice,
      depositAmount: 0,
    };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return { success: false, error: "خطایی در ثبت سفارش رخ داد. لطفاً مجدداً تلاش کنید." };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { displayName: true, phone: true },
        },
        selectedSpecialist: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            city: true,
            equipment: true,
            hasStudio: true,
            specialistProfile: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "سفارش موردنظر یافت نشد." };
    }

    return {
      success: true,
      order: {
        ...order,
        moodboardUrls: order.moodboardUrls ? JSON.parse(order.moodboardUrls) : [],
      },
    };
  } catch (error: any) {
    console.error("Failed to fetch order:", error);
    return { success: false, error: "خطا در دریافت اطلاعات سفارش." };
  }
}
