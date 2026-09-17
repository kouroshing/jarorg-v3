import {
  LOCATION_CATEGORIES,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";

export type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";

const DEFAULT_CATEGORY_IMAGES = Object.fromEntries(
  LOCATION_CATEGORIES.map((c) => [c.id, c.moodImage])
) as Record<PhotoLocationCategory, string>;

export const DEFAULT_JAR_LOCATION_PAGE: JarLocationPageSettingsPublic = {
  heroTitle: "جار لوکیشن",
  heroSubtitle: "فضا، عمارت و خیابان — جایی که نور درست می‌افتد.",
  heroImageUrl: "/images/jar-locations/hero.jpg",
  allChipImageUrl: "/images/jar-locations/hero.jpg",
  freeChipImageUrl: "/images/jar-locations/free.jpg",
  categoryImages: { ...DEFAULT_CATEGORY_IMAGES },
};
