import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * Records a cleared payment.
 *
 * This is the moment the deal becomes real: the money is with Jar, the order is
 * confirmed, and the losing proposals are closed out.
 *
 * Contact details are NOT released here. Phone and exact address wait until
 * ~24 hours before the shoot (scripts/reveal-contacts.mjs). Early release of
 * both meant parties left the platform and Jar lost the coordination trail.
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

    const claimed = await tx.order.updateMany({
      where: { id: orderId, paidAt: null },
      data: {
        status: "CONFIRMED" satisfies OrderStatus,
        paidAt: now,
        paymentRefId: refId,
      },
    });

    // Only the callback that atomically claimed the unpaid order may apply
    // downstream state changes. This makes repeated gateway callbacks harmless.
    if (claimed.count !== 1) return null;

    await tx.projectInterest.updateMany({
      where: {
        orderId,
        status: "SELECTED",
        ...(order.selectedSpecialistId
          ? { specialistId: order.selectedSpecialistId }
          : {}),
      },
      data: { status: "ACCEPTED" },
    });

    // Any leftover SELECTED rows (stale race) must not stay as winners.
    await tx.projectInterest.updateMany({
      where: { orderId, status: "SELECTED" },
      data: { status: "REJECTED" },
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
      message: `کارفرما هزینه پروژه «${applied.categoryTitle || "عکاسی"}» را پرداخت کرد. هماهنگی را از صفحه سفارش پیگیری کنید؛ شماره تماس و نشانی دقیق ۲۴ ساعت پیش از شروع پروژه در اختیارتان قرار می‌گیرد.`,
      type: "SUCCESS",
      link: `/order/${orderId}`,
    });
  }

  return true;
}
