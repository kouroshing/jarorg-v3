/**
 * جار لوکیشن — helpers for catalog of photography locations.
 */

export type PhotoLocationSecurity = "LOW" | "MEDIUM" | "HIGH";

export type PhotoLocationStatus = "PENDING" | "APPROVED" | "REJECTED";

export const SECURITY_LABELS: Record<PhotoLocationSecurity, string> = {
  LOW: "امنیت پایین",
  MEDIUM: "امنیت متوسط",
  HIGH: "امنیت بالا",
};

export const MAX_LOCATION_IMAGES = 8;

/** Haversine distance in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000).toLocaleString("fa-IR")} متر`;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", "٫")} کیلومتر`;
}

/** Match a map pin to a catalog location (≈80m). */
export const JAR_LOCATION_MATCH_METERS = 80;

export function isNearJarLocationPin(
  pin: { lat: number; lng: number },
  catalog: { lat: number; lng: number },
  meters = JAR_LOCATION_MATCH_METERS
): boolean {
  return haversineKm(pin, catalog) * 1000 <= meters;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

/**
 * Pre-payment area label for specialists — district/city only, never street address.
 * Used on the apply / acceptance surfaces so exact pins stay private until reveal.
 */
export function formatApproxShootArea(input: {
  districtOrCity?: string | null;
  city?: string | null;
  district?: string | null;
}): string {
  const fromParts = [input.city, input.district]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  if (fromParts.length > 0) {
    return `محدودهٔ تقریبی: ${fromParts.join("، ")}`;
  }
  const district = input.districtOrCity?.trim();
  if (district) {
    return `محدودهٔ تقریبی: ${district}`;
  }
  return "محدودهٔ تقریبی روی نقشه (بدون آدرس دقیق)";
}

/** Mask Iran mobile for public display until login. */
export function maskContactPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "***";
  const last4 = digits.slice(-4);
  return `۰۹** *** ${last4}`;
}

export function slugifyLocationName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9\-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `location-${Date.now().toString(36)}`;
}

export function parseSecurityLevel(raw: string | null | undefined): PhotoLocationSecurity {
  if (raw === "LOW" || raw === "HIGH" || raw === "MEDIUM") return raw;
  return "MEDIUM";
}

export function parseLocationImageUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim())
      .slice(0, MAX_LOCATION_IMAGES);
  } catch {
    return [];
  }
}

export function serializeLocationImageUrls(urls: string[]): string | null {
  const clean = urls
    .filter((u) => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim())
    .slice(0, MAX_LOCATION_IMAGES);
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

/** Cover falls back to first gallery image. */
export function resolveLocationCover(
  coverImageUrl: string | null | undefined,
  imageUrls: string[] | string | null | undefined
): string | null {
  if (coverImageUrl?.trim()) return coverImageUrl.trim();
  const gallery =
    typeof imageUrls === "string" ? parseLocationImageUrls(imageUrls) : imageUrls || [];
  return gallery[0] || null;
}

export type PhotoLocationPublic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  lat: number;
  lng: number;
  city: string | null;
  district: string | null;
  address: string | null;
  needsPermit: boolean;
  proCameraAllowed: boolean;
  phoneCameraAllowed: boolean;
  hasEntranceFee: boolean;
  hasChangingRoom: boolean;
  hasParking: boolean;
  securityLevel: PhotoLocationSecurity;
  /** Full when viewer logged in; masked otherwise. */
  contactPhoneDisplay: string | null;
  contactPhoneRevealed: boolean;
  coverImageUrl: string | null;
  imageUrls: string[];
  distanceKm?: number | null;
};
