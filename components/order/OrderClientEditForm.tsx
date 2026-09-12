"use client";

import React, { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Link2,
  UploadCloud,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { updateOrderByClientAction } from "@/app/actions/orderActions";
import SaveFeedbackToast from "@/components/ui/SaveFeedbackToast";
import {
  MIN_PROJECT_DESCRIPTION_LENGTH,
  isValidPersonName,
  sanitizePersonName,
} from "@/components/order/steps/StepFinalize";

export interface OrderEditInitial {
  id: string;
  status: string;
  contactName: string | null;
  projectDescription: string | null;
  isFlexibleSchedule: boolean;
  bookingDate: string | null;
  timeSlot: string | null;
  durationHours: number;
  locationType: string;
  locationAddress: string | null;
  districtOrCity: string | null;
  locationLat: number | null;
  locationLng: number | null;
  referenceLink: string | null;
  moodboardUrls: string[];
  adminNote: string | null;
}

interface OrderClientEditFormProps {
  order: OrderEditInitial;
  onCancel?: () => void;
  /** Kept for call-site compatibility; cancel is on the sticky footer. */
  isOwnerOrAdmin?: boolean;
}

export default function OrderClientEditForm({
  order,
  onCancel,
}: OrderClientEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [contactName, setContactName] = useState(
    sanitizePersonName(order.contactName || "")
  );
  const [projectDescription, setProjectDescription] = useState(
    order.projectDescription || ""
  );
  const [durationHours, setDurationHours] = useState(order.durationHours);
  const [locationType, setLocationType] = useState(order.locationType);
  const [districtOrCity, setDistrictOrCity] = useState(order.districtOrCity || "");
  const [locationAddress, setLocationAddress] = useState(order.locationAddress || "");
  const [referenceLink, setReferenceLink] = useState(order.referenceLink || "");
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>(order.moodboardUrls || []);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const descLen = projectDescription.trim().length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 3 - moodboardUrls.length;
    if (remaining <= 0) return;

    setIsUploading(true);
    const next = [...moodboardUrls];
    for (const file of Array.from(files).slice(0, remaining)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/order/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.url) next.push(data.url);
      } catch {
        /* ignore */
      }
    }
    setMoodboardUrls(next);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!isValidPersonName(contactName)) {
      setError("نام را فقط با حروف وارد کنید.");
      return;
    }
    if (descLen < MIN_PROJECT_DESCRIPTION_LENGTH) {
      setError(`توضیحات حداقل ${MIN_PROJECT_DESCRIPTION_LENGTH} حرف باشد.`);
      return;
    }

    startTransition(async () => {
      const res = await updateOrderByClientAction({
        orderId: order.id,
        contactName: contactName.trim(),
        projectDescription: projectDescription.trim(),
        isFlexibleSchedule: order.isFlexibleSchedule,
        bookingDate: order.bookingDate,
        timeSlot: order.timeSlot,
        durationHours,
        locationType: locationType as
          | "CLIENT_LOCATION"
          | "SPECIALIST_ADVICE"
          | "JAR_STUDIO",
        locationAddress,
        districtOrCity,
        locationLat: order.locationLat,
        locationLng: order.locationLng,
        referenceLink: referenceLink.trim(),
        moodboardUrls,
      });

      if (!res.success) {
        setError(res.error || "خطا در ذخیره");
        return;
      }
      setSaved(true);
      setToastOpen(true);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 space-y-5 shadow-sm"
      dir="rtl"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-black text-neutral-900">ویرایش درخواست پروژه</h2>
        <p className="text-xs text-neutral-500">
          پس از ذخیره، دوباره برای تایید تیم جار ارسال می‌شود. برای لغو کل رزرو از نوار پایین استفاده کنید.
        </p>
      </div>

      {order.adminNote && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
          <span className="font-black">پیام ادمین: </span>
          {order.adminNote}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold">نام و نام خانوادگی</label>
        <input
          value={contactName}
          onChange={(e) => setContactName(sanitizePersonName(e.target.value))}
          className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-surface text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold">مدت (ساعت)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value) || 1)}
            className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-surface text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold">نوع محل</label>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-surface text-sm"
          >
            <option value="SPECIALIST_ADVICE">پیشنهاد عکاس</option>
            <option value="CLIENT_LOCATION">محل کارفرما</option>
            <option value="JAR_STUDIO">استودیو جار</option>
          </select>
        </div>
      </div>

      {locationType === "CLIENT_LOCATION" && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold">منطقه / شهر</label>
            <input
              value={districtOrCity}
              onChange={(e) => setDistrictOrCity(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-surface text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold">آدرس (اختیاری)</label>
            <input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-jar-border bg-jar-surface text-sm"
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold flex justify-between">
          <span>توضیحات پروژه</span>
          <span className="font-mono text-jar-muted">
            {descLen} / {MIN_PROJECT_DESCRIPTION_LENGTH}
          </span>
        </label>
        <textarea
          rows={5}
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          className="w-full p-3 rounded-xl border border-jar-border bg-jar-surface text-sm resize-none min-h-[120px]"
        />
      </div>

      <div className="space-y-2 rounded-2xl border border-dashed border-jar-border p-3">
        <div className="flex items-center gap-1.5 text-xs font-black">
          <ImageIcon className="h-3.5 w-3.5" />
          نمونه‌های محتوایی (اختیاری)
        </div>
        <div className="relative">
          <input
            type="url"
            dir="ltr"
            value={referenceLink}
            onChange={(e) => setReferenceLink(e.target.value)}
            placeholder="https://..."
            className="w-full h-10 pl-9 pr-3 text-left rounded-xl border border-jar-border text-xs font-mono"
          />
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29A]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {moodboardUrls.map((url, idx) => (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden border">
              <Image src={url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setMoodboardUrls(moodboardUrls.filter((_, i) => i !== idx))}
                className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {moodboardUrls.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="aspect-square rounded-xl border-2 border-dashed border-jar-border flex flex-col items-center justify-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {saved && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          ذخیره شد — درخواست دوباره برای تایید تیم جار ارسال شد.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 px-5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700"
          >
            انصراف
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 h-11 rounded-xl text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-neutral-900 text-white hover:bg-neutral-800"
          }`}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending
            ? "در حال ذخیره..."
            : saved
              ? "ذخیره شد ✓"
              : "ذخیره و ارسال مجدد برای تایید"}
        </button>
      </div>

      <SaveFeedbackToast
        open={toastOpen}
        message="ذخیره شد — درخواست برای تایید ارسال شد"
        onClose={() => setToastOpen(false)}
      />
    </form>
  );
}
