"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface FinanceActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Gets the current gallery photo sale commission percentage.
 * Seeds PwaSettings with default system config if not present.
 */
export async function getGalleryCommission(): Promise<number> {
  try {
    let settings = await prisma.pwaSettings.findUnique({
      where: { id: "system-config" }
    });

    if (!settings) {
      settings = await prisma.pwaSettings.create({
        data: {
          id: "system-config",
          shortName: "Jar",
          fullName: "Jar Platform",
          description: "Jar Photography Platform",
          appIcon: "/icon.png",
          appleTouchIcon: "/icon.png",
          themeColor: "#006097",
          splashBackgroundColor: "#ffffff",
          showIosPrompt: true,
          galleryCommission: 0
        }
      });
    }

    return settings.galleryCommission;
  } catch (error) {
    console.error("Error in getGalleryCommission:", error);
    return 0;
  }
}

/**
 * Updates the gallery commission percentage (Admin only).
 */
export async function updateGalleryCommission(commission: number): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session || (session.role as string) !== "admin") {
      return { success: false, error: "دسترسی غیرمجاز. فقط مدیر سیستم مجاز به تغییر کارمزد است." };
    }

    if (commission < 0 || commission > 100) {
      return { success: false, error: "درصد کارمزد باید بین ۰ تا ۱۰۰ باشد." };
    }

    await prisma.pwaSettings.upsert({
      where: { id: "system-config" },
      create: {
        id: "system-config",
        shortName: "Jar",
        fullName: "Jar Platform",
        description: "Jar Photography Platform",
        appIcon: "/icon.png",
        appleTouchIcon: "/icon.png",
        themeColor: "#006097",
        splashBackgroundColor: "#ffffff",
        showIosPrompt: true,
        galleryCommission: Math.floor(commission)
      },
      update: {
        galleryCommission: Math.floor(commission)
      }
    });

    revalidatePath("/admin/discounts");
    return { success: true };
  } catch (error) {
    console.error("Error in updateGalleryCommission:", error);
    return { success: false, error: "خطا در بروزرسانی تنظیمات کارمزد." };
  }
}

/**
 * Gets the wallet balance of the logged in specialist user.
 */
export async function getWalletBalance(): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { walletBalance: true }
    });

    return { success: true, data: user?.walletBalance || 0 };
  } catch (error) {
    console.error("Error in getWalletBalance:", error);
    return { success: false, error: "خطا در دریافت موجودی کیف پول." };
  }
}

/**
 * Submits a new withdrawal request for a photographer.
 * Balance is deducted immediately for security.
 */
export async function createWithdrawalRequest(
  amount: number,
  shabaNumber: string
): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "لطفاً وارد حساب کاربری خود شوید." };
    }

    const cleanShaba = shabaNumber.trim();
    if (!cleanShaba.startsWith("IR") || cleanShaba.length !== 26) {
      return { success: false, error: "شماره شبا وارد شده نامعتبر است. باید با IR شروع شده و ۲۶ کاراکتر باشد." };
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: "مبلغ درخواستی تسویه حساب باید عددی صحیح و بیشتر از صفر باشد." };
    }

    const res = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.userId },
        select: { walletBalance: true }
      });

      if (!user || user.walletBalance < amount) {
        return { success: false, error: "موجودی کیف پول شما کافی نیست." };
      }

      // Deduct immediately
      const updated = await tx.user.update({
        where: { id: session.userId },
        data: {
          walletBalance: {
            decrement: amount
          }
        },
        select: { walletBalance: true }
      });

      // Log request
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: session.userId,
          amount,
          shabaNumber: cleanShaba,
          status: "PENDING"
        }
      });

      // Every balance change gets a ledger row, so a specialist can always see
      // why their wallet holds what it holds.
      await tx.walletEntry.create({
        data: {
          userId: session.userId,
          amount: -amount,
          type: "WITHDRAWAL",
          balanceAfter: updated.walletBalance,
          withdrawalId: request.id,
          note: `درخواست تسویه به شبا ${cleanShaba.slice(0, 6)}…${cleanShaba.slice(-4)}`
        }
      });

      return { success: true, data: request };
    });

    if (res.success) {
      revalidatePath("/dashboard/wallet");
    }

    return res;
  } catch (error) {
    console.error("Error in createWithdrawalRequest:", error);
    return { success: false, error: "خطا در ثبت درخواست تسویه حساب." };
  }
}

/**
 * Gets withdrawal requests submitted by the logged in specialist user.
 */
export async function getWithdrawalRequests(): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "احراز هویت ناموفق بود." };
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error in getWithdrawalRequests:", error);
    return { success: false, error: "خطا در دریافت تاریخچه تسویه‌ها." };
  }
}

/**
 * Gets all withdrawal requests for admin panel.
 */
export async function getAllWithdrawalRequests(): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session || (session.role as string) !== "admin") {
      return { success: false, error: "دسترسی ادمین الزامی است." };
    }

    const requests = await prisma.withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            displayName: true,
            phone: true
          }
        }
      }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error in getAllWithdrawalRequests:", error);
    return { success: false, error: "خطا در دریافت لیست تسویه‌ها." };
  }
}

/**
 * Updates a withdrawal request status (Admin only).
 * If rejected, refunds the money back to the photographer's wallet balance.
 */
export async function updateWithdrawalStatus(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  trackingCode?: string
): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session || (session.role as string) !== "admin") {
      return { success: false, error: "دسترسی ادمین الزامی است." };
    }

    const res = await prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        return { success: false, error: "درخواست مورد نظر یافت نشد." };
      }

      if (request.status !== "PENDING") {
        return { success: false, error: "تنها درخواست‌های در حال بررسی قابل بروزرسانی هستند." };
      }

      // Update request
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status,
          trackingCode: trackingCode || null
        }
      });

      // If rejected, refund balance to user
      if (status === "REJECTED") {
        const refunded = await tx.user.update({
          where: { id: request.userId },
          data: {
            walletBalance: {
              increment: request.amount
            }
          },
          select: { walletBalance: true }
        });

        await tx.walletEntry.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            type: "WITHDRAWAL_REFUND",
            balanceAfter: refunded.walletBalance,
            withdrawalId: request.id,
            note: "بازگشت مبلغ به دلیل رد شدن درخواست تسویه"
          }
        });
      }

      return { success: true };
    });

    if (res.success) {
      revalidatePath("/admin/discounts");
    }

    return res;
  } catch (error) {
    console.error("Error in updateWithdrawalStatus:", error);
    return { success: false, error: "خطا در ثبت وضعیت نهایی تسویه." };
  }
}

/**
 * Resets the photographer's unseenSales counter to 0.
 */
export async function resetUnseenSales(): Promise<FinanceActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "احراز هویت ناموفق بود." };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { unseenSales: 0 }
    });

    revalidatePath("/dashboard/gallery");
    return { success: true };
  } catch (error) {
    console.error("Error in resetUnseenSales:", error);
    return { success: false, error: "خطا در ریست کردن وضعیت فروش‌های جدید." };
  }
}

/**
 * Gets the current specialist's count of unseen sales.
 */
export async function getUnseenSales(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) return 0;
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { unseenSales: true }
    });
    return user?.unseenSales ?? 0;
  } catch (error) {
    console.error("Error in getUnseenSales:", error);
    return 0;
  }
}
