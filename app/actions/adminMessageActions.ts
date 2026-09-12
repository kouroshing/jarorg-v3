"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  adminAuthFailure,
  requireAdminPermission,
} from "@/lib/auth/adminAccess";
import { normalizePhoneDigits } from "@/lib/auth/phone";
import { createNotification } from "@/lib/notifications";
import { parseTemplate } from "@/lib/jarchiUtils";

export type AdminMessageResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function searchUsersForAdminMessage(query: string) {
  try {
    const session = await getSession();
    await requireAdminPermission(session, "messages_send");
  } catch (error) {
    return { ...adminAuthFailure(error) };
  }

  const q = query.trim();
  if (q.length < 2) {
    return { success: true as const, users: [] as Array<{
      id: string;
      displayName: string | null;
      phone: string;
    }> };
  }

  const phoneDigits = normalizePhoneDigits(q);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(phoneDigits
          ? [{ phone: { contains: phoneDigits.slice(-10) } }]
          : []),
        { displayName: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    take: 12,
    orderBy: { createdAt: "desc" },
    select: { id: true, displayName: true, phone: true },
  });

  return { success: true as const, users };
}

export async function listNotificationTemplatesForAdmin() {
  try {
    const session = await getSession();
    await requireAdminPermission(session, "messages_send");
  } catch (error) {
    return { ...adminAuthFailure(error), templates: [] };
  }

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, slug: true, title: true, content: true },
  });

  return { success: true as const, templates };
}

/**
 * Sends an in-app (Jarchi-style) message to a user from admin.
 * SMS gateway is pattern-only; free-text stays in-app + audit.
 */
export async function sendAdminUserMessageAction({
  userId,
  title,
  message,
  link,
  templateSlug,
}: {
  userId: string;
  title: string;
  message: string;
  link?: string;
  templateSlug?: string;
}): Promise<AdminMessageResult> {
  let actorId = "admin";
  try {
    const session = await getSession();
    const access = await requireAdminPermission(session, "messages_send");
    actorId = access.phone || access.userId || "admin";
  } catch (error) {
    return adminAuthFailure(error);
  }

  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  if (!userId || cleanTitle.length < 2 || cleanMessage.length < 3) {
    return { success: false, error: "عنوان و متن پیام را کامل وارد کنید." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, phone: true },
  });
  if (!user) {
    return { success: false, error: "کاربر یافت نشد." };
  }

  let finalTitle = cleanTitle;
  let finalMessage = cleanMessage;

  if (templateSlug?.trim()) {
    const tpl = await prisma.notificationTemplate.findUnique({
      where: { slug: templateSlug.trim() },
    });
    if (tpl) {
      const vars = {
        user_name: user.displayName || "کاربر",
        phone: user.phone || "",
      };
      // If admin left defaults from template, re-parse; otherwise keep typed text.
      if (cleanTitle === tpl.title || cleanMessage === tpl.content) {
        finalTitle = parseTemplate(tpl.title, vars);
        finalMessage = parseTemplate(tpl.content, vars);
      } else {
        finalTitle = parseTemplate(cleanTitle, vars);
        finalMessage = parseTemplate(cleanMessage, vars);
      }
    }
  } else {
    finalTitle = parseTemplate(cleanTitle, {
      user_name: user.displayName || "کاربر",
    });
    finalMessage = parseTemplate(cleanMessage, {
      user_name: user.displayName || "کاربر",
    });
  }

  const ok = await createNotification({
    userId: user.id,
    title: finalTitle,
    message: finalMessage,
    type: "INFO",
    channel: "IN_APP",
    link: link?.trim() || undefined,
  });

  if (!ok) {
    return { success: false, error: "ثبت اعلان ناموفق بود." };
  }

  await prisma.auditLog.create({
    data: {
      actorId: actorId,
      action: "ADMIN_MESSAGE_SENT",
      targetModel: "User",
      targetId: user.id,
      note: finalTitle.slice(0, 180),
    },
  });

  revalidatePath("/admin/message");
  revalidatePath("/admin/Notification");

  return {
    success: true,
    message: `پیام برای «${user.displayName || user.phone}» در اعلان‌های درون‌برنامه‌ای ثبت شد.`,
  };
}
