import { SUPER_ADMIN_PHONE } from "@/lib/auth/admin";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { sendSmsByPattern } from "@/lib/sms/ippanel";

export type OrderCreatedSmsPayload = {
  orderId: string;
  categoryTitle: string;
  contactName?: string | null;
  contactPhone?: string | null;
  durationHours: number;
  locationType: string;
  districtOrCity?: string | null;
  isFlexibleSchedule: boolean;
  bookingDate?: string | null;
  timeSlot?: string | null;
  totalEstimatedPrice: number;
  projectDescription?: string | null;
};

function getAdminPatternCode(): string {
  return (
    process.env.ADMIN_NOTIF_PATTERN_CODE?.trim() ||
    process.env.IPPANEL_PATTERN_ADMIN?.trim() ||
    "f81053ii1w7d5j0"
  );
}

/**
 * Non-blocking SMS notification dispatched to admin (09100138383) when a new order is submitted on /order.
 */
export function sendOrderCreatedSmsNotification(
  payload: OrderCreatedSmsPayload
): void {
  void dispatchOrderCreatedSms(payload);
}

async function dispatchOrderCreatedSms(
  payload: OrderCreatedSmsPayload
): Promise<void> {
  const patternCode = getAdminPatternCode();
  if (!patternCode) return;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
    "https://jarorg.ir";

  // Build clean variables matching the existing IPPanel pattern (f81053ii1w7d5j0):
  // variables: name, phone, description, time, budget, link
  const name = String(payload.contactName?.trim() || "کارفرمای جدید");
  const phone = String(phoneToLocalDisplay(payload.contactPhone || "ثبت نشده"));

  let locationText = "در محل کارفرما";
  if (payload.locationType === "SPECIALIST_ADVICE") {
    locationText = "با پیشنهاد و مشورت عکاس";
  } else if (payload.locationType === "JAR_STUDIO") {
    locationText = "استودیو جار";
  } else if (payload.districtOrCity) {
    locationText = `محل کارفرما (${payload.districtOrCity})`;
  }

  const descParts = [
    `${payload.categoryTitle} (${payload.durationHours} ساعت)`,
    locationText,
  ];
  if (payload.projectDescription?.trim()) {
    descParts.push(payload.projectDescription.trim().slice(0, 100));
  }
  const description = descParts.join(" - ");

  const time = payload.isFlexibleSchedule
    ? "زمان‌بندی منعطف (با هماهنگی)"
    : `${payload.bookingDate || "مشخص نشده"} (${payload.timeSlot || "نامشخص"})`;

  const budget = `${payload.totalEstimatedPrice.toLocaleString("fa-IR")} تومان`;
  const link = `${siteUrl}/order/${payload.orderId}`;

  // Recipients list: Always includes 09100138383 plus any numbers in ADMIN_MOBILES
  const envMobiles = process.env.ADMIN_MOBILES?.trim() || "";
  const recipientsSet = new Set<string>();
  recipientsSet.add("09100138383");
  recipientsSet.add(SUPER_ADMIN_PHONE);

  if (envMobiles) {
    envMobiles.split(",").forEach((m) => {
      const clean = m.trim();
      if (clean) recipientsSet.add(clean);
    });
  }

  const recipients = Array.from(recipientsSet);

  console.log("\n--- [DISPATCHING ORDER CREATED SMS NOTIFICATION TO ADMIN] ---");
  console.log(`Order ID: ${payload.orderId}`);
  console.log(`Pattern Code: ${patternCode}`);
  console.log(`Recipients:`, recipients);
  console.log(`Payload Values:`, { name, phone, description, time, budget, link });
  console.log("------------------------------------------------------------\n");

  const tasks = recipients.map(async (recipient) => {
    try {
      await sendSmsByPattern({
        recipient,
        patternCode,
        patternValues: {
          name,
          phone,
          description,
          time,
          budget,
          link,
        },
      });
      console.log(`✓ Order SMS notification delivered successfully to: ${recipient}`);
    } catch (err: any) {
      console.error(
        `[Order SMS Dispatch Error] Failed to notify ${recipient} for order ${payload.orderId}:`,
        err?.message || err
      );
    }
  });

  await Promise.allSettled(tasks);
}
