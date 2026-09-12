/** Cities Jar currently routes projects / specialists around. */

export const SERVICE_CITIES = [
  "تهران",
  "کرج",
  "اصفهان",
  "شیراز",
  "مشهد",
  "تبریز",
  "اهواز",
  "قم",
  "رشت",
  "کرمان",
  "یزد",
  "همدان",
  "اراک",
  "بندرعباس",
  "ارومیه",
  "ساری",
  "کرمانشاه",
  "قزوین",
  "زنجان",
  "بوشهر",
] as const;

export type ServiceCity = (typeof SERVICE_CITIES)[number];

export const DEFAULT_SERVICE_CITY: ServiceCity = "تهران";

/** Pull a known service city out of a reverse-geocoded district string. */
export function matchServiceCity(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if ((SERVICE_CITIES as readonly string[]).includes(value)) return value;
  const head = value.split(/[،,]/)[0]?.trim() || "";
  if ((SERVICE_CITIES as readonly string[]).includes(head)) return head;
  for (const city of SERVICE_CITIES) {
    if (value.includes(city)) return city;
  }
  return null;
}

/** True when two location labels refer to the same service city (or exact match). */
export function citiesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = (a || "").trim();
  const right = (b || "").trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const ca = matchServiceCity(left);
  const cb = matchServiceCity(right);
  if (ca && cb) return ca === cb;
  if (ca && right.includes(ca)) return true;
  if (cb && left.includes(cb)) return true;
  return left.includes(right) || right.includes(left);
}

/** Normalize a district string to a stable city chip label for filters. */
export function normalizeCityLabel(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  return matchServiceCity(value) || value.split(/[،,]/)[0]?.trim() || value;
}
