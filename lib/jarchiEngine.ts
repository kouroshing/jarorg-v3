import { prisma } from "@/lib/prisma";
import { parseTemplate } from "@/lib/jarchiUtils";

const DEFAULT_EVENT_TEMPLATES = [
  {
    slug: "expert-onboarded",
    title: "خوش‌آمدگویی و تکمیل اطلاعات",
    content: "همکار گرامی {{user_name}}، اطلاعات تخصصی شما با موفقیت ثبت شد و در صف تایید مدیریت قرار گرفت. پس از بررسی، سطح کاربری شما فعال خواهد شد."
  },
  {
    slug: "new-project-created",
    title: "پروژه جدید ثبت شد",
    content: "سلام {{user_name}} عزیز، پروژه جدید شما با موفقیت در سیستم ثبت گردید. متخصصان ما به زودی جهت هماهنگی با شما تماس خواهند گرفت."
  },
  {
    slug: "files-uploaded",
    title: "فایل‌های نهایی پروژه آماده شد",
    content: "سلام {{user_name}} عزیز، فایل‌های نهایی سفارش شما با موفقیت در پنل بارگذاری شد و هم‌اکنون آماده مشاهده و دانلود است."
  },
  {
    slug: "jaramooz-payment-success",
    title: "تایید پرداخت و ثبت‌نام در دوره",
    content: "سلام {{user_name}}، پرداخت شما موفقیت‌آمیز بود و ثبت‌نام شما در دوره آموزشی {{course_title}} تایید شد. یادگیری را شروع کنید."
  },
  {
    slug: "plan-upgraded",
    title: "ارتقای اشتراک موفقیت‌آمیز بود",
    content: "کاربر گرامی {{user_name}}، حساب کاربری شما با موفقیت به سطح {{plan_name}} ارتقا یافت. مزایای این سطح برای شما فعال شد."
  }
];

/**
 * Triggers a Jarchi automation event.
 * Non-blocking: executes asynchronously and catches errors internally.
 */
export function triggerEvent(eventType: string, data: any): void {
  // Execute in an async IIFE without awaiting it, ensuring it doesn't block the main flow
  (async () => {
    try {
      const userId = data.userId;
      if (!userId) return;

      // 1. Fetch target user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, phone: true, storageLimit: true }
      });

      if (!user) {
        console.warn(`[JARCHI AUTOMATION WARNING] User not found: ${userId} for event ${eventType}`);
        return;
      }

      // 2. Fetch or seed the event template
      let template = await prisma.notificationTemplate.findUnique({
        where: { slug: eventType }
      });

      if (!template) {
        const defaultTpl = DEFAULT_EVENT_TEMPLATES.find(t => t.slug === eventType);
        if (defaultTpl) {
          template = await prisma.notificationTemplate.create({
            data: defaultTpl
          });
        }
      }

      if (!template) {
        console.warn(`[JARCHI AUTOMATION WARNING] No template found/defined for event: ${eventType}`);
        return;
      }

      // 3. Resolve user variables
      let planName = "بیسیک (Basic)";
      if (user.storageLimit === 0) {
        planName = "بیسیک (Basic)";
      } else if (user.storageLimit > 2147483648) {
        planName = "اولترا (Ultra)";
      } else {
        planName = "پرو (Pro)";
      }

      const variables: Record<string, string> = {
        user_name: user.displayName || "کاربر عزیز",
        plan_name: planName,
        course_title: data.courseTitle || "دوره آموزشی",
        project_id: data.projectId || ""
      };

      // 4. Parse content & title
      const finalTitle = parseTemplate(template.title, variables);
      const finalContent = parseTemplate(template.content, variables);

      // 5. Create notification row
      await prisma.notification.create({
        data: {
          userId: userId,
          title: finalTitle,
          message: finalContent,
          type: "INFO",
          channel: "IN_APP",
          isRead: false
        }
      });

      // 6. Log trigger in terminal (Local Dev report)
      console.log(`[JARCHI AUTOMATION] Triggered event: ${eventType} for User: ${userId}`);

    } catch (err) {
      console.error(`[JARCHI AUTOMATION ERROR] Failed to process event ${eventType}:`, err);
    }
  })();
}
