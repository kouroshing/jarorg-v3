import "server-only";

import { prisma } from "@/lib/prisma";
import {
  KYC_DEADLINE_SUSPEND_NOTE,
  KYC_PENDING_SLA_HOURS,
  getKycDeadlineInfo,
  isKycDeadlineSuspension,
  isKycPendingOverSla,
  type KycDeadlineInfo,
} from "@/lib/kyc/gates";
import { createNotification } from "@/lib/notifications";
import { getAdminPhoneDigits } from "@/lib/auth/admin";
import { SUPER_ADMIN_PHONE } from "@/lib/auth/admin";

/**
 * If an ACTIVE specialist missed the post-approval KYC window (NONE/FAILED),
 * suspend them. Returns the (possibly updated) profile fields used by callers.
 */
export async function enforceKycDeadlineForSpecialist(userId: string): Promise<{
  status: string;
  kycStatus: string;
  reviewedAt: Date | null;
  deadline: KycDeadlineInfo;
  suspendedNow: boolean;
}> {
  const profile = await prisma.specialistProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      kycStatus: true,
      reviewedAt: true,
      reviewNote: true,
      kycSubmittedAt: true,
      userId: true,
    },
  });

  if (!profile) {
    return {
      status: "INCOMPLETE",
      kycStatus: "NONE",
      reviewedAt: null,
      deadline: getKycDeadlineInfo({}),
      suspendedNow: false,
    };
  }

  const deadline = getKycDeadlineInfo({
    reviewedAt: profile.reviewedAt,
    kycStatus: profile.kycStatus,
  });

  if (
    profile.status === "ACTIVE" &&
    profile.kycStatus === "PENDING" &&
    isKycPendingOverSla(profile.kycSubmittedAt)
  ) {
    await nudgeAdminsForStaleKycPending(profile.id, profile.userId);
  }

  if (
    profile.status === "ACTIVE" &&
    deadline.isExpired &&
    (profile.kycStatus === "NONE" || profile.kycStatus === "FAILED")
  ) {
    await prisma.specialistProfile.update({
      where: { id: profile.id },
      data: {
        status: "SUSPENDED",
        reviewNote: KYC_DEADLINE_SUSPEND_NOTE,
      },
    });
    await createNotification({
      userId: profile.userId,
      title: "مهلت احراز هویت تمام شد",
      message:
        "مهلت ۷ روزه احراز هویت پس از تایید پرونده تمام شد و حساب موقتاً معلق است. با تکمیل و تایید هویت دوباره فعال می‌شوید.",
      type: "WARNING",
      link: "/specialist/onboarding/identity",
    }).catch(() => undefined);

    return {
      status: "SUSPENDED",
      kycStatus: profile.kycStatus,
      reviewedAt: profile.reviewedAt,
      deadline,
      suspendedNow: true,
    };
  }

  return {
    status: profile.status,
    kycStatus: profile.kycStatus,
    reviewedAt: profile.reviewedAt,
    deadline,
    suspendedNow: false,
  };
}

async function nudgeAdminsForStaleKycPending(
  specialistId: string,
  userId: string
): Promise<void> {
  const since = new Date(Date.now() - KYC_PENDING_SLA_HOURS * 60 * 60 * 1000);
  const already = await prisma.auditLog.findFirst({
    where: {
      targetModel: "SpecialistProfile",
      targetId: specialistId,
      action: "SPECIALIST_KYC_PENDING_SLA",
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (already) return;

  await prisma.auditLog
    .create({
      data: {
        actorId: userId,
        action: "SPECIALIST_KYC_PENDING_SLA",
        targetModel: "SpecialistProfile",
        targetId: specialistId,
        note: `احراز هویت بیش از ${KYC_PENDING_SLA_HOURS} ساعت در صف PENDING است`,
      },
    })
    .catch(() => undefined);

  const adminPhones = Array.from(new Set([getAdminPhoneDigits(), SUPER_ADMIN_PHONE].filter(Boolean)));
  const admins = await prisma.user.findMany({
    where: { phone: { in: adminPhones as string[] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        title: "احراز هویت متخصص منتظر بررسی",
        message: `یک پرونده KYC بیش از ${KYC_PENDING_SLA_HOURS} ساعت در صف PENDING مانده است.`,
        type: "WARNING",
        link: "/admin/review",
      })
    )
  ).catch(() => undefined);
}

/** After successful KYC, lift deadline suspension so they can work again. */
export async function reactivateAfterKycIfSuspended(specialistId: string): Promise<void> {
  const profile = await prisma.specialistProfile.findUnique({
    where: { id: specialistId },
    select: { status: true, reviewNote: true, kycStatus: true },
  });
  if (!profile) return;
  if (profile.kycStatus !== "VERIFIED") return;
  if (profile.status !== "SUSPENDED") return;
  if (!isKycDeadlineSuspension(profile.reviewNote)) {
    return;
  }
  await prisma.specialistProfile.update({
    where: { id: specialistId },
    data: {
      status: "ACTIVE",
      reviewNote: null,
    },
  });
}
