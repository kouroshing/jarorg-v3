// Admin panel status values + display metadata.

export const ADMIN_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

type StatusMeta = {
  label: string;
  dot: string;
  active: string;
};

export const STATUS_META: Record<AdminStatus, StatusMeta> = {
  PENDING: {
    label: "در انتظار بررسی",
    dot: "bg-gray-400",
    active: "border-gray-300 bg-gray-50 text-gray-800",
  },
  IN_PROGRESS: {
    label: "در حال پیگیری",
    dot: "bg-jar-yellow",
    active: "border-[#FACC15] bg-jar-yellow/10 text-yellow-800",
  },
  COMPLETED: {
    label: "تکمیل‌شده",
    dot: "bg-emerald-500",
    active: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  CANCELED: {
    label: "لغو شده",
    dot: "bg-red-500",
    active: "border-red-300 bg-red-50 text-red-700",
  },
};

const LEGACY_STATUS_MAP: Record<string, AdminStatus> = {
  pending_review: "PENDING",
  contacted: "IN_PROGRESS",
  meeting_scheduled: "IN_PROGRESS",
  converted: "IN_PROGRESS",
  invoiced: "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  canceled: "CANCELED",
};

export function normalizeStatus(status: string | null | undefined): AdminStatus {
  if (status && (ADMIN_STATUSES as readonly string[]).includes(status)) {
    return status as AdminStatus;
  }
  if (status && LEGACY_STATUS_MAP[status]) {
    return LEGACY_STATUS_MAP[status];
  }
  return "PENDING";
}
