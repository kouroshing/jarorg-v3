"use client";

import { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Phone as PhoneIcon, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import {
  sendOtpCode,
  verifyOtpCode,
} from "@/app/actions/authActions";
import {
  isValidIranMobileLocal,
  sanitizeIranMobileInput,
} from "@/lib/auth/phone";
import { isValidOtpCode, OTP_TTL_MS } from "@/lib/auth/otp";
import { OtpInput } from "@/components/login/OtpInput";
import JaramoozLogo from "@/components/JaramoozLogo";

const inputClasses =
  "w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[#006097] focus:ring-2 focus:ring-[#006097]/15";

const RESEND_SECONDS = OTP_TTL_MS / 1000;

type Step = "phone" | "otp";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/jaramooz";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
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
      const result = await verifyOtpCode(phone, otp, redirectTo);
      if (result && !result.success) {
        setError(result.error ?? "خطای ناشناخته");
      }
    });
  };

  const goBackToPhone = useCallback(() => {
    setStep("phone");
    setOtp("");
    setError(null);
  }, []);

  return (
    <div className="jaramooz-theme relative min-h-screen bg-slate-50 text-slate-800 overflow-hidden flex flex-col items-center justify-center px-5 py-12">
      {/* Decorative Radial Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] rounded-full bg-[#006097]/8 blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] rounded-full bg-[#056297]/6 blur-[100px] sm:blur-[150px] pointer-events-none" />

      {/* Back button */}
      <div className="w-full max-w-sm mb-4 animate-fade-step">
        <Link
          href="/jaramooz"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-[#006097]" />
          <span>بازگشت به آکادمی</span>
        </Link>
      </div>

      {/* Glassmorphic Form Card */}
      <div className="w-full max-w-sm rounded-[32px] bg-white/40 backdrop-blur-2xl border border-white/40 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] z-10 animate-fade-up">
        
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center transition-all duration-500 ease-out hover:scale-[1.03] hover:-translate-y-0.5 animate-logo-shimmer">
              <JaramoozLogo className="w-full h-full" />
            </div>
          </div>
          <h1 className="text-xl font-black text-slate-900">
            ورود / عضویت جارآموز
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {step === "phone"
              ? "شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود."
              : `کد ۴ رقمی ارسال‌شده به ${phone} را وارد کنید.`}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mb-4 animate-fade-step rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs leading-relaxed text-red-600"
          >
            {error}
          </p>
        ) : null}

        {step === "phone" ? (
          <form
            key="phone-step"
            onSubmit={handleSendOtp}
            className="animate-fade-step space-y-4"
          >
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                className={`${inputClasses} pr-11 text-left placeholder:text-left`}
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !isValidIranMobileLocal(phone)}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#006097] h-12 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-[#056297] hover:shadow-[0_0_15px_rgba(0,96,151,0.4)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <>
                  در حال ارسال...
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  دریافت کد تایید
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </>
              )}
            </button>

            {/* Quick Test Login Helper */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setPhone("09123456789");
                  setError(null);
                  startTransition(async () => {
                    await sendOtpCode("09123456789");
                    setPhone("09123456789");
                    setOtp("1234");
                    setStep("otp");
                  });
                }}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 px-3 py-1.5 text-xs font-bold text-[#006097] hover:bg-sky-100 transition cursor-pointer"
              >
                <span>⚡ ورود سریع تستی (۰۹۱۲۳۴۵۶۷۸۹ / ۱۲۳۴)</span>
              </button>
            </div>
          </form>
        ) : (
          <form
            key="otp-step"
            onSubmit={handleVerify}
            className="animate-fade-step space-y-5"
          >
            {/* Custom OTP container styled for Light Mode */}
            <div className="flex flex-col items-center gap-2 text-slate-800">
              <OtpInput
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  setError(null);
                }}
                disabled={isPending}
                autoFocus
              />

              {/* Quick Fill Test OTP */}
              <button
                type="button"
                onClick={() => setOtp("1234")}
                className="text-xs font-bold text-[#006097] bg-sky-50 px-3 py-1 rounded-full border border-sky-200/70 hover:bg-sky-100 transition cursor-pointer"
              >
                کد تستی: ۱۲۳۴ (کلیک برای درج خودکار)
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending || !isValidOtpCode(otp)}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#006097] h-12 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-[#056297] hover:shadow-[0_0_15px_rgba(0,96,151,0.4)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <>
                  در حال ورود...
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  ورود
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-3.5 text-center text-xs text-slate-500">
              {resendIn > 0 ? (
                <p>
                  ارسال مجدد کد تا{" "}
                  <span className="font-semibold text-[#006097] font-mono" dir="ltr">
                    {formatTimer(resendIn)}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="font-bold text-[#006097] transition hover:brightness-110 disabled:opacity-40"
                >
                  ارسال مجدد کد تأیید
                </button>
              )}

              <button
                type="button"
                onClick={goBackToPhone}
                disabled={isPending}
                className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                تغییر شماره موبایل
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
