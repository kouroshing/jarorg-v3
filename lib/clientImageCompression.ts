"use client";

/**
 * Client-Side Smart Media Optimizer for Next.js
 * 
 * Rules:
 * 1. Safe for Next.js SSR ("use client" and window checks).
 * 2. MIME-type conditional routing:
 *    - Video (video/*): Bypass image compression. Verify size <= 40 MB. If > 40MB, reject with:
 *      «حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد»
 *    - Image (image/*): Verify raw size <= 25 MB. If > 25MB, reject with:
 *      «حجم تصویر خام نباید بیشتر از ۲۵ مگابایت باشد»
 *      Then compress using WebP, maxSizeMB: 0.7, maxWidthOrHeight: 1920, EXIF auto-rotation.
 * 3. Mobile Memory Protection:
 *    - Sequential processing (for...of), explicit GPU texture cleanup (ImageBitmap.close()).
 * 4. Automatic WebP extension renaming (photo.jpg -> photo.webp).
 * 5. Step-by-step UX progress reporting.
 */

export const MAX_IMAGE_RAW_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_VIDEO_RAW_SIZE_BYTES = 40 * 1024 * 1024; // 40 MB
export const DEFAULT_MAX_SIZE_MB = 0.7; // 700 KB
export const DEFAULT_MAX_WIDTH_OR_HEIGHT = 1920;

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

/**
 * Checks if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name);
}

/**
 * Checks if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|quicktime|webm|m4v)$/i.test(file.name);
}

/**
 * Core image compression function respecting browser-image-compression options.
 * Handles EXIF orientation, maxWidthOrHeight 1920, maxSizeMB 0.7, and WebP conversion.
 */
export async function imageCompression(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  const maxSizeMB = options.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
  const maxWidthOrHeight = options.maxWidthOrHeight ?? DEFAULT_MAX_WIDTH_OR_HEIGHT;
  const targetSizeBytes = maxSizeMB * 1024 * 1024;
  const targetType = options.fileType || "image/webp";

  // Try using native createImageBitmap with EXIF auto-rotation
  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    }
  } catch {
    // If createImageBitmap fails or not supported, fallback to HTMLImageElement
    bitmap = null;
  }

  if (bitmap) {
    try {
      let width = bitmap.width;
      let height = bitmap.height;

      // Scale down preserving aspect ratio if exceeding max dimension
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        if (width > height) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        } else {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
      }

      // Render onto canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        bitmap.close();
        return file;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      // Close bitmap immediately to release RAM and GPU VRAM on mobile
      bitmap.close();

      // Compress to WebP targeting maxSizeMB
      const blob = await canvasToBlobIterative(canvas, targetType, targetSizeBytes);
      
      // Cleanup canvas memory
      canvas.width = 1;
      canvas.height = 1;

      if (!blob) {
        return file;
      }

      const webpFileName = getWebPFileName(file.name);
      return new File([blob], webpFileName, {
        type: "image/webp",
        lastModified: Date.now(),
      });
    } catch (err) {
      console.warn("[imageCompression] Error during bitmap compression, fallback:", err);
      if (bitmap) {
        try { bitmap.close(); } catch {}
      }
    }
  }

  // Fallback: standard HTMLImageElement
  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await canvasToBlobIterative(canvas, targetType, targetSizeBytes);
        canvas.width = 1;
        canvas.height = 1;

        if (!blob) {
          resolve(file);
          return;
        }

        const webpFileName = getWebPFileName(file.name);
        resolve(
          new File([blob], webpFileName, {
            type: "image/webp",
            lastModified: Date.now(),
          })
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Iteratively adjust quality to ensure output blob <= targetSizeBytes
 */
async function canvasToBlobIterative(
  canvas: HTMLCanvasElement,
  fileType: string,
  targetSizeBytes: number
): Promise<Blob | null> {
  const getBlob = (quality: number): Promise<Blob | null> => {
    return new Promise((res) => {
      canvas.toBlob((b) => res(b), fileType, quality);
    });
  };

  let quality = 0.85;
  let blob = await getBlob(quality);

  while (blob && blob.size > targetSizeBytes && quality > 0.4) {
    quality -= 0.12;
    blob = await getBlob(quality);
  }

  return blob;
}

/**
 * Replaces any existing file extension with .webp
 */
export function getWebPFileName(originalName: string): string {
  const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
  return `${baseName}.webp`;
}

/**
 * High-level processor for sequential file handling with validation:
 * - Video validation: max 40 MB.
 * - Image validation: max 25 MB, followed by smart compression.
 */
export async function processSinglePortfolioFile(
  file: File,
  index: number,
  total: number,
  onStatusUpdate?: (statusText: string) => void
): Promise<File> {
  // 1. Process Video
  if (isVideoFile(file)) {
    if (file.size > MAX_VIDEO_RAW_SIZE_BYTES) {
      throw new Error("حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد.");
    }
    onStatusUpdate?.(`در حال آماده‌سازی ویدیو (${index + 1} از ${total})...`);
    return file; // Videos are sent directly without image compression
  }

  // 2. Process Image
  if (file.size > MAX_IMAGE_RAW_SIZE_BYTES) {
    throw new Error("حجم تصویر خام نباید بیشتر از ۲۵ مگابایت باشد.");
  }

  onStatusUpdate?.(`در حال بهینه‌سازی فایل ${index + 1} از ${total}...`);

  const compressed = await imageCompression(file, {
    maxSizeMB: DEFAULT_MAX_SIZE_MB,
    maxWidthOrHeight: DEFAULT_MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: "image/webp",
  });

  return compressed;
}
