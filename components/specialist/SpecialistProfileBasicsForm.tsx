"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, User, AlertCircle } from "lucide-react";
import { saveSpecialistProfileBasicsAction } from "@/app/actions/specialistOnboardingActions";
import { sanitizePersonName, isValidPersonName } from "@/components/order/steps/StepFinalize";

interface Props {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  phoneDisplay: string;
}

export default function SpecialistProfileBasicsForm({
  initialDisplayName,
  initialAvatarUrl,
  phoneDisplay,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [name, setName] = useState(sanitizePersonName(initialDisplayName));
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [previewSrc, setPreviewSrc] = useState(initialAvatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    setPreviewSrc(localUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "avatar");
      const res = await fetch("/api/specialist/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "خطا در آپلود عکس");
        setPreviewSrc(avatarUrl);
      } else {
        setAvatarUrl(data.url);
        setPreviewSrc(data.url);
      }
    } catch {
      setError("خطای شبکه در آپلود");
      setPreviewSrc(avatarUrl);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPersonName(name)) {
      setError("نام را فقط با حروف وارد کنید (حداقل ۲ حرف).");
      return;
    }
    if (!avatarUrl) {
      setError("عکس پروفایل الزامی است. لطفاً یک تصویر JPG، PNG یا WEBP آپلود کنید.");
      return;
    }

    startTransition(async () => {
      const res = await saveSpecialistProfileBasicsAction({
        displayName: name.trim(),
        avatarUrl,
      });
      if (!res.success) {
        setError(res.error || "خطا در ذخیره");
        return;
      }
      router.push(res.redirect || "/specialist/onboarding/categories");
      router.refresh();
    });
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-8 space-y-6 shadow-xs text-jar-primary"
    >
      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl font-black text-jar-primary">اطلاعات پایه</h1>
        <p className="text-sm text-jar-muted leading-relaxed">
          نام نمایشی و عکس پروفایل برای کارفرمایان و پنل ادمین استفاده می‌شود. شماره موبایل از حساب شما گرفته شده است.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="آپلود عکس پروفایل (الزامی)"
            aria-required="true"
            className={`relative h-28 w-28 rounded-3xl overflow-hidden border-2 border-dashed bg-jar-canvas hover:border-jar-primary transition-colors shrink-0 ${
              avatarUrl ? "border-jar-border" : "border-rose-300 ring-2 ring-rose-100"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- user uploads; avoid next/image optimizer path issues
              <img
                src={previewSrc}
                alt="آواتار"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => {
                  if (previewSrc === avatarUrl && avatarUrl) {
                    setError("فایل آپلود شده در دسترس نیست. لطفاً دوباره عکس بفرستید.");
                    setPreviewSrc("");
                    setAvatarUrl("");
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-jar-muted">
                <Camera className="h-6 w-6" />
                <span className="text-[11px] font-bold">آپلود عکس</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </button>
          <span className="text-xs font-bold text-jar-primary">
            عکس پروفایل <span className="text-rose-500">*</span>
          </span>
          {!avatarUrl && (
            <span className="text-[11px] text-rose-600 font-medium">الزامی — بدون عکس ادامه ممکن نیست</span>
          )}
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-jar-primary">
              نام و نام خانوادگی <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                value={name}
                onChange={(e) => setName(sanitizePersonName(e.target.value))}
                placeholder="مثلاً: علی محمدی"
                className="w-full h-11 pr-9 px-3 rounded-xl border border-jar-border bg-jar-canvas text-sm text-jar-primary outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20"
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jar-muted" />
            </div>
          </div>
          <p className="text-xs text-jar-muted">
            موبایل ثبت‌شده:{" "}
            <span dir="ltr" className="font-mono font-bold text-jar-primary">
              {phoneDisplay}
            </span>
          </p>
          <p className="text-xs text-jar-muted">
            فقط JPG / PNG / WEBP، حداکثر ۸ مگابایت. فایل باید واقعاً آپلود شود.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || uploading || !avatarUrl.trim() || !isValidPersonName(name)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ذخیره و ادامه
      </button>
    </form>
  );
}
