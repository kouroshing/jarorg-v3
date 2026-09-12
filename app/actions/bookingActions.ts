"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendSmsByPattern } from "@/lib/sms/ippanel";

export interface BookingData {
  fullName: string;
  summary: string;
  moodboardUrl?: string;
  budgetRange: string;
  phone: string;
  bestContactTime: string;
  expertName?: string;
}

export interface BookingResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to submit a direct specialist booking request.
 * Saves the project lead in the database and dispatches pattern SMS notifications via IPPanel api2.
 * Enforces a persistent 24-hour rate limit check (max 2 projects per phone number).
 */
export async function submitProjectForm(formData: BookingData): Promise<BookingResult> {
  try {
    // 1. Session check: Ensure user is logged in
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "دسترسی غیرمجاز. لطفاً ابتدا وارد حساب خود شوید." };
    }

    const { fullName, summary, moodboardUrl, budgetRange, phone, bestContactTime, expertName } = formData;

    // 2. Server-Side Input Validations
    if (!fullName || !fullName.trim() || !summary || !summary.trim() || !phone || !phone.trim() || !budgetRange || !bestContactTime) {
      return { success: false, error: "لطفاً تمامی فیلدهای الزامی را پر کنید." };
    }

    // Strict input length validation
    if (fullName.trim().length > 50) {
      return { success: false, error: "طول فیلد نام و نام خانوادگی نمی‌تواند بیش از ۵۰ کاراکتر باشد." };
    }
    if (summary.trim().length > 500) {
      return { success: false, error: "طول فیلد خلاصه پروژه نمی‌تواند بیش از ۵۰۰ کاراکتر باشد." };
    }

    // Contact phone format check (iran mobile 09...)
    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      return { success: false, error: "فرمت شماره تماس معتبر نیست. مثال: 09123456789" };
    }

    // 3. Persistent Database Rate Limiting Check (Anti-Spam)
    // Limits: Max 2 submissions per 24 hours per phone number
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingRequestsCount = await prisma.project.count({
      where: {
        contactPhone: phone.trim(),
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    if (existingRequestsCount >= 2) {
      return { 
        success: false, 
        error: "⚠️ شما سقف مجاز ثبت درخواست در روز (۲ پروژه) را پر کرده‌اید. در صورت نیاز به هماهنگی بیشتر، لطفا فردا تلاش کنید یا با پشتیبانی تماس بگیرید." 
      };
    }

    // Clean and validate link variable
    const cleanLink = moodboardUrl?.trim() ? moodboardUrl.trim() : "ندارد";

    // Format summary to include the selected expert's name
    const summaryWithExpert = expertName?.trim()
      ? `${summary.trim()} (رزرو متخصص: ${expertName.trim()})`
      : summary.trim();

    // 4. Save the project to the database
    await prisma.project.create({
      data: {
        contactName: fullName.trim(),
        brief: summaryWithExpert,
        referenceLink: cleanLink,
        budget: budgetRange,
        contactPhone: phone.trim(),
        preferredCallTime: bestContactTime,
        serviceType: "عکاسی (رزرو مستقیم)",
        bookingRoute: "direct_booking",
        userId: session.userId,
        status: "PENDING",
        paymentStatus: "FULL"
      }
    });

    // 5. Read environment variables for IPPanel SMS Notification
    const apiKey = process.env.IPPANEL_API_KEY?.trim() || "";
    const senderNumber = process.env.IPPANEL_SENDER_NUMBER?.trim() || "+983000505";
    const adminPatternCode = process.env.ADMIN_NOTIF_PATTERN_CODE?.trim() || "";
    const adminMobilesString = process.env.ADMIN_MOBILES?.trim() || "09100138383,09126301407";

    if (process.env.NODE_ENV === "development") {
      console.log("[booking] dispatch prepared", {
        userId: session.userId,
        hasPattern: Boolean(adminPatternCode),
      });
    }

    // Parse recipient phone numbers from env
    const recipients = adminMobilesString.split(",").map(num => num.trim()).filter(Boolean);

    // Mock flow local simulation if keys are missing
    if (!apiKey || !adminPatternCode) {
      console.warn("⚠️ IPPanel configurations missing in env variables. SMS dispatch simulated.");
      return { success: true };
    }

    // Dispatch parallel notifications using Promise.all
    const notifyPromises = recipients.map(async (recipient) => {
      try {
        await sendSmsByPattern({
          recipient,
          patternCode: adminPatternCode,
          patternValues: {
            name: String(fullName.trim()),
            description: String(summaryWithExpert),
            link: String(cleanLink),
            budget: String(budgetRange),
            phone: String(phone.trim()),
            time: String(bestContactTime)
          }
        });
        if (process.env.NODE_ENV === "development") {
          console.log("[booking] SMS sent to recipient index", recipients.indexOf(recipient));
        }
      } catch (smsError) {
        console.error("[IPPanel SMS Dispatch Error] Failed to notify a recipient:", smsError);
      }
    });

    // Wait for all dispatches to finish
    await Promise.all(notifyPromises);

    return { success: true };
  } catch (error) {
    console.error("Error in submitProjectForm:", error);
    return { success: false, error: "خطا در ثبت اطلاعات و ارسال پیامک." };
  }
}
