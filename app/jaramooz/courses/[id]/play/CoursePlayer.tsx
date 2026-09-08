"use client";

import { useState } from "react";
import { Play, CheckCircle2, BookOpen, Clock, FileText } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string;
};

type Props = {
  course: Course;
};

type Lesson = {
  title: string;
  duration: string;
  videoUrl: string;
  description: string;
};

const LESSONS: Lesson[] = [
  {
    title: "بخش اول: معرفی سرفصل‌ها و نقشه راه درآمدی",
    duration: "۱۰ دقیقه",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-photo-camera-lens-zooming-in-and-out-33303-large.mp4",
    description: "در این بخش با اهداف دوره آشنا می‌شویم و بررسی می‌کنیم که چگونه با یادگیری این مهارت‌ها می‌توانیم پروژه‌های عکاسی و تدوین بگیریم.",
  },
  {
    title: "بخش دوم: شناخت دوربین و تنظیمات دستی",
    duration: "۴۵ دقیقه",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-adjusting-the-settings-on-a-digital-camera-41713-large.mp4",
    description: "آموزش کامل مثلث نوردهی (دیافراگم، شاتر، ایزو) و چگونگی تنظیم دستی دوربین در شرایط نوری مختلف.",
  },
  {
    title: "بخش سوم: اصول نورپردازی و حالت‌های آتلیه‌ای",
    duration: "۶۰ دقیقه",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-videographer-adjusting-the-lens-of-his-camera-41716-large.mp4",
    description: "شناخت الگوهای نورپردازی کلاسیک، استفاده از رفلکتورها، سافت‌باکس‌ها و چیدمان نورهای ثابت و فلاش در استودیو.",
  },
  {
    title: "بخش چهارم: صدابرداری و سناریونویسی برای ویدیو",
    duration: "۱۲۰ دقیقه",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-retro-camera-recording-a-video-41712-large.mp4",
    description: "چگونه برای ویدیوها سناریو بنویسیم، از چه میکروفون‌هایی استفاده کنیم و چطور صدایی بدون نویز ثبت کنیم.",
  },
  {
    title: "بخش پنجم: تدوین، اصلاح رنگ و کار با نرم‌افزارها",
    duration: "۹۰ دقیقه",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-editing-video-on-computer-with-two-screens-43093-large.mp4",
    description: "آموزش گام‌به‌گام کات زدن، اصلاح رنگ حرفه‌ای، سینک صدا و خروجی گرفتن برای پلتفرم‌های اینستاگرام و یوتیوب.",
  },
];

export default function CoursePlayer({ course }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeLesson = LESSONS[activeIdx] || LESSONS[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Video screen & lesson details (Left 3 columns) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Video Player */}
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg aspect-video">
          <video
            key={activeLesson?.videoUrl} // Triggers reload when source changes
            src={activeLesson?.videoUrl}
            controls
            autoPlay
            className="h-full w-full object-cover"
          />
        </div>

        {/* Lesson Details Card */}
        <div className="rounded-[32px] glass-card-premium p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-4">
          <div>
            <span className="text-[10px] font-bold text-[#006097] bg-[#006097]/8 px-2.5 py-1 rounded-md border border-[#006097]/15">
              در حال پخش: درس {(activeIdx + 1).toLocaleString("fa-IR")}
            </span>
            <h1 className="mt-3 text-lg font-extrabold text-slate-900 sm:text-xl">
              {activeLesson?.title}
            </h1>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
            {activeLesson?.description}
          </p>
        </div>
      </div>

      {/* Chapters Sidebar (Right 1 column) */}
      <div className="lg:col-span-1">
        <div className="rounded-[32px] glass-card-premium p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-5">
          <div className="border-b border-slate-200/60 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="h-4.5 w-4.5 text-[#006097]" />
              سرفصل‌های آموزشی
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">کل دوره: {LESSONS.length.toLocaleString("fa-IR")} درس</p>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {LESSONS.map((lesson, idx) => {
              const isActive = activeIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full text-right p-3.5 rounded-xl border text-xs leading-relaxed transition-all duration-200 flex flex-col gap-1.5 ${
                    isActive
                      ? "border-[#006097] bg-[#006097]/8 text-slate-900 font-bold shadow-[0_4px_15px_rgba(0,96,151,0.1)]"
                      : "border-slate-200/40 bg-white/40 text-slate-600 hover:border-slate-350 hover:bg-white/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isActive ? (
                      <Play className="h-3 w-3 fill-current text-[#006097] shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-slate-450 shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </span>
                  
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 pr-4" dir="ltr">
                    <Clock className="h-2.5 w-2.5" />
                    {lesson.duration}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
