import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { parseProjectStatus } from "@/lib/db/enums";
import type { ProfileProject, ProfileUser } from "@/lib/profile/types";
import { ProfileDashboard } from "./ProfileDashboard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/profile");
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
  let projects: ProfileProject[] = [];

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

    projects = rows.map((p) => ({
      id: p.id,
      createdAt: p.createdAt.toISOString(),
      serviceType: p.serviceType,
      brief: p.brief,
      contactName: p.contactName,
      status: parseProjectStatus(p.status),
    }));
  } catch {
    // Render empty state if DB is unavailable
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

  return <ProfileDashboard user={profileUser} projects={projects} />;
}
