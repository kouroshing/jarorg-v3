"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Link2, UploadCloud, X, Image as ImageIcon, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface MoodboardUploaderProps {
  referenceLink: string;
  onChangeReferenceLink: (link: string) => void;
  uploadedUrls: string[];
  onChangeUploadedUrls: (urls: string[]) => void;
  projectDescription: string;
  onChangeDescription: (desc: string) => void;
}

export default function MoodboardUploader({
  referenceLink,
  onChangeReferenceLink,
  uploadedUrls,
  onChangeUploadedUrls,
  projectDescription,
  onChangeDescription,
}: MoodboardUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    const remainingSlots = 3 - uploadedUrls.length;
    if (remainingSlots <= 0) {
      setUploadError("حداکثر می‌توانید ۳ تصویر رفرنس آپلود کنید.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    const newUrls = [...uploadedUrls];

    for (const file of filesToUpload) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`فایل ${file.name} بیشتر از ۱۰ مگابایت است.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/order/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          newUrls.push(data.url);
        } else {
          setUploadError(data.error || "خطا در آپلود عکس.");
        }
      } catch (err) {
        setUploadError("خطای شبکه در ارسال فایل.");
      }
    }

    onChangeUploadedUrls(newUrls);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const filtered = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
    onChangeUploadedUrls(filtered);
  };

  return (
    <div className="space-y-5 rounded-[28px] border border-[#E5E0D8] bg-white/95 p-5 sm:p-7 shadow-[0_2px_12px_rgba(31,30,29,0.03)] backdrop-blur-xl" dir="rtl">
      
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-white font-bold text-xs">
            ۴
          </span>
          <h3 className="text-base sm:text-lg font-black text-[#141413]">
            رفرنس، نمونه ایده و توضیحات پروژه (اختیاری)
          </h3>
        </div>
        <p className="mt-1 text-xs text-[#66605B] font-medium">
          ارسال ایده یا عکس‌های مشابه کمک می‌کند مناسب‌ترین عکاس با سبک بصری مدنظرتان داوطلب شود.
        </p>
      </div>

      {/* 1. Reference Link (Instagram / Pinterest) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#141413]">
          لینک پست اینستاگرام، پینترست یا گوگل‌درایو:
        </label>
        <div className="relative flex items-center">
          <input
            type="url"
            value={referenceLink}
            onChange={(e) => onChangeReferenceLink(e.target.value)}
            placeholder="https://instagram.com/p/... یا https://pin.it/..."
            dir="ltr"
            className="w-full h-11.5 pl-10 pr-4 rounded-xl border border-[#E5E0D8] bg-white text-xs font-mono font-bold text-[#141413] placeholder:text-[#A8A29A] placeholder:font-sans outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all shadow-2xs"
          />
          <Link2 className="absolute left-3.5 h-4 w-4 text-[#A8A29A] pointer-events-none" />
        </div>
      </div>

      {/* 2. Quick Upload Box (Max 3 Images) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#141413]">
            آپلود تصاویر مودبورد و سبک دلخواه:
          </label>
          <span className="text-[11px] font-bold text-[#66605B] bg-[#FAF9F5] px-2 py-0.5 rounded-full border border-[#E5E0D8] font-mono">
            {uploadedUrls.length} از ۳ تصویر
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Upload Button */}
          {uploadedUrls.length < 3 && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-[#E5E0D8] hover:border-[#141413] bg-[#FAF9F5] hover:bg-[#F3F1EC] transition-all cursor-pointer group disabled:opacity-50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              {isUploading ? (
                <Loader2 className="h-6 w-6 text-[#141413] animate-spin" />
              ) : (
                <UploadCloud className="h-6 w-6 text-[#141413] group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[11px] font-bold text-[#141413]">
                {isUploading ? "در حال آپلود..." : "افزودن تصویر"}
              </span>
            </button>
          )}

          {/* Uploaded Thumbnail Cards */}
          {uploadedUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative h-28 rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#FAF9F5] group shadow-2xs"
            >
              <Image
                src={url}
                alt={`نمونه رفرنس ${idx + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-[#141413]/80 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors cursor-pointer"
                aria-label="حذف عکس"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {uploadError && (
          <p className="text-[11px] font-bold text-rose-600 animate-in fade-in">
            {uploadError}
          </p>
        )}
      </div>

      {/* 3. Free Text Description */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#141413]">
          توضیحات و نکات تکمیلی پروژه:
        </label>
        <textarea
          rows={3}
          value={projectDescription}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="هر نکته‌ای درباره سناریو، تعداد محصولات، افراد حاضر در شات یا حساسیت‌های برند دارید بنویسید..."
          className="w-full p-3.5 rounded-xl border border-[#E5E0D8] bg-white text-xs font-medium text-[#141413] placeholder:text-[#A8A29A] outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all leading-relaxed shadow-2xs"
        />
      </div>

    </div>
  );
}
