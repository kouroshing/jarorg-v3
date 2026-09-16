import "server-only";

import { prisma } from "@/lib/prisma";
import { ALL_CATEGORIES, CATEGORIES_BY_SLUG } from "@/lib/categories";
import { parseSelectedCategories } from "@/lib/specialists/eligibility";

/**
 * Category slugs that at least one ACTIVE specialist has declared.
 * Order form step 1 only offers these — no empty matching queues.
 */
export async function getOrderableCategorySlugs(): Promise<string[]> {
  const rows = await prisma.specialistProfile.findMany({
    where: { status: "ACTIVE" },
    select: { selectedCategories: true },
  });

  const available = new Set<string>();
  for (const row of rows) {
    for (const slug of parseSelectedCategories(row.selectedCategories)) {
      if (CATEGORIES_BY_SLUG[slug]) available.add(slug);
    }
  }

  // Preserve catalog order for a stable UI.
  return ALL_CATEGORIES.map((c) => c.slug).filter((slug) => available.has(slug));
}

export async function isCategoryOrderable(slug: string): Promise<boolean> {
  if (!CATEGORIES_BY_SLUG[slug]) return false;
  const slugs = await getOrderableCategorySlugs();
  return slugs.includes(slug);
}
