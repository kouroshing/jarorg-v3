"use client";

import React from "react";
import { MapPin, MessageSquareText, Landmark, CheckCircle2, Building, Sparkles } from "lucide-react";

export type LocationType = "CLIENT_LOCATION" | "SPECIALIST_ADVICE" | "JAR_STUDIO";

interface LocationSelectorProps {
  locationType: LocationType;
  onChangeLocationType: (type: LocationType) => void;
  address: string;
  onChangeAddress: (val: string) => void;
  district: string;
  onChangeDistrict: (val: string) => void;
}

export default function LocationSelector({
  locationType,
  onChangeLocationType,
  address,
  onChangeAddress,
  district,
  onChangeDistrict,
}: LocationSelectorProps) {
  const options = [
    {
      id: "CLIENT_LOCATION" as LocationType,
      title: "در محل شما",
      desc: "عکاس با تجهیزات کامل در منزل، شرکت، کارخانه یا لوکیشن مدنظر شما حاضر می‌شود.",
      icon: MapPin,
      badge: "رایج‌ترین",
    },
    {
      id: "SPECIALIST_ADVICE" as LocationType,
      title: "با مشورت و پیشنهاد متخصص",
      desc: "عکاس منتخب با توجه به سناریوی پروژه، لوکیشن‌ها و کافه‌های مناسب را پیشنهاد می‌دهد.",
      icon: MessageSquareText,
      badge: "مشاوره رایگان",
    },
    {
      id: "JAR_STUDIO" as LocationType,
      title: "انتخاب از عمارت‌ها و استودیوهای جار",
      desc: "دسترسی مستقیم به فضاهای مجهز استودیویی، عکاسی صنعتی و عمارت‌های اختصاصی طرف قرارداد.",
      icon: Landmark,
      badge: "تجهیزات کامل",
    },
  ];

  return (
    <div className="space-y-5 rounded-[28px] border border-[#E5E0D8] bg-white p-5 sm:p-7 shadow-xs" dir="rtl">
      
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-white font-bold text-xs">
            ۲
          </span>
          <h3 className="text-base sm:text-lg font-black text-[#141413]">
            محل اجرای پروژه (لوکیشن)
          </h3>
        </div>
        <p className="mt-1 text-xs text-[#66605B] font-medium">
          مشخص کنید عکاسی در چه فضایی انجام شود؛ امکان برگزاری در سراسر شهرها فراهم است.
        </p>
      </div>

      {/* 3 Radio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {options.map((opt) => {
          const isSelected = locationType === opt.id;
          const Icon = opt.icon;

          return (
            <div
              key={opt.id}
              onClick={() => onChangeLocationType(opt.id)}
              className={`relative flex flex-col justify-between p-4.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-2 border-[#141413] bg-white text-[#141413] shadow-xs"
                  : "border-[#E5E0D8] bg-white hover:border-[#141413]/40 text-[#141413]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isSelected ? "bg-[#141413] text-white" : "bg-[#FAF9F5] text-[#66605B] border border-[#E5E0D8]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? "bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20"
                        : "bg-[#FAF9F5] text-[#66605B] border-[#E5E0D8]"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>

                <h4 className="text-sm font-black text-[#141413] mb-1">
                  {opt.title}
                </h4>
                <p className="text-[11px] text-[#66605B] leading-relaxed">
                  {opt.desc}
                </p>
              </div>

              {/* Selection Check Circle */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#E5E0D8]">
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? "border-[#141413] bg-[#141413]" : "border-[#E5E0D8] bg-white"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className={`text-[11px] font-bold ${isSelected ? "text-[#141413]" : "text-[#A8A29A]"}`}>
                  {isSelected ? "انتخاب شد" : "انتخاب"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Conditional Details */}
      {locationType === "CLIENT_LOCATION" && (
        <div className="space-y-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] p-4.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-black text-[#141413]">
            <Building className="h-4 w-4 text-[#141413]" />
            <span>اطلاعات آدرس و محدوده حضور عکاس</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="block text-[11px] font-bold text-[#141413]">
                شهر / محدوده:
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => onChangeDistrict(e.target.value)}
                placeholder="مثلاً: تهران، نیاوران"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#141413] placeholder:text-[#A8A29A] outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-bold text-[#141413]">
                آدرس کامل لوکیشن (محرمانه نزد پلتفرم):
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => onChangeAddress(e.target.value)}
                placeholder="خیابان، کوچه، پلاک، واحد..."
                className="w-full h-11 px-3.5 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#141413] placeholder:text-[#A8A29A] outline-none focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}

      {locationType === "SPECIALIST_ADVICE" && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] p-4 text-[#141413] animate-in fade-in duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141413] text-white">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold leading-relaxed">
            پس از واریز پیش‌پرداخت، متخصص داوطلب در اولین تماس تلفنی لوکیشن‌های زیبا (فضای باز، کافه یا پارک‌های استاندارد) را متناسب با سناریوی شما رایگان هماهنگ خواهد کرد.
          </p>
        </div>
      )}

      {locationType === "JAR_STUDIO" && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] p-4 text-[#141413] animate-in fade-in duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141413] text-white shadow-xs">
            <Sparkles className="h-5 w-5 text-[#CC785C]" />
          </div>
          <p className="text-xs font-bold leading-relaxed">
            شبکه استودیوهای جار در تهران و مراکز استان‌ها شامل آتلیه‌های مجهز فون، عمارت‌های پرنور عکاسی مدلینگ و سوله عکاسی صنعتی است. هزینه ورودی استودیو به صورت مجزا با آتلیه محاسبه خواهد شد.
          </p>
        </div>
      )}

    </div>
  );
}
