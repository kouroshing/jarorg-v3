"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSuccessGalleryPhotos } from "@/app/actions/galleryActions";
import {
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Home,
  Sparkles,
  Phone,
  Lock,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type PhotoType = {
  id: string;
  projectId: string;
  originalUrl: string;
  watermarkedUrl: string | null;
  fileName: string;
  fileSize: number;
};

export default function GalleryPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const authority = searchParams.get("authority");

  // Auth States
  const [phone, setPhone] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [photos, setPhotos] = useState<PhotoType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [refId, setRefId] = useState("");

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authority) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await getSuccessGalleryPhotos(authority, phone.trim());
      if (res.success && res.data) {
        setPhotos(res.data);
        setIsAuthorized(true);
        // Safely extract reference ID and project title from first photo / context if needed
        if (res.data.length > 0) {
          // We can also fetch basic metadata if needed, but since we are authorized, let's open up access!
        }
      } else {
        setErrorMsg(res.error || "شماره موبایل وارد شده صحیح نیست.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg("خطایی در تایید شماره همراه رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  function getDirectDownloadUrl(originalUrl: string): string {
    const match = originalUrl.match(/\/file\/d\/([^\/]+)/);
    const fileId = match ? match[1] : originalUrl;
    if (fileId && !fileId.startsWith("http")) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return originalUrl;
  }

  if (!authority) {
    return (
      <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white text-right font-sans" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="text-amber-500 text-sm font-black">خطا در پارامترهای ورودی</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            کد مرجع پرداخت یافت نشد. لطفا از معتبر بودن لینک پرداخت خود اطمینان حاصل کنید.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-amber-500 text-slate-950 font-black rounded-2xl text-xs hover:bg-amber-400 transition"
          >
            <Home className="h-4 w-4" />
            بازگشت به خانه
          </Link>
        </div>
      </div>
    );
  }

  // State: Unauthorized - Show Phone Verification Card
  if (!isAuthorized) {
    return (
      <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white text-right font-sans" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/20 rounded-[32px] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-16 -left-16 h-36 w-36 rounded-full bg-amber-500/5 blur-3xl" />
          
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-base font-black text-slate-100">تایید هویت خریدار گالری</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              جهت احراز هویت و دریافت فایل‌های اصلی، شماره موبایل خریدار را که زمان پرداخت وارد کرده‌اید ثبت کنید.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-rose-950/40 border border-rose-900/50 p-4 text-[10px] font-bold text-rose-450 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block">شماره موبایل خریدار:</span>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-amber-500/50 focus:bg-slate-900 text-center font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-650"
                  dir="ltr"
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/10"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "تایید و باز کردن قفل دانلود"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // State: Authorized - Render paid photos and direct download links
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24" dir="rtl">
      
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-l from-amber-600 via-amber-400 to-yellow-500" />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-12 space-y-10">
        
        {/* Verification Success Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-8 text-center flex flex-col items-center space-y-4 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
          
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ring-4 ring-emerald-500/5">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>

          <div className="space-y-1.5 z-10">
            <h1 className="text-lg sm:text-xl font-black text-slate-100 flex items-center justify-center gap-1.5">
              احراز هویت موفقیت‌آمیز بود!
              <Sparkles className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              پرداخت شما تایید شد. روی دکمه هر عکس کلیک کنید تا نسخه اصلی بدون لوگو مستقیماً بر روی دستگاه شما دانلود شود.
            </p>
          </div>
        </div>

        {/* Photos Grid Header */}
        <div className="border-r-4 border-amber-500 pr-3.5 space-y-1">
          <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <ImageIcon className="h-4.5 w-4.5 text-amber-500" />
            دانلود مستقیم تصاویر خریداری شده ({photos.length} عکس)
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold">آماده ذخیره‌سازی با وضوح اصلی</p>
        </div>

        {/* Paid Photos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-4 flex flex-col justify-between gap-4 transition shadow-lg group"
            >
              {/* Visual Preview Container */}
              <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/50">
                <Image
                  src={photo.watermarkedUrl || "/placeholder.jpg"}
                  alt="تصویر خریداری شده"
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-cover transition duration-300 group-hover:scale-102"
                />
                
                <div className="absolute top-3 right-3 bg-emerald-500/90 text-white rounded-lg px-2 py-0.5 text-[9px] font-black backdrop-blur-sm">
                  خریداری شده
                </div>
              </div>

              {/* Info & Download Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                  <span>نام فایل: {photo.fileName}</span>
                  <span className="font-mono">{photo.fileSize ? `${(photo.fileSize / (1024 * 1024)).toFixed(2)} MB` : ""}</span>
                </div>

                <a
                  href={getDirectDownloadUrl(photo.originalUrl)}
                  className="w-full flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-amber-505 bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-98"
                >
                  <Download className="h-4.5 w-4.5" />
                  دانلود فایل باکیفیت اصلی
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
