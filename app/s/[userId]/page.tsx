import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Camera, CheckCircle2, Smartphone, Film } from "lucide-react";
import { prisma } from "@/lib/prisma";
import EquipmentTagsDisplay from "@/components/specialist/EquipmentTagsDisplay";
import SpecialistPublicStatsRow from "@/components/specialist/SpecialistPublicStatsRow";
import { parseEquipmentTags } from "@/lib/equipment/catalog";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";
import { getSpecialistPublicStats } from "@/lib/specialists/publicStats";
import { getCategoryTitle } from "@/lib/categories";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { userId: string };
  searchParams?: { category?: string };
}

type PortfolioItemRow = {
  id: string;
  fileUrl: string;
  title: string | null;
  mediaType: string;
  categorySlug: string;
};

function groupPortfolioByCategory(
  items: PortfolioItemRow[],
  focusCategory?: string | null
): { slug: string; title: string; items: PortfolioItemRow[] }[] {
  const map = new Map<string, PortfolioItemRow[]>();
  for (const item of items) {
    const slug = item.categorySlug || "other";
    const list = map.get(slug) || [];
    list.push(item);
    map.set(slug, list);
  }

  const groups = Array.from(map.entries()).map(([slug, groupItems]) => ({
    slug,
    title: getCategoryTitle(slug),
    items: groupItems,
  }));

  groups.sort((a, b) => {
    if (focusCategory) {
      if (a.slug === focusCategory) return -1;
      if (b.slug === focusCategory) return 1;
    }
    return b.items.length - a.items.length || a.title.localeCompare(b.title, "fa");
  });

  return groups;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { displayName: true },
  });
  const publicName = formatPublicSpecialistName(user?.displayName);
  return {
    title: `${publicName} | پروفایل متخصص جار`,
  };
}

export default async function PublicSpecialistPage({ params, searchParams }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      displayName: true,
      city: true,
      equipment: true,
      hasStudio: true,
      requestedBlueTick: true,
      specialistProfile: {
        select: {
          id: true,
          status: true,
          avatarUrl: true,
          city: true,
          equipmentSummary: true,
          isMobileGrapher: true,
          studioName: true,
          studioLat: true,
          studioLng: true,
          studioAddress: true,
          portfolioItems: {
            where: { reviewStatus: "APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 60,
            select: {
              id: true,
              fileUrl: true,
              title: true,
              mediaType: true,
              categorySlug: true,
            },
          },
          bio: true,
        },
      },
    },
  });

  const profile = user?.specialistProfile;
  // Marketplace rule: ACTIVE specialists must have a real profile photo.
  if (!profile || profile.status !== "ACTIVE" || !profile.avatarUrl?.trim()) {
    notFound();
  }

  const name = formatPublicSpecialistName(user.displayName);
  const city = profile.city || user.city || "—";
  const equipmentRaw = profile.equipmentSummary || user.equipment;
  const equipmentTags = parseEquipmentTags(equipmentRaw);
  const stats = await getSpecialistPublicStats(user.id, profile.id);
  const avatarUrl = profile.avatarUrl;
  const focusCategory = searchParams?.category?.trim() || null;
  const portfolioGroups = groupPortfolioByCategory(profile.portfolioItems, focusCategory);

  return (
    <main className="min-h-dvh bg-jar-canvas text-jar-primary py-10 px-4 pb-28" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-jar-muted hover:text-jar-primary"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت
        </Link>

        <section className="rounded-[28px] border border-jar-border bg-jar-surface p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-jar-border bg-jar-canvas">
              <Image
                src={avatarUrl}
                alt={name}
                fill
                sizes="72px"
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{name}</h1>
                {user.requestedBlueTick && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                    <CheckCircle2 className="h-3 w-3" />
                    تاییدشده
                  </span>
                )}
                {profile.isMobileGrapher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-logo/10 text-jar-logo text-[10px] font-bold border border-jar-logo/25">
                    <Smartphone className="h-3 w-3" />
                    موبایل‌گرافر
                  </span>
                )}
              </div>
              <p className="text-xs text-jar-muted font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {city}
                {profile.studioName &&
                typeof profile.studioLat === "number" &&
                typeof profile.studioLng === "number"
                  ? ` · ${profile.studioName}`
                  : ""}
              </p>
            </div>
          </div>

          <SpecialistPublicStatsRow
            completedProjects={stats.completedProjects}
            approvedPortfolio={stats.approvedPortfolio}
            avgRating={stats.avgRating}
            ratingCount={stats.ratingCount}
          />

          {profile.bio?.trim() ? (
            <p className="text-sm text-jar-primary leading-relaxed font-medium whitespace-pre-wrap">
              {profile.bio.trim()}
            </p>
          ) : null}

          {equipmentTags.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-jar-border">
              <span className="text-xs font-bold text-jar-primary">
                {profile.isMobileGrapher ? "گوشی و تجهیزات موبایل‌گرافی" : "تجهیزات"}
              </span>
              <EquipmentTagsDisplay value={equipmentRaw} />
            </div>
          )}
        </section>

        {portfolioGroups.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-sm font-black flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              نمونه‌کارها بر اساس دسته‌بندی
            </h2>

            {portfolioGroups.map((group) => (
              <div
                key={group.slug}
                id={`cat-${group.slug}`}
                className="space-y-3 scroll-mt-20"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-black text-jar-primary">
                    {group.title}
                  </h3>
                  <span className="text-[11px] font-bold text-jar-muted shrink-0">
                    {group.items.length.toLocaleString("fa-IR")} اثر
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-jar-surface"
                    >
                      <Image
                        src={item.fileUrl}
                        alt={item.title || group.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                      />
                      {item.mediaType === "VIDEO" && (
                        <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
                          <Film className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
