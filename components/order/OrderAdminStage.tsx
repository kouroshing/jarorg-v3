"use client";

import React from "react";
import OrderAdminPending from "./OrderAdminPending";
import OrderClientEditForm, { type OrderEditInitial } from "./OrderClientEditForm";
import { needsClientEdit } from "@/lib/orders/status";

interface OrderAdminStageProps {
  order: OrderEditInitial & {
    categoryTitle?: string | null;
    locationType: string;
  };
  isOwnerOrAdmin: boolean;
}

export default function OrderAdminStage({ order, isOwnerOrAdmin }: OrderAdminStageProps) {
  if (needsClientEdit(order.status)) {
    return <OrderClientEditForm order={order} isOwnerOrAdmin={isOwnerOrAdmin} />;
  }

  return <OrderAdminPending order={order} isOwnerOrAdmin={isOwnerOrAdmin} />;
}
