import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verify User Login
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "کاربر احراز هویت نشده است." }, { status: 401 });
    }

    const body = await request.json();
    const { planId, discountCode, period } = body;

    if (!planId) {
      return NextResponse.json({ error: "شناسه پلن ارسال نشده است." }, { status: 400 });
    }

    // 2. Fetch Plan metadata
    let plan = await prisma.plan.findUnique({
      where: { key: planId }
    });

    if (!plan) {
      plan = await prisma.plan.findUnique({
        where: { id: planId }
      });
    }

    if (!plan) {
      return NextResponse.json({ error: "پلن مورد نظر یافت نشد." }, { status: 404 });
    }

    // 3. Resolve original amount
    const isAnnual = period === "annual";
    const originalAmount = isAnnual ? plan.price12Months : plan.price3Months;

    // 4. Recalculate amount with coupon validation (server-side verification)
    let finalAmount = originalAmount;
    let discountPercent = 0;
    let discountAmount = 0;

    if (discountCode) {
      const cleanCode = discountCode.toUpperCase().trim();
      const discount = await prisma.discountCode.findUnique({
        where: { code: cleanCode }
      });

      if (!discount || !discount.isActive) {
        return NextResponse.json({ error: "کد تخفیف نامعتبر یا غیرفعال است." }, { status: 400 });
      }

      if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
        return NextResponse.json({ error: "کد تخفیف منقضی شده است." }, { status: 400 });
      }

      if (discount.usedCount >= discount.maxUsage) {
        return NextResponse.json({ error: "ظرفیت استفاده از کد تخفیف پایان یافته است." }, { status: 400 });
      }

      discountPercent = discount.discountPercent;
      discountAmount = Math.floor(originalAmount * (discountPercent / 100));

      if (discount.maxAmount && discount.maxAmount > 0) {
        discountAmount = Math.min(discountAmount, discount.maxAmount);
      }

      finalAmount = Math.max(0, originalAmount - discountAmount);
    }

    // 4b. Handle free payments (100% discount)
    if (finalAmount === 0) {
      const mockRefId = `FREE_UPGRADE_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (isAnnual ? 12 : 3));

      // Calculate storageLimit based on plan key
      const planKey = plan.key.toLowerCase();
      let storageLimit = 2147483648; // Default 2GB for BASIC

      if (planKey === "pro") {
        storageLimit = 2 * 1024 * 1024 * 1024;
      } else if (planKey === "ultra" || planKey === "pro_max") {
        storageLimit = 20 * 1024 * 1024 * 1024;
      }

      await prisma.$transaction(async (tx) => {
        // a. Create Transaction as SUCCESS
        await tx.transaction.create({
          data: {
            userId: session.userId,
            planId: plan.id,
            amount: 0,
            durationMonths: isAnnual ? 12 : 3,
            discountCode: discountCode || null,
            status: "SUCCESS",
            authority: `FREE_AUTH_${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
            refId: mockRefId
          }
        });

        // b. Upgrade user plan and storage limits
        await tx.user.update({
          where: { id: session.userId },
          data: {
            planId: plan.id,
            planExpiresAt: expiryDate,
            storageLimit,
          },
        });

        // c. If coupon was applied, increment usedCount
        if (discountCode) {
          await tx.discountCode.update({
            where: { code: discountCode.toUpperCase().trim() },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          }).catch((err) => {
            console.error("Failed to increment free coupon usedCount:", err);
          });
        }
      });

      // Fire Jarchi automation event (Non-blocking)
      const { triggerEvent } = require("@/lib/jarchiEngine");
      triggerEvent("plan-upgraded", {
        userId: session.userId,
      });

      const callbackUrl = `${request.url.replace(/\/api\/payment\/request.*/, "")}/profile?payment=success`;
      return NextResponse.json({ url: callbackUrl });
    }

    const envMerchant = process.env.ZARINPAL_MERCHANT_ID?.trim();
    const merchantId = (envMerchant && envMerchant !== "sandbox" && envMerchant !== "" && envMerchant !== "undefined")
      ? envMerchant
      : "8428f2e7-b867-411d-bf02-526eb2708f93";
    const isProd = process.env.NODE_ENV === "production";

    // 5. Mock Sandbox Gateway
    if (merchantId === "sandbox" || merchantId === "") {
      const mockAuthority = `MOCK_AUTH_PLAN_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

      // Create transaction row
      await prisma.transaction.create({
        data: {
          userId: session.userId,
          planId: plan.id,
          amount: finalAmount,
          durationMonths: isAnnual ? 12 : 3,
          discountCode: discountCode || null,
          status: "PENDING",
          authority: mockAuthority
        }
      });

      const mockGatewayUrl = `${request.url.replace(/\/api\/payment\/request.*/, "")}/checkout/payment-mock-gateway?authority=${mockAuthority}`;
      return NextResponse.json({ url: mockGatewayUrl });
    }

    // 6. Connect to production Zarinpal API
    const requestUrl = "https://api.zarinpal.com/pg/v4/payment/request.json";
    const gatewayUrl = "https://www.zarinpal.com/pg/StartPay/";
    const callbackUrl = isProd
      ? "https://app.jarorg.ir/api/payment/verify"
      : `${request.url.replace(/\/api\/payment\/request.*/, "")}/api/payment/verify`;

    const zarinpalBody = {
      merchant_id: merchantId,
      amount: finalAmount,
      callback_url: callbackUrl,
      description: `خرید اشتراک پلتفرم جار: ${plan.nameFa} (${isAnnual ? "یک ساله" : "سه ماهه"})`,
      metadata: {
        mobile: session.phone
      }
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

    // Create database Transaction record
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        planId: plan.id,
        amount: finalAmount,
        durationMonths: isAnnual ? 12 : 3,
        discountCode: discountCode || null,
        status: "PENDING",
        authority
      }
    });

    return NextResponse.json({ url: `${gatewayUrl}${authority}` });
  } catch (error) {
    console.error("Error in Payment Request:", error);
    return NextResponse.json({ error: "خطای داخلی در اتصال به درگاه پرداخت." }, { status: 500 });
  }
}
