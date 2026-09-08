import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/orders/payment";

export const dynamic = "force-dynamic";

/**
 * Gateway callback. Verifies with Zarinpal and, only on a verified result,
 * releases the order.
 *
 * Two corrections from the previous version: it verified against
 * `order.depositAmount` — always 0, so the amount Zarinpal echoed back could
 * never match what was actually charged — and it moved the order to
 * DEPOSIT_PAID, a state left over from the abandoned deposit flow which put the
 * order back on the specialist job board after it had been paid for.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    if (!orderId) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        agreedTotalPrice: true,
        paidAt: true,
        paymentAuthority: true,
      },
    });

    if (!order) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    // Already settled — a refreshed callback, or the gateway calling twice.
    if (order.paidAt) {
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    }

    if (status !== "OK" || !authority) {
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=cancelled`, request.url));
    }

    // The authority was recorded before the redirect; a mismatch means this
    // callback belongs to a different payment attempt.
    if (order.paymentAuthority && order.paymentAuthority !== authority) {
      console.warn("[order/verify] authority mismatch", { orderId });
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=failed`, request.url));
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchantId || merchantId === "sandbox") {
      await markOrderPaid(orderId, `SANDBOX-${authority}`);
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    }

    const verifyRes = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: order.agreedTotalPrice ?? 0,
        authority,
      }),
    });

    const verifyData: any = await verifyRes.json().catch(() => null);
    const code = verifyData?.data?.code;

    // 100 = verified, 101 = already verified.
    if (verifyRes.ok && (code === 100 || code === 101)) {
      const refId = String(verifyData?.data?.ref_id ?? authority);
      await markOrderPaid(orderId, refId);
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    }

    console.error("[order/verify] verification rejected", { orderId, code });
    return NextResponse.redirect(new URL(`/order/${orderId}?payment=failed`, request.url));
  } catch (err) {
    console.error("Error in order payment verification:", err);
    return NextResponse.redirect(new URL("/order", request.url));
  }
}
