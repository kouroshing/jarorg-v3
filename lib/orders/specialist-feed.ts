import type { AvailableOrderSpecialistView } from "@/app/actions/marketplaceActions";

export type SpecialistFeedBucket = "action" | "open" | "applied" | "won";

export function classifySpecialistOrder(order: AvailableOrderSpecialistView): SpecialistFeedBucket {
  const interest = order.myInterest?.status ?? "";
  const status = order.status;

  if (interest === "SELECTED" && status === "AWAITING_SPECIALIST_CONFIRMATION") {
    return "action";
  }
  if (status === "AWAITING_SPECIALIST_CONFIRMATION" && order.hasApplied) {
    return "action";
  }

  if (
    interest === "SELECTED" ||
    interest === "ACCEPTED" ||
    (Boolean(order.selectedSpecialistId) &&
      ["CONFIRMED", "AWAITING_PAYMENT", "COMPLETED", "IN_PROGRESS"].includes(status))
  ) {
    return "won";
  }

  if (interest === "PENDING" || interest === "DECLINED" || interest === "REJECTED" || interest === "WITHDRAWN") {
    return "applied";
  }

  return "open";
}

export function countSpecialistMineOrders(orders: AvailableOrderSpecialistView[]): number {
  return orders.filter((order) => classifySpecialistOrder(order) !== "open").length;
}
