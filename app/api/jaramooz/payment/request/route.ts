import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "شما وارد حساب کاربری خود نشده‌اید." },
        { status: 401 }
      );
    }

    // 2. Parse courseId from request body
    const body = await request.json().catch(() => ({}));
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "شناسه دوره الزامی است." },
        { status: 400 }
      );
    }

    // 3. Find course in database by ID or slug
    let course = await prisma.course.findFirst({
      where: {
        OR: [
          { id: courseId },
          { slug: courseId },
          { slug: "photography-masterclass" },
        ],
      },
    });

    if (!course) {
      course = await prisma.course.upsert({
        where: { slug: "photography-masterclass" },
        create: {
          slug: "photography-masterclass",
          title: "مسترکلاس ۱۰۰ روزه عکاسی تجاری",
          description: "جامع‌ترین دوره ورود به بازار کار و بستن قراردادهای بین‌المللی عکاسی",
          price: 9100000,
          image: "/jaramooz/cover.jpg",
        },
        update: {},
      });
    }

    // 4. Create/Upsert PENDING purchase record
    await prisma.purchase.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
      create: {
        userId: session.userId,
        courseId: course.id,
        status: "PENDING",
      },
      update: {
        status: "PENDING",
        authority: null,
        refId: null,
      },
    });

    const envMerchant = process.env.ZARINPAL_MERCHANT_ID?.trim();
    const merchantId = (envMerchant && envMerchant !== "sandbox" && envMerchant !== "" && envMerchant !== "undefined")
      ? envMerchant
      : "8428f2e7-b867-411d-bf02-526eb2708f93";
    const isProd = process.env.NODE_ENV === "production";

    if (isProd && (merchantId === "sandbox" || merchantId === "")) {
      return NextResponse.json(
        { error: "تنظیمات درگاه پرداخت زرین‌پال در حالت پروداکشن صحیح نیست." },
        { status: 500 }
      );
    }

    // 5. Check if we should use local sandbox simulation
    if (merchantId === "sandbox" || merchantId === "") {
      const mockAuthority = `MOCK_AUTH_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

      // Update purchase with mock authority
      await prisma.purchase.update({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: course.id,
          },
        },
        data: { authority: mockAuthority },
      });

      const mockGatewayUrl = `${request.nextUrl.origin}/jaramooz/payment/mock-gateway?authority=${mockAuthority}`;
      return NextResponse.json({ url: mockGatewayUrl });
    }

    // 6. Connect to production Zarinpal API
    const requestUrl = "https://api.zarinpal.com/pg/v4/payment/request.json";
    const gatewayUrl = "https://www.zarinpal.com/pg/StartPay/";
    const callbackUrl = isProd
      ? "https://app.jarorg.ir/api/jaramooz/payment/verify"
      : `${request.nextUrl.origin}/api/jaramooz/payment/verify`;

    const zarinpalBody = {
      merchant_id: merchantId,
      amount: course.price,
      callback_url: callbackUrl,
      description: `خرید دوره: ${course.title}`,
      metadata: {
        mobile: session.phone,
      },
    };

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zarinpalBody),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    const payload: any = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.errors?.length > 0 || !payload.data?.authority) {
      const errMsg = payload?.errors?.message || "خطا در پاسخ‌دهی درگاه زرین‌پال";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const authority = payload.data.authority;

    // Update purchase with official authority
    await prisma.purchase.update({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
      data: { authority },
    });

    return NextResponse.json({ url: `${gatewayUrl}${authority}` });
  } catch (error: any) {
    console.error("[payment_request_error]", error);
    return NextResponse.json(
      { error: "خطای داخلی سرور در اتصال به درگاه پرداخت." },
      { status: 500 }
    );
  }
}
