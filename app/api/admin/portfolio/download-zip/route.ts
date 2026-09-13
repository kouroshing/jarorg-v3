import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/session";
import {
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import { prisma } from "@/lib/prisma";
import { resolveUploadDiskPath } from "@/lib/storage/uploads";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 40;

function safeSegment(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (cleaned.slice(0, 48) || fallback).normalize("NFC");
}

function extensionFromUrl(fileUrl: string, mediaType: string): string {
  const ext = path.extname(fileUrl.split("?")[0] || "");
  if (ext && ext.length <= 8) return ext.toLowerCase();
  return mediaType === "VIDEO" ? ".mp4" : ".jpg";
}

export async function POST(request: Request) {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "specialists_review")) {
    return NextResponse.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const ids = Array.isArray((body as { ids?: unknown })?.ids)
    ? ((body as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string" && id.length > 0))
    : [];

  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "هیچ نمونه‌کاری انتخاب نشده است." }, { status: 400 });
  }
  if (uniqueIds.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_ITEMS} فایل در هر دانلود مجاز است.` },
      { status: 400 }
    );
  }

  const items = await prisma.portfolioItem.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      specialist: {
        select: {
          id: true,
          user: { select: { displayName: true } },
        },
      },
    },
  });

  if (items.length === 0) {
    return NextResponse.json({ error: "نمونه‌کاری یافت نشد." }, { status: 404 });
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const zip = new JSZip();
  const usedNames = new Set<string>();
  let added = 0;
  const missing: string[] = [];

  for (const id of uniqueIds) {
    const item = byId.get(id);
    if (!item) {
      missing.push(id);
      continue;
    }

    const diskPath = resolveUploadDiskPath(item.fileUrl);
    if (!diskPath) {
      missing.push(id);
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(diskPath);
    } catch {
      missing.push(id);
      continue;
    }

    const displayName = safeSegment(
      item.specialist?.user?.displayName || "specialist",
      "specialist"
    );
    const category =
      CATEGORIES_BY_SLUG[item.categorySlug]?.title || item.categorySlug;
    const categorySeg = safeSegment(category, item.categorySlug || "cat");
    const ext = extensionFromUrl(item.fileUrl, item.mediaType);
    let base = `${displayName}_${categorySeg}_${item.id.slice(0, 8)}${ext}`;
    let n = 2;
    while (usedNames.has(base.toLowerCase())) {
      base = `${displayName}_${categorySeg}_${item.id.slice(0, 8)}_${n}${ext}`;
      n += 1;
    }
    usedNames.add(base.toLowerCase());
    zip.file(base, buffer);
    added += 1;
  }

  if (added === 0) {
    return NextResponse.json(
      { error: "هیچ فایلی روی دیسک پیدا نشد.", missing },
      { status: 404 }
    );
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `jar-portfolio-${stamp}-${added}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Jar-Missing-Count": String(missing.length),
      "X-Jar-Added-Count": String(added),
    },
  });
}
