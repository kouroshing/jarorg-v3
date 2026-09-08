import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePhoneForOtp } from "@/lib/auth/otp";
import { dbRoleFromPhone } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { courseId, phone } = body;

    if (!courseId || !phone) {
      return NextResponse.json(
        { error: "شناسه دوره و شماره موبایل الزامی است." },
        { status: 400 }
      );
    }

    const resolved = resolvePhoneForOtp(phone);
    if (!resolved.ok) {
      return NextResponse.json(
        { error: "شماره موبایل معتبر نیست." },
        { status: 400 }
      );
    }

    // Find course by ID, slug, or default photography-masterclass
    let course = await prisma.course.findFirst({
      where: {
        OR: [
          { id: courseId },
          { slug: courseId },
          { slug: "photography-masterclass" },
        ],
      },
    });

    // Self-healing: if course does not exist in DB yet, auto-create it
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

    // Upsert User dynamically
    const phoneDigits = resolved.phoneDigits;
    const dbRole = dbRoleFromPhone(phoneDigits);
    const user = await prisma.user.upsert({
      where: { phone: phoneDigits },
      create: { phone: phoneDigits, role: dbRole },
      update: {},
    });

    const finalAmount =
      typeof body.amount === "number" && body.amount > 0
        ? Math.round(body.amount)
        : course.price;

    const envMerchant = process.env.ZARINPAL_MERCHANT_ID?.trim();
    const merchantId = (envMerchant && envMerchant !== "sandbox" && envMerchant !== "" && envMerchant !== "undefined")
      ? envMerchant
      : "8428f2e7-b867-411d-bf02-526eb2708f93";

    const isProd = process.env.NODE_ENV === "production";
    const mockAuthority = `MOCK_AUTH_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

    let redirectUrl = "";
    let finalAuthority = mockAuthority;

    // Test bypass accounts can use instant mock gateway if requested or proceed
    const isTestBypass = ["09123456789", "09100138383"].includes(resolved.localPhone) && process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true";

    if (isTestBypass && (merchantId === "sandbox" || !isProd)) {
      redirectUrl = `${request.nextUrl.origin}/jaramooz/payment/mock-gateway?authority=${mockAuthority}`;
    } else {
      const requestUrl = "https://api.zarinpal.com/pg/v4/payment/request.json";
      const origin = request.nextUrl.origin;
      const callbackUrl = origin.includes("localhost")
        ? `${origin}/api/jaramooz/payment/verify`
        : "https://app.jarorg.ir/api/jaramooz/payment/verify";

      const zarinpalBody = {
        merchant_id: merchantId,
        amount: finalAmount,
        callback_url: callbackUrl,
        description: `خرید دوره: ${course.title}`,
        metadata: {
          mobile: resolved.localPhone,
        },
      };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zarinpalBody),
        signal: AbortSignal.timeout(15000),
      });

      const payload: any = await response.json().catch(() => null);
      if (response.ok && payload && payload.data?.authority) {
        finalAuthority = payload.data.authority;
        redirectUrl = `https://www.zarinpal.com/pg/StartPay/${finalAuthority}`;
      } else {
        const errMsg = payload?.errors?.message || "خطا در پاسخ‌دهی درگاه زرین‌پال";
        console.error("[Zarinpal Payment Error] Details:", payload);
        if (isProd && !isTestBypass) {
          return NextResponse.json(
            { error: `اتصال به درگاه پرداخت زرین‌پال برقرار نشد: ${errMsg}` },
            { status: 502 }
          );
        }
        // Fallback to mock gateway for test accounts
        redirectUrl = `${request.nextUrl.origin}/jaramooz/payment/mock-gateway?authority=${mockAuthority}`;
      }
    }

    // Upsert Purchase record linked to this user and course as PENDING
    await prisma.purchase.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      create: {
        userId: user.id,
        courseId: course.id,
        amount: finalAmount,
        status: "PENDING",
        authority: finalAuthority,
      },
      update: {
        amount: finalAmount,
        status: "PENDING",
        authority: finalAuthority,
        refId: null,
        licenseKey: null,
      },
    });

    return NextResponse.json({ success: true, url: redirectUrl });
  } catch (error: any) {
    console.error("[payment_initiate_error]", error);
    return NextResponse.json(
      { error: "خطای داخلی سرور در ثبت درخواست پرداخت." },
      { status: 500 }
    );
  }
}
