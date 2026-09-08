import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/orders/status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.redirect(new URL("/order", request.url));
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
    const isProd = process.env.NODE_ENV === "production";

    // If sandbox / development, simulate successful deposit payment
    if (!isProd || !merchantId || merchantId === "sandbox") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "DEPOSIT_PAID" satisfies OrderStatus },
      });

      return NextResponse.redirect(new URL(`/order/${orderId}?payment=success`, request.url));
    }

    // Production Zarinpal gateway request
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/order/verify?orderId=${order.id}`;

    const zarinpalBody = {
      merchant_id: merchantId,
      amount: order.depositAmount,
      callback_url: callbackUrl,
      description: `پیش‌پرداخت بیعانه ۵۰٪ پروژه ${order.categoryTitle || "عکاسی"} (شناسه: #${order.id.slice(-6)})`,
      metadata: {
        mobile: order.contactPhone || "",
      },
    };

    const res = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zarinpalBody),
      signal: AbortSignal.timeout(15000),
    });

    const data: any = await res.json().catch(() => null);

    if (res.ok && data?.data?.authority) {
      return NextResponse.redirect(`https://www.zarinpal.com/pg/StartPay/${data.data.authority}`);
    } else {
      console.error("Zarinpal payment initiation failed:", data);
      return NextResponse.redirect(new URL(`/order/${orderId}?payment=error`, request.url));
    }
  } catch (error) {
    console.error("Error in order payment redirect:", error);
    return NextResponse.redirect(new URL("/order", request.url));
  }
}
