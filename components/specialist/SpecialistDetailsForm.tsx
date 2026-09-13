"use client";

import React, { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Smartphone,
} from "lucide-react";
import { saveSpecialistDetailsAction } from "@/app/actions/specialistOnboardingActions";
import IranProvinceCityPicker from "@/components/specialist/IranProvinceCityPicker";
import EquipmentMultiSelect from "@/components/specialist/EquipmentMultiSelect";
import {
  formatCoverageRadiusKm,
  getCityCoords,
  matchIranPlace,
  parseCoverageRadiusKm,
} from "@/lib/geo/iranPlaces";
import {
  parseEquipmentTags,
  serializeEquipmentTags,
} from "@/lib/equipment/catalog";
import SaveFeedbackToast from "@/components/ui/SaveFeedbackToast";
import ProfileEditPendingBanner from "@/components/specialist/ProfileEditPendingBanner";

const SpecialistBaseMapPicker = dynamic(
  () => import("@/components/specialist/SpecialistBaseMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-jar-canvas text-xs font-bold text-jar-muted">
        در حال بارگذاری نقشه...
      </div>
    ),
  }
);

interface Props {
  initialCity?: string | null;
  initialWorkArea?: string | null;
  initialEquipment?: string | null;
  initialBaseLat?: number | null;
  initialBaseLng?: number | null;
  initialBaseAddress?: string | null;
  initialHasStudio?: boolean;
  initialIsMobileGrapher?: boolean;
  hasEligiblePortfolio: boolean;
  mode?: "onboarding" | "edit";
  returnTo?: string;
  profileEditStatus?: string | null;
  profileEditNote?: string | null;
}

export default function SpecialistDetailsForm({
  initialCity,
  initialWorkArea,
  initialEquipment,
  initialBaseLat,
  initialBaseLng,
  initialBaseAddress,
  initialHasStudio = false,
  initialIsMobileGrapher = false,
  hasEligiblePortfolio,
  mode = "onboarding",
  returnTo,
  profileEditStatus,
  profileEditNote,
}: Props) {
  const router = useRouter();
  const matchedPlace = useMemo(() => matchIranPlace(initialCity), [initialCity]);
  const [province, setProvince] = useState(matchedPlace?.province || "");
  const [city, setCity] = useState(matchedPlace?.city || "");
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(() =>
    parseCoverageRadiusKm(initialWorkArea)
  );
  const [isMobileGrapher, setIsMobileGrapher] = useState(initialIsMobileGrapher);
  const [equipmentTags, setEquipmentTags] = useState<string[]>(() =>
    parseEquipmentTags(initialEquipment)
  );
  const [baseCoords, setBaseCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialBaseLat === "number" && typeof initialBaseLng === "number"
      ? { lat: initialBaseLat, lng: initialBaseLng }
      : null
  );
  const [baseAddress, setBaseAddress] = useState(initialBaseAddress || "");
  const [baseDistrict, setBaseDistrict] = useState("");
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFocusToken, setMapFocusToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [pendingQueued, setPendingQueued] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  const markDirty = () => {
    if (saved) setSaved(false);
  };

  const handleProvinceChange = (nextProvince: string) => {
    markDirty();
    setProvince(nextProvince);
    setCity("");
  };

  const handleCityChange = (nextCity: string) => {
    markDirty();
    setCity(nextCity);
    if (!nextCity || !province) return;
    const coords = getCityCoords(province, nextCity);
    if (coords) {
      setMapFocus(coords);
      setMapFocusToken((t) => t + 1);
      setBaseCoords(coords);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!province || !city) {
      setError("لطفاً استان و شهر محل فعالیت را انتخاب کنید.");
      return;
    }

    if (!baseCoords) {
      setError("لطفاً محل شروع حرکت و محدوده کاری را روی نقشه مشخص کنید.");
      return;
    }

    if (equipmentTags.length === 0) {
      setError(
        isMobileGrapher
          ? "مدل گوشی و تجهیزات موبایل‌گرافی الزامی است."
          : "لیست تجهیزات الزامی است. تمام تجهیزات اصلی خود را اضافه کنید."
      );
      return;
    }

    const equipmentSummary = serializeEquipmentTags(equipmentTags);
    if (!equipmentSummary) {
      setError(
        isMobileGrapher
          ? "مدل گوشی و تجهیزات موبایل‌گرافی الزامی است."
          : "لیست تجهیزات الزامی است. تمام تجهیزات اصلی خود را اضافه کنید."
      );
      return;
    }

    startTransition(async () => {
      const res = await saveSpecialistDetailsAction({
        city,
        workArea: formatCoverageRadiusKm(coverageRadiusKm),
        equipmentSummary,
        isMobileGrapher,
        baseLat: baseCoords.lat,
        baseLng: baseCoords.lng,
        baseAddress: baseAddress.trim() || baseDistrict || undefined,
        returnTo,
      });

      if (!res.success) {
        setError(res.error || "خطایی در ثبت اطلاعات رخ داد.");
      } else if (isEdit) {
        setPendingQueued(Boolean(res.pendingApproval));
        setSaved(true);
        setToastOpen(true);
        router.refresh();
      } else if (res.redirect) {
        router.push(res.redirect);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {isEdit ? (
        <ProfileEditPendingBanner status={profileEditStatus} note={profileEditNote} />
      ) : null}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-jar-primary">
                شهر اصلی محل فعالیت <span className="text-rose-500">*</span>
              </label>
              <IranProvinceCityPicker
                province={province}
                city={city}
                onProvinceChange={handleProvinceChange}
                onCityChange={handleCityChange}
              />
              <span className="text-[10px] text-jar-muted block">
                پروژه‌های این شهر در اولویت معرفی به شما قرار خواهند گرفت.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-jar-primary block">
                مبدأ حرکت و محدوده کاری <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-jar-muted block leading-relaxed">
                سنجاق را روی محل شروع حرکت بگذارید و با دایره مشخص کنید تا چند کیلومتر اطراف مبدأ
                پروژه می‌گیرید. فاصله مبدأ تا پروژه برای ایاب‌وذهاب حساب می‌شود؛ نشانی دقیق به مشتری
                نشان داده نمی‌شود.
              </span>
              <div className="relative h-[min(82dvh,620px)] min-h-[460px] w-full overflow-hidden rounded-2xl border border-jar-border sm:h-[min(70vh,560px)] sm:min-h-[420px]">
                <SpecialistBaseMapPicker
                  district={baseDistrict}
                  onChangeDistrict={(v) => {
                    markDirty();
                    setBaseDistrict(v);
                  }}
                  address={baseAddress}
                  onChangeAddress={(v) => {
                    markDirty();
                    setBaseAddress(v);
                  }}
                  onChangeCoords={(coords) => {
                    markDirty();
                    setBaseCoords(coords);
                  }}
                  initialCoords={baseCoords ?? mapFocus ?? undefined}
                  focusCoords={mapFocus}
                  focusToken={mapFocusToken}
                  showCoverage
                  radiusKm={coverageRadiusKm}
                  onChangeRadius={(km) => {
                    markDirty();
                    setCoverageRadiusKm(km);
                  }}
                />
              </div>
              {baseCoords ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  مبدأ و محدوده ثبت شد
                  {baseAddress ? ` — ${baseAddress}` : ""} · تا {coverageRadiusKm} کیلومتر
                </span>
              ) : (
                <span className="text-[10px] font-bold text-rose-600">
                  هنوز نقطه‌ای انتخاب نشده است. نقشه را جابه‌جا کنید یا «موقعیت من» را بزنید.
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-jar-border bg-jar-canvas/60 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-jar-logo shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-jar-primary">استودیو / فضای ثابت</p>
                  <p className="text-[10px] text-jar-muted leading-relaxed">
                    جدا از مبدأ حرکت ثبت می‌شود. تا وقتی لوکیشن استودیو روی نقشه ذخیره نشود،
                    «دارای استودیو» در پروفایل نشان داده نمی‌شود.
                  </p>
                </div>
              </div>
              {initialHasStudio ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    استودیو ثبت شده
                  </span>
                  <Link
                    href="/specialist/studio"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 text-[11px] font-bold text-jar-primary hover:bg-jar-soft"
                  >
                    ویرایش لوکیشن استودیو
                  </Link>
                </div>
              ) : (
                <Link
                  href="/specialist/studio"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 text-[11px] font-bold text-jar-primary hover:bg-jar-soft"
                >
                  <Building2 className="h-3.5 w-3.5 text-jar-logo" />
                  ثبت لوکیشن استودیو روی نقشه
                </Link>
              )}
            </div>

            <div className="rounded-2xl border border-jar-border bg-jar-canvas/60 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMobileGrapher}
                  onChange={(e) => {
                    markDirty();
                    const next = e.target.checked;
                    setIsMobileGrapher(next);
                    setEquipmentTags([]);
                  }}
                  className="mt-1 h-4 w-4 rounded border-jar-border text-jar-logo focus:ring-jar-logo"
                />
                <span className="min-w-0 space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-jar-primary">
                    <Smartphone className="h-4 w-4 text-jar-logo shrink-0" />
                    موبایل‌گرافر هستم
                  </span>
                  <span className="block text-[10px] text-jar-muted leading-relaxed">
                    اگر کارتان عمدتاً با گوشی است این گزینه را بزنید. به مشتری نمایش داده می‌شود و
                    فهرست تجهیزات به گوشی و لوازم موبایل‌گرافی تغییر می‌کند.
                  </span>
                </span>
              </label>
            </div>

            {isMobileGrapher ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-jar-primary">
                  گوشی و تجهیزات موبایل‌گرافی{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-jar-muted block leading-relaxed">
                  مدل گوشی اصلی و در صورت نیاز گیمبال، میکروفون یا نور همراه موبایل را اضافه کنید.
                </span>
                <EquipmentMultiSelect
                  key="mobile-gear"
                  mode="mobile"
                  value={equipmentTags}
                  onChange={(tags) => {
                    markDirty();
                    setEquipmentTags(tags);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-jar-primary">
                  تجهیزات اصلی (دوربین، لنز، نور، میکروفون، گیمبال، هلی‌شات){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-jar-muted block leading-relaxed">
                  همه تجهیزات اصلی‌تان را بنویسید یا از فهرست انتخاب کنید — این بخش اجباری است.
                </span>
                <EquipmentMultiSelect
                  key="pro-gear"
                  mode="pro"
                  value={equipmentTags}
                  onChange={(tags) => {
                    markDirty();
                    setEquipmentTags(tags);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>پروفایل کاری ذخیره شد. ایاب‌وذهاب پروژه‌های بعدی از مبدأ جدید حساب می‌شود.</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className={`w-full sm:w-auto h-12 px-8 rounded-full font-medium text-xs sm:text-sm shadow-none transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              saved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-jar-primary hover:bg-jar-primaryHover text-white"
            }`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>
              {isPending
                ? "در حال ذخیره..."
                : saved && isEdit
                  ? "ذخیره شد ✓"
                  : isEdit
                    ? "ذخیره پروفایل کاری"
                    : hasEligiblePortfolio
                      ? "ذخیره و رفتن به تعهدنامه"
                      : "ذخیره و ادامه"}
            </span>
          </button>

          <span className="text-xs text-jar-muted font-medium">
            {isEdit
              ? "تغییرات تا تایید جار روی پروفایل عمومی اعمال نمی‌شود."
              : "گام بعدی: مطالعه و پذیرش تعهدنامه عضویت."}
          </span>
        </div>
      </form>

      <SaveFeedbackToast
        open={toastOpen}
        message={
          pendingQueued
            ? "ارسال شد — در انتظار تایید جار"
            : "ذخیره شد — پروفایل کاری به‌روز شد"
        }
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
