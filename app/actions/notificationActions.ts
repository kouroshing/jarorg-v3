"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
}

/**
 * Returns notifications for the current authenticated user.
 */
export async function getMyNotificationsAction(): Promise<{
  success: boolean;
  error?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          userId: session.userId,
          isRead: false,
        },
      }),
    ]);

    const mapped: NotificationItem[] = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      channel: n.channel,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      success: true,
      unreadCount,
      notifications: mapped,
    };
  } catch (error) {
    console.error("Error in getMyNotificationsAction:", error);
    return { success: false, error: "خطا در دریافت اعلان‌ها." };
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "دسترسی غیرمجاز." };
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== session.userId) {
      return { success: false, error: "اعلان یافت نشد." };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/specialist/projects");
    return { success: true };
  } catch (error) {
    console.error("Error in markNotificationAsReadAction:", error);
    return { success: false, error: "خطا در به‌روزرسانی وضعیت اعلان." };
  }
}

/**
 * Marks all unread notifications of the current user as read.
 */
export async function markAllNotificationsAsReadAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "دسترسی غیرمجاز." };
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/specialist/projects");
    return { success: true };
  } catch (error) {
    console.error("Error in markAllNotificationsAsReadAction:", error);
    return { success: false, error: "خطا در به‌روزرسانی اعلان‌ها." };
  }
}
