"use client";

import React from "react";
import Link from "next/link";
import { formatJalaliDateTime } from "@/lib/date/jalali";

export type AuditRow = {
  id: string;
  action: string;
  targetModel: string;
  targetId: string;
  note: string | null;
  createdAt: string;
  actorLabel: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  ORDER_APPROVED: "تایید سفارش",
  ORDER_CANCELLED: "لغو سفارش",
  ORDER_EDIT_REQUESTED: "درخواست ویرایش سفارش",
  PORTFOLIO_APPROVED: "تایید نمونه‌کار",
  PORTFOLIO_REJECTED: "رد نمونه‌کار",
  PORTFOLIO_INSTAGRAM_PICKED: "انتخاب برای اینستا",
  PORTFOLIO_INSTAGRAM_UNPICKED: "لغو انتخاب اینستا",
  SPECIALIST_APPROVED: "تایید متخصص",
  SPECIALIST_REJECTED: "رد متخصص",
  SPECIALIST_KYC_VERIFIED: "تایید KYC",
  SPECIALIST_KYC_FAILED: "رد KYC",
  SPECIALIST_KYC_SUBMITTED: "ثبت KYC",
  SPECIALIST_KYC_ATTEMPT: "تلاش KYC",
  SPECIALIST_KYC_BLOCKED: "مسدود KYC",
  WITHDRAWAL_APPROVED: "تایید تسویه",
  WITHDRAWAL_REJECTED: "رد تسویه",
  ADMIN_STAFF_UPSERT: "ثبت ادمین",
  ADMIN_STAFF_DEACTIVATE: "غیرفعال ادمین",
  INTEREST_SELECTED: "انتخاب متقاضی",
};

function labelFor(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("SPECIALIST_KYC_")) return action.replace("SPECIALIST_KYC_", "KYC ");
  return action;
}

export default function AdminAuditStrip({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
        هنوز لاگ حسابرسی اخیری ثبت نشده است.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs" dir="rtl">
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-xs"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-bold text-slate-900">
                {labelFor(row.action)}
                <span className="mx-1.5 font-medium text-slate-400">·</span>
                <span className="font-medium text-slate-600">
                  {row.targetModel}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 truncate max-w-[36rem]">
                {row.actorLabel ? `${row.actorLabel} · ` : ""}
                <span className="font-mono" dir="ltr">
                  {row.targetId.slice(0, 8)}…
                </span>
                {row.note ? ` — ${row.note}` : ""}
              </p>
            </div>
            <time className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
              {formatJalaliDateTime(new Date(row.createdAt))}
            </time>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/80">
        <Link
          href="/admin/AuditLog"
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
        >
          همه لاگ‌های حسابرسی ←
        </Link>
      </div>
    </div>
  );
}
