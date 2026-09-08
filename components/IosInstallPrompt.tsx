"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function IosInstallPrompt({ showPrompt }: { showPrompt: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Perform checks only in browser
    if (typeof window === "undefined" || !showPrompt) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (!isIos) return; // Android, Chrome on Windows/Mac, etc. will exit immediately

    // Check if it is Safari (Safari has "Safari" in userAgent and does not have "CriOS" or "FxiOS" or "OIOS")
    const isSafari =
      /safari/i.test(window.navigator.userAgent) &&
      !/crios/i.test(window.navigator.userAgent) &&
      !/fxios/i.test(window.navigator.userAgent) &&
      !/opios/i.test(window.navigator.userAgent);

    // Check if web app is run in standalone mode (already installed on Home Screen)
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Check if user dismissed it less than 7 days ago
    const dismissedTime = localStorage.getItem("pwa_prompt_dismissed");
    let isDismissed = false;
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      if (!isNaN(parsedTime)) {
        const diffDays = (Date.now() - parsedTime) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          isDismissed = true;
        }
      }
    }

    if (isSafari && !isStandalone && !isDismissed) {
      // Delay prompt showing slightly for better UX (3 seconds)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] max-w-sm mx-auto bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] animate-fade-up text-right select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">نصب اپلیکیشن جار روی آیفون</h4>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5">بدون نیاز به دانلود از اپ استور</p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Guide Steps */}
      <div className="space-y-3 border-t border-slate-100 pt-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black shrink-0 mt-0.5">
            ۱
          </div>
          <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
            در نوار ابزار پایین مرورگر سافاری، دکمه اشتراک‌گذاری یا <strong className="text-slate-900">Share</strong> (مربع با فلش رو به بالا <Share className="h-3.5 w-3.5 inline mx-0.5 text-blue-500" />) را لمس کنید.
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black shrink-0 mt-0.5">
            ۲
          </div>
          <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
            منوی باز شده را بالا کشیده و گزینه <strong className="text-slate-900">Add to Home Screen</strong> (افزودن به صفحه اصلی <PlusSquare className="h-3.5 w-3.5 inline mx-0.5 text-slate-700" />) را انتخاب کنید.
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black shrink-0 mt-0.5">
            ۳
          </div>
          <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
            در نهایت در بالای صفحه باز شده، روی گزینه <strong className="text-slate-900">Add</strong> (یا افزودن) بزنید تا آیکون اپ روی دسکتاپ ظاهر شود.
          </p>
        </div>
      </div>
    </div>
  );
}
