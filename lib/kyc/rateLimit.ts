import "server-only";

import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS_PER_DAY = 3;
const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Blocks spam KYC submissions before paid inquiry APIs are called.
 * Counts SPECIALIST_KYC_ATTEMPT only (one row per paid attempt).
 */
export async function checkKycSubmitRateLimit(
  profileId: string
): Promise<string | null> {
  const since = new Date(Date.now() - WINDOW_MS);

  const recent = await prisma.auditLog.findMany({
    where: {
      targetModel: "SpecialistProfile",
      targetId: profileId,
      action: "SPECIALIST_KYC_ATTEMPT",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ATTEMPTS_PER_DAY + 1,
    select: { createdAt: true },
  });

  if (recent.length >= MAX_ATTEMPTS_PER_DAY) {
    return `حداکثر ${MAX_ATTEMPTS_PER_DAY} بار استعلام در شبانه‌روز مجاز است. لطفاً بعداً تلاش کنید.`;
  }

  const last = recent[0];
  if (last && Date.now() - last.createdAt.getTime() < MIN_INTERVAL_MS) {
    return "لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید.";
  }

  return null;
}

/** Iranian national ID checksum — reject garbage before paid APIs. */
export function isValidIranianNationalId(raw: string): boolean {
  if (!/^\d{10}$/.test(raw)) return false;
  if (/^(\d)\1{9}$/.test(raw)) return false;
  const check = Number(raw[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(raw[i]) * (10 - i);
  }
  const rem = sum % 11;
  return rem < 2 ? check === rem : check + rem === 11;
}
