"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import xss from "xss";

export interface GalleryProjectResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Normalizes Persian characters and constructs a clean URL slug.
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, "") // Keep Persian characters, English letters, digits, and -
    .replace(/\-+/g, "-"); // Collapse multiple dashes
}

/**
 * Checks if user has enough storage left.
 * maxStorage is stored in the Plan model in MB.
 * usedStorage is stored in the User model in Bytes.
 */
export async function checkStorageQuota(totalNewBytes: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "جهت بررسی فضا باید وارد حساب خود شوید." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return { success: false, error: "کاربر یافت نشد." };
    }

    // Default 500 MB (in bytes) for BASIC
    let maxStorageBytes = 500 * 1024 * 1024;

    if (user.planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: user.planId }
      });
      if (plan && plan.maxStorage > 0) {
        maxStorageBytes = plan.maxStorage * 1024 * 1024;
      } else {
        // Fallback to user's storageLimit column
        maxStorageBytes = user.storageLimit;
      }
    } else {
      // Fallback to user's storageLimit column
      maxStorageBytes = user.storageLimit;
    }

    const projectedUsed = user.usedStorage + totalNewBytes;

    if (projectedUsed > maxStorageBytes) {
      return {
        success: false,
        error: "فضای ذخیره‌سازی شما پر شده است. حساب خود را ارتقا دهید.",
        maxStorageBytes,
        usedStorageBytes: user.usedStorage,
        projectedUsedBytes: projectedUsed
      };
    }

    return {
      success: true,
      maxStorageBytes,
      usedStorageBytes: user.usedStorage
    };
  } catch (error) {
    console.error("Error in checkStorageQuota:", error);
    return { success: false, error: "خطای سرور در بررسی فضا." };
  }
}

/**
 * Gets all gallery projects belonging to the logged-in specialist user.
 */
export async function getGalleryProjects(): Promise<GalleryProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "دسترسی غیرمجاز. لطفا ابتدا وارد حساب خود شوید." };
    }

    const projects = await prisma.galleryProject.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    return { success: true, data: projects };
  } catch (error) {
    console.error("Error in getGalleryProjects:", error);
    return { success: false, error: "خطا در دریافت لیست پروژه‌ها." };
  }
}

/**
 * Creates a new gallery project and its associated photos.
 */
export async function createGalleryProject(
  title: string,
  pricePerPhoto: number,
  photos: { fileName: string; fileSize: number; originalUrl: string; watermarkedUrl?: string }[],
  discountThreshold?: number | null,
  discountedPrice?: number | null
): Promise<GalleryProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "جهت ساخت پروژه باید وارد حساب خود شوید." };
    }

    const sanitizedTitle = xss(title).trim();
    if (!sanitizedTitle) {
      return { success: false, error: "وارد کردن عنوان پروژه الزامی است." };
    }

    if (pricePerPhoto < 0) {
      return { success: false, error: "قیمت هر شات نمی‌تواند منفی باشد." };
    }

    if (!photos || photos.length === 0) {
      return { success: false, error: "حداقل باید یک تصویر انتخاب و آپلود شود." };
    }

    // Generate unique slug
    let baseSlug = slugify(sanitizedTitle);
    if (!baseSlug) {
      baseSlug = Math.random().toString(36).substring(2, 8);
    }

    let slug = baseSlug;
    let isSlugTaken = true;
    let counter = 0;

    while (isSlugTaken) {
      const existing = await prisma.galleryProject.findUnique({
        where: { slug }
      });
      if (!existing) {
        isSlugTaken = false;
      } else {
        counter++;
        slug = `${baseSlug}-${counter}-${Math.random().toString(36).substring(2, 5)}`;
      }
    }

    // Generate unique 5-character uppercase alphanumeric access code
    let accessCode = "";
    let isCodeUnique = false;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    while (!isCodeUnique) {
      let code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await prisma.galleryProject.findUnique({
        where: { accessCode: code }
      });
      if (!existing) {
        accessCode = code;
        isCodeUnique = true;
      }
    }

    // Create project in DB
    const newProject = await prisma.galleryProject.create({
      data: {
        userId: session.userId,
        title: sanitizedTitle,
        slug,
        accessCode,
        price: Math.floor(pricePerPhoto),
        discountThreshold: discountThreshold ? Math.floor(discountThreshold) : null,
        discountedPrice: discountedPrice ? Math.floor(discountedPrice) : null,
        photos: {
          createMany: {
            data: photos.map(p => ({
              fileName: p.fileName,
              fileSize: p.fileSize,
              originalUrl: p.originalUrl,
              watermarkedUrl: p.watermarkedUrl || p.originalUrl // Save Google Drive low-res thumbnail
            }))
          }
        }
      },
      include: {
        photos: true
      }
    });

    revalidatePath("/dashboard/gallery");
    return { success: true, data: newProject };
  } catch (error) {
    console.error("Error in createGalleryProject:", error);
    return { success: false, error: "خطا در ثبت نهایی پروژه گالری." };
  }
}

/**
 * Retrieves a gallery project by slug. If a valid paid authority is provided,
 * returns the original high-resolution download URLs for the purchased photos.
 * Otherwise, original URLs are hidden for security.
 */
export async function getGalleryProjectBySlug(
  slug: string,
  authority?: string
): Promise<GalleryProjectResult> {
  try {
    // 1. Fetch only secure fields first (excluding originalUrl from initial load to prevent memory leakage)
    const project = await prisma.galleryProject.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        discountThreshold: true,
        discountedPrice: true,
        description: true,
        photos: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            watermarkedUrl: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!project) {
      return { success: false, error: "گالری یافت نشد." };
    }

    // 2. Check if we have a successful payment authority
    let purchasedPhotoIds: string[] = [];
    if (authority) {
      const order = await prisma.galleryOrder.findFirst({
        where: {
          authority,
          status: "SUCCESS"
        },
        include: {
          items: true
        }
      });
      if (order) {
        purchasedPhotoIds = order.items.map(item => item.photoId);
      }
    }

    // 3. If there are purchased photos, load their originalUrls securely from DB
    let originalUrlsMap: Record<string, string> = {};
    if (purchasedPhotoIds.length > 0) {
      const originalPhotos = await prisma.galleryPhoto.findMany({
        where: {
          id: { in: purchasedPhotoIds }
        },
        select: {
          id: true,
          originalUrl: true
        }
      });
      originalPhotos.forEach(p => {
        originalUrlsMap[p.id] = p.originalUrl;
      });
    }

    // 4. Map to secure sanitized output
    const sanitizedPhotos = project.photos.map(photo => {
      const isPurchased = purchasedPhotoIds.includes(photo.id);
      return {
        id: photo.id,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        watermarkedUrl: photo.watermarkedUrl,
        originalUrl: isPurchased ? (originalUrlsMap[photo.id] || null) : null,
        isPurchased
      };
    });

    const sanitizedProject = {
      id: project.id,
      title: project.title,
      slug: project.slug,
      price: project.price,
      discountThreshold: project.discountThreshold,
      discountedPrice: project.discountedPrice,
      description: project.description,
      photos: sanitizedPhotos,
      hasPurchaseAccess: purchasedPhotoIds.length > 0
    };

    return { success: true, data: sanitizedProject };
  } catch (error) {
    console.error("Error in getGalleryProjectBySlug:", error);
    return { success: false, error: "خطا در دریافت اطلاعات گالری." };
  }
}

/**
 * Deletes a gallery project, removes original files from Google Drive,
 * and refunds the photographer's storage quota size.
 */
export async function deleteGalleryProject(projectId: string): Promise<GalleryProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "جهت حذف پروژه باید وارد حساب خود شوید." };
    }

    // 1. Fetch the project and its photos
    const project = await prisma.galleryProject.findUnique({
      where: { id: projectId },
      include: { photos: true }
    });

    if (!project) {
      return { success: false, error: "پروژه یافت نشد." };
    }

    if (project.userId !== session.userId) {
      return { success: false, error: "شما دسترسی لازم برای حذف این پروژه را ندارید." };
    }

    const totalSize = project.photos.reduce((acc, p) => acc + p.fileSize, 0);

    // 2. Try deleting local files from disk if stored locally
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      for (const photo of project.photos) {
        if (photo.originalUrl?.startsWith("/uploads/")) {
          const localPath = path.join(process.cwd(), "public", photo.originalUrl);
          await fs.unlink(localPath).catch(() => {});
        }
      }
    } catch {
      // Ignore if files already removed
    }

    // 3. Delete from DB and release storage limit
    await prisma.$transaction(async (tx) => {
      // a. Delete project (photos will cascade delete due to DB setup)
      await tx.galleryProject.delete({
        where: { id: projectId }
      });

      // b. Release storage limit from user
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (user) {
        const newUsed = Math.max(0, user.usedStorage - totalSize);
        await tx.user.update({
          where: { id: session.userId },
          data: { usedStorage: newUsed }
        });
      }
    });

    revalidatePath("/dashboard/gallery");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteGalleryProject:", error);
    return { success: false, error: "خطا در حذف پروژه گالری." };
  }
}

/**
 * Verifies an access code PIN. If valid, returns the associated project slug.
 */
export async function verifyGalleryAccessCode(
  accessCode: string
): Promise<GalleryProjectResult> {
  try {
    if (!accessCode || accessCode.trim().length !== 5) {
      return { success: false, error: "کد ۵ رقمی معتبر نیست." };
    }

    const project = await prisma.galleryProject.findUnique({
      where: { accessCode: accessCode.toUpperCase().trim() }
    });

    if (!project) {
      return { success: false, error: "کد وارد شده نامعتبر است." };
    }

    return { success: true, data: { slug: project.slug } };
  } catch (error) {
    console.error("Error verifying gallery access code:", error);
    return { success: false, error: "خطا در تایید کد دسترسی." };
  }
}

/**
 * Secures high-res photo downloads behind phone authentication.
 */
export async function getSuccessGalleryPhotos(
  authority: string,
  phone: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!authority || !phone) {
      return { success: false, error: "کد پرداخت و شماره موبایل الزامی است." };
    }

    const order = await prisma.galleryOrder.findUnique({
      where: { authority },
      include: { project: true }
    });

    if (!order || order.status !== "SUCCESS") {
      return { success: false, error: "تراکنش معتبر یافت نشد." };
    }

    const enteredPhone = phone.trim();
    if (enteredPhone !== order.phone) {
      return { success: false, error: "شماره موبایل وارد شده با اطلاعات خریدار مطابقت ندارد." };
    }

    const purchase = await prisma.galleryPurchase.findFirst({
      where: {
        projectId: order.projectId,
        clientPhone: order.phone
      },
      orderBy: { createdAt: "desc" }
    });

    if (!purchase) {
      return { success: false, error: "اطلاعات خرید برای این سفارش یافت نشد." };
    }

    const purchasedPhotoIds = purchase.purchasedPhotoIds.split(",").filter(Boolean);

    const photos = await prisma.galleryPhoto.findMany({
      where: {
        id: { in: purchasedPhotoIds }
      }
    });

    return { success: true, data: photos };
  } catch (error) {
    console.error("Error in getSuccessGalleryPhotos:", error);
    return { success: false, error: "خطایی در دریافت تصاویر رخ داد." };
  }
}
