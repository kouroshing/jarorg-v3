import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AreaChart } from "@tremor/react";
import { getSession } from "@/lib/auth/session";
import {
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import { prisma } from "@/lib/prisma";
import { formatJalaliChartDay } from "@/lib/date/jalali";
import { storedValuesFor } from "@/lib/orders/status";
import {
  funnelPercents,
  getSpecialistFunnelSnapshot,
} from "@/lib/admin/specialistFunnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آمار و گزارش‌ها | پنل مدیریت جار",
};

export default async function AdminStatsPage() {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "stats_view")) {
    redirect("/admin");
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    ordersToday,
    orders7d,
    orders30d,
    completed30d,
    cancelled30d,
    activeSpecialists,
    pendingSpecialists,
    jaramoozRevenue,
    planRevenue,
    ordersLast30Days,
    funnel,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count({
      where: {
        status: { in: storedValuesFor("COMPLETED") },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: storedValuesFor("CANCELLED") },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.specialistProfile.count({ where: { status: "ACTIVE" } }),
    prisma.specialistProfile.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.purchase.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    getSpecialistFunnelSnapshot(thirtyDaysAgo),
  ]);

  const rates = funnelPercents(funnel);

  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(formatJalaliChartDay(d), 0);
  }
  for (const o of ordersLast30Days) {
    const key = formatJalaliChartDay(new Date(o.createdAt));
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }
  const chartData = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    "تعداد سفارش‌ها": count,
  }));

  return (
    <main className="px-3 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">آمار و گزارش‌ها</h1>
          <p className="text-xs text-slate-500 mt-1">
            جدا از کار امروز — حجم سفارش، قیف متخصص، درآمد و وضعیت بازار
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          ← بازگشت به کار امروز
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="سفارش امروز" value={ordersToday} />
        <StatCard label="۷ روز اخیر" value={orders7d} />
        <StatCard label="۳۰ روز اخیر" value={orders30d} />
        <StatCard label="تکمیل‌شده ۳۰روز" value={completed30d} />
        <StatCard label="لغوشده ۳۰روز" value={cancelled30d} />
        <StatCard label="متخصص فعال" value={activeSpecialists} />
        <StatCard label="متخصص معوق" value={pendingSpecialists} href="/admin/review" />
        <StatCard
          label="درآمد جارآموز ۳۰روز"
          value={jaramoozRevenue._sum.amount || 0}
          suffix="تومان"
          href="/admin/Purchase"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">قیف متخصص · سلامت تبدیل</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              موجودی وضعیت‌ها + نرخ تبدیل فعال‌ها به اولین اعلام آمادگی و اولین پروژه
              تکمیل‌شده
            </p>
          </div>
          <Link
            href="/admin/review"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            صف بررسی متخصصان
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <MiniStat label="ناقص" value={funnel.incomplete} />
          <MiniStat label="صف بررسی" value={funnel.pendingReview} href="/admin/review" />
          <MiniStat label="فعال" value={funnel.active} />
          <MiniStat label="فعال + KYC" value={funnel.activeKycVerified} />
          <MiniStat label="KYC در صف" value={funnel.activeKycPending} />
          <MiniStat label="بدون KYC / رد" value={funnel.activeKycMissing} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ConversionCard
            title="احراز هویت تاییدشده"
            part={funnel.activeKycVerified}
            whole={funnel.active}
            percent={rates.kycRate}
            hint="از متخصصان فعال"
          />
          <ConversionCard
            title="حداقل یک اعلام آمادگی"
            part={funnel.withAtLeastOneApply}
            whole={funnel.active}
            percent={rates.applyRate}
            hint="از متخصصان فعال"
          />
          <ConversionCard
            title="حداقل یک پروژه تکمیل‌شده"
            part={funnel.withAtLeastOneCompleted}
            whole={funnel.active}
            percent={rates.completeRate}
            hint="از متخصصان فعال"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
          <MiniStat label="پروفایل جدید ۳۰روز" value={funnel.profilesCreated30d} />
          <MiniStat label="اعلام آمادگی ۳۰روز" value={funnel.applies30d} />
          <MiniStat
            label="تکمیل با متخصص ۳۰روز"
            value={funnel.completedWithSpecialist30d}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">توکن ماهانه · تنظیمات زنده</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              نرخ‌ها از PwaSettings خوانده می‌شود؛ برای تغییر اینجا بروید
            </p>
          </div>
          <Link
            href="/admin/PwaSettings"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            ویرایش تنظیمات بازار
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="توکن رایگان / ماه" value={funnel.freeMonthlyTokens} />
          <MiniStat label="هزینه اعلام آمادگی" value={funnel.tokenCostApply} />
          <MiniStat label="هزینه رد کردن پروژه" value={funnel.tokenCostDismiss} />
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">روند ثبت سفارش · ۳۰ روز</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">محور افقی: تاریخ جلالی (ماه/روز)</p>
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            اشتراک موفق ۳۰روز:{" "}
            {(planRevenue._sum.amount || 0).toLocaleString("fa-IR")} تومان
          </p>
        </div>
        {chartData.length > 0 ? (
          <div className="overflow-x-auto pb-1" dir="ltr">
            <div className="min-w-[520px]">
              <AreaChart
                className="h-72 w-full"
                data={chartData}
                index="date"
                categories={["تعداد سفارش‌ها"]}
                colors={["indigo"]}
                showLegend={false}
                showAnimation={true}
                curveType="monotone"
                yAxisWidth={36}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-10">داده‌ای برای نمودار نیست.</p>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  suffix,
  href,
}: {
  label: string;
  value: number;
  suffix?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
        {value.toLocaleString("fa-IR")}
        {suffix ? (
          <span className="text-xs font-medium text-slate-400 mr-1">{suffix}</span>
        ) : null}
      </p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:bg-slate-50"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">{inner}</div>
  );
}

function MiniStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[10px] font-bold text-slate-500 leading-snug">{label}</p>
      <p className="text-lg font-black text-slate-900 mt-1 tabular-nums">
        {value.toLocaleString("fa-IR")}
      </p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 hover:bg-slate-100"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">{inner}</div>
  );
}

function ConversionCard({
  title,
  part,
  whole,
  percent,
  hint,
}: {
  title: string;
  part: number;
  whole: number;
  percent: number | null;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1">
      <p className="text-[11px] font-black text-slate-900">{title}</p>
      <p className="text-xl font-black text-slate-900 tabular-nums">
        {percent != null ? `${percent.toLocaleString("fa-IR")}٪` : "—"}
      </p>
      <p className="text-[10px] text-slate-500">
        {part.toLocaleString("fa-IR")} از {whole.toLocaleString("fa-IR")} · {hint}
      </p>
    </div>
  );
}
