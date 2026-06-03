import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison for OTP codes (both must be 5 digits). */
export function otpCodesMatch(stored: string, provided: string): boolean {
  if (stored.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
}
