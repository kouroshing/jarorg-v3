import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/orders/status";

export const dynamic = "force-dynamic";

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
    });

    if (!order) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    if (status !== "OK" || !authority) {
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=cancelled`, request.url));
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchantId || merchantId === "sandbox") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "DEPOSIT_PAID" satisfies OrderStatus },
      });
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    }

    // Verify with ZarinPal
    const verifyRes = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: order.depositAmount,
        authority,
      }),
    });

    const verifyData: any = await verifyRes.json().catch(() => null);

    if (verifyRes.ok && (verifyData?.data?.code === 100 || verifyData?.data?.code === 101)) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "DEPOSIT_PAID" satisfies OrderStatus },
      });
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    } else {
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=failed`, request.url));
    }
  } catch (err) {
    console.error("Error in order payment verification:", err);
    return NextResponse.redirect(new URL("/order", request.url));
  }
}
