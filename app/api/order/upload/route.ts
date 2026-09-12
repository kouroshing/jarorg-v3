import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/storage/uploads";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "برای بارگذاری تصویر ابتدا وارد شوید." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "هیچ فایلی ارسال نشده است." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: "فرمت فایل مجاز نیست. لطفاً تصویر JPG، PNG یا WEBP ارسال کنید." }, { status: 400 });
    }

    const ext = path.extname(file.name) || ".jpg";
    const filename = `moodboard_${session.userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const uploadDir = path.join(getUploadRoot(), "moodboards");

    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/moodboards/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Order moodboard upload error:", error);
    return NextResponse.json({ error: "خطایی در بارگذاری تصویر رخ داد." }, { status: 500 });
  }
}
