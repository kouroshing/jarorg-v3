import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * Records a cleared payment.
 *
 * This is the moment the deal becomes real: the money is with Jar, the order is
 * confirmed, the losing proposals are closed out, and — only now — the contact
 * details are released. Up to this point the specialist has never seen the
 * client's phone number or exact address.
 *
 * Idempotent: a gateway that calls back twice, or a client who reloads the
 * callback URL, must not double-notify or overwrite the first refId.
 */
export async function markOrderPaid(orderId: string, refId: string): Promise<boolean> {
  const now = new Date();

  const applied = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, paidAt: true, selectedSpecialistId: true, categoryTitle: true },
    });

    if (!order || order.paidAt) return null;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED" satisfies OrderStatus,
        paidAt: now,
        paymentRefId: refId,
        contactRevealedAt: now,
      },
    });

    await tx.projectInterest.updateMany({
      where: { orderId, status: "SELECTED" },
      data: { status: "ACCEPTED" },
    });

    // Everyone who did not get the job stops waiting on it.
    await tx.projectInterest.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "REJECTED" },
    });

    return order;
  });

  if (!applied) return false;

  if (applied.selectedSpecialistId) {
    await createNotification({
      userId: applied.selectedSpecialistId,
      title: "پروژه قطعی شد",
      message: `کارفرما هزینه پروژه «${applied.categoryTitle || "عکاسی"}» را پرداخت کرد. اطلاعات تماس و نشانی دقیق حالا در دسترس شماست.`,
      type: "SUCCESS",
      link: "/specialist/projects",
    });
  }

  return true;
}
