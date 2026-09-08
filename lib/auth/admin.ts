import type { SessionPayload } from "./session";
import { normalizePhoneDigits, sanitizeIranMobileInput } from "./phone";

export const SUPER_ADMIN_PHONE = "989100138383"; // 09100138383

/** Canonical digits for admin SMS / lookups. */
export function getAdminPhoneDigits(): string {
  const raw = process.env.ADMIN_MOBILE?.trim();
  if (raw) {
    const sanitized = sanitizeIranMobileInput(raw);
    const normalized = normalizePhoneDigits(sanitized);
    if (normalized) return normalized;
  }
  return SUPER_ADMIN_PHONE;
}

export function isAdminPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneDigits(phone);
  return normalized === SUPER_ADMIN_PHONE || normalized === getAdminPhoneDigits();
}

/** Admin access is strictly determined by exact phone number match (09100138383) verified via OTP. */
export function isAdminSession(session: SessionPayload | null): session is SessionPayload {
  if (!session || !session.phone) return false;
  return isAdminPhone(session.phone);
}
