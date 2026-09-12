import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/storage/uploads";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_KINDS = new Set(["avatar"]);

function sniffImageMime(buf: Buffer): (typeof ALLOWED_MIME)[number] | null {
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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "ابتدا وارد شوید." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kindRaw = String(formData.get("kind") || "avatar").toLowerCase().trim();
    const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : null;

    if (!kind) {
      return NextResponse.json({ error: "نوع آپلود نامعتبر است." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم حداکثر ۸ مگابایت." }, { status: 400 });
    }
    if (file.size < 32) {
      return NextResponse.json({ error: "فایل تصویر نامعتبر است." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageMime(bytes);
    if (!sniffed || !ALLOWED_MIME.includes(sniffed)) {
      return NextResponse.json({ error: "فقط JPG، PNG یا WEBP واقعی مجاز است." }, { status: 400 });
    }

    const folder = "avatars";
    const safeExt =
      sniffed === "image/png" ? ".png" : sniffed === "image/webp" ? ".webp" : ".jpg";
    const filename = `avatar_${session.userId.slice(0, 8)}_${Date.now()}${safeExt}`;
    const uploadDir = path.join(getUploadRoot(), folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, bytes);

    return NextResponse.json({
      success: true,
      url: `/uploads/${folder}/${filename}`,
    });
  } catch (error) {
    console.error("specialist upload error:", error);
    return NextResponse.json({ error: "خطا در آپلود." }, { status: 500 });
  }
}
