"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { resetUnseenSales } from "@/app/actions/financeActions";
import { Sparkles, X, Trophy } from "lucide-react";

type Props = {
  unseenSales: number;
};

export default function ConfettiCelebration({ unseenSales }: Props) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (unseenSales <= 0) return;

    // 1. Show Toast
    setShowToast(true);

    // 2. Trigger Apple iMessage-like double corner confetti burst
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      // Shoot from left corner
      confetti({
        particleCount: Math.floor(40 * (timeLeft / duration)),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.95 },
        colors: ["#FFD700", "#FFA500", "#FF4500", "#32CD32", "#00FA9A", "#00BFFF"],
        zIndex: 9999
      });

      // Shoot from right corner
      confetti({
        particleCount: Math.floor(40 * (timeLeft / duration)),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.95 },
        colors: ["#FFD700", "#FFA500", "#FF4500", "#32CD32", "#00FA9A", "#00BFFF"],
        zIndex: 9999
      });
    }, 250);

    // 3. Reset unseenSales count in database in the background
    resetUnseenSales().catch((err) => {
      console.error("Failed to reset unseen sales:", err);
    });

    // Auto-hide toast after 7 seconds
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 7000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [unseenSales]);

  if (!showToast) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-6 inset-x-4 sm:left-auto sm:right-6 z-[999] max-w-sm w-full bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 shadow-[0_15px_40px_rgba(245,158,11,0.15)] flex items-start gap-3 animate-in fade-in slide-in-from-top-6 duration-500"
    >
      {/* Icon Badge */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-bounce">
        <Trophy className="h-5.5 w-5.5 fill-amber-500/10" />
      </div>

      {/* Message */}
      <div className="flex-1 space-y-1 text-right">
        <h4 className="text-xs font-black text-slate-100 flex items-center gap-1">
          فروش جدید ثبت شد!
          <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-pulse" />
        </h4>
        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
          🎉 تبریک! <strong className="text-amber-400 font-black">{unseenSales}</strong> فروش جدید داشتید و موجودی کیف پولتان افزایش یافت!
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={() => setShowToast(false)}
        className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
