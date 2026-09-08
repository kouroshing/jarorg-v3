import { prisma } from "@/lib/prisma";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  channel?: "IN_APP" | "SMS" | "EMAIL";
}

/**
 * Creates an internal in-app notification in the database.
 * Completely standalone, no external APIs or SMS required.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    if (!params.userId || !params.title || !params.message) {
      return false;
    }

    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title.trim(),
        message: params.message.trim(),
        type: params.type || "INFO",
        channel: params.channel || "IN_APP",
        link: params.link || null,
        isRead: false,
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to create internal notification:", error);
    return false;
  }
}

/**
 * Creates notifications for multiple users in bulk.
 */
export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<boolean> {
  try {
    if (!notifications || notifications.length === 0) return true;

    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        title: n.title.trim(),
        message: n.message.trim(),
        type: n.type || "INFO",
        channel: n.channel || "IN_APP",
        link: n.link || null,
        isRead: false,
      })),
    });

    return true;
  } catch (error) {
    console.error("Failed to create bulk internal notifications:", error);
    return false;
  }
}
