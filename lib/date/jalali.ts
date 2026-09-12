/**
 * Jalali (Persian) ↔ Gregorian conversion.
 *
 * Orders store their date as a display string with Persian digits —
 * "۱۴۰۵/۰۶/۱۵" — produced by Intl.DateTimeFormat. That is fine to show and
 * useless for anything else: you cannot ask whether two shoots overlap, or when
 * a shoot is 24 hours away, from a formatted string.
 *
 * This turns those strings into real instants so Order.scheduledAt can hold one.
 *
 * The conversion is the standard Birashk/Borkowski algorithm used by
 * jalaali-js, implemented here rather than added as a dependency: it is exact
 * for 1178–1633 AP, deterministic, and about sixty lines.
 */

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
  2394, 2456, 3178,
];

/** Gregorian year and the March day on which the given Jalali year starts. */
function jalCal(jy: number): { gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new RangeError(`Jalali year out of range: ${jy}`);
  }

  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  const n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  return { gy, march };
}

/** Gregorian date to Julian Day Number. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** Julian Day Number to Gregorian date. */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  const jdn = g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  return d2g(jdn);
}

/** True when Jalali year has 366 days (Esfand has 30). */
export function isLeapJalaliYear(jy: number): boolean {
  const a = jalCal(jy);
  const b = jalCal(jy + 1);
  return g2d(b.gy, 3, b.march) - g2d(a.gy, 3, a.march) === 366;
}

/** Gregorian → Jalali (inverse of jalaliToGregorian). */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  const jdn = g2d(gy, gm, gd);
  let jy = d2g(jdn).gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (isLeapJalaliYear(jy)) k += 1;
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

export const JALALI_MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Format as English digits yyyy/mm/dd for APIs (Zohal). */
export function formatJalaliYmd(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function parseJalaliYmd(
  raw: string
): { jy: number; jm: number; jd: number } | null {
  const en = toEnglishDigits(raw).trim().replace(/[-.]/g, "/");
  const m = en.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (!Number.isFinite(jy) || jm < 1 || jm > 12 || jd < 1) return null;
  try {
    if (jd > jalaliMonthLength(jy, jm)) return null;
  } catch {
    return null;
  }
  return { jy, jm, jd };
}

/** Formats an English/Persian ymd as fa display. */
export function formatJalaliYmdFa(raw: string): string {
  const parsed = parseJalaliYmd(raw);
  if (!parsed) return raw;
  return toPersianDigits(formatJalaliYmd(parsed.jy, parsed.jm, parsed.jd));
}

/** Today in Jalali (Tehran calendar day). */
export function todayJalali(): { jy: number; jm: number; jd: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const gy = Number(parts.find((p) => p.type === "year")?.value);
  const gm = Number(parts.find((p) => p.type === "month")?.value);
  const gd = Number(parts.find((p) => p.type === "day")?.value);
  return gregorianToJalali(gy, gm, gd);
}

/** Iran has had a constant +03:30 offset since daylight saving was dropped in 2022. */
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

/**
 * Turns a stored booking date and time slot into the instant the shoot starts.
 *
 * Accepts what the order form actually writes: Persian digits, slash-separated,
 * and a slot label like "۱۶:۰۰ الی ۱۸:۰۰ (غروب)". Returns null rather than
 * guessing when either is missing or unparseable — a wrong instant here would
 * release a phone number on the wrong day.
 */
export function resolveScheduledAt(
  bookingDate: string | null | undefined,
  timeSlot: string | null | undefined
): Date | null {
  if (!bookingDate) return null;

  const parts = toEnglishDigits(bookingDate).trim().split(/[\/\-]/);
  if (parts.length !== 3) return null;

  const [jy, jm, jd] = parts.map((p) => parseInt(p, 10));
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;

  let gy: number, gm: number, gd: number;
  try {
    ({ gy, gm, gd } = jalaliToGregorian(jy, jm, jd));
  } catch {
    return null;
  }

  // A missing slot means the shoot has no agreed hour yet; start of day is the
  // safest assumption, since it only ever makes a deadline earlier.
  const startHour = parseSlotStartHour(timeSlot) ?? 0;

  // Build the instant in Tehran local time, then shift to UTC.
  const asUtc = Date.UTC(gy, gm - 1, gd, startHour, 0, 0, 0);
  return new Date(asUtc - TEHRAN_OFFSET_MS);
}

/** First hour in a slot label such as "۱۶:۰۰ الی ۱۸:۰۰ (غروب)". */
export function parseSlotStartHour(timeSlot: string | null | undefined): number | null {
  if (!timeSlot) return null;
  const match = toEnglishDigits(timeSlot).match(/(\d{1,2})\s*:\s*\d{2}/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  return hour >= 0 && hour <= 23 ? hour : null;
}

/** Formats an instant back to the Persian display form the app uses. */
export function formatJalaliDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(date);
}

/** Jalali date + time for admin lists (Tehran). */
export function formatJalaliDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(date);
}

/** Short Jalali day label for charts, e.g. ۶/۲۱ */
export function formatJalaliChartDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const gy = Number(parts.find((p) => p.type === "year")?.value);
  const gm = Number(parts.find((p) => p.type === "month")?.value);
  const gd = Number(parts.find((p) => p.type === "day")?.value);
  const { jm, jd } = gregorianToJalali(gy, gm, gd);
  return toPersianDigits(`${jm}/${jd}`);
}
