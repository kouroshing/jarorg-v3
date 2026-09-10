/**
 * Zarinpal merchant resolution. Production fails closed if the env is missing
 * or still set to the sandbox sentinel — never fall back to a hardcoded UUID.
 */
export type ZarinpalMerchant =
  | { ok: true; merchantId: string; sandbox: false }
  | { ok: true; merchantId: null; sandbox: true }
  | { ok: false; error: string };

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
