import catalogJson from "@/lib/equipment/catalog.json";
import phonesJson from "@/lib/equipment/phones.json";

/**
 * Specialist gear catalog (~2.2k items + phones for mobile graphers).
 * Cameras: CameraDatabase (GitHub). Lenses: Luminoid/lens-db.
 * Lights/flash/mics/gimbals/drones: curated pro models (Godox, Aputure, DJI, …).
 * Phones: curated mobilegraphy handsets + phone accessories.
 */

export type EquipmentCategory =
  | "camera"
  | "lens"
  | "light"
  | "flash"
  | "microphone"
  | "gimbal"
  | "drone"
  | "support"
  | "phone"
  | "other";

export type EquipmentCatalogMode = "pro" | "mobile";

export type EquipmentItem = {
  id: string;
  label: string;
  category: EquipmentCategory;
  brand?: string;
  keywords?: string[];
  /** Remote thumbnail URL (CDN). Omitted when unavailable. */
  image?: string;
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  camera: "دوربین",
  lens: "لنز",
  light: "نور",
  flash: "فلاش",
  microphone: "میکروفون",
  gimbal: "گیمبال",
  drone: "هلی‌شات",
  support: "پایه و جانبی",
  phone: "موبایل",
  other: "سایر",
};

const PRO_CATEGORIES = new Set<EquipmentCategory>([
  "camera",
  "lens",
  "light",
  "flash",
  "microphone",
  "gimbal",
  "drone",
  "support",
  "other",
]);

const MOBILE_CATEGORIES = new Set<EquipmentCategory>(["phone"]);

export const EQUIPMENT_CATALOG = [
  ...(catalogJson as EquipmentItem[]),
  ...(phonesJson as EquipmentItem[]),
] as EquipmentItem[];

const catalogByLabel = new Map(
  EQUIPMENT_CATALOG.map((item) => [normalizeQuery(item.label), item] as const)
);

function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ");
}

export function findEquipmentByLabel(label: string): EquipmentItem | null {
  return catalogByLabel.get(normalizeQuery(label)) || null;
}

const MAX_TAGS = 40;
const MAX_SERIALIZED_LEN = 4000;

/** Parse stored equipment (JSON array or legacy free text). */
export function parseEquipmentTags(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const text = raw.trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .map((item) => String(item || "").trim())
              .filter((item) => item.length > 0)
          )
        ).slice(0, MAX_TAGS);
      }
    } catch {
      /* fall through to legacy splitter */
    }
  }
  return Array.from(
    new Set(
      text
        .split(/[,،\n|/؛;]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    )
  ).slice(0, MAX_TAGS);
}

export function serializeEquipmentTags(tags: string[]): string | null {
  const cleaned = Array.from(
    new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0))
  ).slice(0, MAX_TAGS);
  if (cleaned.length === 0) return null;
  const serialized = JSON.stringify(cleaned);
  if (serialized.length > MAX_SERIALIZED_LEN) {
    return JSON.stringify(cleaned.slice(0, Math.max(1, cleaned.length - 1)));
  }
  return serialized;
}

export function formatEquipmentDisplay(raw: string | null | undefined): string {
  return parseEquipmentTags(raw).join("، ");
}

function categoriesForMode(mode?: EquipmentCatalogMode): Set<EquipmentCategory> | null {
  if (mode === "mobile") return MOBILE_CATEGORIES;
  if (mode === "pro") return PRO_CATEGORIES;
  return null;
}

export function searchEquipmentCatalog(
  query: string,
  opts?: {
    exclude?: string[];
    limit?: number;
    mode?: EquipmentCatalogMode;
    categories?: EquipmentCategory[];
  }
): EquipmentItem[] {
  const q = normalizeQuery(query);
  if (!q || q.length < 1) return [];
  const exclude = new Set((opts?.exclude || []).map((x) => normalizeQuery(x)));
  const limit = opts?.limit ?? 24;
  const tokens = q.split(" ").filter(Boolean);
  const modeCats = categoriesForMode(opts?.mode);
  const allowed =
    opts?.categories && opts.categories.length > 0
      ? new Set(opts.categories)
      : modeCats;

  const scored: { item: EquipmentItem; score: number }[] = [];
  for (const item of EQUIPMENT_CATALOG) {
    if (allowed && !allowed.has(item.category)) continue;
    const labelNorm = normalizeQuery(item.label);
    if (exclude.has(labelNorm)) continue;

    const hay = [
      labelNorm,
      normalizeQuery(item.brand || ""),
      ...(item.keywords || []).map(normalizeQuery),
    ].join(" ");

    if (!tokens.every((token) => hay.includes(token))) continue;

    let score = 0;
    if (labelNorm.startsWith(q)) score += 40;
    if (labelNorm.includes(q)) score += 20;
    if ((item.keywords || []).some((k) => normalizeQuery(k) === q)) score += 15;
    if (normalizeQuery(item.brand || "").startsWith(tokens[0] || "")) score += 8;
    score += Math.max(0, 12 - item.label.length / 10);
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, limit).map((row) => row.item);
}

export const EQUIPMENT_LIMITS = {
  maxTags: MAX_TAGS,
  maxSerializedLen: MAX_SERIALIZED_LEN,
} as const;
