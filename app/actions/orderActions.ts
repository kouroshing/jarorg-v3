"use server";

import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { resolveAdminAccess } from "@/lib/auth/adminAccess";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";
import { sendOrderCreatedSmsNotification } from "@/lib/sms/order-created";
import {
  ACTIVE_CLIENT_ORDER_STATUSES,
  parseOrderStatus,
  storedValuesFor,
  type OrderStatus,
} from "@/lib/orders/status";
import { evaluateOrderPublishGate, serializePublishFlags } from "@/lib/orders/publishGate";
import { resolveScheduledAt } from "@/lib/date/jalali";
import { revalidatePath } from "next/cache";
import { snapHourlyRate, getGoldenIndex, resolveHourlyRate } from "@/lib/pricing/budgetStops";
import { createNotification } from "@/lib/notifications";
import { MIN_PROJECT_DESCRIPTION_LENGTH } from "@/lib/orders/descriptionLimits";

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

/** Open / in-flight project for this client, if any. */
export async function findActiveOrderForUser(userId: string, phone?: string | null) {
  return prisma.order.findFirst({
    where: {
      AND: [
        {
          OR: [
            { userId },
            ...(phone ? [{ contactPhone: phone }] : []),
          ],
        },
        { status: { in: storedValuesFor(...ACTIVE_CLIENT_ORDER_STATUSES) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, categoryTitle: true },
  });
}

export async function createOrderAction(input: CreateOrderInput) {
  try {
    await ensurePrismaSchemaReady();

    const session = await getSession();

    if (!session?.userId) {
      return {
        success: false,
        error: "برای ثبت سفارش، لطفاً ابتدا با شماره همراه خود وارد حساب شوید.",
      };
    }

    const active = await findActiveOrderForUser(session.userId, session.phone);
    if (active) {
      return {
        success: false,
        error:
          "شما یک پروژه فعال دارید. تا پایان یا لغو آن نمی‌توانید پروژه جدیدی ثبت کنید.",
        orderId: active.id,
      };
    }

    if (!input.categorySlug) {
      return { success: false, error: "لطفاً دسته‌بندی خدمت را انتخاب کنید." };
    }

    const isFlexibleSchedule = input.isFlexibleSchedule ?? true;

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

    const contactName = (input.contactName || "").trim();
    if (contactName.length < 2 || /[0-9۰-۹٠-٩]/.test(contactName)) {
      return {
        success: false,
        error: "نام و نام‌خانوادگی را فقط با حروف (بدون عدد) وارد کنید.",
      };
    }

    const projectDescription = (input.projectDescription || "").trim();
    if (projectDescription.length < MIN_PROJECT_DESCRIPTION_LENGTH) {
      return {
        success: false,
        error: `توضیحات پروژه باید حداقل ${MIN_PROJECT_DESCRIPTION_LENGTH} حرف باشد.`,
      };
    }

    // Snap to configured ladder (lib/pricing/budgetStops — dashboard-ready).
    const hourlyRate = snapHourlyRate(
      input.hourlyRate && input.hourlyRate >= 500_000
        ? input.hourlyRate
        : resolveHourlyRate(getGoldenIndex())
    );
    const totalEstimatedPrice = hourlyRate * input.durationHours;
    const depositAmount = 0; // Deposit is completely removed from upfront flow
    const isAutoPriced =
      input.isAutoPriced ?? hourlyRate === resolveHourlyRate(getGoldenIndex());

    const categoryDef = CATEGORIES_BY_SLUG[input.categorySlug];
    const categoryTitle = categoryDef ? categoryDef.title : input.categorySlug;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [priorOrderCount, recentOrderCount24h] = await Promise.all([
      prisma.order.count({
        where: {
          OR: [
            { userId: session.userId },
            ...(session.phone ? [{ contactPhone: session.phone }] : []),
          ],
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: dayAgo },
          OR: [
            { userId: session.userId },
            ...(session.phone ? [{ contactPhone: session.phone }] : []),
          ],
        },
      }),
    ]);

    const gate = evaluateOrderPublishGate({
      categorySlug: input.categorySlug,
      projectDescription,
      locationType: input.locationType,
      locationAddress: input.locationAddress,
      districtOrCity: input.districtOrCity,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
      referenceLink: input.referenceLink,
      moodboardUrls: input.moodboardUrls,
      isFlexibleSchedule,
      bookingDate: input.bookingDate,
      timeSlot: input.timeSlot,
      hourlyRate,
      priorOrderCount,
      recentOrderCount24h,
    });

    const order = await prisma.order.create({
      data: {
        categorySlug: input.categorySlug,
        categoryTitle,
        isFlexibleSchedule,
        bookingDate: isFlexibleSchedule ? (input.bookingDate || null) : input.bookingDate,
        timeSlot: isFlexibleSchedule ? (input.timeSlot || null) : input.timeSlot,
        durationHours: input.durationHours,
        // Derived once, at the source. bookingDate is a Persian display string;
        // every later question about time is asked of this instead.
        scheduledAt: resolveScheduledAt(
          isFlexibleSchedule ? input.bookingDate || null : input.bookingDate,
          input.timeSlot
        ),
        locationType: input.locationType,
        locationAddress: input.locationAddress || null,
        districtOrCity: input.districtOrCity || null,
        locationLat: input.locationLat ?? null,
        locationLng: input.locationLng ?? null,
        referenceLink: input.referenceLink || null,
        moodboardUrls: input.moodboardUrls ? JSON.stringify(input.moodboardUrls) : null,
        projectDescription,
        isAutoPriced,
        hourlyRate,
        totalEstimatedPrice,
        depositAmount,
        status: gate.status satisfies OrderStatus,
        publishFlags: serializePublishFlags(gate.flags),
        contactName,
        // Ownership phone must come from the verified session — never trust client input.
        contactPhone: session.phone || null,
        userId: session.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.phone || session.userId,
        action: gate.autoPublish ? "ORDER_AUTO_PUBLISHED" : "ORDER_HELD_FOR_REVIEW",
        targetModel: "Order",
        targetId: order.id,
        note: gate.summary.slice(0, 500),
      },
    });

    if (gate.autoPublish) {
      void createNotification({
        userId: session.userId,
        title: "پروژه شما منتشر شد",
        message: `پروژه «${categoryTitle}» برای متخصصان واجد شرایط نمایش داده شد.`,
        type: "SUCCESS",
        link: `/order/${order.id}`,
      });
      revalidatePath("/specialist/projects");
    }

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
      status: gate.status,
      autoPublished: gate.autoPublish,
    };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return { success: false, error: "خطایی در ثبت سفارش رخ داد. لطفاً مجدداً تلاش کنید." };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "سفارش موردنظر یافت نشد." };
    }

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

    const isOwner =
      (order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone);
    const isSelectedSpecialist = order.selectedSpecialistId === session.userId;
    const access = await resolveAdminAccess(session);
    const isAdmin = Boolean(access);

    if (!isOwner && !isAdmin && !isSelectedSpecialist) {
      return { success: false, error: "سفارش موردنظر یافت نشد." };
    }

    return {
      success: true,
      order: {
        ...order,
        moodboardUrls: order.moodboardUrls ? JSON.parse(order.moodboardUrls) : [],
      },
    };
  } catch (error: unknown) {
    console.error("Failed to fetch order:", error);
    return { success: false, error: "خطا در دریافت اطلاعات سفارش." };
  }
}

export interface UpdateOrderByClientInput {
  orderId: string;
  contactName: string;
  projectDescription: string;
  isFlexibleSchedule?: boolean;
  bookingDate?: string | null;
  timeSlot?: string | null;
  durationHours: number;
  locationType: "CLIENT_LOCATION" | "SPECIALIST_ADVICE" | "JAR_STUDIO";
  locationAddress?: string;
  districtOrCity?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  referenceLink?: string;
  moodboardUrls?: string[];
}

/** Client resubmits after admin asked for edits. */
export async function updateOrderByClientAction(input: UpdateOrderByClientInput) {
  try {
    await ensurePrismaSchemaReady();
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری شوید." };
    }

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        userId: true,
        contactPhone: true,
        status: true,
        categorySlug: true,
        categoryTitle: true,
        hourlyRate: true,
      },
    });

    if (!order) {
      return { success: false, error: "سفارش یافت نشد." };
    }

    const isOwner =
      (order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone);
    if (!isOwner && session.role !== "admin") {
      return { success: false, error: "دسترسی ندارید." };
    }

    if (parseOrderStatus(order.status) !== "NEEDS_CLIENT_EDIT") {
      return {
        success: false,
        error: "این سفارش در حال حاضر قابل ویرایش نیست.",
      };
    }

    const contactName = input.contactName.trim();
    if (contactName.length < 2 || /[0-9۰-۹٠-٩]/.test(contactName)) {
      return {
        success: false,
        error: "نام و نام‌خانوادگی را فقط با حروف وارد کنید.",
      };
    }

    const projectDescription = input.projectDescription.trim();
    if (projectDescription.length < MIN_PROJECT_DESCRIPTION_LENGTH) {
      return {
        success: false,
        error: `توضیحات پروژه باید حداقل ${MIN_PROJECT_DESCRIPTION_LENGTH} حرف باشد.`,
      };
    }

    if (input.durationHours < 1) {
      return { success: false, error: "مدت زمان پروژه باید حداقل ۱ ساعت باشد." };
    }

    const isFlexibleSchedule = input.isFlexibleSchedule ?? true;
    const totalEstimatedPrice = order.hourlyRate * input.durationHours;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ownerFilter = {
      OR: [
        ...(order.userId ? [{ userId: order.userId }] : []),
        ...(order.contactPhone ? [{ contactPhone: order.contactPhone }] : []),
        { userId: session.userId },
        ...(session.phone ? [{ contactPhone: session.phone }] : []),
      ],
    };
    const [priorOrderCount, recentOrderCount24h] = await Promise.all([
      prisma.order.count({ where: ownerFilter }),
      prisma.order.count({
        where: { ...ownerFilter, createdAt: { gte: dayAgo }, NOT: { id: order.id } },
      }),
    ]);

    const gate = evaluateOrderPublishGate({
      categorySlug: order.categorySlug,
      projectDescription,
      locationType: input.locationType,
      locationAddress: input.locationAddress,
      districtOrCity: input.districtOrCity,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
      referenceLink: input.referenceLink,
      moodboardUrls: input.moodboardUrls,
      isFlexibleSchedule,
      bookingDate: input.bookingDate,
      timeSlot: input.timeSlot,
      hourlyRate: order.hourlyRate,
      // After first order exists, prior count includes this one — treat as returning.
      priorOrderCount: Math.max(0, priorOrderCount - 1),
      recentOrderCount24h,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        contactName,
        projectDescription,
        isFlexibleSchedule,
        bookingDate: isFlexibleSchedule ? input.bookingDate || null : input.bookingDate,
        timeSlot: isFlexibleSchedule ? input.timeSlot || null : input.timeSlot,
        durationHours: input.durationHours,
        scheduledAt: resolveScheduledAt(
          isFlexibleSchedule ? input.bookingDate || null : input.bookingDate,
          input.timeSlot
        ),
        locationType: input.locationType,
        locationAddress: input.locationAddress || null,
        districtOrCity: input.districtOrCity || null,
        locationLat: input.locationLat ?? null,
        locationLng: input.locationLng ?? null,
        referenceLink: input.referenceLink || null,
        moodboardUrls: input.moodboardUrls
          ? JSON.stringify(input.moodboardUrls)
          : null,
        totalEstimatedPrice,
        status: gate.status satisfies OrderStatus,
        publishFlags: serializePublishFlags(gate.flags),
        adminNote: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.phone || session.userId,
        action: gate.autoPublish
          ? "ORDER_AUTO_PUBLISHED_AFTER_EDIT"
          : "ORDER_HELD_FOR_REVIEW_AFTER_EDIT",
        targetModel: "Order",
        targetId: order.id,
        note: gate.summary.slice(0, 500),
      },
    });

    if (gate.autoPublish && order.userId) {
      void createNotification({
        userId: order.userId,
        title: "پروژه شما منتشر شد",
        message: `پروژه «${order.categoryTitle || "عکاسی"}» پس از ویرایش برای متخصصان منتشر شد.`,
        type: "SUCCESS",
        link: `/order/${order.id}`,
      });
      revalidatePath("/specialist/projects");
    }

    revalidatePath(`/order/${order.id}`);
    revalidatePath("/admin");
    revalidatePath("/admin/Order");

    return { success: true, status: gate.status, autoPublished: gate.autoPublish };
  } catch (error) {
    console.error("Failed to update order:", error);
    return { success: false, error: "خطا در ذخیره ویرایش سفارش." };
  }
}
