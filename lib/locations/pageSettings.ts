import "server-only";
import { prisma } from "@/lib/prisma";
import {
  LOCATION_CATEGORY_IDS,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import {
  DEFAULT_JAR_LOCATION_PAGE,
} from "@/lib/locations/pageSettingsDefaults";
import type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";

export type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";
export { DEFAULT_JAR_LOCATION_PAGE } from "@/lib/locations/pageSettingsDefaults";

function parseCategoryImages(raw: string | null | undefined): Record<PhotoLocationCategory, string> {
  const base = { ...DEFAULT_JAR_LOCATION_PAGE.categoryImages };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const id of LOCATION_CATEGORY_IDS) {
      const v = parsed[id];
      if (typeof v === "string" && v.trim()) base[id] = v.trim();
    }
  } catch {
    // keep defaults
  }
  return base;
}

export async function getJarLocationPageSettings(): Promise<JarLocationPageSettingsPublic> {
  try {
    const row = await prisma.jarLocationPageSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) {
      return {
        ...DEFAULT_JAR_LOCATION_PAGE,
        categoryImages: { ...DEFAULT_JAR_LOCATION_PAGE.categoryImages },
      };
    }

    return {
      heroTitle: row.heroTitle?.trim() || DEFAULT_JAR_LOCATION_PAGE.heroTitle,
      heroSubtitle: row.heroSubtitle?.trim() || DEFAULT_JAR_LOCATION_PAGE.heroSubtitle,
      heroImageUrl: row.heroImageUrl?.trim() || DEFAULT_JAR_LOCATION_PAGE.heroImageUrl,
      allChipImageUrl: row.allChipImageUrl?.trim() || DEFAULT_JAR_LOCATION_PAGE.allChipImageUrl,
      freeChipImageUrl: row.freeChipImageUrl?.trim() || DEFAULT_JAR_LOCATION_PAGE.freeChipImageUrl,
      categoryImages: parseCategoryImages(row.categoryImages),
    };
  } catch {
    return {
      ...DEFAULT_JAR_LOCATION_PAGE,
      categoryImages: { ...DEFAULT_JAR_LOCATION_PAGE.categoryImages },
    };
  }
}

export async function upsertJarLocationPageSettings(
  input: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroImageUrl?: string;
    allChipImageUrl?: string;
    freeChipImageUrl?: string;
    categoryImages?: Partial<Record<PhotoLocationCategory, string>>;
  }
): Promise<JarLocationPageSettingsPublic> {
  const current = await getJarLocationPageSettings();
  const next: JarLocationPageSettingsPublic = {
    heroTitle: input.heroTitle?.trim() || current.heroTitle,
    heroSubtitle: input.heroSubtitle?.trim() || current.heroSubtitle,
    heroImageUrl: input.heroImageUrl?.trim() || current.heroImageUrl,
    allChipImageUrl: input.allChipImageUrl?.trim() || current.allChipImageUrl,
    freeChipImageUrl: input.freeChipImageUrl?.trim() || current.freeChipImageUrl,
    categoryImages: {
      ...current.categoryImages,
      ...(input.categoryImages || {}),
    },
  };

  await prisma.jarLocationPageSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      heroTitle: next.heroTitle,
      heroSubtitle: next.heroSubtitle,
      heroImageUrl: next.heroImageUrl,
      allChipImageUrl: next.allChipImageUrl,
      freeChipImageUrl: next.freeChipImageUrl,
      categoryImages: JSON.stringify(next.categoryImages),
    },
    update: {
      heroTitle: next.heroTitle,
      heroSubtitle: next.heroSubtitle,
      heroImageUrl: next.heroImageUrl,
      allChipImageUrl: next.allChipImageUrl,
      freeChipImageUrl: next.freeChipImageUrl,
      categoryImages: JSON.stringify(next.categoryImages),
    },
  });

  return next;
}
