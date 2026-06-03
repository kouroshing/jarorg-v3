import type { ProjectStatus } from "@/lib/db/enums";

/** Customer-facing labels and badge styles for project status. */
export const CUSTOMER_STATUS: Record<
  ProjectStatus,
  { label: string; dot: string; badge: string }
> = {
  PENDING: {
    label: "در انتظار بررسی",
    dot: "bg-gray-400",
    badge: "border-gray-200 bg-gray-50 text-gray-600",
  },
  IN_PROGRESS: {
    label: "در حال پیگیری",
    dot: "bg-jar-yellow",
    badge: "border-[#FACC15]/40 bg-jar-yellow/10 text-yellow-800",
  },
  COMPLETED: {
    label: "تکمیل شده",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CANCELED: {
    label: "لغو شده",
    dot: "bg-red-400",
    badge: "border-red-200 bg-red-50 text-red-600",
  },
};

export function getCustomerStatus(status: ProjectStatus) {
  return CUSTOMER_STATUS[status] ?? CUSTOMER_STATUS.PENDING;
}
