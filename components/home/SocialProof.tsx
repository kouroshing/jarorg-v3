"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

const CLIENT_REVIEWS = [
  {
    id: "c1",
    name: "امیر",
    role: "مدیریت کافه راستا",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop&crop=face",
    text: "برای منوی جدید کافه‌مون دنبال عکاس صنعتی بودیم. از طریق فرم جار درخواست دادیم و فرداش عکاس با تجهیزات کامل تو کافه بود. خروجی کار فراتر از انتظارمون شد."
  },
  {
    id: "c2",
    name: "سارا",
    role: "مدیر هنری برند زیما",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop&crop=face",
    text: "به عنوان یک برند پوشاک، همیشه دغدغه پیدا کردن عکاس مدلینگ حرفه‌ای و متعهد رو داشتیم. پورتفولیوی عکاس‌های جار بهمون کمک کرد دقیقاً آدمِ متناسب با استایلمون رو پیدا کنیم."
  }
];

const EXPERT_REVIEWS = [
  {
    id: "e1",
    name: "محسن عصار",
    role: "موبایلگرافر و عکاس صنعتی",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=120&auto=format&fit=crop&crop=face",
    text: "جار برای من سیستم بازاریابی رو کلاً حذف کرد. الان فقط روی خلاقیت و کیفیت عکاسی خودم تمرکز دارم و پروژه‌ها به صورت منظم از طریق پلتفرم هماهنگ میشن. سیستم پرداخت بیعانه هم عالیه."
  },
  {
    id: "e2",
    name: "الناز شاکری",
    role: "عکاس فرمالیته و پرتره",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop&crop=face",
    text: "یکی از بزرگترین مشکلات ما عکاس‌ها، هماهنگی زمان و بدقولی مشتری‌ها بود. سیستم رزرو آنلاین جار این مشکل رو حل کرده و همه‌چیز کاملاً داکیومنت شده جلو میره."
  }
];

const TRUST_LOGOS = [
  "کافه ویونا",
  "استودیو شین",
  "برند زیما",
  "کافه راستا",
  "پوشاک آریا"
];

export function SocialProof() {
  const [activeTab, setActiveTab] = useState<"clients" | "experts">("clients");

  const activeReviews = activeTab === "clients" ? CLIENT_REVIEWS : EXPERT_REVIEWS;

  return (
    <section className="py-16 sm:py-24 border-t border-slate-100 bg-slate-50/20" aria-labelledby="social-proof-heading">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="mb-10 text-center sm:mb-12">
          <h2
            id="social-proof-heading"
            className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            جامعهٔ کاربران جار
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            داستان موفقیت پروژه‌ها از زبان مشتریان و متخصصین پلتفرم
          </p>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
              activeTab === "clients"
                ? "bg-[#FBBF24] text-slate-950 shadow-sm border border-[#FBBF24]"
                : "bg-white text-slate-500 border border-slate-200/60 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            از زبان مشتریان (کارفرمایان)
          </button>
          <button
            onClick={() => setActiveTab("experts")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
              activeTab === "experts"
                ? "bg-[#FBBF24] text-slate-950 shadow-sm border border-[#FBBF24]"
                : "bg-white text-slate-500 border border-slate-200/60 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            از زبان متخصصین (عکاسان)
          </button>
        </div>

        {/* Review Cards Grid with dynamic fade-in keyframes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 key-fade">
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .card-fade {
              animation: fadeIn 0.4s ease-out forwards;
            }
          `}</style>
          {activeReviews.map((review) => (
            <div
              key={review.id}
              className="card-fade flex flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-200 hover:shadow-md text-right"
            >
              {/* Review Text */}
              <p className="text-xs sm:text-[13px] font-semibold text-slate-650 leading-relaxed min-h-[70px]">
                «{review.text}»
              </p>

              {/* Reviewer Details */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                {/* Name / Specialty */}
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 block">{review.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">{review.role}</span>
                </div>

                {/* Avatar */}
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-slate-100 bg-slate-50 shadow-sm shrink-0">
                  <Image
                    src={review.avatarUrl}
                    alt={review.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Star Rating Overlay */}
              <div className="flex items-center justify-end gap-0.5 mt-3 text-[#FBBF24]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Bar Segment */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-slate-200/50 text-center">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-6">
            برندها و کسب‌وکارهایی که به جار اعتماد کرده‌اند
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {TRUST_LOGOS.map((logo, idx) => (
              <span
                key={idx}
                className="text-sm sm:text-base font-extrabold text-slate-400/80 hover:text-slate-800 transition-colors duration-250 select-none cursor-default"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
