"use client";

import { useState } from "react";
import { verifyGalleryAccessCode } from "@/app/actions/galleryActions";
import { QrCode, X, ArrowLeft, Loader2, Camera, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GalleryAccessPortal() {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const targetCode = code.trim().toUpperCase();
    if (!targetCode || targetCode.length !== 5) {
      setErrorMsg("لطفاً کد ۵ رقمی معتبر را وارد کنید.");
      return;
    }

    setIsValidating(true);

    try {
      const res = await verifyGalleryAccessCode(targetCode);
      if (res.success && res.data?.slug) {
        // Close modal and redirect to gallery client view
        setIsOpen(false);
        setCode("");
        router.push(`/gallery/${res.data.slug}`);
      } else {
        setErrorMsg(res.error || "کد وارد شده نامعتبر است.");
      }
    } catch (err) {
      console.error("Access verification error:", err);
      setErrorMsg("خطایی در تایید کد دسترسی رخ داد.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div dir="rtl" className="text-right">
      {/* Display Card / Button on Profile */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-amber-500/10 to-amber-600/5 hover:from-amber-500/15 hover:to-amber-600/10 border border-amber-500/20 hover:border-amber-500/30 rounded-3xl transition duration-300 group shadow-sm text-right"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/30">
            <Camera className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              گالری مشتریان من (عکاسی شاتی)
              <Sparkles className="h-3.5 w-3.5 fill-amber-700 text-amber-700 animate-pulse" />
            </h4>
            <p className="text-[10px] text-amber-700/80 font-bold mt-0.5 leading-relaxed">
              جهت ورود به گالری و دانلود تصاویر باکیفیت، کد دسترسی ۵ رقمی دریافتی را وارد کنید.
            </p>
          </div>
        </div>
        <ArrowLeft className="h-5 w-5 text-amber-700 transition-transform duration-300 group-hover:-translate-x-1" />
      </button>

      {/* Access Code Input Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-sm p-6 text-center relative flex flex-col items-center">
            
            <button
              onClick={() => {
                setIsOpen(false);
                setCode("");
                setErrorMsg("");
              }}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4 border border-amber-100">
              <QrCode className="h-6 w-6" />
            </div>

            <h3 className="text-sm font-black text-slate-900">ورود به گالری تصاویر مشتری</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              کد دسترسی ۵ رقمی (مثلاً 8X9M2) که از عکاس دریافت کرده‌اید را در کادر زیر وارد کنید.
            </p>

            {errorMsg && (
              <div className="w-full mt-4 rounded-xl bg-rose-50 p-3 text-[10px] font-bold text-rose-600 border border-rose-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full mt-5 space-y-4">
              <input
                type="text"
                required
                maxLength={5}
                placeholder="کد ۵ رقمی"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-black tracking-widest text-[#006097] outline-none transition focus:border-[#006097] focus:bg-white text-center font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-400"
                dir="ltr"
              />
              
              <button
                type="submit"
                disabled={isValidating}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition disabled:opacity-75"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "تایید و ورود به گالری"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
