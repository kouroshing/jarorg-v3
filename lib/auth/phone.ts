const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Converts Persian and Arabic-Indic numerals to ASCII 0–9. */
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Normalizes mobile input for forms: English digits, no spaces. */
export function sanitizeIranMobileInput(raw: string): string {
  return toEnglishDigits(raw).replace(/\s/g, "");
}

/** Iranian mobile in local form: 09 + 9 digits. */
export const IRAN_MOBILE_LOCAL_REGEX = /^09\d{9}$/;

export function isValidIranMobileLocal(phone: string): boolean {
  return IRAN_MOBILE_LOCAL_REGEX.test(phone);
}

/**
 * Normalizes Iranian mobile numbers to a canonical digit string for storage/lookup.
 * Examples: 09100138383 → 989100138383, +989100138383 → 989100138383
 */
export function normalizePhoneDigits(raw: string): string {
  let digits = sanitizeIranMobileInput(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `98${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) digits = `98${digits}`;
  return digits;
}

/** Display format for forms: 989100138383 → 09100138383 */
export function phoneToLocalDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("98") && d.length >= 12) return `0${d.slice(2)}`;
  return d;
}

/** Highly permissive normalizer for Iran mobile input */
export function normalizePermissiveIranMobile(raw: string): string {
  // 1. Convert Persian/Arabic digits to English digits
  let cleaned = toEnglishDigits(raw);

  // 2. Remove all non-numeric characters
  cleaned = cleaned.replace(/\D/g, "");

  // 3. Handle international prefixes: 0098... or 98...
  if (cleaned.startsWith("0098")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("98") && cleaned.length > 10) {
    cleaned = "0" + cleaned.slice(2);
  }

  // 4. Handle missing leading zero: if starts with 9, prepend 0
  if (cleaned.startsWith("9") && !cleaned.startsWith("98")) {
    cleaned = "0" + cleaned;
  } else if (cleaned.startsWith("9") && cleaned.length === 10) {
    cleaned = "0" + cleaned;
  } else if (cleaned === "9") {
    cleaned = "09";
  }

  return cleaned;
}
