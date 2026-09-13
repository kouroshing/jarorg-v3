import "server-only";

import { unstable_cache } from "next/cache";
import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { parseCoverageRadiusKm } from "@/lib/geo/iranPlaces";
import { toCoverageCircle, type CoverageCircle } from "@/lib/geo/coverageMap";

const MAX_RAW = 200;
const MAX_CIRCLES = 48;
/** Grid degrees for merging nearby specialists (keeps SVG light). */
const CLUSTER_DEG = 0.45;

type RawCover = {
  lat: number;
  lng: number;
  radiusKm: number;
  label: string | null;
};

function clusterCovers(raw: RawCover[]): CoverageCircle[] {
  type Cell = {
    sumLat: number;
    sumLng: number;
    maxR: number;
    count: number;
    label: string | null;
  };
  const cells = new Map<string, Cell>();

  for (const item of raw) {
    const key = `${Math.round(item.lat / CLUSTER_DEG)}_${Math.round(item.lng / CLUSTER_DEG)}`;
    const existing = cells.get(key);
    if (!existing) {
      cells.set(key, {
        sumLat: item.lat,
        sumLng: item.lng,
        maxR: item.radiusKm,
        count: 1,
        label: item.label,
      });
      continue;
    }
    existing.sumLat += item.lat;
    existing.sumLng += item.lng;
    existing.maxR = Math.max(existing.maxR, item.radiusKm);
    existing.count += 1;
    if (!existing.label && item.label) existing.label = item.label;
  }

  const circles = [...cells.values()]
    .map((c) =>
      toCoverageCircle({
        lat: c.sumLat / c.count,
        lng: c.sumLng / c.count,
        radiusKm: c.maxR,
        label: c.label,
        count: c.count,
      })
    )
    // Prefer denser / wider covers when we have to cap.
    .sort((a, b) => b.count * b.radiusKm - a.count * a.radiusKm)
    .slice(0, MAX_CIRCLES);

  return circles;
}

async function loadCoverageCirclesUncached(): Promise<{
  circles: CoverageCircle[];
  specialistCount: number;
}> {
  await ensurePrismaSchemaReady();

  const rows = await prisma.specialistProfile.findMany({
    where: {
      status: "ACTIVE",
      baseLat: { not: null },
      baseLng: { not: null },
    },
    select: {
      baseLat: true,
      baseLng: true,
      workArea: true,
      city: true,
    },
    take: MAX_RAW,
    orderBy: { reviewedAt: "desc" },
  });

  const raw: RawCover[] = [];
  for (const row of rows) {
    const lat = row.baseLat;
    const lng = row.baseLng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }
    // Stay inside Iran frame; drop junk GPS.
    if (lat < 24.5 || lat > 40.5 || lng < 43.5 || lng > 64) continue;

    raw.push({
      lat,
      lng,
      radiusKm: parseCoverageRadiusKm(row.workArea),
      label: row.city?.trim() || null,
    });
  }

  return {
    circles: clusterCovers(raw),
    specialistCount: raw.length,
  };
}

/**
 * Cached public coverage for homepage — avoids hitting SQLite on every request.
 * Revalidates every 10 minutes.
 */
export const getPublicCoverageCircles = unstable_cache(
  loadCoverageCirclesUncached,
  ["homepage-specialist-coverage-v1"],
  { revalidate: 600 }
);
