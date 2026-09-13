import "server-only";

import { prisma } from "@/lib/prisma";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";

export type AdminPortfolioGalleryItem = {
  id: string;
  fileUrl: string;
  mediaType: string;
  title: string | null;
  categoryTitle: string;
  reviewStatus: string;
  rejectionReason: string | null;
  instagramPickedAt: string | null;
  specialist: {
    profileId: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    city: string | null;
  };
};

/**
 * Flat list of every portfolio item for the admin Instagram / curation gallery.
 * Not scoped to the specialist review queue — includes all statuses and profiles.
 */
export async function getAdminPortfolioGalleryItems(): Promise<AdminPortfolioGalleryItem[]> {
  const rows = await prisma.portfolioItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      specialist: {
        select: {
          id: true,
          userId: true,
          avatarUrl: true,
          city: true,
          user: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  return rows.map((item) => ({
    id: item.id,
    fileUrl: item.fileUrl,
    mediaType: item.mediaType,
    title: item.title,
    categoryTitle: CATEGORIES_BY_SLUG[item.categorySlug]?.title || item.categorySlug,
    reviewStatus: item.reviewStatus,
    rejectionReason: item.rejectionReason,
    instagramPickedAt: item.instagramPickedAt?.toISOString() ?? null,
    specialist: {
      profileId: item.specialist.id,
      userId: item.specialist.userId,
      displayName: item.specialist.user?.displayName || "متخصص بدون نام",
      avatarUrl: item.specialist.avatarUrl,
      city: item.specialist.city,
    },
  }));
}
