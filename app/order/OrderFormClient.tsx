"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { CATEGORIES_BY_SLUG, ALL_CATEGORIES } from "@/lib/categories";
import { createOrderAction } from "@/app/actions/orderActions";
import OrderSubmitWaiting from "@/components/order/OrderSubmitWaiting";

import StepCategory from "@/components/order/steps/StepCategory";
import StepLocation, { LocationType } from "@/components/order/steps/StepLocation";
import StepDateTime from "@/components/order/steps/StepDateTime";
import StepFinalize, {
  MIN_PROJECT_DESCRIPTION_LENGTH,
  isValidPersonName,
  sanitizePersonName,
} from "@/components/order/steps/StepFinalize";
import {
  getGoldenIndex,
  resolveHourlyRate,
} from "@/lib/pricing/budgetStops";

interface OrderFormClientProps {
  initialContactName?: string;
  initialContactPhone?: string;
  userId?: string | null;
  /** Only categories with at least one ACTIVE specialist. */
  availableCategorySlugs?: string[];
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
  4: "جزئیات نهایی",
};

export default function OrderFormClient({
  initialContactName = "",
  initialContactPhone = "",
  userId,
  availableCategorySlugs = [],
}: OrderFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderableSlugs = useMemo(() => {
    const allowed = new Set(availableCategorySlugs);
    return ALL_CATEGORIES.map((c) => c.slug).filter((s) => allowed.has(s));
  }, [availableCategorySlugs]);

  // Wizard Navigation State (3 Steps)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1); // 1 = next, -1 = prev

  // Form State
  const [categorySlug, setCategorySlug] = useState<string>(() => {
    const urlCat = searchParams.get("category");
    if (urlCat && availableCategorySlugs.includes(urlCat) && CATEGORIES_BY_SLUG[urlCat]) {
      return urlCat;
    }
    return availableCategorySlugs[0] || "";
  });

  useEffect(() => {
    if (orderableSlugs.length === 0) {
      if (categorySlug) setCategorySlug("");
      return;
    }
    if (!orderableSlugs.includes(categorySlug)) {
      setCategorySlug(orderableSlugs[0]);
    }
  }, [orderableSlugs, categorySlug]);

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
  const [photoLocationId, setPhotoLocationId] = useState<string | null>(null);

  // Contact + brief (phone comes from account; not collected again)
  const [contactName, setContactName] = useState(() =>
    sanitizePersonName(initialContactName)
  );
  const [projectDescription, setProjectDescription] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([]);
  const [selectedBudgetIndex, setSelectedBudgetIndex] = useState(() => getGoldenIndex());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingAfterSubmit, setWaitingAfterSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived Values
  const selectedCategory =
    (categorySlug && CATEGORIES_BY_SLUG[categorySlug]) ||
    (orderableSlugs[0] ? CATEGORIES_BY_SLUG[orderableSlugs[0]] : null) ||
    ALL_CATEGORIES[0];

  const locationLabel = useMemo(() => {
    if (locationType === "CLIENT_LOCATION") {
      return districtOrCity ? `محل شما (${districtOrCity})` : "محل کارفرما";
    }
    if (locationType === "SPECIALIST_ADVICE") {
      return districtOrCity
        ? `با مشورت عکاس — ${districtOrCity}`
        : "با مشورت و پیشنهاد عکاس";
    }
    return districtOrCity
      ? `استودیوهای همکار جار — ${districtOrCity}`
      : "لوکیشن‌ها و استودیوهای همکار جار";
  }, [locationType, districtOrCity]);

  // Validation Logic per step
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(categorySlug) && orderableSlugs.includes(categorySlug);
      case 2:
        // Custom location must be map-pinned; other modes need a city label.
        if (locationType === "CLIENT_LOCATION") {
          return (
            districtOrCity.trim().length >= 2 &&
            coords != null &&
            Number.isFinite(coords.lat) &&
            Number.isFinite(coords.lng)
          );
        }
        return Boolean(locationType) && districtOrCity.trim().length >= 2;
      case 3:
        return (
          durationHours >= 1 &&
          (isFlexibleSchedule || (Boolean(bookingDate) && Boolean(timeSlot)))
        );
      case 4:
        return (
          isValidPersonName(contactName) &&
          projectDescription.trim().length >= MIN_PROJECT_DESCRIPTION_LENGTH
        );
      default:
        return true;
    }
  }, [
    currentStep,
    categorySlug,
    orderableSlugs,
    locationType,
    districtOrCity,
    coords,
    isFlexibleSchedule,
    bookingDate,
    durationHours,
    timeSlot,
    contactName,
    projectDescription,
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

    if (!isValidPersonName(contactName)) {
      setSubmitError("لطفاً نام و نام‌خانوادگی را فقط با حروف وارد کنید.");
      return;
    }

    if (projectDescription.trim().length < MIN_PROJECT_DESCRIPTION_LENGTH) {
      setSubmitError(
        `توضیحات پروژه باید حداقل ${MIN_PROJECT_DESCRIPTION_LENGTH} حرف باشد.`
      );
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
        photoLocationId:
          locationType === "SPECIALIST_ADVICE" ? null : photoLocationId,
        referenceLink: referenceLink.trim(),
        moodboardUrls,
        projectDescription: projectDescription.trim(),
        isAutoPriced: selectedBudgetIndex === getGoldenIndex(),
        hourlyRate: resolveHourlyRate(selectedBudgetIndex),
        contactName: contactName.trim(),
        contactPhone: initialContactPhone,
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
    <div className="min-h-dvh w-full overflow-x-clip bg-white text-neutral-900 flex flex-col selection:bg-neutral-900/10 relative z-[2]" dir="rtl">

      {/* 1. FIXED STANDARD WIZARD HEADER */}
      <header className="sticky top-0 inset-x-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 pt-[env(safe-area-inset-top,0px)] shadow-none">
        
        <div className="w-full h-1 bg-neutral-100 relative overflow-hidden">
          <div
            className="h-full bg-neutral-900 transition-all duration-350 ease-out rounded-r-full"
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
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-none active:scale-95 cursor-pointer"
                aria-label="مرحله قبلی"
              >
                <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.2]" />
              </button>
            ) : null}
          </div>

          {/* Step Indicator Counter & Prominent Step Title */}
          <div className="text-center flex flex-col items-center justify-center gap-0.5 sm:gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-50 border border-neutral-200 text-[10px] sm:text-xs font-bold text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
              مرحله {currentStep} از ۴
            </span>
            <span className="text-xs sm:text-sm font-bold text-neutral-900 block tracking-tight">
              {STEP_TITLES[currentStep]}
            </span>
          </div>

          {/* Close / Exit Button */}
          <div className="w-9 sm:w-11 flex justify-end">
            <Link
              href="/"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-none active:scale-95 cursor-pointer"
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
                availableSlugs={orderableSlugs}
                onSelectSlug={(slug) => {
                  setCategorySlug(slug);
                }}
              />
            )}

            {currentStep === 2 && (
              <StepLocation
                locationType={locationType}
                onChangeLocationType={(type) => {
                  setLocationType(type);
                  if (type === "SPECIALIST_ADVICE") {
                    setPhotoLocationId(null);
                  }
                }}
                address={locationAddress}
                onChangeAddress={setLocationAddress}
                district={districtOrCity}
                onChangeCoords={setCoords}
                onChangeDistrict={setDistrictOrCity}
                onChangePhotoLocationId={setPhotoLocationId}
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
              <StepFinalize
                categoryTitle={selectedCategory.title}
                categorySlug={selectedCategory.slug}
                isFlexibleSchedule={isFlexibleSchedule}
                bookingDate={bookingDate}
                durationHours={durationHours}
                locationLabel={locationLabel}
                contactName={contactName}
                onChangeContactName={setContactName}
                projectDescription={projectDescription}
                onChangeProjectDescription={setProjectDescription}
                referenceLink={referenceLink}
                onChangeReferenceLink={setReferenceLink}
                moodboardUrls={moodboardUrls}
                onChangeMoodboardUrls={setMoodboardUrls}
                selectedBudgetIndex={selectedBudgetIndex}
                onChangeBudgetIndex={setSelectedBudgetIndex}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. STICKY BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 inset-x-0 w-full bg-white/95 backdrop-blur-md border-t border-neutral-200 py-2.5 sm:py-3 px-3 sm:px-6 z-50 shadow-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3 w-full">
          
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="h-11 sm:h-12 px-4 sm:px-6 shrink-0 rounded-xl border border-neutral-200 text-neutral-900 text-xs sm:text-sm font-medium hover:bg-neutral-50 transition-colors cursor-pointer shadow-none bg-white"
            >
              قبلی
            </button>
          )}

          <button
            type="button"
            disabled={!isStepValid || isSubmitting || waitingAfterSubmit}
            onClick={handleNext}
            className={`h-11 sm:h-12 px-5 sm:px-8 flex-1 min-w-0 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-none ${
              !isStepValid
                ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                : "bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white"
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
