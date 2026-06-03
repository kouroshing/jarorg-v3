"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight, Loader2, Phone } from "lucide-react";
import { sendOtpCode, verifyOtpCodeInline } from "@/app/actions/authActions";
import {
  isValidIranMobileLocal,
  sanitizeIranMobileInput,
} from "@/lib/auth/phone";
import { isValidOtpCode, OTP_TTL_MS } from "@/lib/auth/otp";
import { OtpInput } from "@/components/login/OtpInput";

const fieldClass =
  "w-full rounded-2xl border-none bg-gray-50/50 py-3.5 pr-11 pl-4 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:bg-gray-50 focus:ring-2 focus:ring-[#FACC15]";

const RESEND_SECONDS = OTP_TTL_MS / 1000;

type OtpStep = "phone" | "otp";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type InlineOtpAuthProps = {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void | Promise<void>;
  disabled?: boolean;
};

export function InlineOtpAuth({
  phone,
  onPhoneChange,
  onVerified,
  disabled = false,
}: InlineOtpAuthProps) {
  const [step, setStep] = useState<OtpStep>("phone");
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

  const sendOtp = useCallback(() => {
    setError(null);
    if (!isValidIranMobileLocal(phone)) {
      setError("شماره موبایل معتبر نیست.");
      return;
    }

    startTransition(async () => {
      const result = await sendOtpCode(phone);
      if (!result.success) {
        setError(result.error ?? "ارسال کد ناموفق بود.");
        return;
      }
      setOtp("");
      setStep("otp");
      setResendIn(RESEND_SECONDS);
    });
  }, [phone]);

  const verifyAndContinue = useCallback(() => {
    setError(null);
    if (!isValidOtpCode(otp)) {
      setError("کد تأیید ۵ رقمی را کامل وارد کنید.");
      return;
    }

    startTransition(async () => {
      const result = await verifyOtpCodeInline(phone, otp);
      if (!result.success) {
        setError(result.error ?? "تأیید ناموفق بود.");
        return;
      }
      await onVerified();
    });
  }, [otp, onVerified, phone]);

  const busy = disabled || isPending;

  return (
    <section className="space-y-4 border-t border-gray-100 pt-6">
      <div>
        <h3 className="text-sm font-bold text-black">تایید شماره موبایل</h3>
        <p className="mt-1 text-xs text-gray-500">
          برای ثبت درخواست، کد تأیید پیامکی را وارد کنید.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <div className="relative">
            <Phone
              className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => {
                onPhoneChange(sanitizeIranMobileInput(e.target.value));
                setError(null);
              }}
              placeholder="09123456789"
              maxLength={11}
              disabled={busy}
              className={`${fieldClass} text-left placeholder:text-left`}
            />
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || !isValidIranMobileLocal(phone)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FACC15] py-3 text-sm font-bold text-black transition-all hover:brightness-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {isPending ? (
              <>
                در حال ارسال
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                ارسال کد تأیید
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-xs text-gray-500">
            کد ارسال‌شده به{" "}
            <span className="font-semibold text-black" dir="ltr">
              {phone}
            </span>
          </p>

          <OtpInput
            value={otp}
            onChange={(v) => {
              setOtp(v);
              setError(null);
            }}
            disabled={busy}
            autoFocus
          />

          <button
            type="button"
            onClick={verifyAndContinue}
            disabled={busy || !isValidOtpCode(otp)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FACC15] py-3 text-sm font-bold text-black transition-all hover:brightness-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {isPending ? (
              <>
                در حال ثبت
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                تأیید و ثبت نهایی
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>

          <div className="flex flex-col items-center gap-2 text-center text-xs text-gray-500">
            {resendIn > 0 ? (
              <p>
                ارسال مجدد تا{" "}
                <span className="font-semibold text-black" dir="ltr">
                  {formatTimer(resendIn)}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={sendOtp}
                disabled={busy}
                className="font-medium text-black hover:underline disabled:opacity-40"
              >
                ارسال مجدد کد
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
              disabled={busy}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              تغییر شماره
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
