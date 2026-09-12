"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Phone, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { sendOtpCode, verifyOtpCode } from "@/app/actions/authActions";
import { isValidIranMobileLocal, sanitizeIranMobileInput } from "@/lib/auth/phone";
import { isValidOtpCode, OTP_TTL_MS } from "@/lib/auth/otp";
import { OtpInput } from "@/components/login/OtpInput";
import { SPECIALIST_TERMS_PATH } from "@/components/legal/SpecialistMembershipTerms";
import Link from "next/link";

const inputClasses =
  "w-full rounded-2xl border border-jar-border bg-jar-surface px-4 py-3.5 text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all duration-200 focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 shadow-xs";

const RESEND_SECONDS = OTP_TTL_MS / 1000;

/** After OTP, onboarding hub routes: new → basics, incomplete → resume, ACTIVE → panel. */
const AFTER_LOGIN_PATH = "/specialist/onboarding";

type Step = "phone" | "otp";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function JoinForm() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(sanitizeIranMobileInput(e.target.value));
    setError(null);
  };

  const handleSendOtp = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!isValidIranMobileLocal(phone)) {
      setError("شماره موبایل معتبر نیست. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹");
      return;
    }

    if (!agreedToTerms) {
      setError("برای ورود به مسیر متخصص، آگاهی از تعهدنامه الزامی است.");
      return;
    }

    startTransition(async () => {
      const result = await sendOtpCode(phone);
      if (!result.success) {
        setError(result.error ?? "خطای ناشناخته");
        return;
      }
      setOtp("");
      setStep("otp");
      setResendIn(RESEND_SECONDS);
    });
  };

  const handleResend = () => {
    if (resendIn > 0 || isPending) return;
    handleSendOtp();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidOtpCode(otp)) {
      setError("کد تأیید ۴ رقمی را کامل وارد کنید.");
      return;
    }

    startTransition(async () => {
      // Phone-only: name/avatar collected on onboarding basics.
      // Role SPECIALIST is set when basics are saved — not at OTP.
      const result = await verifyOtpCode(phone, otp, AFTER_LOGIN_PATH);
      if (result && !result.success) {
        setError(result.error ?? "خطای ناشناخته در ورود");
      }
    });
  };

  const goBackToPhone = useCallback(() => {
    setStep("phone");
    setOtp("");
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-bold text-red-600 animate-in fade-in">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form key="phone-step" onSubmit={handleSendOtp} className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="relative">
            <Phone className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="09123456789"
              autoFocus
              required
              maxLength={11}
              className={`${inputClasses} pr-12 text-left placeholder:text-left`}
            />
          </div>

          <p className="text-[11px] text-jar-muted leading-relaxed text-right">
            فقط با شماره وارد شوید. اگر قبلاً ثبت‌نام کرده‌اید مستقیم به پنل می‌روید؛ اگر نیمه‌کاره مانده، از همان مرحله ادامه می‌دهید؛ اگر تازه‌اید، نام و عکس را در گام بعد می‌گیریم.
          </p>

          <div className="flex items-start gap-2.5 pt-1 text-right">
            <input
              id="join-nda-checkbox"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-jar-border text-jar-primary focus:ring-jar-primary cursor-pointer"
            />
            <label
              htmlFor="join-nda-checkbox"
              className="text-xs font-bold text-jar-muted leading-relaxed cursor-pointer select-none"
            >
              از{" "}
              <Link
                href={SPECIALIST_TERMS_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-jar-logo underline hover:text-jar-primary font-bold"
                onClick={(e) => e.stopPropagation()}
              >
                تعهدنامه و شرایط عضویت متخصصین جار
              </Link>{" "}
              آگاه هستم؛ پذیرش کامل در مراحل ثبت‌نام انجام می‌شود.
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending || !isValidIranMobileLocal(phone) || !agreedToTerms}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-jar-primary px-7 py-3.5 text-sm font-medium text-white shadow-none transition-colors duration-200 hover:bg-jar-primaryHover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال ارسال پیامک...</span>
              </>
            ) : (
              <>
                <span>دریافت کد ورود</span>
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-jar-muted pt-1">
            کارفرما هستید؟{" "}
            <Link href="/login" className="font-bold text-jar-primary underline-offset-2 hover:underline">
              ورود مشتری
            </Link>
          </p>
        </form>
      ) : (
        <form key="otp-step" onSubmit={handleVerify} className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-jar-canvas border border-jar-border px-4 py-1.5 text-xs font-medium text-jar-muted mb-4">
              ارسال شده به {phone}
            </div>
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setError(null);
              }}
              disabled={isPending}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !isValidOtpCode(otp)}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-jar-primary px-7 py-3.5 text-sm font-medium text-white shadow-none transition-colors duration-200 hover:bg-jar-primaryHover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال بررسی...</span>
              </>
            ) : (
              <>
                <span>تأیید و ورود</span>
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </>
            )}
          </button>

          <div className="flex flex-col items-center gap-3 text-center text-xs font-medium text-jar-muted">
            {resendIn > 0 ? (
              <p>
                ارسال مجدد کد تا{" "}
                <span className="font-bold text-jar-primary" dir="ltr">
                  {formatTimer(resendIn)}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isPending}
                className="font-medium text-jar-primary underline-offset-4 transition hover:text-jar-logo hover:underline disabled:opacity-50 cursor-pointer"
              >
                ارسال مجدد کد تأیید
              </button>
            )}

            <button
              type="button"
              onClick={goBackToPhone}
              disabled={isPending}
              className="flex items-center gap-1 text-jar-muted transition hover:text-jar-primary cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              ویرایش شماره موبایل
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
