"use server";

import { prisma } from "@/lib/prisma";
import { verifyOtpCodeInline, sendOtpCode } from "@/app/actions/authActions";
import { generateSpotPlayerLicense } from "@/lib/spotplayer";

export async function sendOtpForSuccess(phone: string) {
  return await sendOtpCode(phone);
}

export async function finalizePurchaseWithOtp(phone: string, code: string, authority: string) {
  // 1. Verify OTP using the established auth actions
  const verifyResult = await verifyOtpCodeInline(phone, code);
  if (!verifyResult.success) {
    return verifyResult;
  }

  // 2. Finalize purchase record in the database
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { authority },
    });

    if (!purchase) {
      return { success: false, error: "تراکنش یافت نشد." };
    }

    if (purchase.status === "SUCCESS" && purchase.licenseKey) {
      return { success: true, licenseKey: purchase.licenseKey };
    }

    // Generate SpotPlayer license key using our new service
    const licenseKey = await generateSpotPlayerLicense(
      purchase.userId,
      "", // Will fallback to display name or phone number
      purchase.courseId
    );

    const updated = await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: "SUCCESS",
        licenseKey,
      },
    });

    return { success: true, licenseKey: updated.licenseKey };
  } catch (error: any) {
    console.error("[finalize_purchase_error]", error);
    return { 
      success: false, 
      error: error?.message || "خطا در فعال‌سازی خرید و تحویل لایسنس اسپات‌پلییر." 
    };
  }
}
