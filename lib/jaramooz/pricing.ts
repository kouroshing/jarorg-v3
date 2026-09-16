/**
 * Catalog price of a JarAmooz course in **تومان**.
 * Always from `courses.price` — never a client-supplied figure.
 * When talking to Zarinpal, convert with `tomanToRial()` (×10).
 */
export const FULL_BUNDLE_PRICE = 9_100_000;

export function courseChargeAmount(coursePrice: number | null | undefined): number {
  return coursePrice && coursePrice > 0 ? coursePrice : FULL_BUNDLE_PRICE;
}
