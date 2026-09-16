/**
 * Order deliverables — files and external links attached before reportDelivery.
 */

export const MAX_ORDER_DELIVERABLES = 10;
export const MAX_DELIVERABLE_FILE_BYTES = 25 * 1024 * 1024;

export const DELIVERABLE_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
]);

export type DeliverableKind = "FILE" | "LINK";

export type OrderDeliverableView = {
  id: string;
  kind: DeliverableKind;
  fileUrl: string | null;
  linkUrl: string | null;
  label: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
};

export function isAllowedDeliverableMime(mime: string): boolean {
  return DELIVERABLE_ALLOWED_MIME.has(mime.toLowerCase());
}

/** Accept http(s) URLs for Drive / Dropbox / WeTransfer / personal hosting. */
export function normalizeDeliverableLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.toString();
}

export function deliverableHref(d: {
  kind: string;
  fileUrl: string | null;
  linkUrl: string | null;
}): string | null {
  if (d.kind === "LINK") return d.linkUrl;
  if (d.kind === "FILE") return d.fileUrl;
  return d.linkUrl || d.fileUrl;
}
