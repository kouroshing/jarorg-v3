"use client";

import React from "react";
import Link from "next/link";
import {
  ExclamationTriangleIcon,
  UserPlusIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import AdminOrderTriageQueue, {
  type TriageOrderRow,
} from "@/components/admin/AdminOrderTriageQueue";
import AdminWithdrawalQueue, {
  type WithdrawalRow,
} from "@/components/admin/AdminWithdrawalQueue";
import AdminFollowUpQueue from "@/components/admin/AdminFollowUpQueue";
import AdminAuditStrip, {
  type AuditRow,
} from "@/components/admin/AdminAuditStrip";
import type { AdminPermission } from "@/lib/auth/adminPermissions";

export interface DashboardData {
  pendingReviewCount: number;
  matchingStuckCount: number;
  awaitingPaymentCount: number;
  openDisputeCount: number;
  pendingSpecialistCount: number;
  pendingPortfolioCount: number;
  pendingWithdrawalCount: number;
  triageOrders: TriageOrderRow[];
  matchingOrders: TriageOrderRow[];
  paymentOrders: TriageOrderRow[];
  disputeOrders: TriageOrderRow[];
  withdrawals: WithdrawalRow[];
  recentAudits: AuditRow[];
}

export default function AdminDashboard({
  data,
  permissions = [],
  isSuper = false,
}: {
  data: DashboardData;
  permissions?: AdminPermission[];
  isSuper?: boolean;
}) {
  const allowed = new Set(permissions);
  const can = (p: AdminPermission) => isSuper || allowed.has(p);
  const canOrders = can("orders_manage");
  const canReview = can("specialists_review");
  const canFinance = can("finance_manage");
  const canStats = can("stats_view");
  const canDashboard = can("dashboard");

  return (
    <div className="w-full max-w-full space-y-6 px-3 sm:px-6 lg:px-8 py-5 pb-16 overflow-hidden text-right" dir="rtl">
      <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900">
            کار امروز ادمین
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            فقط صف‌های فوری. آمار و نمودار در بخش جداست.
          </p>
        </div>
        {canReview && (
          <Link
            href="/admin/review"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
          >
            <UserPlusIcon className="w-4 h-4" />
            صف بررسی متخصص
            {data.pendingSpecialistCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {data.pendingSpecialistCount.toLocaleString("fa-IR")}
              </span>
            )}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {canOrders && (
          <Kpi
            href="#triage"
            label="تایید سفارش"
            value={data.pendingReviewCount}
            tone="rose"
            hint="PENDING_REVIEW"
          />
        )}
        {canReview && (
          <Kpi
            href="/admin/review"
            label="بررسی متخصص"
            value={data.pendingSpecialistCount}
            tone="amber"
            hint="پرونده معوق"
          />
        )}
        {canFinance && (
          <Kpi
            href="#withdrawals"
            label="تسویه معلق"
            value={data.pendingWithdrawalCount}
            tone="emerald"
            hint="کیف پول"
          />
        )}
        {canOrders && (
          <Kpi
            href="#matching"
            label="تطبیق گیرکرده"
            value={data.matchingStuckCount}
            tone="slate"
            hint="بدون متقاضی / قدیمی"
          />
        )}
        {canOrders && (
          <Kpi
            href="#payment"
            label="در انتظار پرداخت"
            value={data.awaitingPaymentCount}
            tone="indigo"
            hint="AWAITING_PAYMENT"
          />
        )}
        {canOrders && (
          <Kpi
            href="#disputes"
            label="اعتراض باز"
            value={data.openDisputeCount}
            tone="rose"
            hint="تسویه متوقف"
          />
        )}
        {canReview && (
          <Kpi
            href="/admin/PortfolioItem"
            label="نمونه‌کار معوق"
            value={data.pendingPortfolioCount}
            tone="purple"
            hint="از صف بررسی"
          />
        )}
      </div>

      {canReview && data.pendingSpecialistCount > 0 && (
        <Link
          href="/admin/review"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
              <UserPlusIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {data.pendingSpecialistCount.toLocaleString("fa-IR")} متخصص در انتظار تایید
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                تا تایید نشوند به کارتابل پروژه دسترسی ندارند.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white shrink-0">
            ورود به صف بررسی
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </span>
        </Link>
      )}

      {canOrders && (
        <section id="triage" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
              میز کار تایید سفارش
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {data.triageOrders.length.toLocaleString("fa-IR")} مورد
            </span>
          </div>
          <AdminOrderTriageQueue orders={data.triageOrders} />
        </section>
      )}

      {canFinance && (
        <section id="withdrawals" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5 text-emerald-600" />
              صف تسویه کیف پول
            </h2>
            <Link
              href="/admin/WithdrawalRequest"
              className="text-[11px] font-bold text-indigo-600"
            >
              همه رکوردها
            </Link>
          </div>
          <AdminWithdrawalQueue requests={data.withdrawals} />
        </section>
      )}

      {canOrders && (
        <section id="matching" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-500" />
              تطبیق نیازمند پیگیری
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {data.matchingOrders.length.toLocaleString("fa-IR")} مورد
            </span>
          </div>
          <AdminFollowUpQueue orders={data.matchingOrders} mode="matching" />
        </section>
      )}

      {canOrders && (
        <section id="payment" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-indigo-600" />
              پرداخت‌های گیرکرده
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {data.paymentOrders.length.toLocaleString("fa-IR")} مورد
            </span>
          </div>
          <AdminFollowUpQueue orders={data.paymentOrders} mode="payment" />
        </section>
      )}

      {canOrders && (
        <section id="disputes" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
              اعتراض‌های باز
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {data.disputeOrders.length.toLocaleString("fa-IR")} مورد
            </span>
          </div>
          {data.disputeOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
              اعتراض بازی نیست.
            </div>
          ) : (
            <div className="space-y-2">
              {data.disputeOrders.map((ord) => (
                <Link
                  key={ord.id}
                  href={`/order/${ord.id}`}
                  className="block rounded-2xl border border-rose-200 bg-rose-50/60 p-4 hover:bg-rose-50"
                >
                  <p className="text-sm font-bold text-rose-950">
                    {ord.categoryTitle || "پروژه"}
                  </p>
                  <p className="text-[11px] text-rose-900/80 mt-1 leading-relaxed">
                    {ord.disputeReason || "بدون توضیح"} · باز کردن برای آزادسازی یا عودت
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {canDashboard && (
        <section id="audit" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-slate-500" />
              آخرین اقدامات حسابرسی
            </h2>
            <Link href="/admin/AuditLog" className="text-[11px] font-bold text-indigo-600">
              آرشیو کامل
            </Link>
          </div>
          <AdminAuditStrip rows={data.recentAudits} />
        </section>
      )}

      {canStats && (
        <div className="pt-2">
          <Link
            href="/admin/stats"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            مشاهده آمار و گزارش‌ها ←
          </Link>
        </div>
      )}
    </div>
  );
}

function Kpi({
  href,
  label,
  value,
  tone,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  tone: "rose" | "amber" | "emerald" | "slate" | "indigo" | "purple";
  hint: string;
}) {
  const tones: Record<string, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    purple: "border-purple-200 bg-purple-50 text-purple-900",
  };
  const Comp = href.startsWith("#") ? "a" : Link;
  return (
    <Comp
      href={href}
      className={`rounded-2xl border p-3 shadow-xs ${tones[tone]}`}
    >
      <p className="text-[10px] font-bold opacity-70">{label}</p>
      <p className="text-2xl font-black mt-1 tabular-nums">
        {value.toLocaleString("fa-IR")}
      </p>
      <p className="text-[10px] font-medium opacity-60 mt-0.5">{hint}</p>
    </Comp>
  );
}
