import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerEvent } from "@/lib/jarchiEngine";

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
    return safeRedirect(`${origin}/profile?payment=failed&error=missing_authority`);
  }

  try {
    // 2. Fetch the pending Transaction by authority
    const transaction = await prisma.transaction.findUnique({
      where: { authority },
      include: { plan: true, user: true },
    });

    if (!transaction) {
      return safeRedirect(`${origin}/profile?payment=failed&error=transaction_not_found`);
    }

    // 3. If transaction is already successful, redirect
    if (transaction.status === "SUCCESS") {
      return safeRedirect(`${origin}/profile?payment=success`);
    }

    // 4. Check status from payment provider callback
    if (status !== "OK" && status !== "ok") {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      });
      return safeRedirect(`${origin}/profile?payment=failed&error=payment_canceled`);
    }

    let refId = "";

    // 5. Connect to provider verification (Mock vs. Production Zarinpal)
    if (authority.startsWith("MOCK_AUTH_PLAN_")) {
      if (process.env.NODE_ENV === "production") {
        return safeRedirect(`${origin}/profile?payment=failed&error=simulation_disabled`);
      }
      refId = `MOCK_REF_PLAN_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    } else {
      const envMerchant = process.env.ZARINPAL_MERCHANT_ID?.trim();
      const merchantId = (envMerchant && envMerchant !== "sandbox" && envMerchant !== "" && envMerchant !== "undefined")
        ? envMerchant
        : "8428f2e7-b867-411d-bf02-526eb2708f93";

      const verifyUrl = "https://payment.zarinpal.com/pg/v4/payment/verify.json";
      const zarinpalBody = {
        merchant_id: merchantId,
        amount: transaction.amount,
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
        refId = String(payload.data.ref_id);
      } else {
        // Verification failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED" },
        });
        return safeRedirect(`${origin}/profile?payment=failed&error=verification_failed`);
      }
    }

    // 6. Complete Transaction & Upgrade User (Atomic DB Operation)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + transaction.durationMonths);

    // Calculate storageLimit based on plan key
    const planKey = transaction.plan.key.toLowerCase();
    let storageLimit = 2147483648; // Default 2GB for BASIC

    if (planKey === "pro") {
      storageLimit = 2 * 1024 * 1024 * 1024; // 2 GB (2,147,483,648 bytes)
    } else if (planKey === "ultra" || planKey === "pro_max") {
      storageLimit = 20 * 1024 * 1024 * 1024; // 20 GB (21,474,836,480 bytes)
    }

    await prisma.$transaction(async (tx) => {
      // a. Mark transaction as success
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          refId,
        },
      });

      // b. Upgrade user plan and storage limits
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          planId: transaction.plan.id,
          planExpiresAt: expiryDate,
          storageLimit,
        },
      });

      // c. If coupon was applied, increment usedCount
      if (transaction.discountCode) {
        await tx.discountCode.update({
          where: { code: transaction.discountCode },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        }).catch((err) => {
          console.error("Failed to increment coupon usedCount:", err);
        });
      }
    });

    // 7. Fire Jarchi automation event (Non-blocking)
    triggerEvent("plan-upgraded", {
      userId: transaction.userId,
    });

    return safeRedirect(`${origin}/profile?payment=success`);
  } catch (error) {
    console.error("Error in Payment Verification:", error);
    return safeRedirect(`${origin}/profile?payment=failed&error=verify_internal_error`);
  }
}
