import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { getUploadRoot } from "@/lib/storage/uploads";
import { prisma } from "@/lib/prisma";
import { parseOrderStatus } from "@/lib/orders/status";
import { resolveAdminAccess, hasAdminPermission } from "@/lib/auth/adminAccess";
import {
  isAllowedDeliverableMime,
  MAX_DELIVERABLE_FILE_BYTES,
  MAX_ORDER_DELIVERABLES,
} from "@/lib/orders/deliverables";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "برای بارگذاری ابتدا وارد شوید." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orderId = String(formData.get("orderId") || "").trim();
    const labelRaw = String(formData.get("label") || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "شناسه سفارش لازم است." }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "هیچ فایلی ارسال نشده است." }, { status: 400 });
    }
    if (file.size > MAX_DELIVERABLE_FILE_BYTES) {
      return NextResponse.json(
        { error: "حجم فایل نباید بیشتر از ۲۵ مگابایت باشد." },
        { status: 400 }
      );
    }

    const mime = (file.type || "").toLowerCase();
    if (!isAllowedDeliverableMime(mime)) {
      return NextResponse.json(
        { error: "فرمت مجاز: تصویر (JPG/PNG/WEBP)، PDF یا ZIP." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paidAt: true,
        deliveredAt: true,
        settledAt: true,
        disputedAt: true,
        status: true,
        selectedSpecialistId: true,
        _count: { select: { deliverables: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
    }

    const adminAccess = await resolveAdminAccess(session);
    const isAdmin = Boolean(adminAccess && hasAdminPermission(adminAccess, "orders_manage"));
    const isSpecialist = order.selectedSpecialistId === session.userId;

    if (!isAdmin && !isSpecialist) {
      return NextResponse.json({ error: "فقط متخصص منتخب می‌تواند فایل تحویل بفرستد." }, { status: 403 });
    }
    if (!order.paidAt) {
      return NextResponse.json({ error: "تا قبل از پرداخت امکان آپلود تحویل نیست." }, { status: 400 });
    }
    if (order.settledAt) {
      return NextResponse.json({ error: "این پروژه تسویه شده است." }, { status: 400 });
    }
    if (order.deliveredAt && !isAdmin) {
      return NextResponse.json(
        { error: "پس از ثبت تحویل نمی‌توان فایل جدید افزود." },
        { status: 400 }
      );
    }
    if (parseOrderStatus(order.status) !== "CONFIRMED" && !order.disputedAt) {
      return NextResponse.json({ error: "وضعیت سفارش اجازه آپلود نمی‌دهد." }, { status: 400 });
    }
    if (order._count.deliverables >= MAX_ORDER_DELIVERABLES) {
      return NextResponse.json(
        { error: `حداکثر ${MAX_ORDER_DELIVERABLES} مورد تحویل مجاز است.` },
        { status: 400 }
      );
    }

    const ext =
      EXT_BY_MIME[mime] ||
      path.extname(file.name).toLowerCase() ||
      ".bin";
    const filename = `deliverable_${order.id.slice(0, 8)}_${session.userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(getUploadRoot(), "deliverables");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/deliverables/${filename}`;
    const label = labelRaw.slice(0, 120) || null;

    const row = await prisma.orderDeliverable.create({
      data: {
        orderId: order.id,
        uploadedById: session.userId,
        kind: "FILE",
        fileUrl,
        label,
        fileName: file.name.slice(0, 200) || filename,
        mimeType: mime,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      id: row.id,
      url: fileUrl,
      fileName: row.fileName,
    });
  } catch (error) {
    console.error("Order deliverable upload error:", error);
    return NextResponse.json({ error: "خطایی در بارگذاری فایل رخ داد." }, { status: 500 });
  }
}
