/** Client-facing cancel reasons for open (pre-confirmed) bookings. */
export const CLIENT_CANCEL_REASONS = [
  {
    id: "CHANGED_PLANS",
    label: "برنامه‌ام عوض شد / دیگر نیاز ندارم",
  },
  {
    id: "DATE_OR_LOCATION",
    label: "تاریخ یا محل پروژه تغییر کرده",
  },
  {
    id: "NO_FIT",
    label: "پیشنهاد مناسبی بین متخصصان ندیدم",
  },
  {
    id: "PRICE",
    label: "قیمت‌ها با بودجه‌ام هم‌خوان نبود",
  },
  {
    id: "FOUND_ELSEWHERE",
    label: "با متخصص دیگری خارج از جار هماهنگ شدم",
  },
  {
    id: "MISTAKE",
    label: "اشتباهی ثبت کرده بودم",
  },
  {
    id: "OTHER",
    label: "دلیل دیگر",
  },
] as const;

export type ClientCancelReasonId = (typeof CLIENT_CANCEL_REASONS)[number]["id"];

export function labelForClientCancelReason(id: string): string {
  return CLIENT_CANCEL_REASONS.find((r) => r.id === id)?.label || id;
}

export function buildClientCancelNote(
  reasonId: ClientCancelReasonId,
  extraNote?: string
): string {
  const label = labelForClientCancelReason(reasonId);
  const extra = extraNote?.trim();
  if (reasonId === "OTHER") {
    return extra ? `لغو کارفرما: ${extra}` : `لغو کارفرما: ${label}`;
  }
  return extra ? `لغو کارفرما: ${label} — ${extra}` : `لغو کارفرما: ${label}`;
}
