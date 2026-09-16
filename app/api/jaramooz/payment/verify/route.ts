import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerEvent } from "@/lib/jarchiEngine";
import { generateSpotPlayerLicense } from "@/lib/spotplayer";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { sessionRoleFromPhone } from "@/lib/auth/roles";
import { resolveZarinpalMerchant, tomanToRial } from "@/lib/payments/zarinpal";
import { courseChargeAmount } from "@/lib/jaramooz/pricing";

export const dynamic = "force-dynamic";

function safeRedirect(url: string) {
  return NextResponse.redirect(new URL(encodeURI(url)));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const authority = searchParams.get("Authority") || searchParams.get("authority");
  const status = searchParams.get("Status") || searchParams.get("status");

  const origin = request.nextUrl.origin;

  // 1. Validate inputs
  if (!authority) {
    return safeRedirect(`${origin}/jaramooz?error=missing_authority`);
  }

  try {
    // 2. Fetch the pending purchase by authority
    const purchase = await prisma.purchase.findUnique({
      where: { authority },
      include: { course: true, user: true },
    });

    if (!purchase) {
      return safeRedirect(`${origin}/jaramooz?error=purchase_not_found`);
    }

    // 3. If Status is not OK, the user canceled or payment failed
    if (status !== "OK" && status !== "ok") {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED" },
      });
      return safeRedirect(
        `${origin}/jaramooz/courses/${purchase.courseId}?error=payment_failed`
      );
    }

    if (authority.startsWith("MOCK_AUTH_")) {
      if (process.env.NODE_ENV === "production") {
        return safeRedirect(`${origin}/jaramooz?error=payment_simulation_disabled`);
      }
      const mockRefId = `MOCK_REF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      let licenseKey = purchase.licenseKey;
      if (!licenseKey) {
        licenseKey = await generateSpotPlayerLicense(
          purchase.userId,
          purchase.user.displayName || "",
          purchase.courseId
        );
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "SUCCESS",
          refId: mockRefId,
          licenseKey,
        },
      });

      triggerEvent("jaramooz-payment-success", {
        userId: purchase.userId,
        courseTitle: purchase.course.title,
      });

      const res = safeRedirect(
        `${origin}/jaramooz/payment-success?authority=${purchase.authority}`
      );
      const token = await signSessionToken({
        userId: purchase.user.id,
        phone: purchase.user.phone,
        role: sessionRoleFromPhone(purchase.user.phone),
      });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    // Verify against the course list price, not a previously stored amount.
    // A PENDING row written under the old client-controlled `amount` field
    // must not be able to clear a 9.1M course for a 1,000-toman gateway call.
    const finalAmount = courseChargeAmount(purchase.course.price);

    const merchant = resolveZarinpalMerchant();
    if (!merchant.ok || merchant.sandbox) {
      return safeRedirect(`${origin}/jaramooz?error=payment_configuration`);
    }

    const verifyUrl = "https://api.zarinpal.com/pg/v4/payment/verify.json";
    const merchantId = merchant.merchantId;

    const zarinpalBody = {
      merchant_id: merchantId,
      amount: tomanToRial(finalAmount),
      authority: authority,
    };

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zarinpalBody),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    const payload: any = await response.json().catch(() => null);

    if (
      response.ok &&
      payload &&
      payload.data &&
      (payload.data.code === 100 || payload.data.code === 101)
    ) {
      // Payment verified successfully
      const refId = String(payload.data.ref_id || "");

      let licenseKey = purchase.licenseKey;
      if (!licenseKey) {
        licenseKey = await generateSpotPlayerLicense(
          purchase.userId,
          purchase.user.displayName || "",
          purchase.courseId
        );
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: "SUCCESS",
          refId: refId,
          licenseKey,
        },
      });

      triggerEvent("jaramooz-payment-success", {
        userId: purchase.userId,
        courseTitle: purchase.course.title,
      });

      const res = safeRedirect(
        `${origin}/jaramooz/payment-success?authority=${purchase.authority}`
      );
      const token = await signSessionToken({
        userId: purchase.user.id,
        phone: purchase.user.phone,
        role: sessionRoleFromPhone(purchase.user.phone),
      });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    } else {
      console.error("[payment_verify_zarinpal_fail]", payload);
      // Payment verification failed
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED" },
      });

      return safeRedirect(
        `${origin}/jaramooz/courses/${purchase.courseId}?error=payment_failed`
      );
    }
  } catch (error) {
    console.error("[payment_verify_error]", error);
    return safeRedirect(`${origin}/jaramooz?error=verify_internal_error`);
  }
}
