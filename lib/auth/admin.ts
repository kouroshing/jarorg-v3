import type { SessionPayload } from "./session";
import { normalizePhoneDigits, sanitizeIranMobileInput } from "./phone";

/**
 * Sync admin helpers — safe for Edge middleware.
 * Authoritative staff checks live in `adminAccess.ts` (Node + Prisma).
 */

export const SUPER_ADMIN_PHONE = "989100138383"; // 09100138383

/** Canonical digits for env / bootstrap super-admin. */
export function getAdminPhoneDigits(): string {
  const raw = process.env.ADMIN_MOBILE?.trim();
  if (raw) {
    const sanitized = sanitizeIranMobileInput(raw);
    const normalized = normalizePhoneDigits(sanitized);
    if (normalized) return normalized;
  }
  return SUPER_ADMIN_PHONE;
}

export function isSuperAdminPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return false;
  return normalized === SUPER_ADMIN_PHONE || normalized === getAdminPhoneDigits();
}

/** @deprecated Prefer isSuperAdminPhone */
export function isAdminPhone(phone?: string | null): boolean {
  return isSuperAdminPhone(phone);
}

/**
 * Sync JWT / middleware gate only.
 * Mutations and /admin layout MUST use `resolveAdminAccess` (DB).
 */
export function isAdminSession(
  session: SessionPayload | null
): session is SessionPayload {
  if (!session?.phone) return false;
  if (isSuperAdminPhone(session.phone)) return true;
  return session.role === "admin";
}
