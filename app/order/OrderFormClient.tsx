"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { CATEGORIES_BY_SLUG, ALL_CATEGORIES } from "@/lib/categories";
import { BUDGET_STOPS, formatPrice } from "@/components/order/BudgetSlider";
import { createOrderAction } from "@/app/actions/orderActions";
import OrderSubmitWaiting from "@/components/order/OrderSubmitWaiting";

import StepCategory from "@/components/order/steps/StepCategory";
import StepLocation, { LocationType } from "@/components/order/steps/StepLocation";
import StepDateTime from "@/components/order/steps/StepDateTime";
import StepBudget from "@/components/order/steps/StepBudget";
import StepSummary from "@/components/order/steps/StepSummary";

interface OrderFormClientProps {
  initialContactName?: string;
  initialContactPhone?: string;
  userId?: string | null;
}

// Generate default upcoming date (tomorrow)
function getDefaultTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
}

const STEP_TITLES: Record<number, string> = {
  1: "انتخاب خدمت",
  2: "محل پروژه",
  3: "زمان‌بندی و مدت آفیش",
  4: "بودجه و پیش‌فاکتور نهایی",
};

export default function OrderFormClient({
  initialContactName = "",
  initialContactPhone = "",
  userId,
}: OrderFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard Navigation State (3 Steps)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1); // 1 = next, -1 = prev

  // Form State
  const [categorySlug, setCategorySlug] = useState<string>(() => {
    const urlCat = searchParams.get("category");
    if (urlCat && CATEGORIES_BY_SLUG[urlCat]) return urlCat;
    return "portrait-avatar";
  });

  // Scheduling State
  const [isFlexibleSchedule, setIsFlexibleSchedule] = useState<boolean>(true);
  const [bookingDate, setBookingDate] = useState<string>(() => getDefaultTomorrowDate());
  const [durationHours, setDurationHours] = useState<number>(2);
  const [timeSlot, setTimeSlot] = useState<string>("۱۶:۰۰ الی ۱۸:۰۰ (غروب)");

  // Location State
  const [locationType, setLocationType] = useState<LocationType>("SPECIALIST_ADVICE");
  const [locationAddress, setLocationAddress] = useState("");
  const [districtOrCity, setDistrictOrCity] = useState("تهران");
  // The picked point, kept so the travel fee can be quoted per specialist.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Budget State
  const [isAutoPriced, setIsAutoPriced] = useState<boolean>(true);
  const [selectedBudgetIndex, setSelectedBudgetIndex] = useState<number>(3); // 3.6M golden stop default

  // Contact Info State
  const [contactName, setContactName] = useState(initialContactName);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [projectDescription, setProjectDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingAfterSubmit, setWaitingAfterSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived Values
  const selectedCategory = CATEGORIES_BY_SLUG[categorySlug] || ALL_CATEGORIES[0];
  const currentBudgetStop = BUDGET_STOPS[selectedBudgetIndex] || BUDGET_STOPS[3];
  const hourlyRate = isAutoPriced ? 3600000 : currentBudgetStop.rate;
  const totalEstimatedPrice = hourlyRate * durationHours;

  const locationLabel = useMemo(() => {
    if (locationType === "CLIENT_LOCATION") {
      return districtOrCity ? `محل شما (${districtOrCity})` : "محل کارفرما";
    }
    if (locationType === "SPECIALIST_ADVICE") {
      return "با مشورت و پیشنهاد عکاس (پیشنهادی جار)";
    }
    return "لوکیشن‌ها و استودیوهای همکار جار";
  }, [locationType, districtOrCity]);

  // Validation Logic per step
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(categorySlug);
      case 2:
        return (
          Boolean(locationType) &&
          (locationType !== "CLIENT_LOCATION" || districtOrCity.trim().length > 0)
        );
      case 3:
        return (
          durationHours >= 1 &&
          (isFlexibleSchedule || (Boolean(bookingDate) && Boolean(timeSlot)))
        );
      case 4:
        return (
          (isAutoPriced || selectedBudgetIndex >= 0) &&
          contactPhone.trim().length >= 10 &&
          contactName.trim().length >= 2
        );
      default:
        return true;
    }
  }, [
    currentStep,
    categorySlug,
    locationType,
    districtOrCity,
    isFlexibleSchedule,
    bookingDate,
    durationHours,
    timeSlot,
    isAutoPriced,
    selectedBudgetIndex,
    contactPhone,
    contactName,
  ]);

  // Reset scroll to top on step changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [currentStep]);

  // Step Controllers
  const handleNext = () => {
    if (!isStepValid) return;
    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    } else {
      handleSubmitFinalOrder();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  };

  // Final Order Submission
  const handleSubmitFinalOrder = async () => {
    setSubmitError(null);

    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      setSubmitError("لطفاً شماره تماس معتبر برای هماهنگی نهایی وارد فرمایید.");
      return;
    }

    if (!contactName.trim() || contactName.trim().length < 2) {
      setSubmitError("لطفاً نام و نام‌خانوادگی کارفرما را وارد فرمایید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createOrderAction({
        categorySlug,
        isFlexibleSchedule,
        bookingDate,
        timeSlot,
        durationHours,
        locationType,
        locationAddress,
        districtOrCity,
        locationLat: coords?.lat ?? null,
        locationLng: coords?.lng ?? null,
        referenceLink: "",
        moodboardUrls: [],
        projectDescription: projectDescription.trim(),
        isAutoPriced,
        hourlyRate,
        contactName,
        contactPhone,
      });

      if (res.success && res.orderId) {
        setWaitingAfterSubmit(true);
        window.setTimeout(() => {
          router.push(`/order/${res.orderId}`);
        }, 2200);
      } else if (res.orderId) {
        // Active project already exists — send them there.
        router.push(`/order/${res.orderId}`);
      } else {
        setSubmitError(res.error || "خطا در ثبت نهایی سفارش. لطفاً دوباره تلاش کنید.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setSubmitError("خطای شبکه یا سرور در ثبت سفارش رخ داد.");
      setIsSubmitting(false);
    }
  };

  // Animation Variants for Soft & Smooth Spring/Bezier Step Transition
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 32 : -32,
      opacity: 0,
      scale: 0.985,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -28 : 28,
      opacity: 0,
      scale: 0.985,
    }),
  };

  return (
    <div className="min-h-dvh w-full overflow-x-clip bg-jar-canvas text-jar-primary flex flex-col selection:bg-jar-primary/10 relative z-[2]" dir="rtl">

      {/* 1. FIXED STANDARD WIZARD HEADER - Claude Warm Editorial Style */}
      <header className="sticky top-0 inset-x-0 z-40 w-full bg-jar-canvas/90 backdrop-blur-md border-b border-jar-border pt-[env(safe-area-inset-top,0px)] shadow-none">
        
        {/* Solid Editorial Black Progress Bar */}
        <div className="w-full h-1 bg-jar-border relative overflow-hidden">
          <div
            className="h-full bg-jar-primary transition-all duration-350 ease-out rounded-r-full"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Back button */}
          <div className="w-9 sm:w-11 flex justify-start">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft hover:text-jar-primary transition-colors shadow-none active:scale-95 cursor-pointer"
                aria-label="مرحله قبلی"
              >
                <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
              </button>
            ) : null}
          </div>

          {/* Step Indicator Counter & Prominent Step Title */}
          <div className="text-center flex flex-col items-center justify-center gap-0.5 sm:gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-jar-surface border border-jar-border text-[10px] sm:text-xs font-bold text-jar-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-jar-primary" />
              مرحله {currentStep} از ۴
            </span>
            <span className="text-xs sm:text-sm font-bold text-jar-primary block tracking-tight">
              {STEP_TITLES[currentStep]}
            </span>
          </div>

          {/* Close / Exit Button */}
          <div className="w-9 sm:w-11 flex justify-end">
            <Link
              href="/"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft hover:text-jar-primary transition-colors shadow-none active:scale-95 cursor-pointer"
              aria-label="خروج از فرم"
            >
              <X className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. CENTER RESPONSIVE CONTAINER (Mobile & Computer) */}
      <div className={`flex-1 w-full relative z-10 ${
        currentStep === 2
          ? "static p-0 m-0 pointer-events-none"
          : "max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-28 sm:pb-32 overflow-x-clip"
      }`}>
        
        {submitError && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shadow-xs pointer-events-auto">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={currentStep === 2 ? undefined : slideVariants}
            initial={currentStep === 2 ? { opacity: 0 } : "enter"}
            animate={currentStep === 2 ? { opacity: 1 } : "center"}
            exit={currentStep === 2 ? { opacity: 0 } : "exit"}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={currentStep === 2 ? "fixed inset-0 w-full h-dvh z-0 overflow-hidden pointer-events-auto" : ""}
          >
            {currentStep === 1 && (
              <StepCategory
                selectedSlug={categorySlug}
                onSelectSlug={(slug) => {
                  setCategorySlug(slug);
                }}
              />
            )}

            {currentStep === 2 && (
              <StepLocation
                locationType={locationType}
                onChangeLocationType={setLocationType}
                address={locationAddress}
                onChangeAddress={setLocationAddress}
                district={districtOrCity}
                onChangeCoords={setCoords}
                onChangeDistrict={setDistrictOrCity}
              />
            )}

            {currentStep === 3 && (
              <StepDateTime
                isFlexibleSchedule={isFlexibleSchedule}
                onChangeFlexibleSchedule={setIsFlexibleSchedule}
                bookingDate={bookingDate}
                onChangeBookingDate={setBookingDate}
                durationHours={durationHours}
                onChangeDurationHours={setDurationHours}
                timeSlot={timeSlot}
                onChangeTimeSlot={setTimeSlot}
              />
            )}

            {currentStep === 4 && (
              <div className="space-y-6 sm:space-y-7">
                <StepBudget
                  isAutoPriced={isAutoPriced}
                  onChangeAutoPriced={setIsAutoPriced}
                  selectedBudgetIndex={selectedBudgetIndex}
                  onChangeBudgetIndex={setSelectedBudgetIndex}
                  durationHours={durationHours}
                />

                <StepSummary
                  categoryTitle={selectedCategory.title}
                  categorySlug={selectedCategory.slug}
                  isFlexibleSchedule={isFlexibleSchedule}
                  bookingDate={bookingDate}
                  timeSlot={timeSlot}
                  durationHours={durationHours}
                  hourlyRate={hourlyRate}
                  locationLabel={locationLabel}
                  contactName={contactName}
                  onChangeContactName={setContactName}
                  contactPhone={contactPhone}
                  onChangeContactPhone={setContactPhone}
                  projectDescription={projectDescription}
                  onChangeProjectDescription={setProjectDescription}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. STICKY BOTTOM ACTION BAR WITH CLAUDE LIGHT WARM FROSTED GLASS */}
      <footer className="fixed bottom-0 inset-x-0 w-full bg-jar-canvas/90 backdrop-blur-md border-t border-jar-border py-2.5 sm:py-3 px-3 sm:px-6 z-50 shadow-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3 w-full">
          
          {/* Secondary "قبلی" Button on Right (RTL) */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="h-11 sm:h-12 px-4 sm:px-6 shrink-0 rounded-full border border-jar-border text-jar-primary text-xs sm:text-sm font-medium hover:bg-jar-soft transition-colors cursor-pointer shadow-none bg-jar-surface"
            >
              قبلی
            </button>
          )}

          {/* Primary Action Button: Solid Jet-Black #141413 */}
          <button
            type="button"
            disabled={!isStepValid || isSubmitting || waitingAfterSubmit}
            onClick={handleNext}
            className={`h-11 sm:h-12 px-5 sm:px-8 flex-1 min-w-0 rounded-full font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-none ${
              !isStepValid
                ? "bg-jar-border/60 text-[#A8A29A] border border-jar-border cursor-not-allowed"
                : "bg-jar-primary hover:bg-jar-primaryHover active:bg-[#1f1e1d] text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
                <span className="truncate">در حال ثبت درخواست پروژه...</span>
              </>
            ) : currentStep === 4 ? (
              <>
                <Sparkles className="h-4 w-4 shrink-0 text-white fill-white" />
                <span className="truncate">ثبت نهایی درخواست پروژه</span>
              </>
            ) : (
              <>
                <span>ادامه</span>
                <ArrowLeft className="h-4 w-4 shrink-0 stroke-[2.5]" />
              </>
            )}
          </button>

        </div>
      </footer>

      {waitingAfterSubmit && <OrderSubmitWaiting categoryTitle={selectedCategory.title} />}

    </div>
  );
}
