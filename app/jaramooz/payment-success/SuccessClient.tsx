"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Copy, Check, ArrowRight, ShieldCheck, ExternalLink, Key } from "lucide-react";
import JaramoozLogo from "@/components/JaramoozLogo";
import { sendOtpForSuccess, finalizePurchaseWithOtp } from "./actions";

type Props = {
  phone: string;
  localPhone: string;
  authority: string;
  courseTitle: string;
  courseId: string;
  initialLicenseKey?: string | null;
  initialStatus: string;
};

export default function SuccessClient({
  phone,
  localPhone,
  authority,
  courseTitle,
  courseId,
  initialLicenseKey,
  initialStatus,
}: Props) {
  const [step, setStep] = useState<"otp" | "success">(initialStatus === "SUCCESS" ? "success" : "otp");
  const [code, setCode] = useState("");
  const [licenseKey, setLicenseKey] = useState(initialLicenseKey || "");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState(60);

  // Trigger OTP sending on load if still in OTP verification step
  useEffect(() => {
    if (step === "otp") {
      handleSendOtp();
    }
  }, [step]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await sendOtpForSuccess(phone);
      if (!res.success) {
        setOtpError(res.error || "خطا در ارسال کد تایید.");
      } else {
        setTimer(60);
      }
    } catch {
      setOtpError("خطا در ارتباط با سرور.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) {
      setOtpError("کد تایید باید ۴ رقم باشد.");
      return;
    }

    setLoading(true);
    setOtpError(null);
    try {
      const res = await finalizePurchaseWithOtp(phone, code, authority);
      if (res.success && res.licenseKey) {
        setLicenseKey(res.licenseKey);
        setStep("success");
      } else {
        setOtpError(res.error || "کد تایید نامعتبر است.");
      }
    } catch {
      setOtpError("خطا در نهایی‌سازی خرید.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === "success") {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/40 bg-white/50 backdrop-blur-2xl p-8 shadow-2xl space-y-6 text-center text-slate-800 animate-scale-up">
        {/* Success Icon */}
        <div className="flex justify-center text-green-600">
          <div className="w-16 h-16 rounded-full bg-green-550/10 flex items-center justify-center border border-green-500/20 bg-green-500/5">
            <CheckCircle2 className="h-10 w-10 text-green-600 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900">حساب کاربری شما فعال شد!</h1>
          <p className="text-xs leading-relaxed text-slate-500 max-w-[320px] mx-auto">
            ثبت‌نام شما در <span className="font-extrabold text-[#006097]">{courseTitle}</span> با موفقیت نهایی گردید. سشن شما فعال شده و لایسنس اسپات‌پلییر صادر شد.
          </p>
        </div>

        {/* License Box */}
        <div className="space-y-3 pt-2 text-right">
          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 px-1">
            <Key className="h-3.5 w-3.5 text-[#006097]" />
            کلید لایسنس اسپات‌پلییر:
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-slate-200/60 p-3 shadow-inner font-mono text-xs select-all text-[#006097]" dir="ltr">
            <span className="flex-1 truncate font-bold text-center tracking-wider">{licenseKey}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[#006097]/8 text-[#006097] border border-[#006097]/15 hover:bg-[#006097]/15 transition-all"
              title="کپی لایسنس"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl bg-slate-50/60 border border-slate-100 p-4.5 text-right space-y-2.5 text-xs text-slate-500 leading-relaxed shadow-sm">
          <h3 className="font-bold text-slate-900">راهنمای فعال‌سازی سریع:</h3>
          <ul className="list-decimal list-inside space-y-1.5 text-[11px] pr-1">
            <li>برنامه اسپات‌پلییر را برای ویندوز، اندروید یا مک دانلود و نصب کنید.</li>
            <li>کلید لایسنس بالا را کپی کرده و در برنامه وارد نمایید.</li>
            <li>ویدیوهای مسترکلاس بلافاصله روی پخش‌کننده بارگذاری و فعال می‌شوند.</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2.5 pt-2">
          <a
            href={`/jaramooz/courses/${courseId}/play`}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-[#006097] text-white text-xs font-bold transition hover:bg-[#056297] active:scale-98 shadow-md"
          >
            شروع تماشای ویدیوها در پنل کاربری
            <ArrowRight className="h-4 w-4 rotate-180" />
          </a>
          
          <a
            href="https://spotplayer.ir/#download"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-200/50 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition active:scale-98"
          >
            دانلود اسپات‌پلییر
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/40 bg-white/50 backdrop-blur-2xl p-8 shadow-2xl space-y-6 text-center text-slate-800 animate-scale-up">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="w-14 h-14 shrink-0 flex items-center justify-center transition-all duration-500 ease-out hover:scale-105">
          <JaramoozLogo className="w-full h-full" />
        </div>
        <h1 className="text-xl font-black text-slate-900">تایید پرداخت و فعال‌سازی حساب</h1>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-green-500/25 bg-green-500/5 p-4 text-center text-[11px] font-semibold text-green-700 flex items-center justify-center gap-2 leading-relaxed shadow-sm">
          <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
          <span>پرداخت مسترکلاس عکاسی با موفقیت ثبت شد.</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 max-w-[320px] mx-auto">
          برای فعال‌سازی نهایی حساب و تحویل لایسنس، کد تایید ۴ رقمی ارسال شده به شماره موبایل <span className="font-extrabold text-slate-800 font-mono" dir="ltr">{localPhone}</span> را وارد کنید.
        </p>
      </div>

      {/* OTP Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            placeholder="کد تایید ۴ رقمی"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={loading}
            className="w-full h-12 text-center rounded-xl bg-white/50 border border-slate-200/60 text-slate-900 placeholder-slate-400 text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#006097]/40 focus:border-[#006097] transition-all font-mono font-bold"
            dir="ltr"
            required
          />
        </div>

        {otpError && (
          <p className="text-center text-xs font-semibold text-red-600 animate-fade-step">
            {otpError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || otpSending}
          className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-[#006097] text-white text-xs font-bold transition hover:bg-[#056297] active:scale-98 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              در حال تایید و فعال‌سازی...
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            </>
          ) : (
            "تایید و فعال‌سازی حساب"
          )}
        </button>
      </form>

      {/* Resend / Helper */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1">
        {timer > 0 ? (
          <span>ارسال مجدد کد پس از {timer} ثانیه</span>
        ) : (
          <button
            onClick={handleSendOtp}
            disabled={otpSending || loading}
            className="text-[#006097] hover:underline hover:text-[#056297] disabled:opacity-40"
          >
            {otpSending ? "در حال ارسال مجدد..." : "ارسال مجدد کد تایید"}
          </button>
        )}
        
        {process.env.NODE_ENV === "development" && (
          <span className="text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50">
            حالت تست لوکال (کد: 1234)
          </span>
        )}
      </div>
    </div>
  );
}
