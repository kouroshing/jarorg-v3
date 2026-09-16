/**
 * Zarinpal merchant resolution. Production fails closed if the env is missing
 * or still set to the sandbox sentinel — never fall back to a hardcoded UUID.
 *
 * Currency convention across Jar:
 * - DB + UI amounts are always **تومان** (toman)
 * - Zarinpal request/verify `amount` must be **ریال** (rial) = toman × 10
 */
export type ZarinpalMerchant =
  | { ok: true; merchantId: string; sandbox: false }
  | { ok: true; merchantId: null; sandbox: true }
  | { ok: false; error: string };

/** Convert a toman amount (DB/UI) to the rial integer Zarinpal expects. */
export function tomanToRial(toman: number): number {
  if (!Number.isFinite(toman) || toman <= 0) return 0;
  return Math.round(toman) * 10;
}

export function resolveZarinpalMerchant(): ZarinpalMerchant {
  const raw = process.env.ZARINPAL_MERCHANT_ID?.trim();
  const isProd = process.env.NODE_ENV === "production";
  const missing = !raw || raw === "sandbox" || raw === "undefined";

  if (isProd && missing) {
    return { ok: false, error: "تنظیمات درگاه پرداخت زرین‌پال در حالت پروداکشن صحیح نیست." };
  }

  if (missing) {
    return { ok: true, merchantId: null, sandbox: true };
  }

  return { ok: true, merchantId: raw, sandbox: false };
}
