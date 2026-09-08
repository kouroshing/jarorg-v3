"use client";

import React from "react";
import type { CustomInputProps } from "@premieroctet/next-admin";

// Built from lib/orders/status.ts, so the dropdown always offers exactly the
// states the rest of the app understands — and lists them in flow order.
export { ORDER_STATUS_OPTIONS } from "@/lib/orders/status";
import { ORDER_STATUS_OPTIONS } from "@/lib/orders/status";

export const SPECIALIST_STATUS_OPTIONS = [
  { value: "INCOMPLETE", label: "اطلاعات ناقص (INCOMPLETE)" },
  { value: "PENDING_REVIEW", label: "در انتظار بررسی و تایید کیفی (PENDING_REVIEW)" },
  { value: "ACTIVE", label: "متخصص تایید شده و فعال (ACTIVE)" },
  { value: "SUSPENDED", label: "تعلیق موقت (SUSPENDED)" },
] as const;

export const WITHDRAWAL_STATUS_OPTIONS = [
  { value: "PENDING", label: "در انتظار بررسی حسابداری (PENDING)" },
  { value: "APPROVED", label: "تایید شده جهت واریز (APPROVED)" },
  { value: "PAID", label: "تسویه و واریز شده (PAID)" },
  { value: "REJECTED", label: "رد شده (REJECTED)" },
] as const;

export const PROPOSAL_STATUS_OPTIONS = [
  { value: "PENDING", label: "در انتظار تصمیم کارفرما (PENDING)" },
  { value: "ACCEPTED", label: "پذیرفته شده (ACCEPTED)" },
  { value: "REJECTED", label: "رد شده (REJECTED)" },
] as const;

export type { OrderStatus as OrderStatusValue } from "@/lib/orders/status";

export default function OrderStatusSelect({
  name,
  value,
  onChange,
  disabled,
  required,
  item,
}: CustomInputProps) {
  let optionsList: ReadonlyArray<{ value: string; label: string }> = ORDER_STATUS_OPTIONS;
  let defaultVal = "PENDING_REVIEW";

  if (item && ("agreedToTerms" in item || "equipmentSummary" in item || "workArea" in item)) {
    optionsList = SPECIALIST_STATUS_OPTIONS;
    defaultVal = "PENDING_REVIEW";
  } else if (item && "shabaNumber" in item) {
    optionsList = WITHDRAWAL_STATUS_OPTIONS;
    defaultVal = "PENDING";
  } else if (item && "proposedPrice" in item) {
    optionsList = PROPOSAL_STATUS_OPTIONS;
    defaultVal = "PENDING";
  }

  return (
    <div className="relative w-full font-sans">
      <select
        id={name}
        name={name}
        value={value || defaultVal}
        onChange={(e) => onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>)}
        disabled={disabled}
        required={required}
        dir="rtl"
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {optionsList.map((opt) => (
          <option key={opt.value} value={opt.value} className="py-1">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
