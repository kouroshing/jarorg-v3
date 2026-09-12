"use client";

import React, { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { saveSpecialistStudioAction } from "@/app/actions/specialistOnboardingActions";
import SaveFeedbackToast from "@/components/ui/SaveFeedbackToast";

const SpecialistBaseMapPicker = dynamic(
  () => import("@/components/specialist/SpecialistBaseMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-jar-canvas text-xs font-bold text-jar-muted">
        در حال بارگذاری نقشه استودیو...
      </div>
    ),
  }
);

type Props = {
  initialName?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
};

export default function SpecialistStudioForm({
  initialName,
  initialLat,
  initialLng,
  initialAddress,
}: Props) {
  const router = useRouter();
  const [studioName, setStudioName] = useState(initialName || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialLat === "number" && typeof initialLng === "number"
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [address, setAddress] = useState(initialAddress || "");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (studioName.trim().length < 2) {
      setError("نام استودیو یا فضای ثابت را وارد کنید.");
      return;
    }
    if (!coords) {
      setError("لوکیشن استودیو را روی نقشه مشخص کنید.");
      return;
    }

    startTransition(async () => {
      const res = await saveSpecialistStudioAction({
        studioName: studioName.trim(),
        studioLat: coords.lat,
        studioLng: coords.lng,
        studioAddress: address.trim() || district || undefined,
      });
      if (!res.success) {
        setError(res.error || "خطا در ذخیره.");
        return;
      }
      setSaved(true);
      setToastOpen(true);
      router.refresh();
    });
  };

  const handleClear = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveSpecialistStudioAction({ clear: true });
      if (!res.success) {
        setError(res.error || "خطا در حذف.");
        return;
      }
      setStudioName("");
      setCoords(null);
      setAddress("");
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-jar-border pb-3">
          <Building2 className="h-5 w-5 text-jar-logo" />
          <h2 className="text-base font-bold text-jar-primary">لوکیشن استودیو / فضای ثابت</h2>
        </div>

        <p className="text-[11px] text-jar-muted leading-relaxed">
          این نقشه جدا از مبدأ حرکت است. مبدأ برای ایاب‌وذهاب پروژه‌های بیرون است؛ اینجا جایی است که
          مشتری می‌تواند برای شوت در استودیو/فضای شما بیاید. نقشهٔ عمومی عمارت‌ها و لوکیشن‌های آماده
          بعداً اضافه می‌شود.
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-jar-primary">
            نام استودیو یا فضا <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="مثال: آتلیه نور، استودیو جار، فضای خانه..."
            className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-jar-primary">
            موقعیت روی نقشه <span className="text-rose-500">*</span>
          </label>
          <div className="relative h-[min(70vh,480px)] min-h-[320px] w-full overflow-hidden rounded-2xl border border-jar-border">
            <SpecialistBaseMapPicker
              district={district}
              onChangeDistrict={setDistrict}
              address={address}
              onChangeAddress={setAddress}
              onChangeCoords={setCoords}
              initialCoords={coords ?? undefined}
              pinLabel="محل استودیو"
              districtFieldLabel="منطقه استودیو"
              addressFieldLabel="آدرس استودیو"
              addressPlaceholder="خیابان، پلاک، طبقه..."
            />
          </div>
          {coords ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              موقعیت ثبت شد{address ? ` — ${address}` : ""}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-rose-600">
              هنوز نقطه‌ای انتخاب نشده است.
            </span>
          )}
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>اطلاعات استودیو ذخیره شد.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={`w-full sm:w-auto h-12 px-8 rounded-full font-medium text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-jar-primary hover:bg-jar-primaryHover text-white"
          }`}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {isPending ? "در حال ذخیره..." : saved ? "ذخیره شد ✓" : "ذخیره استودیو"}
        </button>

        <div className="flex items-center gap-2">
          {(initialLat != null || studioName) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="h-11 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف استودیو
            </button>
          )}
          <Link
            href="/specialist/profile"
            className="h-11 px-4 rounded-full border border-jar-border text-jar-muted text-xs font-medium inline-flex items-center hover:bg-jar-soft"
          >
            بازگشت به پروفایل کاری
          </Link>
        </div>
      </div>

      <SaveFeedbackToast
        open={toastOpen}
        message="ذخیره شد — اطلاعات استودیو به‌روز شد"
        onClose={() => setToastOpen(false)}
      />
    </form>
  );
}
