import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "ابتدا وارد شوید." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kind = String(formData.get("kind") || "avatar");

    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم حداکثر ۸ مگابایت." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: "فقط JPG، PNG یا WEBP." }, { status: 400 });
    }

    const folder = kind === "avatar" ? "avatars" : "specialists";
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${kind}_${session.userId.slice(0, 8)}_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      url: `/uploads/${folder}/${filename}`,
    });
  } catch (error) {
    console.error("specialist upload error:", error);
    return NextResponse.json({ error: "خطا در آپلود." }, { status: 500 });
  }
}
