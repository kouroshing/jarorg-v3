"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { parseTemplate } from "@/lib/jarchiUtils";
import xss from "xss";

export interface JarchiActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to require a valid session.
 */
async function requireSession() {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new Error("unauthorized");
  }
  return session;
}

/**
 * Gets in-app notifications for the current user.
 */
export async function getUserNotifications(): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
        channel: "IN_APP"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    if (error.message === "unauthorized") {
      return { success: false, error: "دسترسی غیرمجاز. لطفا ابتدا وارد حساب خود شوید." };
    }
    console.error("Error in getUserNotifications:", error);
    return { success: false, error: "خطا در دریافت اعلان‌ها." };
  }
}

/**
 * Gets the count of unread in-app notifications.
 */
export async function getUnreadCount(): Promise<JarchiActionResult<number>> {
  try {
    const session = await requireSession();

    const count = await prisma.notification.count({
      where: {
        userId: session.userId,
        isRead: false,
        channel: "IN_APP"
      }
    });

    return { success: true, data: count };
  } catch (error: any) {
    if (error.message === "unauthorized") {
      return { success: false, data: 0, error: "unauthorized" };
    }
    console.error("Error in getUnreadCount:", error);
    return { success: false, data: 0, error: "Error counting notifications" };
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markAsRead(id: string): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();
    
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== session.userId) {
      return { success: false, error: "اعلان مورد نظر یافت نشد یا دسترسی مجاز نیست." };
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    if (error.message === "unauthorized") {
      return { success: false, error: "دسترسی غیرمجاز." };
    }
    console.error("Error in markAsRead:", error);
    return { success: false, error: "خطا در تغییر وضعیت اعلان." };
  }
}

/**
 * Marks all notifications of the current user as read.
 */
export async function markAllAsRead(): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();

    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
        channel: "IN_APP"
      },
      data: { isRead: true }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    if (error.message === "unauthorized") {
      return { success: false, error: "دسترسی غیرمجاز." };
    }
    console.error("Error in markAllAsRead:", error);
    return { success: false, error: "خطا در تغییر وضعیت اعلان‌ها." };
  }
}

/**
 * Admin utility: Creates a test notification for the admin.
 * Requires user's phone to be the super admin: 09100138383.
 */
export async function createTestNotification(): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();

    // Verify phone is the admin phone
    if (!isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. این عملیات فقط مخصوص مدیریت است." };
    }

    const titles = [
      "سفارش جدید ثبت شد",
      "سیستم به‌روزرسانی شد",
      "هشدار ظرفیت دیسک",
      "کد تخفیف جدید فعال گردید"
    ];

    const messages = [
      "کاربر پوریا شاه‌پسند یک سفارش عکاسی جدید با عنوان 'پرتره پاییزه' ثبت کرده است.",
      "پلتفرم جار با موفقیت به نسخه ۳.۵ ارتقا یافت. تمام ویژگی‌های جدید هم‌اکنون در دسترس هستند.",
      "توجه: فضای ابری دیسک موقت شما به مرز ۸۰٪ رسیده است. لطفاً آن را بررسی کنید.",
      "کد تخفیف SUMMER50 با درصد تخفیف ۵۰٪ برای پلن اولترا متخصصین تعریف و فعال شد."
    ];

    const types = ["SUCCESS", "INFO", "WARNING", "INFO"];

    const randomIndex = Math.floor(Math.random() * titles.length);
    const title = titles[randomIndex]!;
    const message = messages[randomIndex]!;
    const type = types[randomIndex]!;

    const newNotification = await prisma.notification.create({
      data: {
        userId: session.userId,
        title: xss(title),
        message: xss(message),
        type: type,
        channel: "IN_APP",
        isRead: false
      }
    });

    revalidatePath("/");
    return { success: true, data: newNotification };
  } catch (error: any) {
    if (error.message === "unauthorized") {
      return { success: false, error: "دسترسی غیرمجاز." };
    }
    console.error("Error in createTestNotification:", error);
    return { success: false, error: "خطا در ایجاد اعلان تستی." };
  }
}

const DEFAULT_TEMPLATES = [
  {
    slug: "welcome-expert",
    title: "به پلتفرم جار خوش آمدید",
    content: "سلام {{user_name}} عزیز، به خانواده بزرگ عکاسان و فیلم‌برداران جار خوش آمدید. پروفایل تخصصی شما با موفقیت ایجاد شد."
  },
  {
    slug: "plan-upgrade-notice",
    title: "ارتقای حساب کاربری",
    content: "همکار گرامی {{user_name}}، سطح کاربری شما با موفقیت به پلن {{plan_name}} ارتقا یافت. هم‌اکنون می‌توانید از مزایای جدید خود استفاده کنید."
  }
];

/**
 * Gets all notification templates. Auto-seeds default ones if none exist.
 */
export async function getTemplates(): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();
    if (!isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز." };
    }

    let templates = await prisma.notificationTemplate.findMany({
      orderBy: { slug: "asc" }
    });

    if (templates.length === 0) {
      await prisma.notificationTemplate.createMany({
        data: DEFAULT_TEMPLATES
      });
      templates = await prisma.notificationTemplate.findMany({
        orderBy: { slug: "asc" }
      });
    }

    return { success: true, data: templates };
  } catch (error) {
    console.error("Error in getTemplates:", error);
    return { success: false, error: "خطا در دریافت قالب‌ها." };
  }
}

/**
 * Updates a notification template. Locked to super admin.
 */
export async function updateTemplate(
  id: string,
  title: string,
  content: string
): Promise<JarchiActionResult> {
  try {
    const session = await requireSession();
    if (!isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر ارشد مجاز به ویرایش است." };
    }

    const sanitizedTitle = xss(title).trim();
    const sanitizedContent = xss(content).trim();

    if (!sanitizedTitle || !sanitizedContent) {
      return { success: false, error: "پر کردن عنوان و متن قالب الزامی است." };
    }

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        title: sanitizedTitle,
        content: sanitizedContent
      }
    });

    revalidatePath("/admin/jarchi/templates");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error in updateTemplate:", error);
    return { success: false, error: "خطا در ویرایش قالب." };
  }
}

/**
 * Sends notifications to a target group of users in bulk.
 * Locked to super admin.
 */
export async function sendBulkNotifications(
  targetGroup: string,
  templateSlug: string | null,
  customTitle?: string,
  customContent?: string
): Promise<JarchiActionResult<{ count: number }>> {
  try {
    const session = await requireSession();
    if (!isAdminSession(session)) {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر ارشد مجاز به ارسال است." };
    }

    // 1. Resolve target users
    let users: { id: string; phone: string; displayName: string | null; storageLimit: number }[] = [];

    if (targetGroup === "all") {
      users = await prisma.user.findMany({
        select: { id: true, phone: true, displayName: true, storageLimit: true }
      });
    } else if (targetGroup === "specialist") {
      users = await prisma.user.findMany({
        where: { role: "specialist" },
        select: { id: true, phone: true, displayName: true, storageLimit: true }
      });
    } else if (targetGroup === "pro") {
      users = await prisma.user.findMany({
        where: {
          role: "specialist",
          storageLimit: { gt: 0, lte: 2147483648 }
        },
        select: { id: true, phone: true, displayName: true, storageLimit: true }
      });
    } else if (targetGroup === "ultra") {
      users = await prisma.user.findMany({
        where: {
          role: "specialist",
          storageLimit: { gt: 2147483648 }
        },
        select: { id: true, phone: true, displayName: true, storageLimit: true }
      });
    } else {
      return { success: false, error: "گروه هدف نامعتبر است." };
    }

    if (users.length === 0) {
      return { success: true, data: { count: 0 }, error: "هیچ کاربر منطبقی در این گروه هدف یافت نشد." };
    }

    // 2. Fetch template if chosen
    let template: { title: string; content: string } | null = null;
    if (templateSlug) {
      template = await prisma.notificationTemplate.findUnique({
        where: { slug: templateSlug }
      });
      if (!template) {
        return { success: false, error: "قالب انتخاب شده یافت نشد." };
      }
    }

    // 3. Create notifications for all resolved users inside a transaction or in bulk
    const notificationData = users.map((u) => {
      // Resolve tier name
      let planName = "بیسیک (Basic)";
      if (u.storageLimit === 0) {
        planName = "بیسیک (Basic)";
      } else if (u.storageLimit > 2147483648) {
        planName = "اولترا (Ultra)";
      } else {
        planName = "پرو (Pro)";
      }

      const vars = {
        user_name: u.displayName || "کاربر عزیز",
        plan_name: planName
      };

      const finalTitle = template
        ? parseTemplate(template.title, vars)
        : customTitle
        ? parseTemplate(customTitle, vars)
        : "اعلان جدید";

      const finalContent = template
        ? parseTemplate(template.content, vars)
        : customContent
        ? parseTemplate(customContent, vars)
        : "";

      return {
        userId: u.id,
        title: xss(finalTitle),
        message: xss(finalContent),
        type: "INFO",
        channel: "IN_APP",
        isRead: false
      };
    });

    // Write all to DB in a transaction
    await prisma.$transaction(
      notificationData.map((data) => prisma.notification.create({ data }))
    );

    revalidatePath("/");
    return { success: true, data: { count: users.length } };
  } catch (error) {
    console.error("Error in sendBulkNotifications:", error);
    return { success: false, error: "خطا در ارسال نوتیفیکیشن همگانی." };
  }
}
