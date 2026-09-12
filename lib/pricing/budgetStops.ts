/**
 * Client-facing hourly budget stops for the order wizard.
 *
 * Keep rates here (or later load from admin/DB) so StepFinalize and the server
 * share one source of truth. Dashboard can replace `getBudgetStops()` without
 * touching UI components.
 */

export type BudgetLevel = "low" | "golden" | "high";

export interface BudgetStop {
  index: number;
  /** Hourly rate in toman */
  rate: number;
  shortLabel: string;
  level: BudgetLevel;
  hint: string;
  badge: string;
}

/** Default ladder — edit these (or override via getBudgetStops) from admin later. */
export const DEFAULT_BUDGET_STOPS: BudgetStop[] = [
  {
    index: 0,
    rate: 900_000,
    shortLabel: "۹۰۰ هزار",
    level: "low",
    hint: "بودجه پایین‌تر از عرف بازار — داوطلب محدودتر.",
    badge: "زیر عرف",
  },
  {
    index: 1,
    rate: 1_800_000,
    shortLabel: "۱.۸ م",
    level: "low",
    hint: "اقتصادی؛ مناسب کارهای ساده با تجهیزات پایه.",
    badge: "اقتصادی",
  },
  {
    index: 2,
    rate: 2_700_000,
    shortLabel: "۲.۷ م",
    level: "low",
    hint: "کمی زیر نرخ پیشنهادی جار — پذیرش کندتر.",
    badge: "نیمه‌حرفه‌ای",
  },
  {
    index: 3,
    rate: 3_600_000,
    shortLabel: "۳.۶ م",
    level: "golden",
    hint: "نرخ پیشنهادی جار — تعادل کیفیت و سرعت پذیرش.",
    badge: "پیشنهادی جار",
  },
  {
    index: 4,
    rate: 6_500_000,
    shortLabel: "۶.۵ م",
    level: "high",
    hint: "بالاتر از عرف — اولویت بیشتر برای متخصصین باتجربه.",
    badge: "حرفه‌ای",
  },
  {
    index: 5,
    rate: 11_000_000,
    shortLabel: "۱۱ م",
    level: "high",
    hint: "بودجه پریمیوم — جذب متخصصین برتر.",
    badge: "پریمیوم",
  },
  {
    index: 6,
    rate: 18_000_000,
    shortLabel: "۱۸ م",
    level: "high",
    hint: "سطح VIP و سینمایی.",
    badge: "VIP",
  },
];

/** Index of the “normal / recommended” stop (green/red pivot). */
export const DEFAULT_GOLDEN_INDEX = 3;

/**
 * Active stops for the live app. Later: merge admin overrides from DB here.
 * UI and server actions should call this instead of hardcoding rates.
 */
export function getBudgetStops(): BudgetStop[] {
  return DEFAULT_BUDGET_STOPS;
}

export function getGoldenIndex(stops: BudgetStop[] = getBudgetStops()): number {
  const idx = stops.findIndex((s) => s.level === "golden");
  return idx >= 0 ? idx : DEFAULT_GOLDEN_INDEX;
}

export function getBudgetStop(
  index: number,
  stops: BudgetStop[] = getBudgetStops()
): BudgetStop {
  return stops[index] ?? stops[getGoldenIndex(stops)] ?? stops[0];
}

export function resolveHourlyRate(
  index: number,
  stops: BudgetStop[] = getBudgetStops()
): number {
  return getBudgetStop(index, stops).rate;
}

/** Snap arbitrary client rates onto the configured ladder (anti-tamper). */
export function snapHourlyRate(
  rate: number,
  stops: BudgetStop[] = getBudgetStops()
): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    return resolveHourlyRate(getGoldenIndex(stops), stops);
  }
  const exact = stops.find((s) => s.rate === rate);
  if (exact) return exact.rate;
  return stops.reduce((best, s) =>
    Math.abs(s.rate - rate) < Math.abs(best.rate - rate) ? s : best
  ).rate;
}

export function levelTone(level: BudgetLevel): {
  track: string;
  fill: string;
  text: string;
  softBg: string;
  border: string;
} {
  if (level === "low") {
    return {
      track: "bg-rose-100",
      fill: "bg-rose-500",
      text: "text-rose-700",
      softBg: "bg-rose-50",
      border: "border-rose-200",
    };
  }
  if (level === "high") {
    return {
      track: "bg-emerald-100",
      fill: "bg-emerald-500",
      text: "text-emerald-700",
      softBg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }
  return {
    track: "bg-jar-border",
    fill: "bg-jar-primary",
    text: "text-jar-primary",
    softBg: "bg-jar-canvas",
    border: "border-jar-border",
  };
}
