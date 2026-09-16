import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistProfileStudio, {
  type StudioTab,
} from "@/components/specialist/SpecialistProfileStudio";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import ProfileEditPendingBanner from "@/components/specialist/ProfileEditPendingBanner";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";
import { getSpecialistPublicStats } from "@/lib/specialists/publicStats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پروفایل من | پنل متخصص جار",
  description: "ویرایش عکس، بیو، نمونه‌کارها و مبدأ کاری — همان چیزی که کارفرما می‌بیند",
};

type PageProps = {
  searchParams?: { tab?: string };
};

export default async function SpecialistPortfolioPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/join");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "none") {
    redirect("/profile");
  }
  // Incomplete specialists edit portfolio from onboarding, not the app shell.
  if (access.kind === "onboarding" || access.kind === "pending") {
    redirect(access.landingPath);
  }

  const [result, state, profileRow] = await Promise.all([
    getSpecialistCategoriesAndPortfolio(),
    getSpecialistOnboardingStateAction(),
    prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    }),
  ]);

  const stats = profileRow
    ? await getSpecialistPublicStats(session.userId, profileRow.id)
    : {
        completedProjects: 0,
        approvedPortfolio: 0,
        avgRating: null as number | null,
        ratingCount: 0,
      };

  const initialTab: StudioTab =
    searchParams?.tab === "work" ? "work" : "portfolio";

  return (
    <SpecialistAppShell active="portfolio" phone={session.phone}>
      <div className="space-y-4">
        <ProfileEditPendingBanner
          status={state.profileEditStatus}
          note={state.profileEditNote}
        />
        <SpecialistProfileStudio
          userId={session.userId}
          initialTab={initialTab}
          displayName={state.displayName ?? null}
          avatarUrl={state.avatarUrl ?? null}
          bio={state.bio ?? null}
          city={state.city ?? null}
          equipmentSummary={state.equipmentSummary ?? null}
          isMobileGrapher={Boolean(state.isMobileGrapher)}
          studioName={state.studioName ?? null}
          phoneDisplay={state.phoneDisplay || session.phone || ""}
          profileEditStatus={state.profileEditStatus}
          stats={stats}
          selectedCategories={result.selectedCategories || []}
          portfolioItems={result.portfolioItems || []}
          details={{
            city: state.city ?? null,
            workArea: state.workArea ?? null,
            equipmentSummary: state.equipmentSummary ?? null,
            baseLat: state.baseLat ?? null,
            baseLng: state.baseLng ?? null,
            baseAddress: state.baseAddress ?? null,
            hasStudio: Boolean(state.hasStudio),
            isMobileGrapher: Boolean(state.isMobileGrapher),
            hasEligiblePortfolio: Boolean(state.hasEligiblePortfolio),
            profileEditStatus: state.profileEditStatus,
            profileEditNote: state.profileEditNote,
          }}
        />
      </div>
    </SpecialistAppShell>
  );
}
