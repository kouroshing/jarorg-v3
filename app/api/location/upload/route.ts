import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/storage/uploads";
import { resolveAdminAccess, hasAdminPermission } from "@/lib/auth/adminAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 40 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

function sniffImageMime(buf: Buffer): (typeof ALLOWED_IMAGE_MIME)[number] | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function isMp4(buf: Buffer): boolean {
  return buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "ابتدا وارد شوید." }, { status: 401 });
    }

    const admin = await resolveAdminAccess(session);
    const isAdmin = Boolean(admin && hasAdminPermission(admin, "orders_manage"));

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده." }, { status: 400 });
    }
    if (file.size < 32) {
      return NextResponse.json({ error: "فایل نامعتبر است." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageMime = sniffImageMime(bytes);
    const video = !imageMime && isMp4(bytes);

    if (!imageMime && !video) {
      return NextResponse.json(
        { error: "فقط JPG، PNG، WEBP یا ویدیوی MP4 مجاز است." },
        { status: 400 }
      );
    }

    if (imageMime && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "حجم تصویر حداکثر ۸ مگابایت." }, { status: 400 });
    }
    if (video && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: "حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد." }, { status: 400 });
    }

    const folder = "locations";
    const safeExt = video
      ? ".mp4"
      : imageMime === "image/png"
        ? ".png"
        : imageMime === "image/webp"
          ? ".webp"
          : ".jpg";
    const prefix = isAdmin ? "adm" : "usr";
    const kind = video ? "vid" : "loc";
    const filename = `${kind}_${prefix}_${session.userId.slice(0, 8)}_${Date.now()}${safeExt}`;
    const uploadDir = path.join(getUploadRoot(), folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, bytes);

    return NextResponse.json({
      success: true,
      kind: video ? "video" : "image",
      url: `/uploads/${folder}/${filename}`,
    });
  } catch (error) {
    console.error("location upload error:", error);
    return NextResponse.json({ error: "خطا در آپلود." }, { status: 500 });
  }
}
