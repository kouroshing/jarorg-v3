"use client";

import { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
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

const inputClasses =
  "w-full rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm text-[#141413] placeholder:text-[#A8A29A] outline-none transition-all duration-200 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]";

const RESEND_SECONDS = OTP_TTL_MS / 1000;

type Step = "phone" | "otp";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/profile";

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
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center">
      <div className="animate-fade-up">
        <div className="mb-8 text-center">
          <span className="text-4xl font-black tracking-tight text-[#141413]">
            جار
          </span>
          {redirectTo.startsWith("/order") && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20">
                فرم آنلاین ثبت و رزرو سفارش
              </span>
            </div>
          )}
          <h1 className="mt-3 text-2xl font-black tracking-tight text-[#141413]">
            {redirectTo.startsWith("/order") ? "ورود جهت ثبت سفارش" : "ورود / ثبت‌نام"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#66605B]">
            {step === "phone"
              ? redirectTo.startsWith("/order")
                ? "برای ورود به فرم رزرو، شماره همراه خود را وارد کنید تا کد تأیید پیامک شود."
                : "شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود."
              : `کد ۴ رقمی ارسال‌شده به ${phone} را وارد کنید.`}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mb-4 animate-fade-step rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm leading-relaxed text-red-600"
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
              <Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#141413] hover:bg-[#282725] px-7 py-3 text-sm font-medium text-white shadow-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isPending ? (
                <>
                  در حال ارسال...
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  ارسال کد
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form
            key="otp-step"
            onSubmit={handleVerify}
            className="animate-fade-step space-y-5"
          >
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setError(null);
              }}
              disabled={isPending}
              autoFocus
            />

            <button
              type="submit"
              disabled={isPending || !isValidOtpCode(otp)}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#141413] hover:bg-[#282725] px-7 py-3 text-sm font-medium text-white shadow-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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

            <div className="flex flex-col items-center gap-2 text-center text-sm text-[#66605B]">
              {resendIn > 0 ? (
                <p>
                  ارسال مجدد کد تا{" "}
                  <span className="font-semibold text-[#141413]" dir="ltr">
                    {formatTimer(resendIn)}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="font-medium text-[#141413] underline-offset-4 transition hover:text-[#CC785C] hover:underline disabled:opacity-40"
                >
                  ارسال مجدد کد
                </button>
              )}

              <button
                type="button"
                onClick={goBackToPhone}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-[#66605B] transition hover:text-[#141413]"
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
