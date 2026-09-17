import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
    "https://jarorg.ir";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/jaramooz`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/tools`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/tools/locations`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${base}/order`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let locationEntries: MetadataRoute.Sitemap = [];
  try {
    const locations = await prisma.photoLocation.findMany({
      where: { status: "APPROVED" },
      select: { slug: true, updatedAt: true, coverImageUrl: true },
      take: 5000,
    });
    locationEntries = locations.map((loc) => ({
      url: `${base}/locations/${loc.slug}`,
      lastModified: loc.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.88,
      ...(loc.coverImageUrl
        ? {
            images: [
              loc.coverImageUrl.startsWith("http")
                ? loc.coverImageUrl
                : `${base}${loc.coverImageUrl}`,
            ],
          }
        : {}),
    }));
  } catch {
    // Table may not exist yet during bootstrap.
  }

  return [...staticEntries, ...locationEntries];
}
