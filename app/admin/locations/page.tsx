import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import { prisma } from "@/lib/prisma";
import { getJarLocationPageSettings } from "@/lib/locations/pageSettings";
import {
  parseLocationCategory,
  parseLocationImageUrls,
  parseLocationVideoUrls,
  parseSecurityLevel,
  resolveLocationCover,
} from "@/lib/locations/photoLocation";
import { parseSuitableFor } from "@/lib/locations/projectTypes";
import AdminJarLocationManager from "@/components/admin/AdminJarLocationManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مدیریت جار لوکیشن | پنل مدیریت جار",
};

export default async function AdminJarLocationsPage() {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    redirect("/admin");
  }

  const [settings, pendingRaw, catalogRaw] = await Promise.all([
    getJarLocationPageSettings(),
    prisma.photoLocation.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 40,
      include: { submittedBy: { select: { phone: true } } },
    }),
    prisma.photoLocation.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
  ]);

  const pendingItems = pendingRaw.map((r) => {
    const gallery = parseLocationImageUrls(r.imageUrls);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      category: parseLocationCategory(r.category),
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
      securityLevel: parseSecurityLevel(r.securityLevel),
      coverImageUrl: resolveLocationCover(r.coverImageUrl, gallery),
      imageUrls: gallery,
      videoUrls: [] as string[],
      photographerUserId: null as string | null,
      photographerName: null as string | null,
      suitableFor: parseSuitableFor(
        (r as { suitableFor?: string | null }).suitableFor
      ),
    };
  });

  try {
    if (pendingItems.length > 0) {
      const placeholders = pendingItems.map(() => "?").join(",");
      const extras = await prisma.$queryRawUnsafe<
        {
          id: string;
          video_urls: string | null;
          photographer_user_id: string | null;
          photographer_name: string | null;
        }[]
      >(
        `SELECT id, video_urls, photographer_user_id, photographer_name FROM photo_locations WHERE id IN (${placeholders})`,
        ...pendingItems.map((i) => i.id)
      );
      const extraMap = new Map(extras.map((e) => [e.id, e]));
      for (const item of pendingItems) {
        const extra = extraMap.get(item.id);
        if (!extra) continue;
        item.videoUrls = parseLocationVideoUrls(extra.video_urls);
        item.photographerUserId = extra.photographer_user_id;
        item.photographerName = extra.photographer_name;
      }
    }
  } catch {
    // columns may not exist yet on a stale db
  }

  const catalogItems = catalogRaw.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    category: parseLocationCategory(r.category),
    city: r.city,
    status: r.status,
    coverImageUrl: resolveLocationCover(
      r.coverImageUrl,
      parseLocationImageUrls(r.imageUrls)
    ),
    suitableFor: parseSuitableFor(
      (r as { suitableFor?: string | null }).suitableFor
    ),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="px-3 sm:px-6 lg:px-8 py-6 pb-16 max-w-5xl mx-auto">
      <AdminJarLocationManager
        initialSettings={settings}
        pendingItems={pendingItems}
        catalogItems={catalogItems}
      />
    </main>
  );
}
