import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeRedirect(url: string) {
  return NextResponse.redirect(new URL(encodeURI(url)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");

  if (!authority) {
    return NextResponse.json({ error: "Authority parameter missing" }, { status: 400 });
  }

  // 1. Fetch pending order
  const order = await prisma.galleryOrder.findUnique({
    where: { authority },
    include: { project: true }
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const origin = request.url.replace(/\/api\/gallery\/payment\/verify.*/, "");

  try {
    // Calculate dynamic commission shares
    const settings = await prisma.pwaSettings.findUnique({ where: { id: "system-config" } });
    const commission = settings?.galleryCommission ?? 0;

    // 2. Handle Free or Sandbox payment simulations
    if (authority.startsWith("FREE_AUTH_") || authority.startsWith("MOCK_AUTH_")) {
      if (status !== "OK") {
        await prisma.galleryOrder.update({
          where: { id: order.id },
          data: { status: "FAILED" }
        });
        return safeRedirect(`${origin}/gallery/${order.project.slug}?payment=failed`);
      }

      const mockRefId = authority.startsWith("FREE_AUTH_")
        ? `FREE_REF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : `MOCK_REF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const siteShare = Math.floor(order.amount * (commission / 100));
      const expertShare = Math.max(0, order.amount - siteShare);

      await prisma.$transaction(async (tx) => {
        await tx.galleryOrder.update({
          where: { id: order.id },
          data: {
            status: "SUCCESS",
            refId: mockRefId
          }
        });

        await tx.user.update({
          where: { id: order.project.userId },
          data: {
            walletBalance: {
              increment: expertShare
            }
          }
        });
      });

      return safeRedirect(
        `${origin}/gallery/${order.project.slug}?payment=success&authority=${order.authority}`
      );
    }

    // 3. Verify with Zarinpal production API
    if (status !== "OK") {
      await prisma.galleryOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" }
      });
      return safeRedirect(`${origin}/gallery/${order.project.slug}?payment=failed`);
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim() || "sandbox";
    const requestUrl = "https://api.zarinpal.com/pg/v4/payment/verify.json";

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: order.amount,
        authority
      }),
      signal: AbortSignal.timeout(15000)
    });

    const payload: any = await response.json().catch(() => null);

    if (
      response.ok &&
      payload &&
      payload.data &&
      (payload.data.code === 100 || payload.data.code === 101)
    ) {
      const refId = String(payload.data.ref_id);
      const siteShare = Math.floor(order.amount * (commission / 100));
      const expertShare = Math.max(0, order.amount - siteShare);

      await prisma.$transaction(async (tx) => {
        await tx.galleryOrder.update({
          where: { id: order.id },
          data: {
            status: "SUCCESS",
            refId
          }
        });

        await tx.user.update({
          where: { id: order.project.userId },
          data: {
            walletBalance: {
              increment: expertShare
            }
          }
        });
      });

      return safeRedirect(
        `${origin}/gallery/${order.project.slug}?payment=success&authority=${order.authority}`
      );
    } else {
      await prisma.galleryOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" }
      });
      return safeRedirect(`${origin}/gallery/${order.project.slug}?payment=failed`);
    }
  } catch (error) {
    console.error("Error verifying gallery payment:", error);
    return safeRedirect(`${origin}/gallery/${order.project.slug}?payment=failed&error=server_error`);
  }
}
