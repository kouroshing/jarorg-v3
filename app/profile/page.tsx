import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import type { ProfileUser } from "@/lib/profile/types";
import { ProfileDashboard } from "./ProfileDashboard";
import ProfileAppShell, {
  type SpecialistGate,
} from "@/components/profile/ProfileAppShell";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";

export const dynamic = "force-dynamic";

async function getProjectThumbnails(_folderId: string | null): Promise<string[]> {
  return [];
}

function buildSpecialistGate(
  access: Awaited<ReturnType<typeof getSpecialistAccess>>
): SpecialistGate {
  if (access.kind === "active") {
    return { state: "open", href: "/specialist/projects" };
  }
  if (access.kind === "onboarding" || access.kind === "pending") {
    return { state: "open", href: access.landingPath };
  }
  // Pure customer: locked switch → start specialist verification / onboarding
  return { state: "locked", href: "/specialist/onboarding/profile" };
}

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

  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const rows = await prisma.project.findMany({
      where: {
        OR: [{ userId: session.userId }, { contactPhone: session.phone }],
      },
      orderBy: { createdAt: "desc" },
    });

    projects = await Promise.all(
      rows.map(async (p) => {
        const isCompleted =
          p.status === "COMPLETED" || p.status === "delivered" || !!p.googleDriveFolderId;
        const thumbnails = isCompleted
          ? await getProjectThumbnails(p.googleDriveFolderId)
          : [];

        return {
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          serviceType: p.serviceType,
          serviceDetails: p.serviceDetails,
          brief: p.brief,
          contactName: p.contactName,
          status: p.status,
          googleDriveFolderId: p.googleDriveFolderId,
          budget: p.budget || "توافقی",
          city: p.city || "تهران",
          preferredCallTime: p.preferredCallTime,
          thumbnails,
          expert: null,
        };
      })
    );

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
            name: formatPublicSpecialistName(
              o.selectedSpecialist.displayName,
              "متخصص انتخابی شما"
            ),
            imageUrl: null as string | null,
            profileHref: `/s/${o.selectedSpecialist.id}`,
          }
        : null,
    }));

    projects = [...mappedOrders, ...projects];
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

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  const forceCustomer = searchParams?.role === "customer";
  const specialistGate = buildSpecialistGate(access);

  // Active specialists default into specialist panel; ?role=customer keeps customer view.
  if (access.preferSpecialistHome && !forceCustomer) {
    redirect(access.landingPath || "/specialist/projects");
  }

  return (
    <ProfileAppShell
      panel="customer"
      phone={session.phone}
      displayName={profileUser.displayName}
      specialistGate={specialistGate}
    >
      <ProfileDashboard
        user={profileUser}
        projects={projects}
        isSpecialistUser={access.kind === "active"}
        specialistContinueHref={
          access.kind === "onboarding" || access.kind === "pending"
            ? access.landingPath
            : access.kind === "active"
              ? "/specialist/projects"
              : null
        }
        showPanelSwitcherHint={!forceCustomer && access.kind === "none"}
      />
    </ProfileAppShell>
  );
}
