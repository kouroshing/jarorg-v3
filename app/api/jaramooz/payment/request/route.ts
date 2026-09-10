import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { courseChargeAmount } from "@/lib/jaramooz/pricing";
import { resolveZarinpalMerchant } from "@/lib/payments/zarinpal";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "شما وارد حساب کاربری خود نشده‌اید." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "شناسه دوره الزامی است." },
        { status: 400 }
      );
    }

    let course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });

    if (!course) {
      course = await prisma.course.upsert({
        where: { slug: "photography-masterclass" },
        create: {
          slug: "photography-masterclass",
          title: "مسترکلاس ۱۰۰ روزه عکاسی تجاری",
          description: "جامع‌ترین دوره ورود به بازار کار و بستن قراردادهای بین‌المللی عکاسی",
          price: 9_100_000,
          image: "/jaramooz/cover.jpg",
        },
        update: {},
      });
    }

    const amount = courseChargeAmount(course.price);

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
        amount,
        status: "PENDING",
      },
      update: {
        amount,
        status: "PENDING",
        authority: null,
        refId: null,
      },
    });

    const merchant = resolveZarinpalMerchant();
    if (!merchant.ok) {
      return NextResponse.json({ error: merchant.error }, { status: 500 });
    }

    if (merchant.sandbox) {
      const mockAuthority = `MOCK_AUTH_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

      await prisma.purchase.update({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: course.id,
          },
        },
        data: { authority: mockAuthority, amount },
      });

      const mockGatewayUrl = `${request.nextUrl.origin}/jaramooz/payment/mock-gateway?authority=${mockAuthority}`;
      return NextResponse.json({ url: mockGatewayUrl });
    }

    const isProd = process.env.NODE_ENV === "production";
    const requestUrl = "https://api.zarinpal.com/pg/v4/payment/request.json";
    const gatewayUrl = "https://www.zarinpal.com/pg/StartPay/";
    const callbackUrl = isProd
      ? "https://app.jarorg.ir/api/jaramooz/payment/verify"
      : `${request.nextUrl.origin}/api/jaramooz/payment/verify`;

    const zarinpalBody = {
      merchant_id: merchant.merchantId,
      amount,
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
      signal: AbortSignal.timeout(15000),
    });

    const payload: any = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.errors?.length > 0 || !payload.data?.authority) {
      const errMsg = payload?.errors?.message || "خطا در پاسخ‌دهی درگاه زرین‌پال";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const authority = payload.data.authority;

    await prisma.purchase.update({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
      data: { authority, amount },
    });

    return NextResponse.json({ url: `${gatewayUrl}${authority}` });
  } catch (error: unknown) {
    console.error("[payment_request_error]", error);
    return NextResponse.json(
      { error: "خطای داخلی سرور در اتصال به درگاه پرداخت." },
      { status: 500 }
    );
  }
}
