import type { PhotoLocationCategory } from "@/lib/locations/photoLocation";

export type JarLocationPageSettingsPublic = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  allChipImageUrl: string;
  freeChipImageUrl: string;
  categoryImages: Record<PhotoLocationCategory, string>;
};
