"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Link2, UploadCloud, X, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";

interface StepMoodboardProps {
  referenceLink: string;
  onChangeReferenceLink: (link: string) => void;
  uploadedUrls: string[];
  onChangeUploadedUrls: (urls: string[]) => void;
  projectDescription: string;
  onChangeDescription: (desc: string) => void;
}

export default function StepMoodboard({
  referenceLink,
  onChangeReferenceLink,
  uploadedUrls,
  onChangeUploadedUrls,
  projectDescription,
  onChangeDescription,
}: StepMoodboardProps) {
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
    onChangeUploadedUrls(uploadedUrls.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-4 sm:space-y-5" dir="rtl">
      {/* Editorial Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#141413] tracking-tight">
            نمونه ایده، رفرنس یا سبک مدنظرتان
          </h2>
          <span className="text-[10px] font-bold text-[#66605B] bg-[#FAF9F5] border border-[#E5E0D8] px-2 py-0.5 rounded-md shadow-2xs">
            اختیاری
          </span>
        </div>
        <p className="text-xs text-[#66605B]">
          ارسال نمونه کار یا توضیحات به هماهنگی بهتر عکاس کمک می‌کند.
        </p>
      </div>

      {/* 1. Reference Link (Instagram or Pinterest) */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-[#141413]">
          لینک صفحه، پست اینستاگرام یا پینترست (اختیاری):
        </label>
        <div className="relative flex items-center">
          <input
            type="url"
            value={referenceLink}
            onChange={(e) => onChangeReferenceLink(e.target.value)}
            placeholder="https://instagram.com/p/... یا pinterest.com/..."
            dir="ltr"
            className="w-full h-11 sm:h-12 pl-10 pr-3.5 sm:pr-4 rounded-2xl border border-[#E5E0D8] bg-white text-xs sm:text-sm font-mono text-[#141413] placeholder:text-[#A8A29A] outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all shadow-2xs"
          />
          <Link2 className="absolute left-3.5 h-4.5 w-4.5 text-[#A8A29A] pointer-events-none" />
        </div>
      </div>

      {/* 2. Dropzone & Uploaded Photos */}
      <div className="space-y-3 pt-2 border-t border-[#E5E0D8]">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-bold text-[#141413] flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-[#66605B]" />
            <span>آپلود تا ۳ تصویر نمونه سبک یا مودبورد:</span>
          </label>
          <span className="text-xs font-mono font-bold text-[#66605B] bg-[#FAF9F5] px-2 py-0.5 rounded-md border border-[#E5E0D8]">
            {uploadedUrls.length} از ۳
          </span>
        </div>

        {/* Thumbnail Preview Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {uploadedUrls.map((url, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#FAF9F5] shadow-2xs"
            >
              <Image
                src={url}
                alt={`نمونه رفرنس ${idx + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#141413]/80 text-white hover:bg-rose-600 transition-colors shadow-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Upload Button Box if slots available */}
          {uploadedUrls.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-[#E5E0D8] bg-[#FAF9F5] hover:border-[#141413] hover:bg-[#F3F1EC] cursor-pointer transition-all p-3 text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {isUploading ? (
                <Loader2 className="h-6 w-6 text-[#141413] animate-spin" />
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-white border border-[#E5E0D8] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-4.5 w-4.5 text-[#141413]" />
                  </div>
                  <span className="text-[11px] font-black text-[#141413]">افزودن عکس</span>
                  <span className="text-[9px] text-[#A8A29A] mt-0.5">تا ۱۰ مگابایت</span>
                </>
              )}
            </div>
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-rose-600 font-bold">{uploadError}</p>
        )}
      </div>

      {/* 3. Project Notes Textarea */}
      <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
        <label className="block text-xs sm:text-sm font-bold text-[#141413]">
          توضیحات تکمیلی یا سناریوی مدنظر شما:
        </label>
        <textarea
          rows={3}
          value={projectDescription}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="مثلاً: نیاز به نورپردازی سافت در فضای اتاق، رنگ‌بندی لباس‌ها کرم و خاکی است، یا تعداد شات‌های موردنیاز..."
          className="w-full p-4 rounded-2xl border border-[#E5E0D8] bg-white text-xs sm:text-sm font-medium text-[#141413] placeholder:text-[#A8A29A] outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all resize-none shadow-2xs sm:min-h-[100px]"
        />
      </div>
    </div>
  );
}
