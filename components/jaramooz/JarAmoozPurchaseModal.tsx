"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  ArrowLeft,
  Phone,
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
  Award,
  Check,
  Sliders,
  ChevronRight,
  ChevronDown,
  Gift,
  PackageCheck,
  Layers,
  AlertCircle,
} from "lucide-react";
import { sanitizeIranMobileInput, isValidIranMobileLocal } from "@/lib/auth/phone";
import { sendOtpCode, verifyOtpCodeInline } from "@/app/actions/authActions";
import { useJarAmoozPurchaseModal } from "./JarAmoozPurchaseContext";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

export interface CourseModuleItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  price: number;
  originalPrice: number;
  isRequired: boolean;
  isSubscriptionBonus?: boolean;
  isGift?: boolean;
  giftLabel?: string;
  tag?: string;
}

export const COURSE_MODULES: CourseModuleItem[] = [
  {
    id: "mindset",
    number: "۰۱",
    title: "سرفصل ۰۱: ذهنیت ثروت‌ساز و فونداسیون بیزینس عکاسی",
    subtitle: "اصول برندینگ شخصی، روانشناسی مشتری و شکستن باورهای محدودکننده",
    price: 0,
    originalPrice: 2800000,
    isRequired: true,
    isGift: true,
    giftLabel: "هدیه پکیج (رایگان)",
    tag: "پایه و ضروری",
  },
  {
    id: "mobilegraphy",
    number: "۰۲",
    title: "سرفصل ۰۲: تسلط بر موبایلگرافی و ولاگری تجاری",
    subtitle: "تنظیمات دستی Pro، فریم‌ریت استاندارد و الگوریتم‌های تولید محتوای پربازدید",
    price: 2900000,
    originalPrice: 3500000,
    isRequired: false,
    tag: "موبایلگرافی Pro",
  },
  {
    id: "optics_lighting",
    number: "۰۳",
    title: "سرفصل ۰۳: مهندسی نور، شیدرها و اپتیک استودیویی",
    subtitle: "چیدمان Key / Rim / Fill Light، کنترل انعکاس شیشه و فلزات بدون تجهیزات میلیاردی",
    price: 3400000,
    originalPrice: 4200000,
    isRequired: false,
    tag: "نورپردازی استودیو",
  },
  {
    id: "staging_directing",
    number: "۰۴",
    title: "سرفصل ۰۴: کارگردانی صحنه، چیدمان و استوری‌بورد تجاری",
    subtitle: "سناریونویسی تبلیغاتی، پالت رنگ صحنه و دکوپاژ ویژه تیزرهای برندها",
    price: 2500000,
    originalPrice: 3200000,
    isRequired: false,
    tag: "کارگردانی تیزر",
  },
  {
    id: "post_production",
    number: "۰۵",
    title: "سرفصل ۰۵: جادوی پست‌تولید، رتوش فرکانسی و کالرگریدینگ",
    subtitle: "اصلاح بافت پوست در فتوشاپ، تفکیک رنگ در لایت‌روم و طراحی پریست‌های رنگی",
    price: 3200000,
    originalPrice: 3900000,
    isRequired: false,
    tag: "ادیت سینمایی",
  },
  {
    id: "b2b_contracts",
    number: "۰۶",
    title: "سرفصل ۰۶: ماشین پول‌سازی، مذاکره و بستن قراردادهای B2B",
    subtitle: "فرمول بستن قراردادهای حقوقی ۱۵ تا ۳۵ میلیون تومانی با برندها و شرکت‌ها",
    price: 3800000,
    originalPrice: 4800000,
    isRequired: false,
    tag: "درآمد و مارکتینگ",
  },
  {
    id: "vip_mentoring",
    number: "۰۷",
    title: "بخش‌های ویژه VIP: جلسات ژوژمان اختصاصی و منتورینگ مستقیم",
    subtitle: "بررسی و آنالیز مستقیم پروژه‌های شما توسط کوروش چنان + لایوهای ماهانه رفع اشکال",
    price: 2900000,
    originalPrice: 3800000,
    isRequired: false,
    tag: "ژوژمان VIP",
  },
  {
    id: "jar_subscription",
    number: "۰۸",
    title: "اشتراک طلایی و اتصال مستقیم به شبکه پروژه‌های جار",
    subtitle: "معرفی به عنوان متخصص تاییدشده در سامانه سراسری جار جهت دریافت سفارش‌های عکاسی",
    price: 0,
    originalPrice: 2500000,
    isRequired: false,
    isSubscriptionBonus: true,
    isGift: true,
    giftLabel: "هدیه پکیج (رایگان)",
    tag: "اتصال به بازار کار",
  },
];

// Special bundle discounted price when all chapters are selected
const FULL_BUNDLE_SPECIAL_PRICE = 9100000;
const ALL_MODULE_IDS = COURSE_MODULES.map((m) => m.id);
const CORE_OPTIONAL_IDS = ["mobilegraphy", "optics_lighting", "staging_directing", "post_production", "b2b_contracts", "vip_mentoring"];

export default function JarAmoozPurchaseModal() {
  const { isOpen, selectedCourse, closePurchaseModal } = useJarAmoozPurchaseModal();

  // Navigation Steps: "customize" -> "phone" -> "otp" -> "payment_transfer"
  const [step, setStep] = useState<"customize" | "phone" | "otp" | "payment_transfer">("customize");
  
  // Customization Mode: when false, shows only the master bundle option. When true, expands all 8 chapters.
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(ALL_MODULE_IDS);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const isSubmittingRef = useRef(false);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("customize");
      setIsCustomizing(false);
      setSelectedModuleIds(ALL_MODULE_IDS);
      if (selectedCourse?.initialPhone) {
        setPhone(selectedCourse.initialPhone);
      }
      setOtp("");
      setError(null);
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [isOpen, selectedCourse]);

  // Countdown timer for OTP resend (120s)
  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const interval = window.setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step, resendIn]);

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        closePurchaseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, closePurchaseModal]);

  // Focus OTP input when step changes to otp
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Are ALL 6 core optional chapters selected?
  const areAllCourseChaptersSelected = useMemo(() => {
    return CORE_OPTIONAL_IDS.every((id) => selectedModuleIds.includes(id));
  }, [selectedModuleIds]);

  // If all course chapters are selected, jar_subscription is unlocked and active!
  // If not all course chapters are selected, jar_subscription is locked/disabled.
  const isSubscriptionActive = useMemo(() => {
    return !isCustomizing || areAllCourseChaptersSelected;
  }, [isCustomizing, areAllCourseChaptersSelected]);

  // Overall isAllSelected status
  const isAllSelected = useMemo(() => {
    return !isCustomizing || areAllCourseChaptersSelected;
  }, [isCustomizing, areAllCourseChaptersSelected]);

  const rawIndividualTotal = useMemo(() => {
    return COURSE_MODULES.filter((m) => {
      if (m.id === "jar_subscription") {
        return isSubscriptionActive;
      }
      return selectedModuleIds.includes(m.id);
    }).reduce((sum, m) => sum + m.price, 0);
  }, [selectedModuleIds, isSubscriptionActive]);

  const totalOriginalValuation = useMemo(() => {
    return COURSE_MODULES.filter((m) => {
      if (m.id === "jar_subscription") {
        return isSubscriptionActive;
      }
      return selectedModuleIds.includes(m.id);
    }).reduce((sum, m) => sum + m.originalPrice, 0);
  }, [selectedModuleIds, isSubscriptionActive]);

  // Final Price: if in master mode or all core chapters selected -> 9,100,000; otherwise sum of individual choices
  const finalCalculatedPrice = useMemo(() => {
    if (!isCustomizing || isAllSelected) {
      return FULL_BUNDLE_SPECIAL_PRICE;
    }
    return Math.max(rawIndividualTotal, 100000);
  }, [isCustomizing, isAllSelected, rawIndividualTotal]);

  // Toggle Module Selection
  const toggleModule = (id: string, isRequired: boolean, isSubscriptionBonus?: boolean) => {
    if (isRequired) return; // Mindset is always required

    if (isSubscriptionBonus) {
      // If user clicks on Jar subscription when it's locked, prompt to select all or activate full bundle
      if (!areAllCourseChaptersSelected) {
        selectAll();
        return;
      }
      return;
    }

    setSelectedModuleIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }

      // Check if all core optional items are in updated
      const allCoreNow = CORE_OPTIONAL_IDS.every((cid) => updated.includes(cid));
      if (allCoreNow && !updated.includes("jar_subscription")) {
        updated.push("jar_subscription");
      } else if (!allCoreNow && updated.includes("jar_subscription")) {
        updated = updated.filter((item) => item !== "jar_subscription");
      }

      return updated;
    });
  };

  // Toggle Master Bundle Checkbox
  const toggleMasterBundle = () => {
    if (!isCustomizing) {
      // User unchecked the master bundle -> expand all individual chapters
      setIsCustomizing(true);
      // Deselect one optional chapter by default to make the customization immediate and clear
      setSelectedModuleIds(
        COURSE_MODULES.filter((m) => m.id !== "vip_mentoring" && m.id !== "jar_subscription").map((m) => m.id)
      );
    } else {
      // User selected full bundle -> collapse back to master mode
      setIsCustomizing(false);
      setSelectedModuleIds(ALL_MODULE_IDS);
    }
  };

  const selectAll = () => {
    setIsCustomizing(false);
    setSelectedModuleIds(ALL_MODULE_IDS);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const cleanPhone = sanitizeIranMobileInput(phone);
    if (!isValidIranMobileLocal(cleanPhone)) {
      setError("شماره موبایل معتبر نیست. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹ (۱۱ رقم با ۰۹)");
      return;
    }

    setLoading(true);

    try {
      const res = await sendOtpCode(cleanPhone);
      if (!res.success) {
        throw new Error(res.error || "خطا در ارسال کد تأیید");
      }
      setStep("otp");
      setOtp("");
      setResendIn(120); // 2 minutes timer
    } catch (err: any) {
      setError(err.message || "خطا در ارسال کد تأیید. مجدداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = useCallback(
    async (phoneDigits: string) => {
      if (!selectedCourse) return;
      setStep("payment_transfer");
      setLoading(true);
      setError(null);

      const finalModules = isSubscriptionActive
        ? [...selectedModuleIds, "jar_subscription"].filter((v, i, a) => a.indexOf(v) === i)
        : selectedModuleIds.filter((id) => id !== "jar_subscription");

      try {
        const res = await fetch("/api/jaramooz/payment/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourse.courseId,
            phone: phoneDigits,
            amount: finalCalculatedPrice,
            selectedModules: finalModules,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "خطا در شروع فرآیند پرداخت");
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("آدرس درگاه پرداخت دریافت نشد.");
        }
      } catch (err: any) {
        setError(err.message || "خطایی در فرآیند انتقال به درگاه رخ داد.");
        setLoading(false);
        setStep("otp");
        isSubmittingRef.current = false;
      }
    },
    [selectedCourse, finalCalculatedPrice, selectedModuleIds, isSubscriptionActive]
  );

  const triggerVerifyOtp = useCallback(
    async (otpCodeValue: string) => {
      if (isSubmittingRef.current || loading) return;
      isSubmittingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const cleanPhone = sanitizeIranMobileInput(phone);
        const res = await verifyOtpCodeInline(cleanPhone, otpCodeValue);

        if (!res.success) {
          throw new Error(res.error || "کد وارد شده صحیح نیست.");
        }

        // OTP verified successfully -> initiate payment gateway
        await handleInitiatePayment(cleanPhone);
      } catch (err: any) {
        setError(err.message || "کد تأیید نامعتبر است.");
        setLoading(false);
        isSubmittingRef.current = false;
      }
    },
    [phone, loading, handleInitiatePayment]
  );

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setOtp(val);
    setError(null);

    // Auto-submit as soon as 4 digits are entered!
    if (val.length === 4 && !isSubmittingRef.current) {
      triggerVerifyOtp(val);
    }
  };

  if (!mounted || !isOpen || !selectedCourse) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in">
      {/* Backdrop overlay click close */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={() => !loading && closePurchaseModal()}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-white/30 bg-white/95 backdrop-blur-2xl shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header (Sticky Top) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#006097]/10 text-[#006097]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {step === "customize" ? "ثبت‌نام و انتخاب سرفصل‌ها" : "تایید شماره موبایل و ورود به دوره"}
              </h3>
              <p className="text-xs font-extrabold text-[#006097] mt-0.5">
                مسترکلاس ۱۰۰ روزه عکاسی تجاری (کوروش چنان)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !loading && closePurchaseModal()}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-600 animate-shake">
              {error}
            </div>
          )}

          {/* STEP 1: MODULAR COURSE CHAPTER CUSTOMIZER */}
          {step === "customize" && (
            <div className="space-y-4">

              {/* 1. MASTER BUNDLE CHECKBOX CARD (Default Single Checkbox View) */}
              {!isCustomizing ? (
                <div className="space-y-3">
                  <div
                    onClick={toggleMasterBundle}
                    className="relative flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/30 shadow-[0_8px_30px_rgba(16,185,129,0.12)] cursor-pointer transition-all hover:scale-[1.01] select-none"
                  >
                    {/* Master Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-right">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-black text-slate-900">
                            پکیج جامع مسترکلاس ۱۰۰ روزه (شامل تمام سرفصل‌ها)
                          </h4>
                        </div>

                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                          🎁 ۵۲٪ تخفیف ویژه پکیج کامل
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        شامل هر ۸ سرفصل تخصصی، فایل‌های RAW استودیو، قراردادهای حقوقی B2B، ژوژمان اختصاصی مدرس و اتصال به شبکه پروژه‌های جار.
                      </p>

                      {/* Included Features Bullet Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-700 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
                          ✓ نورپردازی استودیویی
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
                          ✓ موبایلگرافی تجاری
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
                          ✓ رتوش و کالرگریدینگ
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-md">
                          ✓ قراردادهای ۳۰ میلیونی B2B
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-md">
                          🎁 اشتراک طلایی جار (هدیه)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button to Customize Individual Chapters */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomizing(true);
                        setSelectedModuleIds(
                          COURSE_MODULES.filter((m) => m.id !== "vip_mentoring" && m.id !== "jar_subscription").map((m) => m.id)
                        );
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006097] hover:text-[#004d7a] hover:underline transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>مایل به حذف برخی سرفصل‌ها یا خرید تکی هستید؟ (شخصی‌سازی سرفصل‌ها)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* 2. EXPANDED INDIVIDUAL CHAPTERS VIEW (When user unchecks master checkbox) */
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Banner to Switch Back to Master Bundle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-50 to-sky-50 p-3.5 rounded-2xl border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Sliders className="w-4 h-4 text-[#006097]" />
                      <span>سرفصل‌های مد نظرتان را انتخاب کنید:</span>
                    </div>

                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-3 py-1.5 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all flex items-center justify-center gap-1"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>✨ انتخاب تمام سرفصل‌ها (تخفیف پکیج جامع)</span>
                    </button>
                  </div>

                  {/* Individual Chapter Checkbox Cards */}
                  <div className="space-y-2.5">
                    {COURSE_MODULES.map((module) => {
                      const isSubscriptionItem = module.id === "jar_subscription";
                      const isLockedRequirement = module.isRequired; // Mindset is required

                      // For Jar Subscription: it is active ONLY if all other chapters are checked!
                      const isChecked = isSubscriptionItem
                        ? isSubscriptionActive
                        : selectedModuleIds.includes(module.id);

                      const isDisabledItem = isSubscriptionItem && !areAllCourseChaptersSelected;

                      return (
                        <div
                          key={module.id}
                          onClick={() => toggleModule(module.id, isLockedRequirement, isSubscriptionItem)}
                          className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all select-none ${
                            isLockedRequirement
                              ? "bg-slate-50/90 border-slate-200 cursor-default"
                              : isDisabledItem
                              ? "bg-slate-100/70 border-dashed border-slate-300 opacity-65 cursor-pointer hover:border-emerald-400 hover:opacity-90"
                              : isChecked
                              ? "bg-white border-emerald-400/80 shadow-[0_4px_16px_rgba(16,185,129,0.08)] cursor-pointer hover:border-emerald-500"
                              : "bg-slate-50/60 border-slate-200/80 opacity-60 cursor-pointer hover:opacity-100 hover:bg-white"
                          }`}
                        >
                          {/* Checkbox Icon */}
                          <div className="pt-0.5 shrink-0">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                isLockedRequirement || (isSubscriptionItem && isChecked)
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : isDisabledItem
                                  ? "bg-slate-200 text-slate-400 border border-slate-300"
                                  : isChecked
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border-2 border-slate-300 bg-white"
                              }`}
                            >
                              {isChecked ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : isDisabledItem ? (
                                <Lock className="w-3 h-3 text-slate-500" />
                              ) : null}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-1 text-right">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span
                                className={`text-xs font-black leading-snug ${
                                  isChecked ? "text-slate-900" : isDisabledItem ? "text-slate-600 line-through" : "text-slate-500"
                                }`}
                              >
                                {module.title}
                              </span>

                              {/* Price Tag */}
                              <div className="shrink-0">
                                {isSubscriptionItem ? (
                                  isSubscriptionActive ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300/80 px-2 py-0.5 rounded-md animate-pulse">
                                      <Gift className="w-3 h-3 text-emerald-600" />
                                      <span>هدیه ویژه پکیج کامل (رایگان)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-md">
                                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                                      <span>غیرفعال (نیاز به پکیج کامل)</span>
                                    </span>
                                  )
                                ) : module.isGift ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-2 py-0.5 rounded-md">
                                    <Gift className="w-3 h-3 text-emerald-600" />
                                    <span>{module.giftLabel}</span>
                                  </span>
                                ) : (
                                  <div className="text-left">
                                    <span
                                      className={`text-xs font-black font-mono ${
                                        isChecked ? "text-[#006097]" : "text-slate-400 line-through"
                                      }`}
                                    >
                                      {formatPrice(module.price)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                              {module.subtitle}
                            </p>

                            {/* Contextual Sub-label */}
                            {isLockedRequirement && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold pt-0.5">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>سرفصل پایه و ضروری (هدیه همراه دوره)</span>
                              </div>
                            )}

                            {isSubscriptionItem && !isSubscriptionActive && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold pt-0.5">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>با انتخاب تمام سرفصل‌های دوره، اشتراک طلایی جار به صورت هدیه رایگان برای شما فعال می‌شود.</span>
                              </div>
                            )}

                            {isSubscriptionItem && isSubscriptionActive && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold pt-0.5">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>تبریک! اشتراک طلایی و اتصال به شبکه پروژه‌های جار به عنوان پاداش پکیج کامل فعال شد.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* STEP 2: PHONE INPUT */}
          {step === "phone" && (
            <div className="space-y-4 animate-fade-in">
              {/* Back to customizer button */}
              <button
                type="button"
                onClick={() => setStep("customize")}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#006097] hover:underline"
              >
                <ChevronRight className="w-4 h-4" />
                <span>ویرایش سرفصل‌های انتخابی ({isAllSelected ? "۸ سرفصل پکیج کامل" : `${selectedModuleIds.length} سرفصل`})</span>
              </button>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-500 text-right">
                  برای ثبت‌نام و اتصال به درگاه شاپرک با مبلغ انتخاب‌شده، شماره موبایل خود را وارد کنید:
                </p>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-700">شماره موبایل</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                      <Phone className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      required
                      maxLength={11}
                      className="w-full h-12 pr-11 pl-4 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#006097]/30 focus:border-[#006097] text-left transition-all font-semibold focus:bg-white"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValidIranMobileLocal(sanitizeIranMobileInput(phone))}
                  className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all duration-200 hover:shadow-lg active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
                >
                  {loading ? (
                    <>
                      در حال ارسال کد...
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      دریافت کد تایید و مرحله نهایی
                      <ArrowLeft className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: OTP INPUT */}
          {step === "otp" && (
            <div className="space-y-5 animate-fade-in">
              <p className="text-xs leading-relaxed text-slate-500 text-right">
                کد تایید ۴ رقمی ارسال شده به شماره <strong dir="ltr" className="text-slate-900 font-mono">{phone}</strong> را وارد کنید:
              </p>

              <div className="space-y-2 text-center">
                <label className="text-xs font-bold text-slate-700 block text-right">کد تایید ۴ رقمی</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="• • • •"
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={loading}
                  maxLength={4}
                  autoFocus
                  className="w-full h-13 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-300 text-xl font-bold text-center tracking-[0.8em] focus:outline-none focus:ring-2 focus:ring-[#006097]/40 focus:border-[#006097] transition-all focus:bg-white font-mono"
                  dir="ltr"
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#006097] animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال بررسی و اتصال به درگاه پرداخت...</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => !loading && setStep("phone")}
                  disabled={loading}
                  className="text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-4 transition disabled:opacity-40"
                >
                  تغییر شماره موبایل
                </button>

                {resendIn > 0 ? (
                  <span className="text-slate-400 font-medium">
                    ارسال مجدد کد تا{" "}
                    <span className="font-mono font-bold text-[#006097]" dir="ltr">
                      {formatTimer(resendIn)}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="flex items-center gap-1 font-bold text-[#006097] hover:underline transition disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    ارسال مجدد کد تایید
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => triggerVerifyOtp(otp)}
                disabled={loading || otp.length !== 4}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all duration-200 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              >
                {loading ? (
                  <>
                    در حال تایید...
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    تایید و انتقال به درگاه پرداخت ({formatPrice(finalCalculatedPrice)})
                    <ArrowLeft className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 4: GATEWAY TRANSFER */}
          {step === "payment_transfer" && (
            <div className="py-8 space-y-4 text-center animate-fade-in">
              <div className="flex justify-center text-[#006097]">
                <Loader2 className="h-12 w-12 animate-spin" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                در حال انتقال به درگاه پرداخت شاپرک...
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                مبلغ تراکنش: <strong className="text-emerald-700">{formatPrice(finalCalculatedPrice)}</strong>
              </p>
            </div>
          )}

        </div>

        {/* Dynamic Sticky Bottom Pricing Bar (Always Visible at bottom) */}
        <div className="border-t border-slate-200/80 bg-slate-50/90 p-4 sm:p-5 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">
                {isAllSelected ? "پکیج کامل دوره (۸ سرفصل + تمام هدایا)" : `${selectedModuleIds.length} سرفصل انتخابی`}:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-black text-emerald-700">
                  {formatPrice(finalCalculatedPrice)}
                </span>
                {isAllSelected && (
                  <span className="text-xs text-slate-400 line-through font-mono">
                    {formatPrice(totalOriginalValuation)}
                  </span>
                )}
              </div>
            </div>

            {isAllSelected ? (
              <span className="text-[10px] sm:text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1 rounded-xl animate-pulse">
                🎁 ۵۲٪ تخفیف کل دوره اعمال شد
              </span>
            ) : (
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] sm:text-[11px] font-extrabold text-[#006097] hover:underline"
              >
                + فعال‌سازی همه (با تخفیف پکیج)
              </button>
            )}
          </div>

          {/* Action button on Step 1 */}
          {step === "customize" && (
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all duration-200 hover:shadow-lg active:scale-98 shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
            >
              <span>ادامه ثبت‌نام با این سرفصل‌ها</span>
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {/* Guarantee pill */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>۷ روز ضمانت ۱۰۰٪ بازگشت وجه + دسترسی آنی پس از پرداخت</span>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
