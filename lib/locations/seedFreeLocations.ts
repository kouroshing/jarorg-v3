import "server-only";
import { prisma } from "@/lib/prisma";
import { LOCATION_CATEGORIES } from "@/lib/locations/photoLocation";
import { serializeLocationImageUrls } from "@/lib/locations/photoLocation";
import { serializeSuitableFor } from "@/lib/locations/projectTypes";
import { FREE_JAR_LOCATION_SEED } from "@/lib/locations/freeLocationSeed";

function moodCover(category: string): string {
  return (
    LOCATION_CATEGORIES.find((c) => c.id === category)?.moodImage ||
    "/images/jar-locations/hero.jpg"
  );
}

async function writeSuitableFor(id: string, slugs: string[]) {
  const json = serializeSuitableFor(slugs);
  try {
    await prisma.photoLocation.update({
      where: { id },
      data: { suitableFor: json },
    });
  } catch {
    await prisma.$executeRawUnsafe(
      "UPDATE photo_locations SET suitable_for = ? WHERE id = ?",
      json,
      id
    );
  }
}

export async function upsertFreeJarLocations(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  let created = 0;
  let skipped = 0;

  for (const item of FREE_JAR_LOCATION_SEED) {
    const exists = await prisma.photoLocation.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const cover = moodCover(item.category);
    const row = await prisma.photoLocation.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        lat: item.lat,
        lng: item.lng,
        city: item.city,
        district: item.district,
        address: item.address,
        needsPermit: item.needsPermit,
        proCameraAllowed: true,
        phoneCameraAllowed: true,
        hasEntranceFee: false,
        hasChangingRoom: false,
        hasParking: item.hasParking,
        securityLevel: item.securityLevel,
        coverImageUrl: cover,
        imageUrls: serializeLocationImageUrls([cover]),
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });
    await writeSuitableFor(row.id, item.suitableFor);
    created += 1;
  }

  return { created, skipped, total: FREE_JAR_LOCATION_SEED.length };
}
