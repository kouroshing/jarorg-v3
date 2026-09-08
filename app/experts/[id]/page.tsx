"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, CheckCircle2, ShieldAlert, Award, Camera, Sparkles } from "lucide-react";
import GalleryAccessPortal from "@/components/gallery/GalleryAccessPortal";

// Mock data aligned with the home page list
const MOCK_EXPERTS = [
  {
    id: "1",
    name: "کوروش",
    specialty: "کارگردان هنری و عکاس صنعتی",
    coverUrl: "/images/hero-bg.jpg",
    avatarUrl: "/images/kourosh.jpg",
    bio: "خلق تصاویر صنعتی و تبلیغاتی متمایز با تکیه بر نورپردازی دقیق و هویت‌سازی خلاقانه برای برندهای بین‌المللی.",
    price: "۵,۰۰۰,۰۰۰ تومان",
    portfolio: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg"
    ]
  },
  {
    id: "2",
    name: "الناز شاکری",
    specialty: "عکاس تبلیغاتی و پرتره",
    coverUrl: "/images/hero-bg.jpg",
    avatarUrl: "/images/kourosh.jpg",
    bio: "ثبت احساسات واقعی در پرتره‌های عمیق هنری و عکاسی تبلیغاتی متمرکز بر روایت داستان و روح برند.",
    price: "۳,۵۰۰,۰۰۰ تومان",
    portfolio: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg"
    ]
  },
  {
    id: "3",
    name: "امیررضا محمودی",
    specialty: "تصویربردار و تدوینگر فشن",
    coverUrl: "/images/hero-bg.jpg",
    avatarUrl: "/images/kourosh.jpg",
    bio: "تولید ویدیوهای فشن و تیزرهای تبلیغاتی با ادیت‌های مدرن، پویا و با کلاس متناسب با جدیدترین متدهای روز دنیا.",
    price: "۶,۰۰۰,۰۰۰ تومان",
    portfolio: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg"
    ]
  },
  {
    id: "4",
    name: "رعنا احمدی",
    specialty: "فیلمبردار فرمالیته و مستند",
    coverUrl: "/images/hero-bg.jpg",
    avatarUrl: "/images/kourosh.jpg",
    bio: "ثبت داستان‌های عاشقانه در ویدیوهای فرمالیته و عروسی به سبک مستند و سینمایی با رنگ و بوی طبیعی و ماندگار.",
    price: "۴,۵۰۰,۰۰۰ تومان",
    portfolio: [
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg",
      "/images/hero-bg.jpg",
      "/images/kourosh.jpg"
    ]
  }
];

type Props = {
  params: { id: string };
};

export default function ExpertProfilePage({ params }: Props) {
  // Find match or default to first expert to prevent 404 during testing
  const expert = MOCK_EXPERTS.find((e) => e.id === params.id) || MOCK_EXPERTS[0];

  return (
    <div className="min-h-screen bg-white pb-24 text-slate-800">
      {/* Top Sticky Nav for Return */}
      <div className="border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
            بازگشت به خانه
          </Link>
          <span className="text-[10px] font-extrabold text-slate-400 select-none">پروفایل متخصص</span>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-[240px] sm:h-[380px] w-full bg-slate-100 overflow-hidden">
        <Image
          src={expert.coverUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      {/* Main Grid Content */}
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 mt-[-50px] sm:mt-[-80px] relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Main profile content */}
          <div className="md:col-span-2 space-y-12">
            
            {/* Header info */}
            <div className="space-y-4">
              {/* Overlapping Avatar */}
              <div className="relative h-24 w-24 sm:h-36 sm:w-36 rounded-full border-4 border-white bg-slate-50 shadow-md overflow-hidden">
                <Image
                  src={expert.avatarUrl}
                  alt={expert.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 144px"
                />
              </div>

              {/* Title & Badge */}
              <div className="text-right pt-2 space-y-2">
                <div className="flex items-center justify-end gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                    {expert.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold text-sky-700 shadow-sm">
                    <CheckCircle2 className="h-3 w-3 text-sky-600" />
                    تایید صلاحیت شده
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm font-bold text-[#006097]">
                  {expert.specialty}
                </p>
                
                <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-2xl pt-2">
                  {expert.bio}
                </p>
              </div>
            </div>

            {/* Gallery Access PIN Code Section */}
            <div className="pt-2">
              <GalleryAccessPortal />
            </div>

            {/* Staggered Portfolio Gallery */}
            <div className="space-y-6">
              <h2 className="text-sm font-black text-slate-900 border-r-2 border-[#006097] pr-2 text-right">
                تألیفات و نمونه کارها
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {expert.portfolio.map((url, idx) => {
                  // Generate custom staggered layout heights for dynamic masonry feel
                  const heights = ["h-64", "h-80", "h-80", "h-64", "h-64", "h-80"];
                  const height = heights[idx % heights.length];
                  
                  return (
                    <div
                      key={idx}
                      className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 ${height} shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200`}
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 300px"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-103"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar Booking Card (Desktop Only) */}
          <div className="hidden md:block md:col-span-1">
            <div className="sticky top-24 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg space-y-6 text-right animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Cost Box */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400">شروع قیمت پروژه‌ها:</span>
                <p className="text-lg font-black text-slate-900">{expert.price}</p>
              </div>

              {/* Guarantees */}
              <div className="space-y-3 pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-500">
                <div className="flex items-center gap-2 justify-end">
                  <span>تجهیزات مدرن و سنسورهای فول‌فریم</span>
                  <Camera className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span>دارای گواهینامه معتبر آکادمی جار</span>
                  <Award className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span>ضمانت کیفیت خدمات و خروجی نهایی</span>
                  <Sparkles className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* CTA Book */}
              <Link
                href={`/order?expert=${encodeURIComponent(expert.id)}`}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 text-slate-950 text-xs font-bold transition hover:bg-amber-500 hover:shadow-lg active:scale-98 shadow-sm"
              >
                رزرو این متخصص
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Bar (Mobile Only) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-100/60 p-4 flex items-center justify-between z-30 md:hidden shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="text-right">
          <span className="text-[9px] font-extrabold text-slate-400 block">شروع قیمت:</span>
          <span className="text-sm font-black text-slate-950">{expert.price}</span>
        </div>

        <Link
          href={`/order?expert=${encodeURIComponent(expert.id)}`}
          className="flex h-10 px-6 items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold transition hover:bg-amber-500 active:scale-98"
        >
          رزرو متخصص
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
