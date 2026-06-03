"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
import { sendOtpSms } from "@/lib/sms/send-otp";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

async function establishSessionForPhone(phoneDigits: string): Promise<void> {
  const dbRole = dbRoleFromPhone(phoneDigits);
  const sessionRole = sessionRoleFromPhone(phoneDigits);

  const user = await prisma.user.upsert({
    where: { phone: phoneDigits },
    create: { phone: phoneDigits, role: dbRole },
    update: { role: dbRole },
  });

  await createSession({
    userId: user.id,
    phone: user.phone,
    role: sessionRole,
  });
}

async function signInUser(
  phoneDigits: string,
  redirectTo: string
): Promise<never> {
  await establishSessionForPhone(phoneDigits);
  redirect(redirectTo);
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

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  try {
    await prisma.verificationCode.upsert({
      where: { phone: resolved.phoneDigits },
      create: {
        phone: resolved.phoneDigits,
        code,
        expiresAt,
      },
      update: { code, expiresAt },
    });
  } catch {
    return {
      success: false,
      error: "ذخیره کد تأیید ناموفق بود. دیتابیس را بررسی کنید.",
    };
  }

  try {
    await sendOtpSms(resolved.localPhone, code);
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
  redirectTo = "/profile"
): Promise<AuthActionResult> {
  const resolved = resolvePhoneForOtp(phone);
  if (!resolved.ok) {
    return { success: false, error: "شماره موبایل معتبر نیست." };
  }

  const otp = sanitizeOtpInput(code);
  if (!isValidOtpCode(otp)) {
    return { success: false, error: "کد تأیید باید ۵ رقم باشد." };
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
      });
      return {
        success: false,
        error: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (!otpCodesMatch(record.code, otp)) {
      return { success: false, error: "کد تأیید اشتباه است." };
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
    await signInUser(resolved.phoneDigits, redirectTo);
  } catch (e) {
    if (isRedirectError(e)) throw e;
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
    return { success: false, error: "کد تأیید باید ۵ رقم باشد." };
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
      });
      return {
        success: false,
        error: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (!otpCodesMatch(record.code, otp)) {
      return { success: false, error: "کد تأیید اشتباه است." };
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
  } catch {
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
