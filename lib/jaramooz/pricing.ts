/**
 * The toman amount charged for a JarAmooz course.
 * Always the row in `courses.price` — never a client-supplied figure.
 */
export const FULL_BUNDLE_PRICE = 9_100_000;

export function courseChargeAmount(coursePrice: number | null | undefined): number {
  return coursePrice && coursePrice > 0 ? coursePrice : FULL_BUNDLE_PRICE;
}
