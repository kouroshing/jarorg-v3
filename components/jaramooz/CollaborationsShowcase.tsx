"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, ShieldCheck, Camera, FolderGit2, FileImage } from "lucide-react";

interface PartnerItem {
  name: string;
  category: string;
  followers: string;
  collabType: string;
  roleNote: string;
  badgeColor: string;
  badgeBg: string;
  logoBg: string;
  initials: string;
  imageUrl?: string;
  verified?: boolean;
}

const PARTNERS: PartnerItem[] = [
  {
    name: "دیجی‌کالا (Digikala)",
    category: "بزرگترین مارکت‌پلیس ایران",
    followers: "+۱.۸M فالوور",
    collabType: "عکاسی صنعتی و استودیویی محصولات",
    roleNote: "اجرای پروژه‌های عکاسی کاتالوگ صنعتی",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-[#ED1C24] text-white",
    initials: "DK",
    imageUrl: "/jaramooz/digikala.png",
    verified: true,
  },
  {
    name: "لبنیات و بستنی دومینو",
    category: "برند صنایع غذایی و لبنی",
    followers: "+۳۵۰K دنبال‌کننده",
    collabType: "عکاسی تبلیغاتی و تیزر محصول",
    roleNote: "شات‌های تبلیغاتی کمپین تابستانه",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-white border border-slate-100",
    initials: "Domino",
    imageUrl: "/jaramooz/domino.png",
    verified: true,
  },
  {
    name: "اسنپ‌پی (SnappPay)",
    category: "سوپراپلیکیشن و فین‌تک",
    followers: "+۱۰M کاربر",
    collabType: "تولید محتوای بصری و تیزر کمپین",
    roleNote: "تولید محتوای عکاسی و تیزر اختصاصی",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-[#00D170] text-white",
    initials: "Snapp",
    verified: true,
  },
  {
    name: "نیما تکیدو (Nima TaqiDo)",
    category: "یوتیوبر برتر فان و سرگرمی",
    followers: "+۳M مخاطب (۱M یوتیوب + ۲M اینستا)",
    collabType: "تصویربرداری و کارگردانی بصری ولاگ‌ها",
    roleNote: "همکاری بلندمدت در تولید محتوای پربازدید",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-gradient-to-tr from-slate-900 to-amber-600 text-white",
    initials: "تکیدو",
    imageUrl: "/jaramooz/nima-taghido.webp",
    verified: true,
  },
  {
    name: "مهدیس (Mahdis)",
    category: "یوتیوبر و تولیدکننده محتوا",
    followers: "+۲۰۰K سابسکرایبر",
    collabType: "تصویربرداری حرفه‌ای و ادیت ویدیوها",
    roleNote: "همکاری در ویدیوهای استودیویی و محیطی",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-red-600 text-white",
    initials: "مهدیس",
    imageUrl: "/jaramooz/mahdis.jpg",
    verified: true,
  },
  {
    name: "گروه بارکد بیت‌باکس (Barcode)",
    category: "قهرمان جهان و کریتور موزیکال",
    followers: "+۳M مخاطب (۱M یوتیوب + ۲M اینستا)",
    collabType: "شروع فعالیت، تصویربرداری و موزیک ویدیو",
    roleNote: "عکاسی پرتره و تولید تیزرهای وایرال",
    badgeColor: "text-blue-700",
    badgeBg: "bg-blue-50 border-blue-200/80",
    logoBg: "bg-gradient-to-tr from-slate-900 to-purple-800 text-white",
    initials: "بارکد",
    imageUrl: "/jaramooz/barcode-beatbox.jpg",
    verified: true,
  },
];

export default function CollaborationsShowcase() {
  return (
    <div className="w-full space-y-6 pt-6">
      {/* Header section with 100% clarity on instructor's real commercial projects */}
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-8 px-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006097]/10 px-3.5 py-1 text-xs font-bold text-[#006097]">
          <Camera className="h-3.5 w-3.5" />
          سوابق کاری مدرس و فایل‌های تمرینی
        </span>
        <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
          پروژه‌های اجرایی کوروش چنان برای <span className="text-[#006097]">برندها و چهره‌های برتر</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          تکنیک‌های این مسترکلاس تئوری نیستند؛ تمام سرفصل‌ها حاصل اجرای مستقیم پروژه‌های صنعتی برندهای معتبر و کریتورهای پرمخاطب است. <strong className="text-slate-800">فایل‌های RAW واقعی این پروژه‌ها در دوره جهت تمرین در اختیارتان قرار می‌گیرد.</strong>
        </p>
      </div>

      {/* Static Responsive Grid (3 columns on desktop, 2 on tablet, 1 on mobile) */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {/* Seamless Soft Blue Ambient Halos behind partners grid (Zero-Edge Radial Falloff) */}
        <div className="absolute -inset-x-12 -inset-y-16 -z-10 pointer-events-none overflow-visible">
          <div 
            className="absolute -top-20 -left-20 w-[480px] sm:w-[680px] h-[360px] sm:h-[500px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(56,189,248,0.26) 0%, rgba(0,128,255,0.12) 35%, rgba(0,128,255,0.03) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
          <div 
            className="absolute -bottom-20 -right-20 w-[480px] sm:w-[680px] h-[360px] sm:h-[500px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(34,211,238,0.24) 0%, rgba(56,189,248,0.12) 35%, rgba(56,189,248,0.03) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
        </div>
        {PARTNERS.map((partner, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-[#006097]/40 transition-all flex flex-col justify-between group"
          >
            {/* Top Row: Avatar & Followers Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center font-black text-xs shadow-xs tracking-tight overflow-hidden ${partner.logoBg}`}
                >
                  {partner.imageUrl ? (
                    <img
                      src={partner.imageUrl}
                      alt={partner.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    partner.initials
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 group-hover:text-[#006097] transition-colors">
                      {partner.name}
                    </span>
                    {partner.verified && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#006097] shrink-0 fill-[#006097]/10" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {partner.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Collab Type & Stats */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-slate-700 font-bold truncate">
                  {partner.collabType}
                </span>
                <span
                  className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${partner.badgeBg} ${partner.badgeColor}`}
                >
                  {partner.followers}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                • {partner.roleNote}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* RAW Practice Files & Commercial Projects Badge */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1 text-center">
        <div className="flex items-center gap-2 bg-[#006097]/8 border border-[#006097]/20 rounded-full px-4 py-1.5">
          <FileImage className="h-4 w-4 text-[#006097]" />
          <p className="text-xs sm:text-[13px] font-bold text-slate-700">
            فایل‌های خام (RAW) پروژه‌های بالا در پنل دوره جهت <span className="text-[#006097] font-black">تمرین گام‌به‌گام و اصلاح رنگ</span> قرار داده شده است.
          </p>
        </div>
      </div>

      {/* Trust Quote Banner */}
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right shadow-2xs max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#FACC15] flex items-center justify-center p-2 shadow-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 701 701"
              className="w-full h-full fill-black"
              aria-label="لوگوی پلتفرم جار"
            >
              <path d="M1548,1006a77.61,77.61,0,0,1-14.12,44.76h0A78,78,0,1,1,1548,1006Z" transform="translate(-847.5 -900.5)"/>
              <path d="M1548.5,1182.5v187.64c0,127.78-103.58,231.36-231.36,231.36H1078.86c-127.78,0-231.36-103.58-231.36-231.36V1131.86c0-127.78,103.58-231.36,231.36-231.36H1272v132H1077.36a99.86,99.86,0,0,0-99.86,99.86v236.28a99.86,99.86,0,0,0,99.86,99.86h236.28a99.86,99.86,0,0,0,99.86-99.86V1182.5Z" transform="translate(-847.5 -900.5)"/>
            </svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-800">
              فرصت همکاری اختصاصی برای فارغ‌التحصیلان برتر دوره
            </span>
            <span className="block text-[11px] text-slate-500">
              هنرجویان برتر مستقیماً به عنوان عکاس و تصویربردار پروژه‌های پلتفرم «جار» و کارفرمایان معرفی می‌شوند.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-extrabold text-[#006097] bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>تضمین معرفی به بازار کار</span>
        </div>
      </div>
    </div>
  );
}
