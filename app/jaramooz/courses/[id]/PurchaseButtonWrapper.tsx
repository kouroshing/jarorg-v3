"use client";

import { ArrowLeft } from "lucide-react";
import { useJarAmoozPurchaseModal } from "@/components/jaramooz/JarAmoozPurchaseContext";

type Props = {
  courseId?: string;
  title?: string;
  price?: number;
  isLoggedIn?: boolean;
  initialPhone?: string;
  className?: string;
  customText?: string;
  variant?: "emerald" | "blue";
};

export default function PurchaseButtonWrapper({
  courseId = "photography-masterclass",
  title = "مسترکلاس ۱۰۰ روزه عکاسی",
  price = 9100000,
  isLoggedIn = false,
  initialPhone = "",
  className = "",
  customText,
  variant = "emerald",
}: Props) {
  const { openPurchaseModal } = useJarAmoozPurchaseModal();

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    openPurchaseModal({
      courseId: courseId || "photography-masterclass",
      title,
      price,
      initialPhone: initialPhone || "",
    });
  };

  const defaultText = isLoggedIn ? "ورود به درگاه پرداخت" : "شروع ثبت‌نام و ورود به دوره";

  const colorStyles =
    variant === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_18px_rgba(16,185,129,0.28)]"
      : "bg-[#006097] hover:bg-[#056297] shadow-[0_4px_18px_rgba(0,96,151,0.25)]";

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      className={`flex items-center justify-center gap-1.5 text-white transition-all duration-200 hover:scale-105 active:scale-98 cursor-pointer select-none ${colorStyles} ${
        className || "w-full h-12 px-8 rounded-2xl text-sm font-black"
      }`}
    >
      <span>{customText || defaultText}</span>
      <ArrowLeft className="h-3.5 w-3.5" />
    </button>
  );
}
