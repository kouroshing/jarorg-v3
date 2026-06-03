import type { SessionPayload } from "./session";
import { normalizePhoneDigits, sanitizeIranMobileInput } from "./phone";

/** Canonical digits for admin SMS / lookups (from env). */
export function getAdminPhoneDigits(): string | null {
  const raw = process.env.ADMIN_MOBILE?.trim();
  if (!raw) return null;
  return normalizePhoneDigits(sanitizeIranMobileInput(raw));
}

export function isAdminPhone(phone?: string | null): boolean {
  const adminDigits = getAdminPhoneDigits();
  if (!adminDigits || !phone) return false;
  return normalizePhoneDigits(phone) === adminDigits;
}

/** Admin access is determined only by the signed session role (set after OTP). */
export function isAdminSession(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.role === "admin";
}
