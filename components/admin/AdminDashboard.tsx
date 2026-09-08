"use client";

import React from "react";
import Link from "next/link";
import { AreaChart, Badge } from "@tremor/react";
import {
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  PhotoIcon,
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export interface DashboardData {
  ordersNeedingActionCount: number;
  ordersTodayCount: number;
  pendingPortfolioCount: number;
  jaramoozMonthlyRevenue: number;
  chartData: Array<{
    date: string;
    "تعداد سفارش‌ها": number;
  }>;
  recentPendingOrders: Array<{
    id: string;
    categoryTitle: string | null;
    status: string;
    totalEstimatedPrice: number;
    createdAt: string;
    contactName: string | null;
    contactPhone: string | null;
  }>;
}

export default function AdminDashboard({ data }: { data: DashboardData }) {
  const {
    ordersNeedingActionCount,
    ordersTodayCount,
    pendingPortfolioCount,
    jaramoozMonthlyRevenue,
    chartData,
    recentPendingOrders,
  } = data;

  return (
    <div className="w-full max-w-full space-y-6 px-3 sm:px-6 lg:px-8 py-5 pb-16 overflow-hidden text-right">
      {/* Header Bar */}
      <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
            <span>مرکز فرماندهی و داشبورد جار</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              زنده و برخط
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            خلاصه وضعیت سفارش‌ها، بررسی‌های معوق و شاخص‌های کلیدی پلتفرم
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/Order"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <span>سفارش‌ها</span>
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/PortfolioItem"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <span>بررسی نمونه‌کارها</span>
            <PhotoIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Metric Cards: 1 Hero Card + 3 Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full min-w-0">
        {/* HERO CARD: Orders Needing Action */}
        <div className="lg:col-span-1 md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white p-4 sm:p-6 shadow-md flex flex-col justify-between w-full min-w-0">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-100 flex items-center gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-300 animate-pulse" />
                اولویت بحرانی
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                تاخیر بالای ۲۴ ساعت یا بدون متخصص
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-rose-50 mt-2">
              سفارش‌های در انتظار اقدام
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">
                {ordersNeedingActionCount.toLocaleString("fa-IR")}
              </span>
              <span className="text-sm font-medium text-rose-100">سفارش معوق</span>
            </div>
            <p className="text-xs text-rose-100/90 mt-2 leading-relaxed">
              سفارش‌هایی که در وضعیت جستجو یا با پیشنهاد قرار دارند و نیازمند پیگیری یا انتساب قطعی هستند.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/15">
            <Link
              href="/admin/Order"
              className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 rounded-xl transition shadow-xs"
            >
              <span>مشاهده و تعیین تکلیف سفارش‌ها</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* SECONDARY CARD 1: Orders Today */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col justify-between w-full min-w-0">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سفارش‌های امروز</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <CalendarDaysIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {ordersTodayCount.toLocaleString("fa-IR")}
              </span>
              <span className="text-xs font-bold text-slate-400">ثبت‌شده از بامداد</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              پروژه‌ها و فرم‌های جدید عکاسی و فیلم‌برداری ثبت‌شده توسط مشتریان
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <ClockIcon className="w-3.5 h-3.5" />
              ورودی ۲۴ ساعت گذشته
            </span>
          </div>
        </div>

        {/* SECONDARY CARD 2: Pending Portfolio Reviews */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">بررسی نمونه‌کارها</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                <PhotoIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {pendingPortfolioCount.toLocaleString("fa-IR")}
              </span>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                در انتظار بررسی
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              نمونه‌کارهای ارسالی عکاسان که برای انتشار در پروفایل نیازمند تایید یا رد کیفی هستند
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/admin/PortfolioItem"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <span>ورود به صف تایید آثار</span>
              <span>←</span>
            </Link>
          </div>
        </div>

        {/* SECONDARY CARD 3: Monthly Jaramooz Revenue */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">درآمد ماهانه آکادمی</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <AcademicCapIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {jaramoozMonthlyRevenue.toLocaleString("fa-IR")}
              </span>
              <span className="text-xs font-bold text-amber-600">تومان</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              مجموع مبالغ واریزشده موفق بابت فروش دوره‌های آموزشی پلتفرم جارآموز در ۳۰ روز اخیر
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/admin/Purchase"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              <span>گزارش تراکنش‌های خرید</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 30-Day Orders Trend Chart (Tremor AreaChart) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              روند ثبت سفارش‌های پلتفرم در ۳۰ روز اخیر
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              توزیع زمانی پروژه‌های ثبت‌شده توسط مشتریان به تفکیک روز
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              تعداد سفارش‌ها
            </span>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="mt-4 pt-2 w-full max-w-full overflow-x-auto min-w-0 pb-2" dir="ltr">
            <div className="min-w-[500px] sm:min-w-full">
              <AreaChart
                className="h-72 w-full"
                data={chartData}
                index="date"
                categories={["تعداد سفارش‌ها"]}
                colors={["indigo"]}
                showLegend={false}
                showGridLines={true}
                showAnimation={true}
                curveType="monotone"
                yAxisWidth={35}
              />
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            داده‌ای برای نمایش در ۳۰ روز اخیر یافت نشد.
          </div>
        )}
      </div>

      {/* Recent Orders Table Snapshot */}
      {recentPendingOrders.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                آخرین سفارش‌های نیازمند اقدام فوری
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {recentPendingOrders.length.toLocaleString("fa-IR")} مورد
              </span>
            </div>
            <Link
              href="/admin/Order"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              مشاهده جدول کامل
            </Link>
          </div>
          <div className="w-full max-w-full overflow-x-auto">
            <table className="min-w-[620px] w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">شناسه سفارش</th>
                  <th className="py-2.5 px-3">شاخه‌ی خدمات</th>
                  <th className="py-2.5 px-3">وضعیت فعلی</th>
                  <th className="py-2.5 px-3">مبلغ برآورد (تومان)</th>
                  <th className="py-2.5 px-3">کاربر / تماس</th>
                  <th className="py-2.5 px-3">تاریخ ثبت</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {recentPendingOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {ord.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white font-bold">
                      {ord.categoryTitle || "پروژه عکاسی"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {ord.totalEstimatedPrice.toLocaleString("fa-IR")} تومان
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {ord.contactName || "—"} ({ord.contactPhone || "—"})
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(ord.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Link
                        href={`/admin/Order/${ord.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-colors"
                      >
                        <span>تعیین متخصص / ویرایش</span>
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
