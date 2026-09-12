import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Camera, CheckCircle2, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import EquipmentTagsDisplay from "@/components/specialist/EquipmentTagsDisplay";
import { parseEquipmentTags } from "@/lib/equipment/catalog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { userId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { displayName: true },
  });
  return {
    title: user?.displayName
      ? `${user.displayName} | پروفایل متخصص جار`
      : "پروفایل متخصص | جار",
  };
}

export default async function PublicSpecialistPage({ params }: PageProps) {
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
          status: true,
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
            take: 12,
            select: {
              id: true,
              fileUrl: true,
              title: true,
              mediaType: true,
            },
          },
        },
      },
    },
  });

  if (!user?.specialistProfile || user.specialistProfile.status !== "ACTIVE") {
    notFound();
  }

  const profile = user.specialistProfile;
  const name = user.displayName || "متخصص جار";
  const city = profile.city || user.city || "—";
  const equipmentRaw = profile.equipmentSummary || user.equipment;
  const equipmentTags = parseEquipmentTags(equipmentRaw);

  return (
    <main className="min-h-dvh bg-jar-canvas text-jar-primary py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-jar-muted hover:text-jar-primary"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت
        </Link>

        <section className="rounded-[28px] border border-jar-border bg-jar-surface p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-jar-primary text-white text-lg font-black">
              {name.slice(0, 1)}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">{name}</h1>
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
              {profile.studioAddress && (
                <p className="text-[11px] text-jar-muted font-medium mt-1">
                  استودیو: {profile.studioAddress}
                </p>
              )}
            </div>
          </div>

          {equipmentTags.length > 0 && (
            <div className="rounded-2xl border border-jar-border bg-jar-canvas px-3.5 py-3 space-y-2">
              <span className="text-xs font-bold text-jar-primary">
                {profile.isMobileGrapher ? "گوشی و تجهیزات موبایل‌گرافی" : "تجهیزات"}
              </span>
              <EquipmentTagsDisplay value={equipmentRaw} />
            </div>
          )}
        </section>

        {profile.portfolioItems.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-black flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              نمونه‌کارها
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {profile.portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-jar-border bg-jar-surface"
                >
                  <Image
                    src={item.fileUrl}
                    alt={item.title || "نمونه کار"}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
