import {
  ALL_CATEGORIES,
  CATEGORIES_BY_SLUG,
  COMMERCIAL_CATEGORIES,
  PERSONAL_CATEGORIES,
  type CategoryType,
  type ServiceCategory,
} from "@/lib/categories";
import { citiesMatch, DEFAULT_SERVICE_CITY } from "@/lib/geo/serviceCities";

export type LocationAudience = "ALL" | CategoryType;

export function parseSuitableFor(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const slugs = parsed
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .filter((s) => Boolean(CATEGORIES_BY_SLUG[s]));
    return Array.from(new Set(slugs));
  } catch {
    return [];
  }
}

export function serializeSuitableFor(slugs: string[] | null | undefined): string | null {
  const clean = Array.from(
    new Set(
      (slugs || [])
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .filter((s) => Boolean(CATEGORIES_BY_SLUG[s]))
    )
  );
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

/** Compact chip label from the order-form category titles. */
export function projectTypeChipLabel(slug: string): string {
  const cat = CATEGORIES_BY_SLUG[slug];
  if (!cat) return slug;
  const first = cat.title.split(" - ")[0]?.trim() || cat.title;
  return first
    .replace(/^عکاسی و فیلمبرداری\s+/, "")
    .replace(/^عکاسی\s+/, "")
    .replace(/^فیلمبرداری\s+/, "فیلم ");
}

export function projectTypeTitle(slug: string): string {
  return CATEGORIES_BY_SLUG[slug]?.title || slug;
}

export function projectTypeAudience(slug: string): CategoryType | null {
  return CATEGORIES_BY_SLUG[slug]?.type ?? null;
}

export function categoriesForAudience(audience: LocationAudience): ServiceCategory[] {
  if (audience === "PERSONAL") return PERSONAL_CATEGORIES;
  if (audience === "COMMERCIAL") return COMMERCIAL_CATEGORIES;
  return ALL_CATEGORIES;
}

export function audienceFromSlugs(slugs: string[]): LocationAudience {
  if (slugs.length === 0) return "ALL";
  const types = new Set(
    slugs.map((s) => CATEGORIES_BY_SLUG[s]?.type).filter(Boolean) as CategoryType[]
  );
  if (types.size === 1) return [...types][0];
  return "ALL";
}

export function locationMatchesAudience(
  slugs: string[],
  audience: LocationAudience
): boolean {
  if (audience === "ALL") return true;
  if (slugs.length === 0) return true;
  return slugs.some((s) => CATEGORIES_BY_SLUG[s]?.type === audience);
}

export function locationMatchesProjectSlug(
  slugs: string[],
  projectSlug: string | null | undefined
): boolean {
  if (!projectSlug) return true;
  if (slugs.length === 0) return true;
  return slugs.includes(projectSlug);
}

export function locationMatchesCity(
  city: string | null | undefined,
  filterCity: string | null | undefined
): boolean {
  if (!filterCity || filterCity === "ALL") return true;
  if (!city?.trim()) return filterCity === DEFAULT_SERVICE_CITY;
  return citiesMatch(city, filterCity);
}

export const AUDIENCE_OPTIONS: { id: LocationAudience; label: string; hint: string }[] = [
  { id: "ALL", label: "همه پروژه‌ها", hint: "شخصی و تجاری" },
  { id: "PERSONAL", label: "عکاسی شخصی", hint: "عقد، خانواده، پرتره" },
  { id: "COMMERCIAL", label: "عکاسی تجاری", hint: "تبلیغات، محصول، برند" },
];
