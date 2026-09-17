import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { isAdminPhone } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { resolveUploadDiskPath } from "@/lib/storage/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
};

function isAdmin(session: SessionPayload): boolean {
  return isAdminPhone(session.phone);
}

function fileResponse(data: Buffer, filePath: string, cache: string) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cache,
    },
  });
}

async function canAccessMoodboard(
  publicUrl: string,
  filename: string,
  session: SessionPayload
): Promise<boolean> {
  if (isAdmin(session)) return true;

  const userPrefix = `moodboard_${session.userId.slice(0, 8)}_`;
  if (filename.startsWith(userPrefix)) return true;

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { userId: session.userId },
        ...(session.phone ? [{ contactPhone: session.phone }] : []),
        {
          interests: {
            some: { specialistId: session.userId },
          },
        },
        { selectedSpecialistId: session.userId },
      ],
    },
    select: { moodboardUrls: true },
    take: 200,
  });

  return orders.some((o) => {
    if (!o.moodboardUrls) return false;
    try {
      const urls = JSON.parse(o.moodboardUrls) as unknown;
      return Array.isArray(urls) && urls.includes(publicUrl);
    } catch {
      return o.moodboardUrls.includes(publicUrl);
    }
  });
}

async function canAccessPortfolio(
  publicUrl: string,
  session: SessionPayload | null
): Promise<{ ok: boolean; cachePublic: boolean }> {
  const item = await prisma.portfolioItem.findFirst({
    where: { fileUrl: publicUrl },
    select: {
      reviewStatus: true,
      specialist: { select: { userId: true } },
    },
  });

  if (!item) {
    if (session && isAdmin(session)) {
      return { ok: true, cachePublic: false };
    }
    return { ok: false, cachePublic: false };
  }

  if (item.reviewStatus === "APPROVED") {
    return { ok: true, cachePublic: true };
  }

  if (!session?.userId) {
    return { ok: false, cachePublic: false };
  }
  if (isAdmin(session) || item.specialist.userId === session.userId) {
    return { ok: true, cachePublic: false };
  }
  return { ok: false, cachePublic: false };
}

async function canAccessDeliverable(
  publicUrl: string,
  session: SessionPayload
): Promise<boolean> {
  if (isAdmin(session)) return true;

  const row = await prisma.orderDeliverable.findFirst({
    where: { fileUrl: publicUrl },
    select: {
      order: {
        select: {
          userId: true,
          contactPhone: true,
          selectedSpecialistId: true,
        },
      },
    },
  });

  if (!row) return false;

  const o = row.order;
  if (o.selectedSpecialistId === session.userId) return true;
  if (o.userId === session.userId) return true;
  if (session.phone && o.contactPhone === session.phone) return true;
  return false;
}

/**
 * Serve runtime uploads from UPLOAD_ROOT / public/uploads.
 * avatars/ stay public; moodboards/ need session + ownership/admin;
 * deliverables/ need order party or admin;
 * portfolio/ is public when APPROVED, else owner/admin only.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolved = await Promise.resolve(context.params);
    const parts = resolved.path || [];
    if (parts.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const folder = parts[0];
    const filename = parts[parts.length - 1] || "";
    const publicUrl = `/uploads/${parts.join("/")}`;
    const filePath = resolveUploadDiskPath(publicUrl);
    if (!filePath) {
      return new NextResponse(null, { status: 404 });
    }

    if (folder === "avatars" || folder === "gallery" || folder === "specialists" || folder === "locations") {
      const data = await fs.readFile(filePath);
      return fileResponse(data, filePath, "public, max-age=31536000, immutable");
    }

    if (folder === "moodboards") {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse(null, { status: 401 });
      }
      const allowed = await canAccessMoodboard(publicUrl, filename, session);
      if (!allowed) {
        return new NextResponse(null, { status: 403 });
      }
      const data = await fs.readFile(filePath);
      return fileResponse(data, filePath, "private, max-age=3600");
    }

    if (folder === "deliverables") {
      const session = await getSession();
      if (!session?.userId) {
        return new NextResponse(null, { status: 401 });
      }
      const allowed = await canAccessDeliverable(publicUrl, session);
      if (!allowed) {
        return new NextResponse(null, { status: 403 });
      }
      const data = await fs.readFile(filePath);
      return fileResponse(data, filePath, "private, max-age=3600");
    }

    if (folder === "portfolio") {
      const session = await getSession();
      const access = await canAccessPortfolio(publicUrl, session);
      if (!access.ok) {
        return new NextResponse(null, { status: session?.userId ? 403 : 401 });
      }
      const data = await fs.readFile(filePath);
      return fileResponse(
        data,
        filePath,
        access.cachePublic ? "public, max-age=86400" : "private, max-age=3600"
      );
    }

    const session = await getSession();
    if (!session?.userId || !isAdmin(session)) {
      return new NextResponse(null, { status: session?.userId ? 403 : 401 });
    }
    const data = await fs.readFile(filePath);
    return fileResponse(data, filePath, "private, no-store");
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
