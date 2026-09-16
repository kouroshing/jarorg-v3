import type { AvailableOrderSpecialistView } from "@/app/actions/marketplaceActions";

export type SpecialistFeedBucket = "action" | "open" | "applied" | "won" | "lost";

/** Hide lost (REJECTED) cards from «پروژه‌های من» after this many days. */
export const LOST_FEED_RETENTION_DAYS = 14;

function interestUpdatedAtMs(order: AvailableOrderSpecialistView): number {
  const raw = order.myInterest?.updatedAt || order.myInterest?.createdAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function isLostInterestArchived(
  order: AvailableOrderSpecialistView,
  now = new Date()
): boolean {
  if ((order.myInterest?.status ?? "") !== "REJECTED") return false;
  const updated = interestUpdatedAtMs(order);
  if (!updated) return false;
  const cutoff = now.getTime() - LOST_FEED_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return updated < cutoff;
}

export function classifySpecialistOrder(order: AvailableOrderSpecialistView): SpecialistFeedBucket {
  const interest = order.myInterest?.status ?? "";
  const status = order.status;

  // Legacy ASC rows still need an action bucket; new flow never creates them.
  if (interest === "SELECTED" && status === "AWAITING_SPECIALIST_CONFIRMATION") {
    return "action";
  }
  if (status === "AWAITING_SPECIALIST_CONFIRMATION" && interest === "SELECTED") {
    return "action";
  }

  // Won only when THIS specialist is the pick — never because someone else was selected.
  if (interest === "SELECTED" || interest === "ACCEPTED") {
    return "won";
  }

  if (interest === "REJECTED") {
    return "lost";
  }

  if (interest === "PENDING" || interest === "DECLINED" || interest === "WITHDRAWN") {
    return "applied";
  }

  return "open";
}

export function countSpecialistMineOrders(orders: AvailableOrderSpecialistView[]): number {
  return orders.filter((order) => {
    const bucket = classifySpecialistOrder(order);
    if (bucket === "open") return false;
    if (bucket === "lost" && isLostInterestArchived(order)) return false;
    return true;
  }).length;
}
