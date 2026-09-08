import {
  isValidIranMobileLocal,
  normalizePhoneDigits,
  sanitizeIranMobileInput,
  toEnglishDigits,
} from "@/lib/auth/phone";

export const OTP_LENGTH = 4;
export const OTP_TTL_MS = 2 * 60 * 1000;

/** Cryptographically weak but sufficient for short-lived SMS OTP. */
export function generateOtpCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
}

export function sanitizeOtpInput(raw: string): string {
  return toEnglishDigits(raw).replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isValidOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

export function resolvePhoneForOtp(raw: string):
  | { ok: true; localPhone: string; phoneDigits: string }
  | { ok: false } {
  const localPhone = sanitizeIranMobileInput(raw);
  if (!isValidIranMobileLocal(localPhone)) return { ok: false };
  return {
    ok: true,
    localPhone,
    phoneDigits: normalizePhoneDigits(localPhone),
  };
}
