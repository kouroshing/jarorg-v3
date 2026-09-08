"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, MapPin, Clock, DollarSign, ArrowUpRight, ShieldCheck, Filter, Users, Flame, Briefcase } from "lucide-react";

interface LiveProject {
  id: string;
  title: string;
  category: "portrait" | "product" | "food" | "fashion" | "industrial";
  categoryLabel: string;
  location: string;
  budget: string;
  budgetNumeric: number;
  timeAgo: string;
  status: string;
  statusType: "referred" | "completed" | "in_progress";
  clientType: string;
  tags: string[];
}

const LIVE_PROJECTS: LiveProject[] = [
  {
    id: "JAR-8941",
    title: "عکاسی پرتره مدیریتی و بیزینس پروفایل",
    category: "portrait",
    categoryLabel: "پرتره و شخصی",
    location: "تهران، الهیه",
    budget: "۸٬۵۰۰٬۰۰۰ تومان",
    budgetNumeric: 8500000,
    timeAgo: "۱۵ دقیقه پیش",
    status: "ارجاع‌شده به متخصص جارآموز",
    statusType: "referred",
    clientType: "هلدینگ بازرگانی بین‌المللی",
    tags: ["نورپردازی استودیویی", "۳ ساعت شات"],
  },
  {
    id: "JAR-8938",
    title: "عکاسی منو و آیتم‌های جدید کافه رستوران",
    category: "food",
    categoryLabel: "منو و غذایی",
    location: "تهران، سعادت‌آباد",
    budget: "۱۶٬۰۰۰٬۰۰۰ تومان",
    budgetNumeric: 16000000,
    timeAgo: "۴۵ دقیقه پیش",
    status: "تکمیل پروژه و تسویه آنی",
    statusType: "completed",
    clientType: "مجموعه رستوران‌های زنجیره‌ای",
    tags: ["عکاسی غذا", "ادیت رنگ و نور اختصاصی"],
  },
  {
    id: "JAR-8935",
    title: "عکاسی صنعتی از محصولات پوستی (۳۰ شات)",
    category: "product",
    categoryLabel: "محصول و صنعتی",
    location: "البرز، کرج",
    budget: "۲۲٬۵۰۰٬۰۰۰ تومان",
    budgetNumeric: 22500000,
    timeAgo: "۲ ساعت پیش",
    status: "در حال اجرا توسط هنرجوی برتر",
    statusType: "in_progress",
    clientType: "برند آرایشی و بهداشتی",
    tags: ["شات پس‌زمینه سفید", "روتوش تبلیغاتی"],
  },
  {
    id: "JAR-8931",
    title: "عکاسی مدلینگ کالکشن پاییزی مزون",
    category: "fashion",
    categoryLabel: "پوشاک و فشن",
    location: "شیراز، قصرالدشت",
    budget: "۲۸٬۰۰۰٬۰۰۰ تومان",
    budgetNumeric: 28000000,
    timeAgo: "۳ ساعت پیش",
    status: "ارجاع‌شده به متخصص جارآموز",
    statusType: "referred",
    clientType: "مزون و برند استایلینگ",
    tags: ["مدلینگ و لباس", "پروژه فول‌دی"],
  },
  {
    id: "JAR-8927",
    title: "عکاسی پرتره فضای باز و لایف‌استایل بلاگری",
    category: "portrait",
    categoryLabel: "پرتره و شخصی",
    location: "تهران، نیاوران",
    budget: "۶٬۸۰۰٬۰۰۰ تومان",
    budgetNumeric: 6800000,
    timeAgo: "۵ ساعت پیش",
    status: "تکمیل پروژه با رضایت ۱۰۰٪",
    statusType: "completed",
    clientType: "کریتور و اینفلوئنسر",
    tags: ["شات محیطی", "اصلاح رنگ اینستاگرامی"],
  },
  {
    id: "JAR-8922",
    title: "عکاسی صنعتی خط تولید و بسته‌بندی",
    category: "industrial",
    categoryLabel: "محصول و صنعتی",
    location: "اصفهان، شهرک صنعتی",
    budget: "۳۵٬۰۰۰٬۰۰۰ تومان",
    budgetNumeric: 35000000,
    timeAgo: "۶ ساعت پیش",
    status: "عقد قرارداد رسمی حقوقی B2B",
    statusType: "referred",
    clientType: "کارخانه صنایع غذایی",
    tags: ["شات خط تولید", "عکاسی معماری صنعتی"],
  },
];

const CATEGORIES = [
  { id: "all", label: "همه سفارش‌ها" },
  { id: "portrait", label: "پرتره و شخصی" },
  { id: "food", label: "منو و رستوران" },
  { id: "product", label: "محصول و کاتالوگ" },
  { id: "fashion", label: "پوشاک و فشن" },
];

export default function JarLiveProjectsFeed() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredProjects = activeCategory === "all"
    ? LIVE_PROJECTS
    : LIVE_PROJECTS.filter(p => p.category === activeCategory || (activeCategory === "product" && p.category === "industrial"));

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 px-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/50 px-4 py-1.5 text-xs font-black text-slate-900 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FACC15] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span>جریان زنده سفارش‌های کارفرمایی در اکوسیستم «جار»</span>
        </div>
        
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          تنها مسترکلاسی که <span className="text-[#006097]">مستقیماً به مشتری و بازار کار</span> متصلتان می‌کند
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
          ما فقط تکنیک آموزش نمی‌دهیم؛ دانشجویان برتر پس از تایید ژوژمان مستقیماً به شبکه سفارش‌های فعال پلتفرم «جار» با سابقه بیش از ۵,۰۰۰ پروژه متصل می‌شوند.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 px-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 ${
              activeCategory === cat.id
                ? "bg-[#006097] text-white shadow-xs"
                : "bg-white/80 border border-slate-200/80 text-slate-600 hover:bg-slate-100/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Live Projects Grid */}
      <div className="relative max-w-5xl mx-auto">
        {/* Soft Blue Cloud Halos in Background */}
        <div className="absolute -inset-8 -z-10 pointer-events-none overflow-visible">
          <div className="absolute -top-12 -left-10 w-80 h-80 rounded-full bg-gradient-to-br from-sky-400/35 via-[#0080ff]/20 to-transparent blur-3xl opacity-80" />
          <div className="absolute -bottom-10 -right-10 w-80 h-80 rounded-full bg-gradient-to-tl from-cyan-400/30 via-sky-300/30 to-transparent blur-3xl opacity-75" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200/85 bg-white/90 backdrop-blur-xl p-5 shadow-xs hover:shadow-md hover:border-[#FACC15]/60 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Bar: Code & Time */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100 pb-3 mb-3">
                  <span className="font-mono font-bold text-slate-500">{project.id}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{project.timeAgo}</span>
                  </div>
                </div>

                {/* Project Title & Client */}
                <div className="space-y-2 mb-4">
                  <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-[#006097] transition-colors">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{project.clientType}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="rounded-md bg-slate-100/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Bottom Row: Location, Budget, Status */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{project.location}</span>
                    </div>
                    {/* Jar Brand Yellow Price Badge */}
                    <span className="inline-flex items-center rounded-lg bg-[#FACC15]/25 border border-[#FACC15]/60 px-2.5 py-1 text-xs font-black text-amber-950 font-mono shadow-2xs">
                      {project.budget}
                    </span>
                  </div>

                  {/* Status Badge in Jar Yellow Tint */}
                  <div className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold flex items-center justify-between bg-[#FACC15]/15 text-slate-800 border border-[#FACC15]/40">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                      <span>{project.status}</span>
                    </span>
                    <span className="text-[9px] font-black text-amber-700 font-mono tracking-tight">JAR VERIFIED</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Jar Ecosystem Trust & Guarantee Banner */}
      <div className="max-w-4xl mx-auto rounded-2xl border border-[#FACC15]/40 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/40 p-5 sm:p-6 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 text-right">
          <div className="h-12 w-12 rounded-2xl bg-[#FACC15] p-2.5 flex items-center justify-center shrink-0 shadow-md">
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
            <h4 className="text-sm font-black text-slate-900">
              مسیر تضمینی ورود به پروژه‌های تجاری سراسر کشور
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              پس از گذراندن مسترکلاس و قبولی در ژوژمان، نشان «متخصص تایید‌شده جار» را دریافت کرده و در اولویت دریافت سفارش‌ها قرار می‌گیرید.
            </p>
          </div>
        </div>

        <a
          href="#instructor"
          className="shrink-0 inline-flex h-10 items-center justify-center rounded-xl bg-[#006097] px-4 text-xs font-extrabold text-white shadow-xs hover:bg-[#056297] transition-all"
        >
          ثبت‌نام در مسترکلاس ۱۰۰ روزه
        </a>
      </div>
    </div>
  );
}
