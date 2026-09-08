"use client";

import React, { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Camera,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { saveSpecialistDetailsAction } from "@/app/actions/specialistOnboardingActions";
import { NdaModal } from "@/components/specialist/NdaModal";

// Leaflet needs the DOM; same dynamic import the order wizard uses.
const LocationMapPicker = dynamic(() => import("@/components/order/LocationMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-jar-border bg-jar-canvas text-xs font-bold text-jar-muted">
      در حال بارگذاری نقشه...
    </div>
  ),
});

interface Props {
  initialCity?: string | null;
  initialWorkArea?: string | null;
  initialBio?: string | null;
  initialEquipment?: string | null;
  initialAgreedToTerms?: boolean;
  initialBaseLat?: number | null;
  initialBaseLng?: number | null;
  initialBaseAddress?: string | null;
  hasEligiblePortfolio: boolean;
}

export default function SpecialistDetailsForm({
  initialCity,
  initialWorkArea,
  initialBio,
  initialEquipment,
  initialAgreedToTerms,
  initialBaseLat,
  initialBaseLng,
  initialBaseAddress,
  hasEligiblePortfolio,
}: Props) {
  const router = useRouter();
  const [city, setCity] = useState(initialCity || "");
  const [workArea, setWorkArea] = useState(initialWorkArea || "");
  const [bio, setBio] = useState(initialBio || "");
  const [equipmentSummary, setEquipmentSummary] = useState(initialEquipment || "");
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(initialAgreedToTerms));
  // Where this specialist travels from. Every proposal they make quotes travel
  // from this point, so it is required before they can be activated.
  const [baseCoords, setBaseCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialBaseLat === "number" && typeof initialBaseLng === "number"
      ? { lat: initialBaseLat, lng: initialBaseLng }
      : null
  );
  const [baseAddress, setBaseAddress] = useState(initialBaseAddress || "");
  const [baseDistrict, setBaseDistrict] = useState("");
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (city.trim().length < 2) {
      setError("لطفاً نام شهر محل فعالیت خود را وارد کنید.");
      return;
    }

    if (!baseCoords) {
      setError("لطفاً محل شروع حرکت خود را روی نقشه مشخص کنید تا هزینه ایاب‌وذهاب محاسبه شود.");
      return;
    }

    if (!agreedToTerms) {
      setError("پذیرش تعهدنامه حفظ محرمانگی و عدم انتشار فایل‌های مشتریان الزامی است.");
      return;
    }

    startTransition(async () => {
      const res = await saveSpecialistDetailsAction({
        city: city.trim(),
        workArea: workArea.trim() || undefined,
        bio: bio.trim() || undefined,
        equipmentSummary: equipmentSummary.trim() || undefined,
        baseLat: baseCoords.lat,
        baseLng: baseCoords.lng,
        baseAddress: baseAddress.trim() || baseDistrict || undefined,
        agreedToTerms: true,
      });

      if (!res.success) {
        setError(res.error || "خطایی در ثبت اطلاعات رخ داد.");
      } else if (res.redirect) {
        router.push(res.redirect);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-xs backdrop-blur-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-jar-border pb-3">
            <MapPin className="h-5 w-5 text-jar-logo" />
            <h2 className="text-base font-bold text-jar-primary">محدوده فعالیت و تجهیزات کاری</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* City */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-jar-primary">
                شهر اصلی محل فعالیت <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="مثال: تهران، اصفهان، شیراز..."
                className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all"
                required
              />
              <span className="text-[10px] text-jar-muted block">
                پروژه‌های این شهر در اولویت معرفی به شما قرار خواهند گرفت.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-jar-primary block">
                محل شروع حرکت شما <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-jar-muted block">
                جار فاصله این نقطه تا محل پروژه را حساب می‌کند و هزینه ایاب‌وذهاب را خودکار به
                پیشنهاد شما اضافه می‌کند. این نشانی هرگز به مشتری نمایش داده نمی‌شود.
              </span>
              <div className="overflow-hidden rounded-2xl border border-jar-border">
                <LocationMapPicker
                  district={baseDistrict}
                  onChangeDistrict={setBaseDistrict}
                  address={baseAddress}
                  onChangeAddress={setBaseAddress}
                  onChangeCoords={setBaseCoords}
                  initialCoords={baseCoords ?? undefined}
                />
              </div>
              {baseCoords ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  موقعیت ثبت شد{baseAddress ? ` — ${baseAddress}` : ""}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-rose-600">
                  هنوز نقطه‌ای انتخاب نشده است.
                </span>
              )}
            </div>

            {/* Work Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-jar-primary">
                مناطق و محدوده پوشش‌دهی
              </label>
              <input
                type="text"
                value={workArea}
                onChange={(e) => setWorkArea(e.target.value)}
                placeholder="مثال: تمام مناطق تهران، شمیرانات، غرب..."
                className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all"
              />
              <span className="text-[10px] text-jar-muted block">
                محدوده‌هایی که امکان اعزام و حضور برای پروژه را دارید.
              </span>
            </div>

            {/* Equipment */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-jar-primary">
                تجهیزات اصلی (دوربین، لنز و نور)
              </label>
              <input
                type="text"
                value={equipmentSummary}
                onChange={(e) => setEquipmentSummary(e.target.value)}
                placeholder="مثال: Sony A7IV، لنز 24-70mm f/2.8 GM، دو شاخه نور Godox AD400..."
                className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all"
              />
              <span className="text-[10px] text-jar-muted block">
                این مشخصات پس از انتخاب به کارفرما نمایش داده می‌شود و اعتماد ایجاد می‌کند.
              </span>
            </div>

            {/* Bio */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-jar-primary">
                خلاصه بیوگرافی و سبک کاری (اختیاری)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="معرفی کوتاه، سابقه کاری و گرایش تخصصی شما در تصویربرداری یا عکاسی..."
                className="w-full rounded-2xl border border-jar-border bg-jar-canvas p-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* NDA & Terms Agreement Card */}
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-xs backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-jar-border pb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-jar-primary">تعهدنامه رسمی و حریم خصوصی کارفرمایان</h2>
          </div>

          <div className="p-4 rounded-2xl bg-jar-canvas border border-jar-border space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="nda-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-jar-border text-jar-primary focus:ring-jar-primary cursor-pointer"
              />
              <label htmlFor="nda-checkbox" className="text-xs font-bold text-jar-primary leading-relaxed cursor-pointer select-none">
                اینجانب متعهد می‌شوم فایل‌ها، عکس‌ها و ویدیوهای خام پروژه‌ها را به عنوان امانت حفظ نموده و بدون کسب رضایت کتبی کارفرما، در هیچ پلتفرم یا فضای مجازی منتشر ننمایم.
              </label>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={() => setShowNdaModal(true)}
                className="text-[11px] font-bold text-jar-logo hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهده متن کامل تعهدنامه عدم افشا (NDA) پلتفرم جار</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto h-12 px-8 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>
              {hasEligiblePortfolio ? "تأیید نهایی و فعال‌سازی حساب کاربری" : "ذخیره و ورود به مرحله آپلود نمونه‌کارها"}
            </span>
          </button>

          <span className="text-xs text-jar-muted font-medium">
            {hasEligiblePortfolio
              ? "✓ شرط ۱۰ نمونه‌کار شما قبلاً احراز شده است."
              : "توجه: پس از ثبت مشخصات، بارگذاری ۱۰ نمونه‌کار الزامی است."}
          </span>
        </div>
      </form>

      {/* NDA Modal */}
      <NdaModal
        isOpen={showNdaModal}
        onClose={() => setShowNdaModal(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setShowNdaModal(false);
        }}
      />
    </div>
  );
}
