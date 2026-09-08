"use client";

import { useState, useTransition } from "react";
import { validateDiscountCode } from "@/app/actions/paymentActions";
import { ArrowRight, ShieldCheck, Sparkles, Loader2, CheckCircle2, AlertCircle, ShoppingBag, Receipt } from "lucide-react";
import Link from "next/link";

interface PlanProps {
  id: string;
  key: string;
  nameFa: string;
  price3Months: number;
  price12Months: number;
  features: string;
}

export default function CheckoutForm({ plan, period }: { plan: PlanProps; period: string }) {
  const isAnnual = period === "annual";
  const originalAmount = isAnnual ? plan.price12Months : plan.price3Months;
  
  const [coupon, setCoupon] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(originalAmount);
  const [appliedCode, setAppliedCode] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleApplyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!coupon.trim()) {
      setErrorMsg("لطفاً کد تخفیف را وارد کنید.");
      return;
    }

    startTransition(async () => {
      const res = await validateDiscountCode(coupon, originalAmount, plan.id);
      if (res.success && res.discountedAmount !== undefined) {
        setDiscountAmount(res.discountAmount || 0);
        setFinalAmount(res.discountedAmount);
        setAppliedCode(coupon.toUpperCase().trim());
        setSuccessMsg(`کد تخفیف ${coupon.toUpperCase().trim()} با موفقیت اعمال گردید.`);
      } else {
        setErrorMsg(res.error || "کد تخفیف نامعتبر است.");
      }
    });
  };

  const handleCheckout = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          discountCode: appliedCode || null,
          period: period
        })
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || "خطا در اتصال به درگاه پرداخت زرین‌پال.");
        setIsCheckingOut(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطا در برقراری ارتباط با سرور پرداخت. مجدداً تلاش کنید.");
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg animate-fade-up text-right pb-10" dir="rtl">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShoppingBag className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-black">پیش‌فاکتور خرید</h1>
            <p className="text-xs text-gray-400">تایید نهایی سفارش و پرداخت ایمن</p>
          </div>
        </div>
        <Link
          href="/profile/upgrade"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </Link>
      </header>

      {/* Main content grid */}
      <div className="space-y-6">
        {/* Order details card */}
        <div className="flex flex-col p-6 rounded-3xl border border-slate-150 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.02)] space-y-5">
          <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
            <Receipt className="h-4.5 w-4.5 text-[#006097]" />
            جزئیات صورت‌حساب
          </h3>

          <div className="space-y-3.5 text-xs font-bold text-slate-500">
            <div className="flex justify-between">
              <span>محصول انتخاب شده:</span>
              <span className="text-slate-900">{plan.nameFa}</span>
            </div>
            
            <div className="flex justify-between">
              <span>مدت دوره اشتراک:</span>
              <span className="text-slate-900">
                {isAnnual ? "دوره ۱۲ ماهه (۱ سال)" : "دوره ۳ ماهه"}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-50 pt-3.5">
              <span>قیمت اصلی:</span>
              <span className="text-slate-900 font-mono">
                {originalAmount.toLocaleString("fa-IR")} تومان
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>تخفیف اعمال شده ({appliedCode}):</span>
                <span className="font-mono">
                  {discountAmount.toLocaleString("fa-IR")}- تومان
                </span>
              </div>
            )}

            {/* Final Cost display */}
            <div className="flex justify-between border-t border-slate-100 pt-4 items-baseline">
              <span className="text-sm font-black text-slate-850">مبلغ قابل پرداخت:</span>
              <div className="flex items-baseline gap-1">
                {discountAmount > 0 ? (
                  <>
                    <span className="text-xs line-through text-slate-400 font-mono ml-2">
                      {originalAmount.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-2xl font-black tracking-tight text-emerald-600 font-mono">
                      {finalAmount.toLocaleString("fa-IR")}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                    {originalAmount.toLocaleString("fa-IR")}
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400">تومان</span>
              </div>
            </div>
          </div>
        </div>

        {/* Discount Code Input Box */}
        <div className="flex flex-col p-6 rounded-3xl border border-slate-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <span className="text-xs font-bold text-slate-500">کد تخفیف دارید؟</span>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon}
              onChange={e => setCoupon(e.target.value)}
              placeholder="مثال: SUMMER50"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-mono text-left outline-none transition focus:border-[#006097] focus:bg-white text-slate-800"
              dir="ltr"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={isPending}
              className="px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition duration-200 active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[90px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "اعمال"}
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-600 flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {successMsg}
            </div>
          )}
        </div>

        {/* Secure Checkout Button */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isCheckingOut || isPending}
            className="w-full h-14 rounded-2xl bg-[#006097] text-white hover:bg-[#004b75] text-xs font-black shadow-lg shadow-[#006097]/15 transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال انتقال به درگاه پرداخت...
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                انتقال به درگاه امن زرین‌پال
              </>
            )}
          </button>
          
          <p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed px-4">
            تراکنش فوق تحت پروتکل امن SSL و از طریق کلیه کارت‌های عضو شتاب کشور انجام می‌گیرد.
          </p>
        </div>
      </div>
    </div>
  );
}
