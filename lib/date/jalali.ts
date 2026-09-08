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

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
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
