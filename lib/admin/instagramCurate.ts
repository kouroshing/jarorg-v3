/** Client helpers for admin Instagram curation of portfolio items. */

export const SITE_ORIGIN = "https://app.jarorg.ir";

export type InstagramAspect = "1:1" | "4:5";

export function profileUrl(userId: string): string {
  return `${SITE_ORIGIN}/s/${userId}`;
}

export function buildInstagramCaption(item: {
  displayName: string;
  categoryTitle: string;
  userId: string;
  city?: string | null;
}): string {
  const lines = [
    `کار از ${item.displayName}`,
    item.categoryTitle,
    item.city ? `📍 ${item.city}` : null,
    "",
    `پروفایل متخصص: ${profileUrl(item.userId)}`,
    "",
    "#جار #عکاسی #فیلمبرداری #jarorg",
  ].filter((line) => line !== null) as string[];
  return lines.join("\n");
}

export function buildInstagramCaptionsBatch(
  items: Array<{
    displayName: string;
    categoryTitle: string;
    userId: string;
    city?: string | null;
  }>
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return buildInstagramCaption(items[0]);
  return items
    .map((item, i) => `—— ${i + 1} ——\n${buildInstagramCaption(item)}`)
    .join("\n\n");
}

function aspectSize(aspect: InstagramAspect): { w: number; h: number } {
  if (aspect === "4:5") return { w: 1080, h: 1350 };
  return { w: 1080, h: 1080 };
}

/**
 * Center-cover crop an image into Instagram post dimensions (JPEG).
 */
export async function cropImageForInstagram(
  fileUrl: string,
  aspect: InstagramAspect
): Promise<Blob> {
  const { w, h } = aspectSize(aspect);
  const img = await loadImage(fileUrl);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const dx = (w - drawW) / 2;
  const dy = (h - drawH) / 2;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("toBlob failed"));
        else resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
