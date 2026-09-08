import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only real database project records are processed

  // 2. Database Flow
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { googleDriveFolderId: true, contactPhone: true, userId: true, serviceType: true, paymentStatus: true }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isOwner = project.contactPhone === session.phone || project.userId === session.userId;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "دانلود فایل‌های این پروژه به صورت مستقیم در دسترس است." },
    { status: 400 }
  );
}
