/**
 * Marketplace / payout KYC gates.
 * Phase 3: specialists may browse open projects while ACTIVE, but may not
 * apply (or be selected) until Zohal KYC is VERIFIED.
 *
 * After admin approval (reviewedAt), they have KYC_DEADLINE_DAYS to finish
 * identity. Past that with NONE/FAILED → auto-suspend until KYC is VERIFIED.
 */

export type KycStatusValue = "NONE" | "PENDING" | "VERIFIED" | "FAILED" | string;

/** Days after ACTIVE approval to complete KYC (national ID + Sheba). */
export const KYC_DEADLINE_DAYS = 7;

/** Machine-stable prefix so admin free-text notes cannot false-match. */
export const KYC_DEADLINE_SUSPEND_CODE = "[KYC_DEADLINE]";

export const KYC_DEADLINE_SUSPEND_NOTE =
  `${KYC_DEADLINE_SUSPEND_CODE} تعلیق خودکار: مهلت ۷ روزه احراز هویت پس از تایید پرونده به پایان رسید. با تکمیل و تایید هویت دوباره فعال می‌شوید.`;

export function isKycDeadlineSuspension(reviewNote: string | null | undefined): boolean {
  const note = (reviewNote || "").trim();
  if (!note) return false;
  return note === KYC_DEADLINE_SUSPEND_NOTE || note.startsWith(KYC_DEADLINE_SUSPEND_CODE);
}

export function isKycMarketplaceReady(kycStatus: string | null | undefined): boolean {
  return (kycStatus || "NONE") === "VERIFIED";
}

export type KycDeadlineInfo = {
  /** Clock start = admin approval time. Null if never approved. */
  startsAt: Date | null;
  endsAt: Date | null;
  /** Whole days left (ceil). Null if no deadline / already verified. */
  daysLeft: number | null;
  /** True when grace ended and KYC is still NONE or FAILED. */
  isExpired: boolean;
  /** Pending admin review after specialist submitted — not treated as expired. */
  isWaitingAdmin: boolean;
};

export function getKycDeadlineInfo(input: {
  reviewedAt?: Date | string | null;
  kycStatus?: string | null;
  now?: Date;
}): KycDeadlineInfo {
  const status = input.kycStatus || "NONE";
  if (status === "VERIFIED") {
    return {
      startsAt: null,
      endsAt: null,
      daysLeft: null,
      isExpired: false,
      isWaitingAdmin: false,
    };
  }

  const reviewed =
    typeof input.reviewedAt === "string"
      ? new Date(input.reviewedAt)
      : input.reviewedAt ?? null;
  if (!reviewed || !Number.isFinite(reviewed.getTime())) {
    return {
      startsAt: null,
      endsAt: null,
      daysLeft: null,
      isExpired: false,
      isWaitingAdmin: status === "PENDING",
    };
  }

  const now = input.now ?? new Date();
  const endsAt = new Date(reviewed.getTime() + KYC_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
  const msLeft = endsAt.getTime() - now.getTime();
  const isWaitingAdmin = status === "PENDING";
  const isExpired = msLeft <= 0 && (status === "NONE" || status === "FAILED");
  const daysLeft =
    msLeft <= 0 ? 0 : Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  return {
    startsAt: reviewed,
    endsAt,
    daysLeft: isWaitingAdmin && msLeft <= 0 ? 0 : daysLeft,
    isExpired,
    isWaitingAdmin,
  };
}

export function formatKycDeadlineMessage(info: KycDeadlineInfo, kycStatus?: string | null): string {
  const status = kycStatus || "NONE";
  if (status === "VERIFIED") return "";
  if (info.isWaitingAdmin) {
    return info.daysLeft === 0
      ? "احراز هویت شما در صف بررسی ادمین است (مهلت ارسال شما تمام شده؛ منتظر تایید جار بمانید)."
      : "احراز هویت در صف بررسی است. تا تایید نهایی اعلام آمادگی ممکن نیست.";
  }
  if (info.isExpired) {
    return `مهلت ${KYC_DEADLINE_DAYS} روزه احراز هویت تمام شد. حساب تا تکمیل هویت معلق می‌شود — همین حالا اطلاعات را ارسال کنید.`;
  }
  if (info.daysLeft == null) {
    return "برای اعلام آمادگی روی پروژه‌ها، ابتدا احراز هویت (کد ملی + شبا) را تکمیل کنید.";
  }
  if (info.daysLeft <= 1) {
    return `فقط تا پایان امروز / کمتر از ۲۴ ساعت برای احراز هویت فرصت دارید (مهلت ${KYC_DEADLINE_DAYS} روز پس از تایید پرونده).`;
  }
  return `از زمان تایید پرونده، ${info.daysLeft.toLocaleString("fa-IR")} روز از مهلت ${KYC_DEADLINE_DAYS.toLocaleString("fa-IR")} روزه احراز هویت باقی مانده است.`;
}

/** Persian copy for apply / select blocks. */
export function kycMarketplaceBlockMessage(
  kycStatus: string | null | undefined,
  deadline?: KycDeadlineInfo | null
): string {
  const status = kycStatus || "NONE";
  if (deadline?.isExpired) {
    return formatKycDeadlineMessage(deadline, status);
  }
  if (status === "PENDING") {
    return "احراز هویت شما در صف بررسی است. تا تایید نهایی نمی‌توانید برای پروژه اعلام آمادگی کنید.";
  }
  if (status === "FAILED") {
    return "احراز هویت رد شده است. پس از اصلاح اطلاعات و تایید مجدد می‌توانید اعلام آمادگی کنید.";
  }
  if (deadline && deadline.daysLeft != null) {
    return formatKycDeadlineMessage(deadline, status);
  }
  return "برای اعلام آمادگی روی پروژه‌ها، ابتدا احراز هویت (کد ملی + شبا) را تکمیل کنید.";
}

export function kycSelectBlockMessage(
  kycStatus: string | null | undefined
): string {
  const status = kycStatus || "NONE";
  if (status === "PENDING") {
    return "این متخصص هنوز احراز هویت تاییدشده ندارد (در صف بررسی). فعلاً قابل انتخاب نیست.";
  }
  if (status === "FAILED") {
    return "احراز هویت این متخصص رد شده و فعلاً قابل انتخاب نیست.";
  }
  return "این متخصص احراز هویت تکمیل‌شده ندارد و فعلاً قابل انتخاب نیست.";
}

/** Admin SLA: PENDING KYC older than this is highlighted. */
export const KYC_PENDING_SLA_HOURS = 24;

export function kycPendingAgeHours(submittedAt: Date | string | null | undefined): number | null {
  if (!submittedAt) return null;
  const t = typeof submittedAt === "string" ? new Date(submittedAt).getTime() : submittedAt.getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (Date.now() - t) / (60 * 60 * 1000));
}

export function isKycPendingOverSla(submittedAt: Date | string | null | undefined): boolean {
  const hours = kycPendingAgeHours(submittedAt);
  return hours != null && hours >= KYC_PENDING_SLA_HOURS;
}
