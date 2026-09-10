import "server-only";
import { prisma } from "@/lib/prisma";
import { isAdminPhone } from "@/lib/auth/admin";

const MAX_SENDS_PER_WINDOW = 5;
const ROLLING_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MIN_INTERVAL_MS = 60_000;

/** Returns a user-facing error when OTP send should be blocked, otherwise null. */
export async function checkOtpSendRateLimit(
  phoneDigits: string,
  ip: string = "unknown"
): Promise<string | null> {
  if (isAdminPhone(phoneDigits)) {
    return null;
  }

  const since = new Date(Date.now() - ROLLING_WINDOW_MS);

  const phoneCount = await prisma.otpSendLog.count({
    where: { phone: phoneDigits, sentAt: { gte: since } },
  });

  if (phoneCount >= MAX_SENDS_PER_WINDOW) {
    return "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.";
  }

  const lastPhone = await prisma.otpSendLog.findFirst({
    where: { phone: phoneDigits },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  if (lastPhone && Date.now() - lastPhone.sentAt.getTime() < MIN_INTERVAL_MS) {
    return "لطفاً یک دقیقه صبر کنید و دوباره درخواست کد دهید.";
  }

  if (ip && ip !== "unknown") {
    const ipCount = await prisma.otpSendLog.count({
      where: { phone: `ip:${ip}`, sentAt: { gte: since } },
    });
    if (ipCount >= MAX_SENDS_PER_WINDOW) {
      return "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.";
    }
  }

  return null;
}

/** Records a successful OTP send for rate-limit accounting. */
export async function recordOtpSend(
  phoneDigits: string,
  ip: string = "unknown"
): Promise<void> {
  if (isAdminPhone(phoneDigits)) {
    return;
  }

  await prisma.otpSendLog.create({
    data: { phone: phoneDigits },
  });

  if (ip && ip !== "unknown") {
    await prisma.otpSendLog.create({
      data: { phone: `ip:${ip}` },
    });
  }
}
