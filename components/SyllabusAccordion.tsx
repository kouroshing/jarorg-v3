"use client";

import React, { useState } from "react";
import { ChevronDown, Lock, Play, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useJarAmoozPurchaseModal } from "@/components/jaramooz/JarAmoozPurchaseContext";

type VideoItem = {
  num: number;
  title: string;
  duration: string;
  isBonus?: boolean;
};

type Chapter = {
  num: string;
  title: string;
  goal: string;
  duration: string;
  videos: VideoItem[];
};

const SYLLABUS_DATA: Chapter[] = [
  {
    num: "۰۱",
    title: "ذهنیتِ عکاس ثروتمند و ورود به بازار",
    goal: "تغییر نگاه هنرجو از یک دکمه‌زن به یک مدیر هنری و آماده‌سازی برای مسیر ۱۰۰ روزه.",
    duration: "۲ ساعت",
    videos: [
      { num: 1, title: "نقشه راه ۱۰۰ روزه؛ چطور از صفر به اولین درآمد برسیم؟", duration: "۱۵:۴۰" },
      { num: 2, title: "تفاوت عکاس آماتور و عکاس تجاری (چرا بعضی‌ها ۲۰ میلیون می‌گیرند و بعضی‌ها ۲ میلیون؟)", duration: "۲۲:۱۵" },
      { num: 3, title: "توهم تجهیزات؛ چطور کمال‌گرایی را بکشیم و با کمترین امکانات شروع کنیم؟", duration: "۱۸:۳۰" },
      { num: 4, title: "پیدا کردن نیچ (Niche) پولساز؛ در کدام شاخه عکاسی سریع‌تر به درآمد می‌رسیم؟", duration: "۲۵:۱۰" },
    ],
  },
  {
    num: "۰۲",
    title: "تسلط بر موبایلگرافی حرفه‌ای (مخصوص همه دانشجویان)",
    goal: "آموزش تنظیمات دستی روی موبایل تا کسانی که دوربین ندارند هم بتوانند خروجی‌های خارق‌العاده و مارکت‌پسند بگیرند.",
    duration: "۴ ساعت",
    videos: [
      { num: 5, title: "آشنایی با لنزها و سنسورهای موبایل و درک محدودیت‌های آنها", duration: "۱۴:۲۰" },
      { num: 6, title: "فعالسازی و تسلط بر حالت Pro/Manual در دوربین گوشی (آیفون و اندروید)", duration: "۲۸:۵۰" },
      { num: 7, title: "کنترل دستیِ مثلث نوردهی روی موبایل (تنظیم ISO و Shutter Speed برای محیط‌های تاریک و روشن)", duration: "۳۲:۱۵" },
      { num: 8, title: "تکنیک‌های فوکوس کشیِ دستی (Manual Focus) و ایجاد عمق میدان (بوکه) با موبایل", duration: "۱۹:۳۰" },
      { num: 9, title: "وایت بالانس (WB) در موبایل؛ چطور رنگ‌ها را واقعی و سینمایی ثبت کنیم؟", duration: "۲۱:۴۵" },
      { num: 10, title: "معرفی اپلیکیشن‌های تخصصی برای فیلمبرداری و عکاسی حرفه‌ای با گوشی (ProCam, Lightroom Mobile و...)", duration: "۳۵:۱۰" },
      { num: 11, title: "ترفندهای کادربندی و زاویه‌بندی مخصوص موبایل برای جلوگیری از دفرمه شدن سوژه", duration: "۱۷:۳۰" },
    ],
  },
  {
    num: "۰۳",
    title: "مهندسی نور و تسلط بر دوربین‌های حرفه‌ای",
    goal: "یادگیری عمیق تنظیمات دوربین‌های حرفه‌ای (مثل سونی A7) و تکنیک‌های نورپردازی تجاری.",
    duration: "۵ ساعت",
    videos: [
      { num: 12, title: "کالبدشکافی دوربین حرفه‌ای (بدنه، انواع لنزها، کراپ سنسور vs فول فریم)", duration: "۲۴:۱۵" },
      { num: 13, title: "درک عمیق مثلث نوردهی (دیافراگم، شاتر، ایزو) در پروژه‌های واقعی", duration: "۳۰:۴۵" },
      { num: 14, title: "علم رنگ (Color Science) و مدیریت پروفایل‌های رنگی در دوربین", duration: "۲۲:۱۰" },
      { num: 15, title: "نورپردازیِ پایه؛ درک کیفیت نور (Hard Light vs Soft Light)", duration: "۱۸:۳۵" },
      { num: 16, title: "نورپردازیِ تجاری ۱؛ تکنیک‌های نورپردازی محصولات شفاف (شیشه، عطر و نوشیدنی)", duration: "۴۲:۱۵" },
      { num: 17, title: "نورپردازیِ تجاری ۲؛ تکنیک‌های نورپردازی فلزات، جواهرات و بافت‌های سخت", duration: "۴۵:۲۰" },
    ],
  },
  {
    num: "۰۴",
    title: "کارگردانی هنری و طراحیِ پروژه (Pre-Production)",
    goal: "آموزش فکر کردن قبل از شات زدن. کارفرمای بزرگ بابت ایده پول می‌دهد نه فقط کلیک کردن.",
    duration: "۳ ساعت",
    videos: [
      { num: 18, title: "مودبورد (Moodboard) چیست و چطور قبل از عکاسی، ذهن کارفرما را تسخیر کنیم؟", duration: "۲۰:۴۰" },
      { num: 19, title: "طراحی استوری‌بورد و برنامه‌ریزی روز عکاسی (Call Sheet)", duration: "۱۸:۱۵" },
      { num: 20, title: "روانشناسی کادر و ترکیب‌بندیِ تبلیغاتی (هدایت چشم مخاطب به سمت محصول)", duration: "۲۶:۳۰" },
      { num: 21, title: "چیدمان صحنه (Set Design) و انتخاب پراپ‌های (Props) مناسب برای عکاسی محصول", duration: "۳۲:۱۰" },
    ],
  },
  {
    num: "۰۵",
    title: "جادوی پست‌تولید (High-End Post-Production)",
    goal: "تبدیل یک عکس خام به یک خروجیِ بی‌نقصِ بیلبوردی و مجله‌ای.",
    duration: "۶ ساعت",
    videos: [
      { num: 22, title: "آشنایی با محیط نرم‌افزارهای استاندارد بازار (Adobe Lightroom & Photoshop)", duration: "۱۵:۵۰" },
      { num: 23, title: "اصلاح رنگ و نورِ پایه (Color Correction) و بازیابی جزئیات", duration: "۲۷:۴۰" },
      { num: 24, title: "کالرگریدینگ (Color Grading)؛ رنگسازیِ لوکس و سینمایی بر اساس روانشناسی رنگ", duration: "۳۸:۱۵" },
      { num: 25, title: "رتوش تجاری و تبلیغاتی (High-End Retouching) برای پوست و محصول", duration: "۴۵:۳۰" },
      { num: 26, title: "تکنیک‌های کامپوزیت (Compositing)؛ ترکیب چندین عکس برای رسیدن به یک شاتِ جادویی که در واقعیت ممکن نیست!", duration: "۵۲:۱۰" },
    ],
  },
  {
    num: "۰۶",
    title: "ماشین پولسازی، مذاکره و پلتفرم «جار»",
    goal: "آموزش بیزینس، غلبه بر ترسِ اعلام قیمت، بستن قراردادهای گران‌قیمت و ورود به بازار کار واقعی.",
    duration: "۵ ساعت",
    videos: [
      { num: 27, title: "پورتفولیوی پِریمیوم؛ چطور یک آلبوم نمونه‌کار بسازیم که داد بزند «من گران هستم!»", duration: "۲۲:۴۰" },
      { num: 28, title: "چرا سایت‌های کاریابی عمومی (فریلنسری) برای عکاسان حرفه‌ای تله هستند؟", duration: "۱۵:۱۵" },
      { num: 29, title: "قیمت‌گذاری بر اساس ارزش (Value-Based Pricing)؛ چطور برای یک پروژه قیمت ۲۰ میلیونی تعیین کنیم؟", duration: "۲۸:۳۰" },
      { num: 30, title: "تکنیک‌های مذاکره B2B؛ چطور با مدیران کسب‌وکارها و کارفرمایان بزرگ حرف بزنیم؟", duration: "۳۴:۱۰" },
      { num: 31, title: "آناتومی یک قرارداد حرفه‌ای (نحوه دریافت پیش‌پرداخت، حق کپی‌رایت و شرایط تحویل)", duration: "۲۵:۴۵" },
      { num: 32, title: "مقابل با پدیده «غیب شدن کارفرما بعد از شنیدن قیمت» و تکنیک‌های پیگیری (Follow-up)", duration: "۱۹:۳۰" },
      { num: 33, title: "معرفی پلتفرم اختصاصی «جار»؛ سیستمِ کار و قوانین پلتفرم", duration: "۲۴:۵۰" },
      { num: 34, title: "نحوه ساخت پروفایل حرفه‌ای در «جار» و دریافت اولین پروژه‌ی اختصاصی", duration: "۱۸:۲۰" },
      { num: 35, title: "ایستگاه آخر؛ حفظ مشتری، شبکه‌سازی و مسیر توسعه بیزینسِ شما در سال‌های آینده", duration: "۳۰:۱۵" },
    ],
  },
  {
    num: "بونوس",
    title: "بخش‌های ویژه و لایو‌های ماهانه (Bonus)",
    goal: "فایل‌های آماده، چک‌لیست‌ها و ارتباط مستقیم با مدرس جهت رفع اشکال پورتفولیو.",
    duration: "مستمر",
    videos: [
      { num: 36, title: "فایلهای ضمیمه: قراردادهای خام عکاسی (فایل Word آماده چاپ)، چک‌لیست تجهیزات، پالت‌های رنگی", duration: "آماده دانلود", isBonus: true },
      { num: 37, title: "لایوهای ماهانه: بررسی و رفع اشکال پورتفولیوی هنرجویان", duration: "وبینار زنده", isBonus: true },
    ],
  },
];

type Props = {
  courseId: string;
  isLoggedIn: boolean;
  isPurchased: boolean;
  initialPhone?: string;
};

export default function SyllabusAccordion({ courseId, isPurchased }: Props) {
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  const { openPurchaseModal } = useJarAmoozPurchaseModal();

  const toggleChapter = (index: number) => {
    setOpenChapter(openChapter === index ? null : index);
  };

  const handleVideoClick = () => {
    if (isPurchased) {
      window.location.href = `/jaramooz/courses/${courseId}/play`;
      return;
    }
    openPurchaseModal({
      courseId,
      title: "مسترکلاس ۱۰۰ روزه عکاسی",
      price: 9100000,
    });
  };

  return (
    <div className="space-y-4">
      {SYLLABUS_DATA.map((chapter, idx) => {
        const isExpanded = openChapter === idx;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className="rounded-[24px] border border-slate-200/60 bg-white/50 backdrop-blur-md overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:border-[#006097]/20"
          >
            {/* Header Accordion Button */}
            <motion.div
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleChapter(idx)}
              className="w-full flex items-center justify-between p-5 text-right transition-colors hover:bg-slate-50/50 gap-4 cursor-pointer select-none"
            >
              {/* Right content: Badge and Main Title */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-[#006097]/10 text-[11px] font-black text-[#006097] font-mono shadow-xs">
                  {chapter.num}
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug flex-1">
                  {chapter.title}
                </h3>
              </div>

              {/* Left content: Duration and Arrow Icon */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 font-mono" dir="ltr">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {chapter.duration}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ChevronDown className="h-4.5 w-4.5 text-[#006097]" />
                </motion.div>
              </div>
            </motion.div>

            {/* Video List Items (Animated with Framer Motion AnimatePresence) */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="overflow-hidden border-t border-slate-200/40 bg-slate-50/20"
                >
                  <div className="p-5 space-y-4">
                    {/* Goal Description */}
                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium border-b border-slate-200/40 pb-3">
                      {chapter.goal}
                    </p>

                    {/* Video Rows */}
                    <div className="space-y-2">
                      {chapter.videos.map((vid, vIdx) => (
                        <motion.div
                          key={vIdx}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: vIdx * 0.03 }}
                          whileHover={{ scale: 1.01, x: -3 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleVideoClick()}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/50 border border-slate-200/50 hover:bg-white/90 hover:border-[#006097]/30 hover:shadow-xs transition-colors duration-150 gap-4 text-right group cursor-pointer select-none"
                        >
                          {/* Right side: Play Circle Badge + Title */}
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#006097]/10 text-[#006097] flex items-center justify-center shrink-0 group-hover:bg-[#006097] group-hover:text-white transition-all duration-200 shadow-xs">
                              <Play className="h-2.5 w-2.5 fill-current" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                              {vid.isBonus ? "" : `ویدیو ${vid.num}: `}
                              {vid.title}
                            </span>
                          </div>

                          {/* Left side: Duration & Lock Icon */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[10px] font-semibold text-slate-500 font-mono" dir="ltr">
                              {vid.duration}
                            </span>
                            {!isPurchased && (
                              <Lock className="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#006097] transition-all" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
