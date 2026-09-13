import iranData from "@/lib/geo/iranProvincesCities.json";
import { lookupCityCenter } from "@/lib/geo/cityCenters";

export type IranCity = {
  name: string;
  lat?: number;
  lng?: number;
};

export type IranProvince = {
  id: number;
  name: string;
  cities: IranCity[];
};

export const IRAN_PROVINCES = iranData as IranProvince[];

const DEFAULT_COVERAGE_KM = 20;
const MIN_COVERAGE_KM = 5;
const MAX_COVERAGE_KM = 100;

export const COVERAGE_RADIUS_BOUNDS = {
  min: MIN_COVERAGE_KM,
  max: MAX_COVERAGE_KM,
  default: DEFAULT_COVERAGE_KM,
  /** Below this ≈ local neighborhood around base. */
  localMaxKm: 10,
  /** Above this ≈ wide metro / suburbs. */
  wideMinKm: 30,
} as const;

export function describeCoverageRadius(km: number): {
  band: "local" | "nearby" | "wide";
  title: string;
  hint: string;
} {
  const safe = Math.min(MAX_COVERAGE_KM, Math.max(MIN_COVERAGE_KM, Math.round(km)));
  if (safe <= COVERAGE_RADIUS_BOUNDS.localMaxKm) {
    return {
      band: "local",
      title: "محدوده محلی",
      hint: "فقط اطراف نزدیک مبدأ — پروژه‌های دورتر (مثل سمت دیگر شهر) کمتر به شما می‌رسد.",
    };
  }
  if (safe < COVERAGE_RADIUS_BOUNDS.wideMinKm) {
    return {
      band: "nearby",
      title: "اطراف مبدأ",
      hint: "محله‌ها و مسیرهای اطراف مبدأ را پوشش می‌دهید؛ مناسب رفت‌وآمد روزمره در شهر.",
    };
  }
  return {
    band: "wide",
    title: "محدوده وسیع",
    hint: "دایره بزرگ یعنی حومه و نقاط دورتر هم داخل پوشش‌تان است. اگر استودیو دارید، هم آنجا و هم اطراف را می‌توانید بپذیرید.",
  };
}

function normalizeFa(value: string): string {
  return value
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "")
    .replace(/\s+/g, "");
}

/** Resolve province + city from a previously saved city string. */
export function matchIranPlace(cityLabel: string | null | undefined): {
  province: string;
  city: string;
} | null {
  const raw = (cityLabel || "").trim();
  if (!raw) return null;

  const parts = raw.split(/[،,/|-]/).map((p) => p.trim()).filter(Boolean);
  const candidates = parts.length > 1 ? [parts[parts.length - 1], parts[0], raw] : [raw];

  for (const candidate of candidates) {
    const needle = normalizeFa(candidate);
    for (const province of IRAN_PROVINCES) {
      const hit = province.cities.find((c) => normalizeFa(c.name) === needle);
      if (hit) return { province: province.name, city: hit.name };
    }
  }

  for (const candidate of candidates) {
    const needle = normalizeFa(candidate);
    for (const province of IRAN_PROVINCES) {
      if (normalizeFa(province.name) === needle) {
        const capital =
          province.cities.find((c) => normalizeFa(c.name) === needle) ||
          province.cities[0];
        if (capital) return { province: province.name, city: capital.name };
      }
    }
  }

  return null;
}

export function getCitiesForProvince(provinceName: string): IranCity[] {
  return IRAN_PROVINCES.find((p) => p.name === provinceName)?.cities ?? [];
}

export function getCityCoords(
  provinceName: string,
  cityName: string
): { lat: number; lng: number } | null {
  // Curated centers first — JSON lat/lng is often wrong or missing.
  const curated = lookupCityCenter(cityName);
  if (curated) return curated;

  const city = getCitiesForProvince(provinceName).find((c) => c.name === cityName);
  if (city?.lat != null && city?.lng != null) {
    // Reject clearly absurd points for known city names that slipped past curation
    // (e.g. legacy تهران at ~31.9 near اصفهان).
    const lat = city.lat;
    const lng = city.lng;
    if (lat >= 24.5 && lat <= 40 && lng >= 44 && lng <= 63.5) {
      return { lat, lng };
    }
  }
  return null;
}

/** Parse coverage radius from workArea text (legacy free text → default). */
export function parseCoverageRadiusKm(workArea: string | null | undefined): number {
  const raw = (workArea || "").trim();
  if (!raw) return DEFAULT_COVERAGE_KM;

  const latin = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const match = latin.match(/(\d+(?:\.\d+)?)\s*(?:km|کیلومتر|کیلومتری|ک\.م)?/i);
  if (!match) return DEFAULT_COVERAGE_KM;

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return DEFAULT_COVERAGE_KM;
  return Math.min(MAX_COVERAGE_KM, Math.max(MIN_COVERAGE_KM, Math.round(n)));
}

export function formatCoverageRadiusKm(km: number): string {
  const safe = Math.min(MAX_COVERAGE_KM, Math.max(MIN_COVERAGE_KM, Math.round(km)));
  return `شعاع ${safe} کیلومتر`;
}
