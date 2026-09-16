import { getNextAdminProps } from "@premieroctet/next-admin/appRouter";
import { NextAdmin } from "@premieroctet/next-admin/adapters/next";
import { prisma } from "@/lib/prisma";
import { options } from "@/lib/admin/options";
import { getSession } from "@/lib/auth/session";
import {
  canAccessNextAdminModel,
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import type { AdminPermission } from "@/lib/auth/adminPermissions";
import { redirect } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import SpecialistPortfolioReviewWidget from "@/components/admin/SpecialistPortfolioReviewWidget";
import OrderApplicantsAdminWidget from "@/components/admin/OrderApplicantsAdminWidget";
import AdminDashboard, { DashboardData } from "@/components/admin/AdminDashboard";
import AdminBrandHeader from "@/components/admin/AdminBrandHeader";
import AdminPortfolioCuratePage from "@/components/admin/AdminPortfolioCuratePage";
import { getAdminPortfolioGalleryItems } from "@/lib/admin/portfolioGalleryData";
import { persianTranslations } from "@/lib/admin/translations";
import { storedValuesFor } from "@/lib/orders/status";
import { parsePublishFlags } from "@/lib/orders/publishGate";
import type { NextAdminOptions } from "@premieroctet/next-admin";

function filterOptionsForAccess(
  base: NextAdminOptions,
  canModel: (model: string) => boolean
): NextAdminOptions {
  const groups = (base.sidebar?.groups || [])
    .map((g) => ({
      ...g,
      models: (g.models || []).filter((m) => canModel(String(m))),
    }))
    .filter((g) => g.models.length > 0);

  return {
    ...base,
    sidebar: { ...base.sidebar, groups },
  };
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: { nextadmin?: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access) {
    redirect("/login?redirect=/admin");
  }

  const segments = params.nextadmin || [];
  const modelSegment = segments[0];
  if (modelSegment && !canAccessNextAdminModel(access, modelSegment)) {
    redirect("/admin");
  }

  // Replace the raw PortfolioItem table with the curation gallery.
  // Keep /admin/PortfolioItem/[id] edit on NextAdmin.
  const isPortfolioList =
    segments.length === 1 &&
    String(segments[0]).toLowerCase() === "portfolioitem";
  if (isPortfolioList) {
    if (!hasAdminPermission(access, "specialists_review")) {
      redirect("/admin");
    }
    const portfolioItems = await getAdminPortfolioGalleryItems();
    return <AdminPortfolioCuratePage items={portfolioItems} />;
  }

  const scopedOptions = filterOptionsForAccess(options, (model) =>
    canAccessNextAdminModel(access, model)
  );

  const props = await getNextAdminProps({
    params: params.nextadmin,
    searchParams,
    basePath: "/admin",
    apiBasePath: "/api/admin",
    prisma,
    options: scopedOptions,
  });

  const isDashboardRoute = segments.length === 0;
  let dashboardElement: React.ReactNode = undefined;

  if (isDashboardRoute) {
    if (!hasAdminPermission(access, "dashboard")) {
      // Land on first allowed custom page
      if (hasAdminPermission(access, "specialists_review")) redirect("/admin/review");
      if (hasAdminPermission(access, "messages_send")) redirect("/admin/message");
      if (hasAdminPermission(access, "finance_manage")) redirect("/admin/WithdrawalRequest");
      if (hasAdminPermission(access, "stats_view")) redirect("/admin/stats");
      if (hasAdminPermission(access, "admins_manage")) redirect("/admin/staff");
      redirect("/");
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const canOrders = hasAdminPermission(access, "orders_manage");
    const canReview = hasAdminPermission(access, "specialists_review");
    const canFinance = hasAdminPermission(access, "finance_manage");

    const [
      pendingReviewCount,
      matchingStuckCount,
      awaitingPaymentCount,
      openDisputeCount,
      pendingPortfolioCount,
      pendingSpecialistCount,
      pendingWithdrawalCount,
      triageRaw,
      matchingRaw,
      paymentRaw,
      disputeRaw,
      withdrawalsRaw,
      auditsRaw,
      pendingLocationsRaw,
      noMatchRaw,
    ] = await Promise.all([
      canOrders
        ? prisma.order.count({
            where: {
              status: { in: storedValuesFor("PENDING_REVIEW", "NEEDS_CLIENT_EDIT") },
            },
          })
        : Promise.resolve(0),
      canOrders
        ? prisma.order.count({
            where: {
              status: { in: storedValuesFor("MATCHING", "HAS_APPLICANTS") },
              OR: [
                { createdAt: { lt: fortyEightHoursAgo } },
                { interests: { none: {} } },
              ],
            },
          })
        : Promise.resolve(0),
      canOrders
        ? prisma.order.count({
            where: { status: { in: storedValuesFor("AWAITING_PAYMENT") } },
          })
        : Promise.resolve(0),
      canOrders
        ? prisma.order.count({
            where: {
              disputedAt: { not: null },
              disputeResolvedAt: null,
              settledAt: null,
            },
          })
        : Promise.resolve(0),
      canReview
        ? prisma.portfolioItem.count({ where: { reviewStatus: "PENDING" } })
        : Promise.resolve(0),
      canReview
        ? prisma.specialistProfile.count({ where: { status: "PENDING_REVIEW" } })
        : Promise.resolve(0),
      canFinance
        ? prisma.withdrawalRequest.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
      canOrders
        ? prisma.order.findMany({
            where: {
              status: { in: storedValuesFor("PENDING_REVIEW", "NEEDS_CLIENT_EDIT") },
            },
            orderBy: { createdAt: "asc" },
            take: 12,
            select: {
              id: true,
              categoryTitle: true,
              status: true,
              totalEstimatedPrice: true,
              createdAt: true,
              contactName: true,
              contactPhone: true,
              publishFlags: true,
              _count: { select: { interests: true } },
            },
          })
        : Promise.resolve([]),
      canOrders
        ? prisma.order.findMany({
            where: {
              status: { in: storedValuesFor("MATCHING", "HAS_APPLICANTS") },
              OR: [
                { createdAt: { lt: fortyEightHoursAgo } },
                { interests: { none: {} } },
                { noApplicantsAt: { not: null } },
                { clientRemindedAt: { not: null } },
              ],
            },
            orderBy: [{ noApplicantsAt: "asc" }, { clientRemindedAt: "asc" }, { createdAt: "asc" }],
            take: 12,
            select: {
              id: true,
              categoryTitle: true,
              status: true,
              totalEstimatedPrice: true,
              createdAt: true,
              contactName: true,
              contactPhone: true,
              noApplicantsAt: true,
              clientRemindedAt: true,
              _count: { select: { interests: true } },
            },
          })
        : Promise.resolve([]),
      canOrders
        ? prisma.order.findMany({
            where: { status: { in: storedValuesFor("AWAITING_PAYMENT") } },
            orderBy: { createdAt: "asc" },
            take: 10,
            select: {
              id: true,
              categoryTitle: true,
              status: true,
              totalEstimatedPrice: true,
              createdAt: true,
              contactName: true,
              contactPhone: true,
              _count: { select: { interests: true } },
            },
          })
        : Promise.resolve([]),
      canOrders
        ? prisma.order.findMany({
            where: {
              disputedAt: { not: null },
              disputeResolvedAt: null,
              settledAt: null,
            },
            orderBy: { disputedAt: "asc" },
            take: 8,
            select: {
              id: true,
              categoryTitle: true,
              status: true,
              totalEstimatedPrice: true,
              createdAt: true,
              contactName: true,
              contactPhone: true,
              disputeReason: true,
              _count: { select: { interests: true, deliverables: true, messages: true } },
            },
          })
        : Promise.resolve([]),
      canFinance
        ? prisma.withdrawalRequest.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
            take: 10,
            include: {
              user: { select: { displayName: true, phone: true } },
            },
          })
        : Promise.resolve([]),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          targetModel: true,
          targetId: true,
          note: true,
          createdAt: true,
          actorId: true,
        },
      }),
      canOrders
        ? prisma.photoLocation.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
            take: 20,
            include: { submittedBy: { select: { phone: true } } },
          }).catch(() => [])
        : Promise.resolve([]),
      canOrders
        ? prisma.order.findMany({
            where: { status: { in: storedValuesFor("NO_MATCH") } },
            orderBy: { noMatchAt: "desc" },
            take: 20,
            select: {
              id: true,
              categoryTitle: true,
              status: true,
              totalEstimatedPrice: true,
              createdAt: true,
              contactName: true,
              contactPhone: true,
              noMatchAt: true,
              _count: { select: { interests: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const actorIds = [
      ...new Set(
        auditsRaw.map((a) => a.actorId).filter((id): id is string => Boolean(id))
      ),
    ];
    const actors =
      actorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, displayName: true, phone: true },
          })
        : [];
    const actorMap = new Map(
      actors.map((u) => [
        u.id,
        u.displayName || u.phone || u.id.slice(0, 8),
      ])
    );

    const mapOrder = (o: {
      id: string;
      categoryTitle: string | null;
      status: string;
      totalEstimatedPrice: number;
      createdAt: Date;
      contactName: string | null;
      contactPhone: string | null;
      _count: { interests: number; deliverables?: number; messages?: number };
      publishFlags?: string | null;
      disputeReason?: string | null;
      noApplicantsAt?: Date | null;
      clientRemindedAt?: Date | null;
      noMatchAt?: Date | null;
    }) => ({
      id: o.id,
      categoryTitle: o.categoryTitle,
      status: o.status,
      totalEstimatedPrice: o.totalEstimatedPrice,
      createdAt: o.createdAt.toISOString(),
      contactName: o.contactName,
      contactPhone: o.contactPhone,
      applicantCount: o._count.interests,
      deliverableCount: o._count.deliverables ?? 0,
      messageCount: o._count.messages ?? 0,
      noApplicantsAt: o.noApplicantsAt?.toISOString() ?? null,
      clientRemindedAt: o.clientRemindedAt?.toISOString() ?? null,
      noMatchAt: o.noMatchAt?.toISOString() ?? null,
      publishFlags: parsePublishFlags(o.publishFlags),
      disputeReason: o.disputeReason ?? null,
    });

    const permissions = Array.from(access.permissions) as AdminPermission[];

    const kpiData: DashboardData = {
      pendingReviewCount,
      matchingStuckCount,
      awaitingPaymentCount,
      openDisputeCount,
      pendingPortfolioCount,
      pendingSpecialistCount,
      pendingWithdrawalCount,
      pendingLocationCount: pendingLocationsRaw.length,
      triageOrders: triageRaw.map(mapOrder),
      matchingOrders: matchingRaw.map(mapOrder),
      paymentOrders: paymentRaw.map(mapOrder),
      disputeOrders: disputeRaw.map(mapOrder),
      noMatchOrders: noMatchRaw.map(mapOrder),
      pendingLocations: pendingLocationsRaw.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        city: r.city,
        district: r.district,
        address: r.address,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        contactPhone: r.contactPhone,
        submittedByPhone: r.submittedBy?.phone ?? null,
        lat: r.lat,
        lng: r.lng,
        needsPermit: r.needsPermit,
        proCameraAllowed: r.proCameraAllowed,
        phoneCameraAllowed: r.phoneCameraAllowed,
        hasEntranceFee: r.hasEntranceFee,
        hasChangingRoom: r.hasChangingRoom,
        hasParking: r.hasParking,
        securityLevel: (r.securityLevel === "LOW" || r.securityLevel === "HIGH"
          ? r.securityLevel
          : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
        coverImageUrl: r.coverImageUrl || (() => {
          try {
            const arr = r.imageUrls ? JSON.parse(r.imageUrls) : [];
            return Array.isArray(arr) && typeof arr[0] === "string" ? arr[0] : null;
          } catch {
            return null;
          }
        })(),
        imageUrls: (() => {
          try {
            const arr = r.imageUrls ? JSON.parse(r.imageUrls) : [];
            return Array.isArray(arr)
              ? arr.filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0)
              : [];
          } catch {
            return [];
          }
        })(),
      })),
      withdrawals: withdrawalsRaw.map((w) => ({
        id: w.id,
        amount: w.amount,
        shabaNumber: w.shabaNumber,
        createdAt: w.createdAt.toISOString(),
        displayName: w.user.displayName,
        phone: w.user.phone,
      })),
      recentAudits: auditsRaw.map((a) => ({
        id: a.id,
        action: a.action,
        targetModel: a.targetModel,
        targetId: a.targetId,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
        actorLabel: a.actorId ? actorMap.get(a.actorId) || null : null,
      })),
    };

    dashboardElement = (
      <AdminDashboard data={kpiData} permissions={permissions} isSuper={access.isSuper} />
    );
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
        orderApplicants: <OrderApplicantsAdminWidget />,
      }}
    />
  );
}
