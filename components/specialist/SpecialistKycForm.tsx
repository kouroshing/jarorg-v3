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
}

export default function SpecialistKycForm({
  kycStatus,
  nationalIdMask,
  shabaMask,
  failureReason,
}: Props) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shaba, setShaba] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (kycStatus === "VERIFIED") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 space-y-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-lg font-black text-emerald-950">احراز هویت تایید شد</h1>
        <p className="text-xs text-emerald-900/80">
          هویت و حساب بانکی شما برای تسویه پروژه‌ها تایید شده است.
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
          استعلام خودکار زحل کامل نشد و پرونده برای بررسی دستی ادمین در صف قرار گرفت.
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
    setError(null);
    startTransition(async () => {
      const res = await submitSpecialistKycAction({ nationalId, birthDate, shaba });
      if (!res.success) {
        setError(res.error || "خطا");
        return;
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
        <h1 className="text-lg sm:text-xl font-black text-jar-primary">احراز هویت بانکی (زحل)</h1>
        <p className="text-sm text-jar-muted leading-relaxed">
          موبایل حساب شما با شاهکار و شبا با کد ملی/تاریخ تولد از طریق زحل بررسی می‌شود. کد ملی و شبا کامل ذخیره نمی‌شود — فقط نسخه ماسک‌شده.
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

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-jar-primary">کد ملی</label>
        <input
          inputMode="numeric"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-canvas text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20"
          placeholder="۱۰ رقم"
          dir="ltr"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-jar-primary">تاریخ تولد</label>
        <JalaliBirthDatePicker
          value={birthDate}
          onChange={setBirthDate}
          disabled={isPending}
        />
        <p className="text-xs text-jar-muted">از تقویم شمسی انتخاب کنید.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-jar-primary">شماره شبا</label>
        <input
          value={shaba}
          onChange={(e) => setShaba(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-canvas text-sm font-mono text-jar-primary placeholder:text-jar-muted/50 outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20"
          placeholder="IRxxxxxxxxxxxxxxxxxxxxxxxx"
          dir="ltr"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !nationalId.trim() || !birthDate.trim() || !shaba.trim()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-jar-logo" />}
        ارسال و استعلام زحل
      </button>
    </form>
  );
}
