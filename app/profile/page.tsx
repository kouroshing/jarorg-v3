import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { isSpecialistRole } from "@/lib/auth/roles";
import type { ProfileUser } from "@/lib/profile/types";
import { ProfileDashboard } from "./ProfileDashboard";
import { SpecialistDashboard } from "./SpecialistDashboard";

export const dynamic = "force-dynamic";

async function getProjectThumbnails(folderId: string | null): Promise<string[]> {
  return [];
}

const MOCK_PROJECTS = [
  {
    id: "mock-active-1",
    createdAt: new Date().toISOString(),
    serviceType: "عکاسی پرتره",
    serviceDetails: "آفیش عکاسی پرتره - فردا ساعت ۱۶:۰۰",
    brief: "تهران، جردن، خیابان گلفام، پلاک ۴",
    contactName: "محسن عصار",
    status: "PENDING",
    googleDriveFolderId: null,
    budget: "۳,۵۰۰,۰۰۰",
    city: "تهران، جردن",
    preferredCallTime: "فردا ساعت ۱۶:۰۰",
    thumbnails: [],
    isMock: true,
    expert: {
      id: "mock-expert-1",
      name: "محسن عصار",
      imageUrl: "/images/kourosh.jpg",
    }
  },
  {
    id: "mock-history-1",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    serviceType: "عکاسی آتلیه‌ای",
    serviceDetails: "تحویل داده شده - تیر ۱۴۰۵",
    brief: "تحویل با موفقیت انجام شد",
    contactName: "امیر آرتی",
    status: "delivered",
    googleDriveFolderId: "mock-folder-1",
    budget: "۵,۲۰۰,۰۰۰",
    city: "تهران",
    preferredCallTime: null,
    thumbnails: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg"
    ],
    isMock: true,
    expert: {
      id: "mock-expert-2",
      name: "امیر آرتی",
      imageUrl: "/images/kourosh.jpg",
    }
  },
  {
    id: "mock-history-2",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    serviceType: "عکاسی فضای باز",
    serviceDetails: "تکمیل شده - خرداد ۱۴۰۵",
    brief: "تحویل به موقع فایل‌ها",
    contactName: "استودیو یونیک",
    status: "delivered",
    googleDriveFolderId: "mock-folder-2",
    budget: "۱,۸۰۰,۰۰۰",
    city: "تهران",
    preferredCallTime: null,
    thumbnails: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg"
    ],
    isMock: true,
    expert: {
      id: "mock-expert-3",
      name: "استودیو یونیک",
      imageUrl: "/images/kourosh.jpg",
    }
  }
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/login?redirect=/profile"));
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
  let projects: any[] = [];
  let serializedPurchases: any[] = [];

  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const rows = await prisma.project.findMany({
      where: {
        OR: [{ userId: session.userId }, { contactPhone: session.phone }],
      },
      include: {
        expert: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Resolve thumbnails in parallel for completed/delivered projects
    projects = await Promise.all(
      rows.map(async (p) => {
        const isCompleted = p.status === "COMPLETED" || p.status === "delivered" || !!p.googleDriveFolderId;
        const thumbnails = isCompleted ? await getProjectThumbnails(p.googleDriveFolderId) : [];

        return {
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          serviceType: p.serviceType,
          serviceDetails: p.serviceDetails,
          brief: p.brief,
          contactName: p.contactName,
          status: p.status, // Pass original status
          googleDriveFolderId: p.googleDriveFolderId,
          budget: p.budget || "توافقی",
          city: p.city || "تهران",
          preferredCallTime: p.preferredCallTime,
          thumbnails,
          expert: p.expert
            ? {
                id: p.expert.id,
                name: p.expert.name,
                imageUrl: p.expert.imageUrl,
              }
            : null,
        };
      })
    );

    // Fetch new marketplace orders submitted via /order
    const orderRows = await prisma.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          ...(session.phone ? [{ contactPhone: session.phone }] : []),
        ],
      },
      include: {
        selectedSpecialist: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedOrders = orderRows.map((o) => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      serviceType: o.categoryTitle || o.categorySlug,
      serviceDetails: `آفیش ${o.categoryTitle || o.categorySlug} (${o.durationHours} ساعت)`,
      brief: o.projectDescription || `رزرو آفیش برای ${o.bookingDate} (${o.timeSlot})`,
      contactName: o.contactName || "شما",
      status: o.status === "COMPLETED" ? "delivered" : o.status,
      googleDriveFolderId: null,
      budget: o.totalEstimatedPrice.toString(),
      city: o.districtOrCity || "تهران",
      preferredCallTime: `${o.bookingDate} (${o.timeSlot})`,
      thumbnails: [],
      orderUrl: `/order/${o.id}`,
      expert: o.selectedSpecialist
        ? {
            id: o.selectedSpecialist.id,
            name: o.selectedSpecialist.displayName || "متخصص انتخابی شما",
            imageUrl: "/images/kourosh.jpg",
          }
        : null,
    }));

    if (mappedOrders.length > 0 || projects.length > 0) {
      projects = [...mappedOrders, ...projects];
    } else {
      projects = MOCK_PROJECTS;
    }

    // Fetch successful purchases for the customer's phone number
    const purchases = await prisma.galleryPurchase.findMany({
      where: {
        clientPhone: session.phone,
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const successOrders = await prisma.galleryOrder.findMany({
      where: {
        phone: session.phone,
        status: "SUCCESS",
      },
      select: {
        projectId: true,
        amount: true,
        authority: true,
      },
    });

    serializedPurchases = purchases.map((pur) => {
      const matchingOrder = successOrders.find((o) => o.projectId === pur.projectId);
      return {
        id: pur.id,
        createdAt: pur.createdAt.toISOString(),
        projectName: pur.project.title,
        photoCount: pur.purchasedPhotoIds.split(",").filter(Boolean).length,
        amount: matchingOrder?.amount ?? 0,
        authority: matchingOrder?.authority ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching profile dashboard details:", error);
  }

  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
      }).format(user.createdAt)
    : "—";

  const profileUser: ProfileUser = {
    phoneDisplay: phoneToLocalDisplay(session.phone),
    displayName: user?.displayName ?? null,
    memberSince,
  };

  // The session role is only "user" or "admin" — a specialist is identified by
  // the database role. The previous check also compared session.role against
  // "specialist", which can never match, and hard-coded one phone number.
  const isSpecialistUser = isSpecialistRole(user?.role);

  const forceCustomer = searchParams?.role === "customer";
  const isSpecialist = isSpecialistUser && !forceCustomer;

  if (isSpecialist) {
    return <SpecialistDashboard user={profileUser} projects={projects} isSpecialistUser={isSpecialistUser} />;
  }

  return (
    <ProfileDashboard
      user={profileUser}
      projects={projects}
      purchases={serializedPurchases}
      isSpecialistUser={isSpecialistUser}
    />
  );
}
