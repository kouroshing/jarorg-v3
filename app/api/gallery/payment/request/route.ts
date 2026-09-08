import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { projectId, phone, photoIds } = await request.json();

    if (!projectId || !phone || !photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "اطلاعات سفارش ناقص است." },
        { status: 400 }
      );
    }

    // 1. Fetch project details
    const project = await prisma.galleryProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: "پروژه عکاسی یافت نشد." },
        { status: 404 }
      );
    }

    let totalAmount = project.price * photoIds.length;
    if (
      project.discountThreshold &&
      project.discountedPrice &&
      photoIds.length >= project.discountThreshold
    ) {
      totalAmount = project.discountedPrice * photoIds.length;
    }

    // 2. Handle 100% free orders (amount is 0)
    if (totalAmount === 0) {
      const mockRefId = `FREE_GALLERY_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const mockAuthority = `FREE_AUTH_GALLERY_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

      await prisma.galleryOrder.create({
        data: {
          phone,
          projectId,
          amount: 0,
          status: "SUCCESS",
          authority: mockAuthority,
          refId: mockRefId,
          items: {
            create: photoIds.map(id => ({ photoId: id }))
          }
        }
      });

      const successUrl = `${request.url.replace(/\/api\/gallery\/payment\/request.*/, "")}/api/gallery/verify?Authority=${mockAuthority}&Status=OK`;
      return NextResponse.json({ url: successUrl });
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim() || "sandbox";
    const isProd = process.env.NODE_ENV === "production";

    if (isProd && (merchantId === "sandbox" || merchantId === "")) {
      return NextResponse.json(
        { error: "تنظیمات درگاه پرداخت زرین‌پال در محیط سرور صحیح نیست." },
        { status: 500 }
      );
    }

    // 3. Mock Sandbox Gateway
    if (merchantId === "sandbox" || merchantId === "") {
      const mockAuthority = `MOCK_AUTH_GALLERY_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

      await prisma.galleryOrder.create({
        data: {
          phone,
          projectId,
          amount: totalAmount,
          status: "PENDING",
          authority: mockAuthority,
          items: {
            create: photoIds.map(id => ({ photoId: id }))
          }
        }
      });

      const mockGatewayUrl = `${request.url.replace(/\/api\/gallery\/payment\/request.*/, "")}/checkout/payment-mock-gateway?authority=${mockAuthority}`;
      return NextResponse.json({ url: mockGatewayUrl });
    }

    // 4. Connect to production Zarinpal API
    const requestUrl = "https://api.zarinpal.com/pg/v4/payment/request.json";
    const gatewayUrl = "https://www.zarinpal.com/pg/StartPay/";
    const callbackUrl = isProd
      ? "https://app.jarorg.ir/api/gallery/verify"
      : `${request.url.replace(/\/api\/gallery\/payment\/request.*/, "")}/api/gallery/verify`;

    const zarinpalBody = {
      merchant_id: merchantId,
      amount: totalAmount,
      callback_url: callbackUrl,
      description: `خرید شات‌های گالری عکاسی: ${project.title} (${photoIds.length} عدد)`,
      metadata: {
        mobile: phone
      }
    };

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zarinpalBody),
      signal: AbortSignal.timeout(15000)
    });

    const payload: any = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.errors?.length > 0 || !payload.data?.authority) {
      const errMsg = payload?.errors?.message || "خطا در پاسخ‌دهی درگاه زرین‌پال";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const authority = payload.data.authority;

    // Create database GalleryOrder record
    await prisma.galleryOrder.create({
      data: {
        phone,
        projectId,
        amount: totalAmount,
        status: "PENDING",
        authority,
        items: {
          create: photoIds.map(id => ({ photoId: id }))
        }
      }
    });

    return NextResponse.json({ url: `${gatewayUrl}${authority}` });
  } catch (error) {
    console.error("Error in Gallery Payment Request:", error);
    return NextResponse.json({ error: "خطای داخلی در اتصال به درگاه پرداخت." }, { status: 500 });
  }
}
