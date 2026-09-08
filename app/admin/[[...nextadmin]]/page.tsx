import { getNextAdminProps } from "@premieroctet/next-admin/appRouter";
import { NextAdmin } from "@premieroctet/next-admin/adapters/next";
import { prisma } from "@/lib/prisma";
import { options } from "@/lib/admin/options";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import SpecialistPortfolioReviewWidget from "@/components/admin/SpecialistPortfolioReviewWidget";
import AdminDashboard, { DashboardData } from "@/components/admin/AdminDashboard";
import AdminBrandHeader from "@/components/admin/AdminBrandHeader";
import { persianTranslations } from "@/lib/admin/translations";
import {
  NEEDS_ADMIN_ACTION_STATUSES,
  storedValuesFor,
} from "@/lib/orders/status";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: { nextadmin?: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  if (!isAdminSession(session)) {
    redirect("/login?redirect=/admin");
  }

  const props = await getNextAdminProps({
    params: params.nextadmin,
    searchParams,
    basePath: "/admin",
    apiBasePath: "/api/admin",
    prisma,
    options,
  });

  const isDashboardRoute = !params.nextadmin || params.nextadmin.length === 0;
  let dashboardElement: React.ReactNode = undefined;

  if (isDashboardRoute) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      ordersNeedingActionCount,
      ordersTodayCount,
      pendingPortfolioCount,
      revenueResult,
      ordersLast30Days,
      recentOrdersRaw,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          status: { in: storedValuesFor(...NEEDS_ADMIN_ACTION_STATUSES) },
          OR: [
            { createdAt: { lt: twentyFourHoursAgo } },
            { selectedSpecialistId: null },
          ],
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.portfolioItem.count({
        where: {
          reviewStatus: "PENDING",
        },
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: {
          status: "SUCCESS",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.order.findMany({
        where: {
          status: { in: storedValuesFor(...NEEDS_ADMIN_ACTION_STATUSES) },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          categoryTitle: true,
          status: true,
          totalEstimatedPrice: true,
          createdAt: true,
          contactName: true,
          contactPhone: true,
        },
      }),
    ]);

    // Group orders by day for 30-day trend chart
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyMap.set(key, 0);
    }

    ordersLast30Days.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    });

    const chartData = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      "تعداد سفارش‌ها": count,
    }));

    const kpiData: DashboardData = {
      ordersNeedingActionCount,
      ordersTodayCount,
      pendingPortfolioCount,
      jaramoozMonthlyRevenue: revenueResult._sum.amount || 0,
      chartData,
      recentPendingOrders: recentOrdersRaw.map((o) => ({
        id: o.id,
        categoryTitle: o.categoryTitle,
        status: o.status,
        totalEstimatedPrice: o.totalEstimatedPrice,
        createdAt: o.createdAt.toISOString(),
        contactName: o.contactName,
        contactPhone: o.contactPhone,
      })),
    };

    dashboardElement = <AdminDashboard data={kpiData} />;
  }

  return (
    <NextAdmin
      {...props}
      title={<AdminBrandHeader />}
      translations={persianTranslations}
      dashboard={dashboardElement}
      customInputs={{
        status: <OrderStatusSelect />,
        portfolioReview: <SpecialistPortfolioReviewWidget />,
      }}
    />
  );
}

