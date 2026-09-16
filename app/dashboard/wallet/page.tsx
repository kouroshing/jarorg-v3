"use client";

import { useState, useEffect } from "react";
import {
  getWalletBalance,
  createWithdrawalRequest,
  getWithdrawalRequests
} from "@/app/actions/financeActions";
import {
  CreditCard,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Coins
} from "lucide-react";
import Link from "next/link";

type WithdrawalRequest = {
  id: string;
  amount: number;
  shabaNumber: string;
  status: string;
  trackingCode: string | null;
  createdAt: Date;
};

export default function PhotographerWalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [amount, setAmount] = useState("");
  const [shabaNumber, setShabaNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      const balanceRes = await getWalletBalance();
      if (balanceRes.success) {
        setBalance(balanceRes.data);
        setKycVerified(Boolean(balanceRes.kycVerified));
        setKycStatus(balanceRes.kycStatus ?? null);
      }

      const reqRes = await getWithdrawalRequests();
      if (reqRes.success && reqRes.data) {
        setRequests(reqRes.data);
      }
    } catch (err) {
      console.error("Error loading wallet data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("لطفاً مبلغ معتبری برای برداشت وارد کنید.");
      return;
    }

    if (amountNum > balance) {
      setFormError("مبلغ درخواستی بیشتر از موجودی کیف پول شماست.");
      return;
    }

    const cleanShaba = shabaNumber.trim().toUpperCase();
    if (!cleanShaba.startsWith("IR") || cleanShaba.length !== 26) {
      setFormError("شماره شبا باید با IR شروع شده و شامل ۲۴ رقم بعد از آن باشد (کل ۲۶ کاراکتر).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createWithdrawalRequest(amountNum, cleanShaba);
      if (res.success) {
        setFormSuccess(true);
        setAmount("");
        loadWalletData();
        setTimeout(() => setFormSuccess(false), 5000);
      } else {
        setFormError(res.error || "خطا در ثبت درخواست تسویه حساب.");
      }
    } catch (err) {
      setFormError("خطایی در ثبت درخواست رخ داد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-up text-right pb-24 px-4 sm:px-6 font-sans" dir="rtl">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Coins className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">کیف پول و تسویه حساب</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              درآمد حاصل از پروژه‌های انجام‌شده را مدیریت کرده و درخواست تسویه حساب ثبت کنید.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </Link>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white border border-slate-100 rounded-3xl gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#006097]" />
          <span className="text-xs font-bold text-slate-400">در حال دریافت اطلاعات کیف پول...</span>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3 items-start">
          
          {/* Left Column: Wallet Balance & Payout Form */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#006097] to-[#004b75] text-white rounded-[32px] p-6 shadow-md shadow-[#006097]/15">
              <span className="text-[10px] font-bold opacity-80">موجودی قابل تسویه:</span>
              <h2 className="text-3xl font-black mt-1 font-mono tracking-wide">
                {balance.toLocaleString("fa-IR")}
              </h2>
              <span className="text-[10px] font-black opacity-80 mt-1.5 block">تومان</span>
            </div>

            {/* Withdrawal Form Card */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <CreditCard className="h-4.5 w-4.5 text-[#006097]" />
                درخواست تسویه جدید
              </h3>

              {!kycVerified && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[11px] font-bold text-amber-900 space-y-2 leading-relaxed">
                  <p>
                    {kycStatus === "PENDING"
                      ? "احراز هویت در صف بررسی است. تا تایید نهایی امکان تسویه وجود ندارد."
                      : kycStatus === "FAILED"
                        ? "احراز هویت رد شده است. اطلاعات را اصلاح کنید و دوباره ارسال کنید."
                        : "برای تسویه حساب، ابتدا احراز هویت (کد ملی + شبا) را تکمیل کنید. بدون آن نمی‌توانید روی پروژه‌ها هم اعلام آمادگی کنید."}
                  </p>
                  <Link
                    href="/specialist/onboarding/identity"
                    className="inline-flex text-[#006097] underline"
                  >
                    رفتن به احراز هویت
                  </Link>
                </div>
              )}

              {formError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-[10px] font-bold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-[10px] font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  درخواست تسویه با موفقیت ثبت شد. مبلغ از کیف پول شما کسر گردید.
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className={`space-y-4 ${!kycVerified ? "opacity-50 pointer-events-none" : ""}`}>
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold text-slate-500">شماره شبا (با IR شروع شود):</span>
                  <input
                    type="text"
                    required
                    placeholder="IR000000000000000000000000"
                    maxLength={26}
                    value={shabaNumber}
                    onChange={(e) => setShabaNumber(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] focus:bg-white text-center font-mono"
                    dir="ltr"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-bold text-slate-500">مبلغ درخواستی (تومان):</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={balance}
                    placeholder="مثال: ۵۰۰۰۰"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] focus:bg-white text-center font-mono"
                    dir="ltr"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || balance <= 0}
                  className="w-full flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#006097] text-white text-xs font-black hover:bg-[#004b75] transition shadow-lg shadow-[#006097]/15 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    "ثبت درخواست تسویه حساب"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Withdrawal Requests History */}
          <div className="md:col-span-2 space-y-5 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-800">تاریخچه درخواست‌های تسویه حساب</h3>

            {requests.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold text-xs">
                تاکنون هیچ درخواست تسویه حسابی ثبت نکرده‌اید.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-black">
                      <th className="pb-3 pr-2">تاریخ</th>
                      <th className="pb-3">مبلغ (تومان)</th>
                      <th className="pb-3">شماره شبا</th>
                      <th className="pb-3">وضعیت</th>
                      <th className="pb-3 pl-2 text-left">کد پیگیری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {requests.map((req) => (
                      <tr key={req.id} className="text-slate-850">
                        <td className="py-4 pr-2 font-bold text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString("fa-IR")}
                        </td>
                        <td className="py-4 font-black font-mono">
                          {req.amount.toLocaleString("fa-IR")}
                        </td>
                        <td className="py-4 font-mono text-slate-500" dir="ltr">
                          {req.shabaNumber}
                        </td>
                        <td className="py-4">
                          {req.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-[9px] font-black border border-amber-100">
                              <Clock className="h-3.5 w-3.5" />
                              در حال بررسی
                            </span>
                          )}
                          {req.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[9px] font-black border border-emerald-100">
                              <CheckCircle className="h-3.5 w-3.5" />
                              تسویه شده
                            </span>
                          )}
                          {req.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 text-[9px] font-black border border-rose-100">
                              <XCircle className="h-3.5 w-3.5" />
                              رد شده
                            </span>
                          )}
                        </td>
                        <td className="py-4 pl-2 text-left font-mono font-bold text-slate-650">
                          {req.trackingCode || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
