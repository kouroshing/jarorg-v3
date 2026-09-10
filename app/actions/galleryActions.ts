"use server";

export interface GalleryProjectResult {
  success: boolean;
  data?: any;
  error?: string;
}

const GALLERY_DISABLED = "فروش گالری در حال حاضر غیرفعال است.";

export async function checkStorageQuota(_totalNewBytes: number) {
  return { success: false, error: GALLERY_DISABLED };
}

export async function getGalleryProjects(): Promise<GalleryProjectResult> {
  return { success: true, data: [] };
}

export async function createGalleryProject(
  _title: string,
  _pricePerPhoto: number,
  _photos: { fileName: string; fileSize: number; originalUrl: string; watermarkedUrl?: string }[],
  _discountThreshold?: number | null,
  _discountedPrice?: number | null
): Promise<GalleryProjectResult> {
  return { success: false, error: GALLERY_DISABLED };
}

export async function getGalleryProjectBySlug(
  _slug: string,
  _authority?: string
): Promise<GalleryProjectResult> {
  return { success: false, error: GALLERY_DISABLED };
}

export async function deleteGalleryProject(_projectId: string): Promise<GalleryProjectResult> {
  return { success: false, error: GALLERY_DISABLED };
}

export async function verifyGalleryAccessCode(
  _accessCode: string
): Promise<GalleryProjectResult> {
  return { success: false, error: GALLERY_DISABLED };
}

export async function getSuccessGalleryPhotos(
  _authority: string,
  _phone: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return { success: false, error: GALLERY_DISABLED };
}
