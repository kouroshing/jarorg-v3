import { toEnglishDigits } from "@/lib/auth/phone";

/** Strip spaces/dashes and optional leading IR; return up to 24 digit chars. */
export function normalizeShabaDigitsFromInput(raw: string): string {
  let s = toEnglishDigits(raw)
    .replace(/[\s_\-–—]/g, "")
    .toUpperCase();
  if (s.startsWith("IR")) s = s.slice(2);
  return s.replace(/\D/g, "").slice(0, 24);
}

export function formatShabaWithIr(digits24: string): string {
  const d = normalizeShabaDigitsFromInput(digits24);
  return `IR${d}`;
}

/**
 * ISO 13616 check (mod 97) for Iranian IBAN: IR + 24 digits.
 * Rejects typos before paid Zohal inquiries.
 */
export function isValidIranIban(raw: string): boolean {
  const digits = normalizeShabaDigitsFromInput(raw);
  if (digits.length !== 24) return false;
  const iban = `IR${digits}`;
  // Move first 4 chars to end, map letters A=10 … Z=35
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") expanded += ch;
    else if (ch >= "A" && ch <= "Z") expanded += String(ch.charCodeAt(0) - 55);
    else return false;
  }
  // mod 97 on big integer via chunks
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    const block = String(remainder) + expanded.slice(i, i + 7);
    remainder = Number(block) % 97;
  }
  return remainder === 1;
}
