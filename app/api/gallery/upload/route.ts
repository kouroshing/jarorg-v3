import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkStorageQuota } from "@/app/actions/galleryActions";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSpecialist =
      (session.role as string) === "specialist" ||
      (session.role as string) === "ADMIN" ||
      (session.role as string) === "admin";
    if (!isSpecialist) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check storage limits first
    const quotaRes = await checkStorageQuota(file.size);
    if (!quotaRes.success) {
      return NextResponse.json({ error: quotaRes.error }, { status: 400 });
    }

    // Save locally on server inside public/uploads/gallery
    const ext = path.extname(file.name) || ".jpg";
    const filename = `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "gallery");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/gallery/${filename}`;

    // Update user's usedStorage in database
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        usedStorage: {
          increment: file.size,
        },
      },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      originalUrl: fileUrl,
      watermarkedUrl: fileUrl,
    });
  } catch (error) {
    console.error("Gallery Upload Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
