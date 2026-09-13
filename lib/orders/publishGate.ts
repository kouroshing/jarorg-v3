/**
 * Decides whether a new/updated order can go straight to MATCHING
 * or must wait in PENDING_REVIEW for a human.
 *
 * Pure rules — no Prisma. Callers pass any DB-derived signals (e.g. prior orders).
 */

export type PublishGateFlagCode =
  | "LOCATION_INCOMPLETE"
  | "LOCATION_WEAK"
  | "BRIEF_THIN"
  | "NO_VISUAL_REFS"
  | "BUDGET_FLOOR"
  | "FIRST_CLIENT_ORDER"
  | "RECENT_BURST"
  | "SUSPICIOUS_TEXT";

export type PublishGateFlag = {
  code: PublishGateFlagCode;
  /** hard = alone forces review; soft = needs 2+ to force review */
  severity: "hard" | "soft";
  label: string;
};

export type PublishGateInput = {
  categorySlug: string;
  projectDescription: string;
  locationType: "CLIENT_LOCATION" | "SPECIALIST_ADVICE" | "JAR_STUDIO" | string;
  locationAddress?: string | null;
  districtOrCity?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  referenceLink?: string | null;
  moodboardUrls?: string[] | null;
  isFlexibleSchedule: boolean;
  bookingDate?: string | null;
  timeSlot?: string | null;
  hourlyRate: number;
  /** Prior orders by this user (any status). */
  priorOrderCount: number;
  /** Orders created by this user in the last 24h (excluding the one being created). */
  recentOrderCount24h: number;
};

export type PublishGateResult = {
  autoPublish: boolean;
  status: "MATCHING" | "PENDING_REVIEW";
  flags: PublishGateFlag[];
  /** Short Persian summary for audit logs */
  summary: string;
};

/** Categories where visual refs strongly help specialists estimate work. */
const STYLE_SENSITIVE_SLUGS = new Set([
  "wedding-ceremony",
  "birthday-party",
  "wedding-contract-video",
  "wedding-ceremony-video",
  "kids",
  "family",
  "newborn",
  "couple-anniversary",
  "pregnancy",
  "portrait-avatar",
  "gender-reveal",
  "modeling",
  "jewelry",
  "food-beverage",
  "architecture-interior",
  "instagram-reels-video",
  "commercial-teaser-video",
  "events-photo",
  "events-video",
]);

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /کازینو|شرط\s*بند|قمار/i,
  /ویزا\s*اسپانسری|اقامت\s*اروپا/i,
  /\b(crypto|forex|nft)\b/i,
  /خرید\s*فالوور|فروش\s*اکانت/i,
  /تست\s*سیستم|ignore\s*this|asdf{3,}/i,
  /https?:\/\/\S+\s+https?:\/\/\S+\s+https?:\/\/\S+/i,
];

/** Lowest configured ladder stop — see lib/pricing/budgetStops. */
const BUDGET_FLOOR_RATE = 900_000;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length >= 2);
}

function uniqueCharRatio(text: string): number {
  const cleaned = text.replace(/\s+/g, "");
  if (cleaned.length < 40) return 1;
  return new Set([...cleaned]).size / cleaned.length;
}

function collectFlags(input: PublishGateInput): PublishGateFlag[] {
  const flags: PublishGateFlag[] = [];
  const desc = input.projectDescription.trim();

  // --- Location ---
  if (input.locationType === "CLIENT_LOCATION") {
    const hasAddress = hasText(input.locationAddress);
    const hasCity = hasText(input.districtOrCity);
    const hasCoords =
      typeof input.locationLat === "number" &&
      typeof input.locationLng === "number" &&
      Number.isFinite(input.locationLat) &&
      Number.isFinite(input.locationLng);

    if (!hasAddress && !hasCity && !hasCoords) {
      flags.push({
        code: "LOCATION_INCOMPLETE",
        severity: "hard",
        label: "محل کارفرما بدون آدرس، شهر یا نقشه",
      });
    } else if (!hasAddress && !hasCoords && hasCity) {
      flags.push({
        code: "LOCATION_WEAK",
        severity: "soft",
        label: "فقط شهر مشخص است؛ آدرس/نقشه ندارد",
      });
    }
  }

  // --- Brief quality (soft; form hard floor is MIN_PROJECT_DESCRIPTION_LENGTH) ---
  if (desc.length < 160 || uniqueCharRatio(desc) < 0.22) {
    flags.push({
      code: "BRIEF_THIN",
      severity: "soft",
      label: "توضیحات کم‌جزئیات یا تکراری",
    });
  }

  // --- Visual refs for style-heavy categories ---
  const moodboardCount = Array.isArray(input.moodboardUrls)
    ? input.moodboardUrls.filter((u) => typeof u === "string" && u.trim()).length
    : 0;
  const hasRef = hasText(input.referenceLink);
  if (
    STYLE_SENSITIVE_SLUGS.has(input.categorySlug) &&
    !hasRef &&
    moodboardCount === 0
  ) {
    flags.push({
      code: "NO_VISUAL_REFS",
      severity: "soft",
      label: "بدون رفرنس و مودبورد در دسته استایل‌محور",
    });
  }

  // --- Budget floor ---
  if (input.hourlyRate <= BUDGET_FLOOR_RATE) {
    flags.push({
      code: "BUDGET_FLOOR",
      severity: "soft",
      label: "بودجه روی کف نردبان قیمت",
    });
  }

  // --- Client history ---
  if (input.priorOrderCount <= 0) {
    flags.push({
      code: "FIRST_CLIENT_ORDER",
      severity: "soft",
      label: "اولین سفارش این کاربر",
    });
  }
  if (input.recentOrderCount24h >= 2) {
    flags.push({
      code: "RECENT_BURST",
      severity: "hard",
      label: "چند سفارش پشت‌سرهم در ۲۴ ساعت",
    });
  }

  // --- Suspicious content ---
  if (SUSPICIOUS_PATTERNS.some((re) => re.test(desc))) {
    flags.push({
      code: "SUSPICIOUS_TEXT",
      severity: "hard",
      label: "متن مشکوک یا خارج از حوزه",
    });
  }

  return flags;
}

/**
 * Evaluate whether the order is safe to auto-publish to specialists.
 */
export function evaluateOrderPublishGate(
  input: PublishGateInput
): PublishGateResult {
  const flags = collectFlags(input);
  const hard = flags.filter((f) => f.severity === "hard");
  const soft = flags.filter((f) => f.severity === "soft");

  const needsReview = hard.length > 0 || soft.length >= 2;
  const autoPublish = !needsReview;

  const summary = autoPublish
    ? "انتشار خودکار: معیارهای کامل بودن برقرار بود"
    : `نگه‌داشته برای بررسی: ${flags.map((f) => f.label).join("؛ ")}`;

  return {
    autoPublish,
    status: autoPublish ? "MATCHING" : "PENDING_REVIEW",
    flags,
    summary,
  };
}

/** Persistable JSON for Order.publishFlags */
export function serializePublishFlags(flags: PublishGateFlag[]): string {
  return JSON.stringify(
    flags.map((f) => ({ code: f.code, severity: f.severity, label: f.label }))
  );
}

/** Safe parse of stored publishFlags (or empty). */
export function parsePublishFlags(raw: string | null | undefined): PublishGateFlag[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: PublishGateFlag[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.code === "string" &&
        (item.severity === "hard" || item.severity === "soft") &&
        typeof item.label === "string"
      ) {
        out.push({
          code: item.code as PublishGateFlagCode,
          severity: item.severity,
          label: item.label,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
