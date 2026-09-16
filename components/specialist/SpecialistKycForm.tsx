"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { submitSpecialistKycAction } from "@/app/actions/specialistOnboardingActions";
import JalaliBirthDatePicker from "@/components/specialist/JalaliBirthDatePicker";
import { isValidIranIban, normalizeShabaDigitsFromInput } from "@/lib/kyc/iban";
import { isValidIranianNationalId } from "@/lib/kyc/nationalId";

interface Props {
  kycStatus: string;
  nationalIdMask?: string | null;
  shabaMask?: string | null;
  failureReason?: string | null;
  bankName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
  /** Days left in post-approval KYC window. */
  deadlineDaysLeft?: number | null;
  deadlineExpired?: boolean;
  deadlineDays?: number;
}

function digitsOnlyNationalId(value: string) {
  return value
    .replace(/[^\d۰-۹٠-٩]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .slice(0, 10);
}

export default function SpecialistKycForm({
  kycStatus,
  nationalIdMask,
  shabaMask,
  failureReason,
  bankName,
  firstName,
  lastName,
  fatherName,
  deadlineDaysLeft = null,
  deadlineExpired = false,
  deadlineDays = 7,
}: Props) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  /** 24 digits only — IR is fixed in the UI prefix. */
  const [shabaDigits, setShabaDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [touched, setTouched] = useState(false);
  /** Allow re-submit while server status is still PENDING (manual queue / old soft-lock). */
  const [retryPending, setRetryPending] = useState(false);

  const nationalOk = nationalId.trim().length === 10;
  const nationalChecksumOk = nationalOk && isValidIranianNationalId(nationalId);
  const birthOk = birthDate.trim().length >= 8;
  const shabaOk = shabaDigits.length === 24;
  const shabaChecksumOk = shabaOk && isValidIranIban(shabaDigits);
  const shabaRemaining = Math.max(0, 24 - shabaDigits.length);

  const blockers: string[] = [];
  if (!nationalOk) {
    blockers.push(
      nationalId.length === 0
        ? "کد ملی را وارد کنید (۱۰ رقم)."
        : `کد ملی ناقص است (${nationalId.length.toLocaleString("fa-IR")}/۱۰ رقم).`
    );
  } else if (!nationalChecksumOk) {
    blockers.push("کد ملی از نظر رقم کنترلی نامعتبر است — با کارت ملی دوباره چک کنید.");
  }
  if (!birthOk) blockers.push("تاریخ تولد را از تقویم شمسی انتخاب کنید (مطابق کارت ملی).");
  if (!shabaOk) {
    blockers.push(
      shabaDigits.length === 0
        ? "۲۴ رقم شبا را بعد از IR وارد کنید (خود IR را ننویسید؛ اگر از بانک با IR کپی کردید، خودکار حذف می‌شود)."
        : `شبا ناقص است — ${shabaRemaining.toLocaleString("fa-IR")} رقم دیگر لازم است (${shabaDigits.length.toLocaleString("fa-IR")}/۲۴).`
    );
  } else if (!shabaChecksumOk) {
    blockers.push(
      "رقم‌های شبا از نظر کنترل بانکی نامعتبر است — یک رقم اشتباه وارد شده؛ از اپ بانک دوباره کپی کنید."
    );
  }

  const canSubmit =
    !isPending && nationalOk && nationalChecksumOk && birthOk && shabaOk && shabaChecksumOk;
  const showHints = touched || shabaDigits.length > 0 || nationalId.length > 0;

  const fullLegalName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (kycStatus === "VERIFIED") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 space-y-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <div className="space-y-1">
          <h1 className="text-lg font-black text-emerald-950">اطلاعات تایید شد</h1>
          <p className="text-xs text-emerald-900/80 leading-relaxed">
            هویت و حساب بانکی شما برای تسویه پروژه‌ها تایید شده است.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-right space-y-2.5">
          {fullLegalName ? (
            <div>
              <p className="text-[10px] font-bold text-emerald-800/70">نام کامل (ثبت احوال)</p>
              <p className="text-base font-black text-emerald-950">{fullLegalName}</p>
            </div>
          ) : null}
          {fatherName ? (
            <div>
              <p className="text-[10px] font-bold text-emerald-800/70">نام پدر</p>
              <p className="text-sm font-bold text-emerald-900">{fatherName}</p>
            </div>
          ) : null}
          {(nationalIdMask || shabaMask) && (
            <div className="pt-1 border-t border-emerald-100 space-y-1">
              {nationalIdMask ? (
                <p className="text-[11px] font-mono text-emerald-800">
                  کد ملی: {nationalIdMask}
                </p>
              ) : null}
              {shabaMask ? (
                <p className="text-[11px] font-mono text-emerald-800">شبا: {shabaMask}</p>
              ) : null}
              {bankName ? (
                <p className="text-[11px] font-bold text-emerald-900">بانک: {bankName}</p>
              ) : null}
            </div>
          )}
        </div>

        <Link
          href="/specialist/projects"
          className="inline-flex h-11 items-center justify-center rounded-full bg-jar-primary px-6 text-xs font-medium text-white"
        >
          رفتن به پروژه‌های باز
        </Link>
      </div>
    );
  }

  if (kycStatus === "PENDING" && !retryPending) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 space-y-3 text-center">
        <ShieldCheck className="h-10 w-10 text-amber-700 mx-auto" />
        <h1 className="text-lg font-black text-amber-950">در انتظار تایید احراز هویت</h1>
        <p className="text-xs text-amber-900/80 leading-relaxed text-right sm:text-center">
          {failureReason ||
            "استعلام قبلی کامل نشده. احراز هویت باید با استعلام آنلاین (زحل) تمام شود — معمولاً نیازی به تایید دستی ادمین نیست."}
        </p>
        <div className="rounded-2xl border border-amber-200/80 bg-white/70 p-3 text-right space-y-1.5">
          <p className="text-[11px] font-black text-amber-950">کار بعدی شما:</p>
          <ul className="text-[11px] font-medium text-amber-900/90 space-y-1 list-disc list-inside leading-relaxed">
            <li>دکمه «اصلاح و تلاش مجدد» را بزنید و دوباره استعلام آنلاین بگیرید.</li>
            <li>کد ملی، تاریخ تولد و شبا را با کارت ملی و اپ بانک چک کنید.</li>
            <li>موبایل ورود به جار باید به نام صاحب کد ملی باشد (شاهکار).</li>
          </ul>
        </div>
        {(nationalIdMask || shabaMask) && (
          <p className="text-[11px] font-mono text-amber-900">
            {[nationalIdMask, shabaMask].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => setRetryPending(true)}
            className="inline-flex h-10 items-center justify-center rounded-full bg-jar-primary px-5 text-xs font-bold text-white"
          >
            اصلاح و تلاش مجدد
          </button>
          <Link
            href="/specialist/projects"
            className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300 bg-white px-5 text-xs font-bold text-amber-950"
          >
            فعلاً برو به پروژه‌ها
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    setOkMessage(null);
    if (!canSubmit) {
      setError(blockers[0] || "لطفاً همه فیلدها را کامل کنید.");
      return;
    }
    const shaba = `IR${shabaDigits}`;
    startTransition(async () => {
      const res = await submitSpecialistKycAction({
        nationalId,
        birthDate,
        shaba,
      });
      if (!res.success) {
        setError(res.error || "خطا");
        // FAILED / ERROR stay on form so user can fix or retry.
        if (res.status === "FAILED" || res.status === "ERROR") {
          router.refresh();
        }
        return;
      }
      if (res.status === "VERIFIED") {
        setOkMessage(
          res.firstName && res.lastName
            ? `احراز هویت «${res.firstName} ${res.lastName}» تایید شد.`
            : "احراز هویت با موفقیت تایید شد."
        );
      }
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-8 space-y-5 shadow-xs text-jar-primary"
    >
      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl font-black text-jar-primary">احراز هویت</h1>
        <p className="text-sm text-jar-muted leading-relaxed">
          سه استعلام جداگانه انجام می‌شود:{" "}
          <span className="font-bold text-jar-primary">شاهکار</span> (موبایل به نام کد ملی)،{" "}
          <span className="font-bold text-jar-primary">ثبت احوال</span> (کد ملی + تاریخ تولد)، و{" "}
          <span className="font-bold text-jar-primary">تطبیق شبا</span> (حساب بانکی به نام همان کد
          ملی). تصویر کارت ملی لازم نیست. اگر یکی رد شود، همان مورد را در پیام خطا می‌بینید.
        </p>
      </div>

      {kycStatus !== "VERIFIED" && (deadlineExpired || deadlineDaysLeft != null) && (
        <div
          className={`rounded-xl border p-3 text-sm font-medium space-y-1 ${
            deadlineExpired
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : deadlineDaysLeft != null && deadlineDaysLeft <= 2
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-sky-200 bg-sky-50 text-sky-950"
          }`}
        >
          <p className="font-black">
            {deadlineExpired
              ? "مهلت احراز هویت تمام شد"
              : deadlineDaysLeft != null && deadlineDaysLeft <= 1
                ? "کمتر از یک روز تا پایان مهلت"
                : `مهلت ${deadlineDays.toLocaleString("fa-IR")} روزه احراز هویت`}
          </p>
          <p className="text-xs leading-relaxed opacity-90">
            {deadlineExpired
              ? `مهلت ${deadlineDays.toLocaleString("fa-IR")} روز پس از تایید پرونده تمام شده و دسترسی پروژه‌ها معلق است. همین حالا اطلاعات را بفرستید تا پس از تایید دوباره فعال شوید.`
              : deadlineDaysLeft != null
                ? `${deadlineDaysLeft.toLocaleString("fa-IR")} روز از مهلت باقی مانده است. بعد از این زمان بدون احراز تاییدشده، حساب معلق می‌شود.`
                : `از زمان تایید پرونده، ${deadlineDays.toLocaleString("fa-IR")} روز فرصت تکمیل دارید.`}
          </p>
        </div>
      )}

      {kycStatus === "FAILED" && failureReason && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 font-medium space-y-2">
          <p className="font-black">احراز هویت رد شد — جزئیات</p>
          <p className="leading-relaxed">{failureReason}</p>
          <p className="text-xs font-normal text-rose-700/90 leading-relaxed">
            فیلد مربوط را اصلاح کنید و دوباره «ارسال و استعلام» بزنید. تا وقتی تایید نشود، اعلام
            آمادگی و تسویه فعال نیست.
          </p>
        </div>
      )}

      {kycStatus === "PENDING" && retryPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 font-medium space-y-1">
          <p className="font-black">تلاش مجدد استعلام</p>
          <p className="text-xs font-normal leading-relaxed">
            همه فیلدها را دوباره وارد کنید. اگر قبلاً شبا یا کد ملی اشتباه بوده، همین‌جا اصلاح
            کنید.
            {failureReason ? ` دلیل قبلی: ${failureReason}` : ""}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {okMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {okMessage}
        </div>
      )}

      {showHints && blockers.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-black text-amber-950">برای فعال شدن دکمه ارسال:</p>
          <ul className="space-y-1">
            {blockers.map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-xs font-medium text-amber-900">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-jar-primary">کد ملی</label>
        <input
          inputMode="numeric"
          value={nationalId}
          onChange={(e) => setNationalId(digitsOnlyNationalId(e.target.value))}
          onBlur={() => setTouched(true)}
          className={`w-full h-11 px-3 rounded-xl border bg-jar-canvas text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none focus:ring-2 focus:ring-jar-logo/20 ${
            showHints && (!nationalOk || !nationalChecksumOk)
              ? "border-amber-400 focus:border-amber-500"
              : "border-jar-border focus:border-jar-logo"
          }`}
          placeholder="۱۰ رقم"
          dir="ltr"
          autoComplete="off"
          maxLength={10}
        />
        <p className="text-[11px] text-jar-muted leading-relaxed">
          {nationalId.length.toLocaleString("fa-IR")}/۱۰ رقم
          {nationalOk && nationalChecksumOk
            ? " · معتبر"
            : nationalOk
              ? " · رقم کنترلی نامعتبر"
              : ""}
          {" · "}سیم‌کارت ورود باید به نام همین کد ملی باشد.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-jar-primary">تاریخ تولد</label>
        <JalaliBirthDatePicker
          value={birthDate}
          onChange={(v) => {
            setBirthDate(v);
            setTouched(true);
          }}
          disabled={isPending}
        />
        <p className="text-xs text-jar-muted">دقیقاً مطابق کارت ملی (سال/ماه/روز شمسی).</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-bold text-jar-primary">شماره شبا</label>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              shabaOk && shabaChecksumOk ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {shabaDigits.length.toLocaleString("fa-IR")}/۲۴ رقم
            {shabaOk && shabaChecksumOk ? " · معتبر" : shabaOk ? " · نامعتبر" : ""}
          </span>
        </div>
        <div
          className={`flex h-11 w-full items-center overflow-hidden rounded-xl border bg-jar-canvas focus-within:ring-2 focus-within:ring-jar-logo/20 ${
            showHints && (!shabaOk || !shabaChecksumOk)
              ? "border-amber-400 focus-within:border-amber-500"
              : "border-jar-border focus-within:border-jar-logo"
          }`}
          dir="ltr"
        >
          <span className="shrink-0 border-l border-jar-border bg-jar-soft px-3 text-sm font-black text-jar-primary select-none">
            IR
          </span>
          <input
            inputMode="numeric"
            value={shabaDigits}
            onChange={(e) => {
              // Do not use maxLength={24}: pasting "IR"+24 digits gets truncated by the
              // browser before onChange, which drops the last two account digits.
              setShabaDigits(normalizeShabaDigitsFromInput(e.target.value));
              setTouched(true);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text");
              setShabaDigits(normalizeShabaDigitsFromInput(pasted));
              setTouched(true);
            }}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none"
            placeholder="۲۴ رقم — اگر IR هم کپی شد، حذف می‌شود"
            autoComplete="off"
          />
        </div>
        <p
          className={`text-[11px] font-medium leading-relaxed ${
            showHints && (!shabaOk || !shabaChecksumOk) ? "text-amber-800" : "text-jar-muted"
          }`}
        >
          پیشوند IR از قبل هست — دوباره تایپ نکنید. اگر از اپ بانک کل شبا (با IR) را بچسبانید،
          IR و فاصله‌ها خودکار برداشته می‌شود و هر ۲۴ رقم حفظ می‌شود.
          {!shabaOk && shabaDigits.length > 0
            ? ` هنوز ${shabaRemaining.toLocaleString("fa-IR")} رقم کم است.`
            : ""}
          {shabaOk && !shabaChecksumOk ? " رقم کنترلی شبا اشتباه است." : ""}
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        onClick={() => setTouched(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-jar-logo" />
        )}
        {canSubmit ? "ارسال و استعلام" : "ابتدا فیلدهای ناقص را کامل کنید"}
      </button>
    </form>
  );
}
