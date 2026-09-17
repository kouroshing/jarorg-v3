import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { JarLocationSubmitForm } from "@/components/tools/JarLocationExplorer";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistAccess } from "@/lib/specialists/access";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";
import { prisma } from "@/lib/prisma";
import { parseLocationCategory } from "@/lib/locations/photoLocation";
import { matchServiceCity, SERVICE_CITIES } from "@/lib/geo/serviceCities";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت لوکیشن | جار لوکیشن",
  description:
    "لوکیشن عکاسی یا فیلمبرداری خود را در جار لوکیشن ثبت کنید؛ موقعیت روی نقشه، دسته، عکس و جزئیات مجوز را بفرستید تا پس از تایید در کاتالوگ منتشر شود.",
  robots: { index: false, follow: false },
};

export default async function NewJarLocationPage({
  searchParams,
}: {
  searchParams?: { category?: string; city?: string; for?: string };
}) {
  const nextParams = new URLSearchParams();
  if (searchParams?.category) nextParams.set("category", searchParams.category);
  if (searchParams?.city) nextParams.set("city", searchParams.city);
  if (searchParams?.for) nextParams.set("for", searchParams.for);
  const nextQuery = nextParams.toString();
  const nextPath = nextQuery
    ? `/tools/locations/new?${nextQuery}`
    : "/tools/locations/new";
  const session = await getSession();
  if (!session?.userId) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  let portfolioImages: {
    id: string;
    fileUrl: string;
    title: string | null;
    categorySlug: string;
    mediaType: "IMAGE" | "VIDEO";
  }[] = [];
  let selfSpecialist: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null = null;

  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "active" || access.kind === "onboarding" || access.kind === "pending") {
    const [portfolio, me] = await Promise.all([
      getSpecialistCategoriesAndPortfolio(),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          displayName: true,
          specialistProfile: { select: { avatarUrl: true } },
        },
      }),
    ]);
    if (me) {
      selfSpecialist = {
        id: me.id,
        name: formatPublicSpecialistName(me.displayName),
        avatarUrl: me.specialistProfile?.avatarUrl || null,
      };
    }
    if (portfolio.success && portfolio.portfolioItems) {
      portfolioImages = portfolio.portfolioItems
        .filter(
          (item) =>
            (item.mediaType === "IMAGE" || item.mediaType === "VIDEO") &&
            (item.reviewStatus === "APPROVED" || item.reviewStatus === "PENDING")
        )
        .map((item) => ({
          id: item.id,
          fileUrl: item.fileUrl,
          title: item.title,
          categorySlug: item.categorySlug,
          mediaType: item.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
        }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-0 py-6 pb-24 animate-fade-up">
      <div className="mb-4">
        <Link
          href="/tools/locations"
          className="text-[11px] font-bold text-jar-muted hover:text-jar-primary"
        >
          ← جار لوکیشن
        </Link>
      </div>
      <JarLocationSubmitForm
        portfolioImages={portfolioImages}
        initialCategory={
          searchParams?.category
            ? parseLocationCategory(searchParams.category)
            : undefined
        }
        initialCity={
          matchServiceCity(searchParams?.city) ||
          ((SERVICE_CITIES as readonly string[]).includes(searchParams?.city || "")
            ? searchParams?.city
            : undefined)
        }
        initialProjectSlug={
          searchParams?.for && CATEGORIES_BY_SLUG[searchParams.for]
            ? searchParams.for
            : undefined
        }
        selfSpecialist={selfSpecialist}
      />
    </div>
  );
}
