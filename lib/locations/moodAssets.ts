import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getUploadRoot } from "@/lib/storage/uploads";
import { LOCATION_CATEGORIES } from "@/lib/locations/photoLocation";

export const JAR_LOCATION_MOOD_FILES = [
  "hero.jpg",
  "free.jpg",
  ...LOCATION_CATEGORIES.map((c) => path.basename(c.moodImage)),
] as const;

const UNIQUE_MOOD_FILES = Array.from(new Set(JAR_LOCATION_MOOD_FILES));

export function jarLocationMoodDiskUrl(filename: string): string {
  return `/uploads/locations/mood/${filename}`;
}

/**
 * Copy bundled mood/hero jpgs onto the persistent uploads disk (once).
 * Source stays in the app bundle so a fresh environment can seed the disk;
 * after this, page settings can point at /uploads/... and later deploys
 * do not need to carry replacement galleries.
 */
export async function copyJarLocationMoodsToDisk(): Promise<{
  copied: string[];
  existed: string[];
}> {
  const sourceDir = path.join(process.cwd(), "public", "images", "jar-locations");
  const destDir = path.join(getUploadRoot(), "locations", "mood");
  await fs.mkdir(destDir, { recursive: true });

  const copied: string[] = [];
  const existed: string[] = [];

  for (const file of UNIQUE_MOOD_FILES) {
    const from = path.join(sourceDir, file);
    const to = path.join(destDir, file);
    try {
      await fs.access(to);
      existed.push(file);
      continue;
    } catch {
      // missing on disk
    }
    try {
      await fs.copyFile(from, to);
      copied.push(file);
    } catch (err) {
      console.error("[copyJarLocationMoodsToDisk]", file, err);
    }
  }

  return { copied, existed };
}
