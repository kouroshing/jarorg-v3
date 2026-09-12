"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import {
  generateOtpCode,
  isValidOtpCode,
  OTP_TTL_MS,
  resolvePhoneForOtp,
  sanitizeOtpInput,
} from "@/lib/auth/otp";
import { otpCodesMatch } from "@/lib/auth/otp-compare";
import { createSession, clearSession } from "@/lib/auth/session";
import { dbRoleFromPhone, sessionRoleFromPhone } from "@/lib/auth/roles";
import { resolveAdminAccessByPhone } from "@/lib/auth/adminAccess";
import { isSuperAdminPhone } from "@/lib/auth/admin";
import {
  checkOtpSendRateLimit,
  recordOtpSend,
} from "@/lib/auth/otp-rate-limit";
import { sendOtpSms } from "@/lib/sms/send-otp";
import { safeInternalPath } from "@/lib/http/safe-path";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

async function establishSessionForPhone(phoneDigits: string, defaultRole?: string, displayName?: string): Promise<void> {
  await ensurePrismaSchemaReady();
  const staffAccess = await resolveAdminAccessByPhone(phoneDigits);
  const isStaffAdmin = Boolean(staffAccess?.isAdmin);
  const dbRole = isStaffAdmin ? "ADMIN" : dbRoleFromPhone(phoneDigits);
  const sessionRole = isStaffAdmin ? "admin" : sessionRoleFromPhone(phoneDigits);

  // SPECIALIST is only upgraded when explicitly requested (e.g. first onboarding
  // save). Join OTP must not stamp it — that trapped unfinished joiners in the
  // specialist panel after a later customer login.
  let user = await prisma.user.findUnique({
    where: { phone: phoneDigits },
    include: { specialistProfile: { select: { id: true } } },
  });
  
  const createData: {
    phone: string;
    role: string;
    displayName?: string;
  } = {
    phone: phoneDigits,
    role: defaultRole === "SPECIALIST" ? "SPECIALIST" : dbRole,
  };
  if (displayName) createData.displayName = displayName;

  if (!user) {
    user = await prisma.user.create({
      data: createData,
      include: { specialistProfile: { select: { id: true } } },
    });
  } else {
    const updateData: { displayName?: string; role?: string } = {};
    if (displayName && !user.displayName) updateData.displayName = displayName;
    
    if (dbRole === "ADMIN" && user.role !== "ADMIN") {
      updateData.role = "ADMIN";
    } else if (
      // Revoked staff: demote ADMIN → USER unless specialist / env super.
      !isStaffAdmin &&
      user.role === "ADMIN" &&
      !isSuperAdminPhone(phoneDigits)
    ) {
      updateData.role = user.specialistProfile ? "SPECIALIST" : "USER";
    } else if (
      defaultRole === "SPECIALIST" &&
      user.role !== "SPECIALIST" &&
      user.role !== "ADMIN"
    ) {
      updateData.role = "SPECIALIST";
    } else if (
      // Customer login / join without specialist intent: clear orphan SPECIALIST
      // roles that never created a profile (abandoned /join OTP).
      defaultRole !== "SPECIALIST" &&
      user.role === "SPECIALIST" &&
      !user.specialistProfile &&
      dbRole !== "ADMIN"
    ) {
      updateData.role = "USER";
    }

    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { phone: phoneDigits },
        data: updateData,
        include: { specialistProfile: { select: { id: true } } },
      });
    }
  }

  await createSession({
    userId: user.id,
    phone: user.phone,
    role: sessionRole,
  });
}

async function signInUser(
  phoneDigits: string,
  redirectTo: string,
  defaultRole?: string,
  displayName?: string
): Promise<never> {
  await establishSessionForPhone(phoneDigits, defaultRole, displayName);
  redirect(encodeURI(safeInternalPath(redirectTo)));
}

/**
 * Generates a 5-digit OTP, stores it for 2 minutes, and sends it via IPPanel.
 * Login is impossible without a successful SMS delivery.
 */
export async function sendOtpCode(phone: string): Promise<AuthActionResult> {
  const resolved = resolvePhoneForOtp(phone);
  if (!resolved.ok) {
    return { success: false, error: "شماره موبایل معتبر نیست." };
  }

  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) {
    const ipList = headers().get("x-forwarded-for");
    const ip = ipList ? ipList.split(',')[0].trim() : headers().get("x-real-ip") || "unknown";
    
    const rateLimitError = await checkOtpSendRateLimit(resolved.phoneDigits, ip);
    if (rateLimitError) {
      return { success: false, error: rateLimitError };
    }
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  try {
    await prisma.verificationCode.upsert({
      where: { phone: resolved.phoneDigits },
      create: {
        phone: resolved.phoneDigits,
        code,
        expiresAt,
        attempts: 0,
      },
      update: { code, expiresAt, attempts: 0 },
    });
  } catch {
    return {
      success: false,
      error: "ذخیره کد تأیید ناموفق بود. دیتابیس را بررسی کنید.",
    };
  }

  try {
    await sendOtpSms(resolved.localPhone, code);
    
    const ipList = headers().get("x-forwarded-for");
    const ip = ipList ? ipList.split(',')[0].trim() : headers().get("x-real-ip") || "unknown";
    await recordOtpSend(resolved.phoneDigits, ip);
    
    return { success: true };
  } catch (error) {
    await prisma.verificationCode
      .delete({ where: { phone: resolved.phoneDigits } })
      .catch(() => {});

    return {
      success: false,
      error: error instanceof Error ? error.message : "خطای ناشناخته",
    };
  }
}

/**
 * Verifies OTP, burns the code, creates session (role from ADMIN_MOBILE), redirects.
 */
export async function verifyOtpCode(
  phone: string,
  code: string,
  redirectTo = "/profile",
  defaultRole?: string,
  displayName?: string
): Promise<AuthActionResult> {
  const resolved = resolvePhoneForOtp(phone);
  if (!resolved.ok) {
    return { success: false, error: "شماره موبایل معتبر نیست." };
  }

  const otp = sanitizeOtpInput(code);
  if (!isValidOtpCode(otp)) {
    return { success: false, error: "کد تأیید باید ۴ رقم باشد." };
  }

  try {
    const record = await prisma.verificationCode.findUnique({
      where: { phone: resolved.phoneDigits },
    });

    if (!record) {
      return {
        success: false,
        error: "کد تأیید یافت نشد. لطفاً دوباره درخواست ارسال کد دهید.",
      };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await prisma.verificationCode.delete({
        where: { phone: resolved.phoneDigits },
      }).catch(() => {});
      return {
        success: false,
        error: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (record.attempts >= 5) {
      await prisma.verificationCode.delete({
        where: { phone: resolved.phoneDigits },
      }).catch(() => {});
      return {
        success: false,
        error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (!otpCodesMatch(record.code, otp)) {
      const newAttempts = record.attempts + 1;
      if (newAttempts >= 5) {
        await prisma.verificationCode.delete({
          where: { phone: resolved.phoneDigits },
        }).catch(() => {});
        return {
          success: false,
          error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.",
        };
      } else {
        await prisma.verificationCode.update({
          where: { phone: resolved.phoneDigits },
          data: { attempts: newAttempts },
        });
        const remaining = 5 - newAttempts;
        return {
          success: false,
          error: `کد تأیید اشتباه است. ${remaining} تلاش باقی‌مانده است.`,
        };
      }
    }

    await prisma.verificationCode.delete({
      where: { phone: resolved.phoneDigits },
    });
  } catch {
    return {
      success: false,
      error: "بررسی کد تأیید ناموفق بود. لطفاً دوباره تلاش کنید.",
    };
  }

  try {
    await signInUser(resolved.phoneDigits, redirectTo, defaultRole, displayName);
  } catch (e: any) {
    if (isRedirectError(e)) throw e;
    console.error("❌ CRITICAL DB ERROR ON OTP VERIFY (signInUser):");
    console.error(e?.message || e);
    console.error(JSON.stringify(e, null, 2));
    return {
      success: false,
      error: "ورود ناموفق بود. اتصال دیتابیس را بررسی کنید.",
    };
  }

  return { success: true };
}

/**
 * Verifies OTP and creates a session without redirecting (lazy registration in forms).
 */
export async function verifyOtpCodeInline(
  phone: string,
  code: string
): Promise<AuthActionResult> {
  const resolved = resolvePhoneForOtp(phone);
  if (!resolved.ok) {
    return { success: false, error: "شماره موبایل معتبر نیست." };
  }

  const otp = sanitizeOtpInput(code);
  if (!isValidOtpCode(otp)) {
    return { success: false, error: "کد تأیید باید ۴ رقم باشد." };
  }

  try {
    const record = await prisma.verificationCode.findUnique({
      where: { phone: resolved.phoneDigits },
    });

    if (!record) {
      return {
        success: false,
        error: "کد تأیید یافت نشد. لطفاً دوباره درخواست ارسال کد دهید.",
      };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await prisma.verificationCode.delete({
        where: { phone: resolved.phoneDigits },
      }).catch(() => {});
      return {
        success: false,
        error: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (record.attempts >= 5) {
      await prisma.verificationCode.delete({
        where: { phone: resolved.phoneDigits },
      }).catch(() => {});
      return {
        success: false,
        error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (!otpCodesMatch(record.code, otp)) {
      const newAttempts = record.attempts + 1;
      if (newAttempts >= 5) {
        await prisma.verificationCode.delete({
          where: { phone: resolved.phoneDigits },
        }).catch(() => {});
        return {
          success: false,
          error: "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.",
        };
      } else {
        await prisma.verificationCode.update({
          where: { phone: resolved.phoneDigits },
          data: { attempts: newAttempts },
        });
        const remaining = 5 - newAttempts;
        return {
          success: false,
          error: `کد تأیید اشتباه است. ${remaining} تلاش باقی‌مانده است.`,
        };
      }
    }

    await prisma.verificationCode.delete({
      where: { phone: resolved.phoneDigits },
    });
  } catch {
    return {
      success: false,
      error: "بررسی کد تأیید ناموفق بود. لطفاً دوباره تلاش کنید.",
    };
  }

  try {
    await establishSessionForPhone(resolved.phoneDigits);
  } catch (e: any) {
    console.error("❌ CRITICAL DB ERROR ON OTP VERIFY INLINE (establishSession):");
    console.error(e?.message || e);
    console.error(JSON.stringify(e, null, 2));
    return {
      success: false,
      error: "ورود ناموفق بود. اتصال دیتابیس را بررسی کنید.",
    };
  }

  return { success: true };
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}

/** Prefills contact step: phone from session is locked (read-only) when logged in. */
export async function getSessionContactForForm(): Promise<{
  isAuthenticated: boolean;
  phone: string | null;
  phoneLocked: boolean;
}> {
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session) {
    return { isAuthenticated: false, phone: null, phoneLocked: false };
  }
  return {
    isAuthenticated: true,
    phone: phoneToLocalDisplay(session.phone),
    phoneLocked: true,
  };
}
