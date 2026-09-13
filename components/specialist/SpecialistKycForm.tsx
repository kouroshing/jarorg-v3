"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { submitSpecialistKycAction } from "@/app/actions/specialistOnboardingActions";
import JalaliBirthDatePicker from "@/components/specialist/JalaliBirthDatePicker";

interface Props {
  kycStatus: string;
  nationalIdMask?: string | null;
  shabaMask?: string | null;
  failureReason?: string | null;
  bankName?: string | null;
}

function digitsOnly(value: string) {
  return value
    .replace(/[^\d۰-۹٠-٩]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export default function SpecialistKycForm({
  kycStatus,
  nationalIdMask,
  shabaMask,
  failureReason,
  bankName,
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

  const nationalOk = nationalId.trim().length === 10;
  const birthOk = birthDate.trim().length >= 8;
  const shabaOk = shabaDigits.length === 24;
  const shabaRemaining = Math.max(0, 24 - shabaDigits.length);

  const blockers: string[] = [];
  if (!nationalOk) {
    blockers.push(
      nationalId.length === 0
        ? "کد ملی را وارد کنید (۱۰ رقم)."
        : `کد ملی ناقص است (${nationalId.length}/۱۰ رقم).`
    );
  }
  if (!birthOk) blockers.push("تاریخ تولد را از تقویم انتخاب کنید.");
  if (!shabaOk) {
    blockers.push(
      shabaDigits.length === 0
        ? "۲۴ رقم شبا را بعد از IR وارد کنید (خود IR را ننویسید)."
        : `شبا ناقص است — ${shabaRemaining.toLocaleString("fa-IR")} رقم دیگر لازم است (${shabaDigits.length.toLocaleString("fa-IR")}/۲۴).`
    );
  }

  const canSubmit = !isPending && nationalOk && birthOk && shabaOk;
  const showHints = touched || shabaDigits.length > 0 || nationalId.length > 0;

  if (kycStatus === "VERIFIED") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 space-y-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-lg font-black text-emerald-950">احراز هویت تایید شد</h1>
        <p className="text-xs text-emerald-900/80">
          هویت و حساب بانکی شما برای تسویه پروژه‌ها تایید شده است.
          {bankName ? ` (${bankName})` : ""}
        </p>
        {(nationalIdMask || shabaMask) && (
          <p className="text-[11px] font-mono text-emerald-800">
            {[nationalIdMask, shabaMask].filter(Boolean).join(" · ")}
          </p>
        )}
        <Link
          href="/specialist/projects"
          className="inline-flex h-11 items-center justify-center rounded-full bg-jar-primary px-6 text-xs font-medium text-white"
        >
          رفتن به پروژه‌های باز
        </Link>
      </div>
    );
  }

  if (kycStatus === "PENDING") {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 space-y-3 text-center">
        <ShieldCheck className="h-10 w-10 text-amber-700 mx-auto" />
        <h1 className="text-lg font-black text-amber-950">در انتظار تایید احراز هویت</h1>
        <p className="text-xs text-amber-900/80 leading-relaxed">
          درخواست شما ثبت شده و در صف بررسی است. تا اعلام نتیجه دوباره ارسال نکنید.
        </p>
        {(nationalIdMask || shabaMask) && (
          <p className="text-[11px] font-mono text-amber-900">
            {[nationalIdMask, shabaMask].filter(Boolean).join(" · ")}
          </p>
        )}
        <Link
          href="/specialist/projects"
          className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300 bg-white px-5 text-xs font-bold text-amber-950"
        >
          فعلاً برو به پروژه‌ها
        </Link>
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
        return;
      }
      if (res.status === "VERIFIED") {
        setOkMessage("احراز هویت با موفقیت تایید شد.");
      } else if (res.status === "PENDING") {
        setOkMessage("درخواست ثبت شد و در صف بررسی قرار گرفت.");
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
          برای تسویه کیف‌پول، مالکیت موبایل (شاهکار)، کد ملی، تاریخ تولد و مطابقت شبا به‌صورت
          آنلاین استعلام می‌شود. تصویر کارت ملی لازم نیست — فقط همین اطلاعات.
          کد ملی و شبا کامل ذخیره نمی‌شود؛ فقط نسخه ماسک‌شده.
        </p>
      </div>

      {kycStatus === "FAILED" && failureReason && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 font-medium">
          رد قبلی: {failureReason}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
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
          onChange={(e) => setNationalId(digitsOnly(e.target.value).slice(0, 10))}
          onBlur={() => setTouched(true)}
          className={`w-full h-11 px-3 rounded-xl border bg-jar-canvas text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none focus:ring-2 focus:ring-jar-logo/20 ${
            showHints && !nationalOk
              ? "border-amber-400 focus:border-amber-500"
              : "border-jar-border focus:border-jar-logo"
          }`}
          placeholder="۱۰ رقم"
          dir="ltr"
          autoComplete="off"
          maxLength={10}
        />
        <p className="text-[11px] text-jar-muted">
          {nationalId.length.toLocaleString("fa-IR")}/۱۰ رقم
          {nationalOk ? " · کامل" : ""}
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
        <p className="text-xs text-jar-muted">از تقویم شمسی انتخاب کنید.</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-bold text-jar-primary">شماره شبا</label>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              shabaOk ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {shabaDigits.length.toLocaleString("fa-IR")}/۲۴ رقم
          </span>
        </div>
        <div
          className={`flex h-11 w-full items-center overflow-hidden rounded-xl border bg-jar-canvas focus-within:ring-2 focus-within:ring-jar-logo/20 ${
            showHints && !shabaOk
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
              setShabaDigits(digitsOnly(e.target.value).slice(0, 24));
              setTouched(true);
            }}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none"
            placeholder="۲۴ رقم بدون IR و بدون فاصله"
            autoComplete="off"
            maxLength={24}
          />
        </div>
        <p
          className={`text-[11px] font-medium ${
            showHints && !shabaOk ? "text-amber-800" : "text-jar-muted"
          }`}
        >
          پیشوند IR از قبل گذاشته شده — آن را دوباره تایپ نکنید.
          {!shabaOk && shabaDigits.length > 0
            ? ` هنوز ${shabaRemaining.toLocaleString("fa-IR")} رقم کم است.`
            : ""}
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
