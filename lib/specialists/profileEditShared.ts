export type PendingProfileEditDraft = {
  city?: string | null;
  workArea?: string | null;
  equipmentSummary?: string | null;
  isMobileGrapher?: boolean;
  baseLat?: number | null;
  baseLng?: number | null;
  baseAddress?: string | null;
  studioName?: string | null;
  studioLat?: number | null;
  studioLng?: number | null;
  studioAddress?: string | null;
  clearStudio?: boolean;
  selectedCategories?: string[] | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export function parsePendingProfileEdit(
  raw: string | null | undefined
): PendingProfileEditDraft | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PendingProfileEditDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function mergePendingProfileEdit(
  existingRaw: string | null | undefined,
  patch: PendingProfileEditDraft
): string {
  const current = parsePendingProfileEdit(existingRaw) || {};
  const next: PendingProfileEditDraft = { ...current, ...patch };
  if (patch.clearStudio) {
    next.studioName = null;
    next.studioLat = null;
    next.studioLng = null;
    next.studioAddress = null;
    next.clearStudio = true;
  } else if (
    patch.studioName != null ||
    patch.studioLat != null ||
    patch.studioLng != null
  ) {
    next.clearStudio = false;
  }
  return JSON.stringify(next);
}

export const PROFILE_EDIT_FIELD_LABELS: Record<keyof PendingProfileEditDraft, string> = {
  city: "شهر",
  workArea: "محدوده کاری",
  equipmentSummary: "تجهیزات",
  isMobileGrapher: "موبایل‌گرافر",
  baseLat: "عرض مبدأ",
  baseLng: "طول مبدأ",
  baseAddress: "آدرس مبدأ",
  studioName: "نام استودیو",
  studioLat: "عرض استودیو",
  studioLng: "طول استودیو",
  studioAddress: "آدرس استودیو",
  clearStudio: "حذف استودیو",
  selectedCategories: "دسته‌بندی‌ها",
  displayName: "نام نمایشی",
  avatarUrl: "عکس پروفایل",
};

export function formatPendingEditValue(
  key: keyof PendingProfileEditDraft,
  value: unknown
): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (Array.isArray(value)) return value.join("، ") || "—";
  return String(value);
}
