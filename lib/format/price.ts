/** Shared price formatters — safe for Server and Client Components. */

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export function formatShortPrice(amount: number): string {
  if (amount < 1_000_000) {
    const val = Math.round(amount / 1_000);
    return `${new Intl.NumberFormat("fa-IR").format(val)} هزار`;
  }
  const millions = amount / 1_000_000;
  const formatted = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
    .format(millions)
    .replace("٫", ".");
  return `${formatted} م`;
}
