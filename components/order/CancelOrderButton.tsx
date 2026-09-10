"use client";

import React, { useState, useTransition } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { cancelOrderByClientAction } from "@/app/actions/marketplaceActions";
import { useRouter } from "next/navigation";
import { isClientCancellable } from "@/lib/orders/status";

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  isOwnerOrAdmin: boolean;
}

export default function CancelOrderButton({
  orderId,
  orderStatus,
  isOwnerOrAdmin,
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOwnerOrAdmin || !isClientCancellable(orderStatus)) {
    return null;
  }

  const handleCancel = () => {
    setError(null);
    const confirmed = window.confirm(
      "آیا مطمئن هستید که می‌خواهید این پروژه را لغو کنید؟ بعد از لغو می‌توانید پروژه جدیدی ثبت کنید."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await cancelOrderByClientAction(orderId);
      if (!res.success) {
        setError(res.error || "خطا در لغو سفارش.");
      } else {
        router.push("/order");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2.5" dir="rtl">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="flex items-center justify-center gap-1.5 w-full h-11 px-4 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span>{isPending ? "در حال لغو..." : "لغو این پروژه"}</span>
      </button>
    </div>
  );
}
