import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseOrderStatus } from "@/lib/orders/status";
import { markOrderPaid } from "@/lib/orders/payment";

export const dynamic = "force-dynamic";

/**
 * Starts payment for an order the client has already matched to a specialist.
 *
 * Two things were wrong here before. It charged `order.depositAmount`, which
 * createOrderAction hard-codes to 0, so it asked Zarinpal for a zero-rial
 * payment. And it took an orderId straight from the query string with no
 * session check at all — anyone could drive somebody else's order through
 * payment. Both are fixed below: the amount is the price agreed when the client
 * picked their specialist, and only that client (or an admin) can pay it.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(`/order/${orderId}`)}`, request.url)
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        contactPhone: true,
        status: true,
        categoryTitle: true,
        agreedTotalPrice: true,
        paidAt: true,
      },
    });

    if (!order) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    const isOwner =
      (order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone);
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.redirect(new URL("/profile", request.url));
    }

    if (order.paidAt) {
      return NextResponse.redirect(new URL(`/order/${order.id}?payment=already`, request.url));
    }

    if (parseOrderStatus(order.status) !== "AWAITING_PAYMENT") {
      return NextResponse.redirect(new URL(`/order/${order.id}?payment=not_ready`, request.url));
    }

    const amount = order.agreedTotalPrice ?? 0;
    if (amount <= 0) {
      return NextResponse.redirect(new URL(`/order/${order.id}?payment=no_amount`, request.url));
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
    const isProd = process.env.NODE_ENV === "production";

    // Sandbox / development: settle immediately so the flow can be walked
    // through end to end without a real gateway.
    if (!isProd || !merchantId || merchantId === "sandbox") {
      await markOrderPaid(order.id, `SANDBOX-${Date.now()}`);
      return NextResponse.redirect(new URL(`/order/${order.id}?payment=success`, request.url));
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/order/verify?orderId=${order.id}`;

    const res = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount,
        callback_url: callbackUrl,
        description: `پرداخت پروژه ${order.categoryTitle || "عکاسی"} (شناسه: #${order.id.slice(-6)})`,
      }),
    });

    const payload = await res.json();
    const authority: string | undefined = payload?.data?.authority;

    if (!authority) {
      console.error("[order/pay] Zarinpal did not return an authority", payload?.errors);
      return NextResponse.redirect(new URL(`/order/${order.id}?payment=failed`, request.url));
    }

    // Recorded before the redirect so the callback can find this order even if
    // the client never returns to the site.
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentAuthority: authority },
    });

    return NextResponse.redirect(`https://payment.zarinpal.com/pg/StartPay/${authority}`);
  } catch (error) {
    console.error("[order/pay] failed:", error);
    return NextResponse.redirect(new URL("/profile", request.url));
  }
}
