import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { BookOpen, Award, Clock, CheckCircle2, ShieldCheck, HelpCircle, Film, Sparkles, LogIn, Play, Camera, Palette, UserCheck, ArrowRight, Users, Flame, Video, Zap, Star, ChevronLeft, ChevronDown, Shield } from "lucide-react";
import PurchaseButtonWrapper from "./courses/[id]/PurchaseButtonWrapper";
import JaramoozLogo from "@/components/JaramoozLogo";
import BillowComparison from "@/components/jaramooz/BillowComparison";
import RoiCalculator from "@/components/jaramooz/RoiCalculator";
import BillowFAQ from "@/components/jaramooz/BillowFAQ";
import BillowBackground from "@/components/jaramooz/BillowBackground";
import HeroTrustBar from "@/components/jaramooz/HeroTrustBar";
import StripeWebGlHero from "@/components/jaramooz/StripeWebGlHero";
import FloatingStickyCta from "@/components/jaramooz/FloatingStickyCta";
import CollaborationsShowcase from "@/components/jaramooz/CollaborationsShowcase";
import JaramoozHeader from "@/components/jaramooz/JaramoozHeader";
import { HeroFadeIn, FadeIn, StaggerContainer, StaggerItem, FloatingElement, HoverCard, MotionDiv } from "@/components/jaramooz/JaramoozMotion";
import { phoneToLocalDisplay } from "@/lib/auth/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مسترکلاس ۱۰۰ روزه عکاسی تجاری و تبلیغاتی | کوروش چنان (جارآموز)",
  description: "آموزش تخصصی نورپردازی، عکاسی تجاری و ورود مستقیم به بازار کار با تدریس کوروش چنان در جارآموز.",
  keywords: [
    "کوروش چنان",
    "کوروش چانان",
    "Kourosh Chanan",
    "عکاسی تجاری کوروش چنان",
    "آموزش عکاسی جار",
    "مسترکلاس جارآموز",
    "عکاسی تبلیغاتی",
    "عکاسی صنعتی",
  ],
  openGraph: {
    title: "مسترکلاس ۱۰۰ روزه عکاسی تجاری و تبلیغاتی | کوروش چنان (جارآموز)",
    description: "آموزش تخصصی نورپردازی، عکاسی تجاری و ورود مستقیم به بازار کار با تدریس کوروش چنان در جارآموز.",
    url: "https://app.jarorg.ir/jaramooz",
    siteName: "جارآموز",
    images: [
      {
        url: "https://app.jarorg.ir/jaramooz/instructor.jpg",
        width: 1200,
        height: 630,
        alt: "کوروش چنان عکاس و مدرس مسترکلاس عکاسی جارآموز",
      },
    ],
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "مسترکلاس ۱۰۰ روزه عکاسی تجاری و تبلیغاتی | کوروش چنان (جارآموز)",
    description: "آموزش تخصصی نورپردازی، عکاسی تجاری و ورود مستقیم به بازار کار با تدریس کوروش چنان در جارآموز.",
    images: ["https://app.jarorg.ir/jaramooz/instructor.jpg"],
  },
  alternates: {
    canonical: "https://app.jarorg.ir/jaramooz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://app.jarorg.ir/jaramooz#instructor",
      "name": "کوروش چنان",
      "alternateName": ["کوروش چانان", "Kourosh Chanan"],
      "jobTitle": "عکاس تجاری و بنیانگذار جار",
      "worksFor": {
        "@type": "Organization",
        "name": "جار | Jar",
      },
      "url": "https://app.jarorg.ir/jaramooz",
      "image": "https://app.jarorg.ir/jaramooz/instructor.jpg",
      "description":
        "کارآفرین، مدرس عکاسی تبلیغاتی و بنیانگذار پلتفرم جار با سابقه اجرای بیش از ۵۰۰۰ پروژه تجاری.",
    },
    {
      "@type": "Course",
      "name": "مسترکلاس ۱۰۰ روزه عکاسی تجاری و تبلیغاتی",
      "description":
        "آموزش تخصصی نورپردازی، عکاسی و بیزینس عکاسی با تدریس کوروش چنان",
      "provider": {
        "@type": "Organization",
        "name": "جارآموز",
        "sameAs": "https://app.jarorg.ir",
      },
      "instructor": {
        "@type": "Person",
        "name": "کوروش چنان",
      },
    },
  ],
};

async function getMasterclassCourse() {
  const slug = "photography-masterclass";
  let course = await prisma.course.findUnique({
    where: { slug },
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        title: "مسترکلاس ۱۰۰ روزه عکاسی",
        description: "دوره جامع و صفر تا صد عکاسی، نورپردازی خلاقانه، تدوین حرفه‌ای و فرمول جذب مشتریان بزرگ.",
        price: 9100000,
        slug: slug,
        image: "lighting",
      },
    });
  } else if (course.title !== "مسترکلاس ۱۰۰ روزه عکاسی") {
    course = await prisma.course.update({
      where: { slug },
      data: {
        title: "مسترکلاس ۱۰۰ روزه عکاسی",
        description: "دوره جامع و صفر تا صد عکاسی، نورپردازی خلاقانه، تدوین حرفه‌ای و فرمول جذب مشتریان بزرگ.",
      },
    });
  }

  return course;
}

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

export default async function JaramoozLandingPage() {
  const course = await getMasterclassCourse();
  const session = await getSession();
  let isPurchased = false;

  if (session) {
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    });
    isPurchased = purchase?.status === "SUCCESS";
  }

  return (
    <main className="jaramooz-theme relative isolate min-h-screen bg-[#fcfdff] text-slate-800 overflow-x-clip pt-[calc(env(safe-area-inset-top,0px)+5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+6.5rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-24">
      {/* Schema.org JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Stripe WebGL Mesh Gradient */}
      <StripeWebGlHero />

      {/* Billow.so Dot-Matrix & Lighting Ambient Background */}
      <BillowBackground />

      {/* Modern Frosted Header with Mobile Hamburger Menu */}
      <JaramoozHeader isPurchased={isPurchased} session={session} courseId={course?.id} />

      {/* 1. CLEAN FULL-VIEWPORT HERO SECTION (Full Edge-to-Edge Screen Width) */}
      <section className="relative w-full min-h-[calc(100vh-5.5rem)] sm:min-h-[88vh] flex flex-col justify-center items-center text-center px-5 md:px-8 pt-4 sm:pt-8 pb-12 overflow-x-clip">

        <div className="relative z-10 max-w-4xl mx-auto w-full space-y-6 sm:space-y-8 flex flex-col items-center">
          {/* Top Pill Tag */}
          <HeroFadeIn direction="down" delay={0.05} className="flex justify-center">
            <FloatingElement duration={4.5} distance={4}>
              <div className="relative inline-flex items-center justify-center">
                {/* Minimal Clean Glassmorphic Pill */}
                <span className="relative inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-1.5 text-xs font-bold text-slate-800 backdrop-blur-md backdrop-saturate-150 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] transition-transform hover:scale-[1.02]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0080ff] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#006097]" />
                  </span>
                  <span className="tracking-tight text-slate-800">
                    مسترکلاس ۱۰۰ روزه عکاسی و درآمد زایی
                  </span>
                </span>
              </div>
            </FloatingElement>
          </HeroFadeIn>

          {/* Mega Headline */}
          <div className="max-w-3xl mx-auto space-y-5">
            <HeroFadeIn direction="up" delay={0.1}>
              <h1 className="text-3xl font-black sm:text-5xl md:text-6xl tracking-tight leading-[1.15] text-slate-900">
                عکاسی را اصولی بیاموزید،{" "}
                <span className="text-[#006097] bg-clip-text">درآمد میلیونی</span> بسازید.
              </h1>
            </HeroFadeIn>

            <HeroFadeIn direction="up" delay={0.15}>
              <p className="text-xs sm:text-sm md:text-base font-medium text-slate-600 leading-relaxed max-w-2xl mx-auto">
                از شات‌های استودیویی و موبایلگرافی پیشرفته تا ادیت رنگ سینمایی و فرمول مذاکره با برندها برای عقد قراردادهای ۱۵ الی ۳۰ میلیون تومانی.
              </p>
            </HeroFadeIn>
          </div>

          {/* 1. Scroll-Down Cue Button (Top Position - Brand Blue) */}
          <HeroFadeIn direction="up" delay={0.2} className="flex justify-center pt-1">
            <a
              href="#details"
              className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-[#006097] px-8 text-sm font-black text-white shadow-[0_10px_28px_rgba(0,96,151,0.28)] hover:bg-[#056297] hover:scale-105 transition-all"
            >
              <span>مشاهده بیشتر</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white transition-all group-hover:bg-white/30">
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </div>
            </a>
          </HeroFadeIn>

          {/* 2. Direct Purchase Button & Live Capacity (Bottom Position - Vibrant Emerald Green) */}
          <HeroFadeIn direction="up" delay={0.25} className="space-y-3.5 max-w-md mx-auto pt-2 sm:pt-4 w-full">
            {isPurchased ? (
              <MotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href={`/jaramooz/courses/${course?.id}/play`}
                  className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-8 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all"
                >
                  <Play className="h-4 w-4 fill-current text-[#006097]" />
                  <span>ورود به دوره و پخش ویدیوها</span>
                </Link>
              </MotionDiv>
            ) : (
              <>
                <div className="flex items-center justify-center w-full">
                  {/* Direct Purchase Button in Green (Compact Style) */}
                  <div className="w-auto shrink-0">
                    <PurchaseButtonWrapper
                      courseId={course?.id || "photography-masterclass"}
                      isLoggedIn={!!session}
                      initialPhone={session?.phone ? phoneToLocalDisplay(session.phone) : ""}
                      customText="خرید مستقیم دوره"
                      variant="emerald"
                      className="h-9.5 sm:h-10 px-5 sm:px-6 rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.28)] text-xs font-black"
                    />
                  </div>
                </div>

                {/* Capacity Counter Badge (Clean Glassmorphic) */}
                <div className="flex items-center justify-center pt-1">
                  <div className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 text-[11px] font-bold text-slate-700 backdrop-blur-md backdrop-saturate-150 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span className="text-slate-600 font-medium">ظرفیت دوره با نظارت مدرس:</span>
                    <span className="rounded-md bg-emerald-500/15 border border-emerald-300/40 px-2 py-0.5 font-black text-emerald-900 inline-flex items-center gap-1">
                      <span>فقط</span>
                      <span className="text-emerald-800 font-black text-xs font-mono">
                        ۳
                      </span>
                      <span>نفر باقی‌مانده</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </HeroFadeIn>
        </div>

      </section>

      {/* Main Content Body */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 py-6 md:py-12 space-y-24 sm:space-y-32">

        {/* 2. SOCIAL PROOF & COLLABORATIONS SECTION */}
        <section id="details" className="scroll-mt-24 space-y-12 pt-2 sm:pt-4">
          {/* Social Proof & Rating Trust Bar + Compact Instructor Capsule */}
          <HeroTrustBar />

          {/* Collaborations & Influencers Showcase */}
          <CollaborationsShowcase />
        </section>

        {/* COMPARISON SECTION */}
        <section id="comparison" className="scroll-mt-24">
          <FadeIn duration={0.9} distance={24}>
            <BillowComparison />
          </FadeIn>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section id="calculator" className="scroll-mt-24">
          <FadeIn duration={0.9} distance={24}>
            <RoiCalculator />
          </FadeIn>
        </section>

        {/* INSTRUCTOR & PRICING BENTO */}
        <section id="instructor" className="relative scroll-mt-24">
          <FadeIn duration={0.95} distance={24}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
              {/* Seamless Soft Blue Cloud Halos behind Instructor & Pricing */}
              <div className="absolute -inset-x-12 -inset-y-16 -z-10 pointer-events-none overflow-visible">
                <div 
                  className="absolute -top-24 -left-20 w-[450px] sm:w-[650px] h-[350px] sm:h-[480px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(56,189,248,0.26) 0%, rgba(0,128,255,0.12) 35%, rgba(0,128,255,0.03) 55%, rgba(255,255,255,0) 70%)"
                  }}
                />
                <div 
                  className="absolute -top-20 -right-20 w-[450px] sm:w-[650px] h-[350px] sm:h-[480px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(34,211,238,0.24) 0%, rgba(56,189,248,0.12) 35%, rgba(56,189,248,0.03) 55%, rgba(255,255,255,0) 70%)"
                  }}
                />
              </div>
              
              {/* Instructor Bento (7 cols) */}
              <div className="lg:col-span-7 rounded-[28px] border border-slate-200/80 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-4">
                  <Award className="h-5 w-5 text-[#006097]" />
                  <h2 className="text-base font-bold text-slate-900">مدرس مسترکلاس کیست؟</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-[#006097]/30 shadow-md relative group">
                    <img
                      src="/jaramooz/instructor.jpg"
                      alt="کوروش چنان عکاس و مدرس مسترکلاس عکاسی جارآموز"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">کوروش چنان</h3>
                      <span className="text-xs font-semibold text-[#006097]">کارآفرین، بنیان‌گذار اکوسیستم «جار» و «جارآموز» و عکاس تجاری</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500 font-medium">
                      با بیش از ۷ سال تجربه در تلفیق عکاسی تبلیغاتی و دیجیتال مارکتینگ، مجری پروژه‌های صنعتی برندهایی نظیر دیجی‌کالا و همکار بصری چهره‌های مطرح دیجیتال. تفاوت این مسترکلاس با دوره‌های رایج در این است که از دل اکوسیستم «جار» با سابقه اجرای بیش از ۲,۰۰۰ پروژه در سراسر ایران متولد شده؛ هدف فقط آموزش تکنیک نیست، بلکه ساخت متخصصانی است که مستقیماً وارد جریان سفارش‌های تجاری کشور شوند.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                    <span className="block font-black text-slate-800 text-sm font-mono">+۲,۰۰۰</span>
                    <span className="text-[10px] text-slate-500">پروژه اجرایی در سراسر کشور</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                    <span className="block font-black text-[#006097] text-sm font-mono">۷ سال</span>
                    <span className="text-[10px] text-slate-500">سابقه عکاسی تجاری و مارکتینگ</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                    <span className="block font-black text-emerald-600 text-sm font-mono">۱۰۰٪</span>
                    <span className="text-[10px] text-slate-500">اتصال به شبکه کارفرمایان جار</span>
                  </div>
                </div>
              </div>

              {/* Pricing & Checkout Bento (5 cols) */}
              <div className="lg:col-span-5 rounded-[28px] border border-[#006097]/30 bg-gradient-to-b from-white/90 to-white/60 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-[#006097]/5 space-y-6 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                  <div>
                    <span className="block text-[11px] text-slate-400">مبلغ سرمایه‌گذاری دوره</span>
                    <span className="block text-2xl font-black text-[#006097] tracking-tight">
                      {formatPrice(course?.price || 0)}
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-extrabold px-3 py-1 border border-emerald-500/20">
                    دسترسی مادام‌العمر
                  </span>
                </div>

                {isPurchased ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-center text-xs font-bold text-emerald-700">
                      شما در این دوره ثبت‌نام کرده‌اید.
                    </div>
                    <Link
                      href={`/jaramooz/courses/${course?.id}/play`}
                      className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-md"
                    >
                      <Play className="h-4 w-4 fill-current text-[#006097]" />
                      شروع تماشای ویدیوها
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <PurchaseButtonWrapper
                      courseId={course?.id || "photography-masterclass"}
                      isLoggedIn={!!session}
                      initialPhone={session?.phone ? phoneToLocalDisplay(session.phone) : ""}
                      customText="ثبت‌نام و خرید مسترکلاس"
                      className="h-12 w-full rounded-xl shadow-md text-sm font-extrabold"
                    />

                    {/* 100% Money-Back Guarantee Card */}
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-1 text-right shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>ضمانت بی‌قیدوشرط بازگشت ۱۰۰٪ وجه تا ۷ روز</span>
                      </div>
                      <p className="text-[11px] text-emerald-700/90 leading-relaxed font-medium">
                        اگر تا ۷ روز پس از مشاهده جلسات احساس کردید دوره مناسب شما نبوده، تمام شهریه بدون هیچ سوالی مسترد خواهد شد.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 text-center">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>پرداخت امن شتابی با تمام کارت‌ها + فعالسازی آنی پنل</span>
                    </div>

                    {/* Trust Badges Enamad & Zarinpal */}
                    <div className="pt-2 flex items-center justify-center gap-3">
                      {/* Enamad */}
                      <div className="flex items-center justify-center p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs w-16 h-16 overflow-hidden">
                        <a referrerPolicy="origin" target="_blank" rel="noopener noreferrer" href="https://trustseal.enamad.ir/?id=605631&Code=lsFMGOxtiarWs5AO2WLcTmK8Cxt1RmsS">
                          <img 
                            referrerPolicy="origin" 
                            src="https://trustseal.enamad.ir/logo.aspx?id=605631&Code=lsFMGOxtiarWs5AO2WLcTmK8Cxt1RmsS" 
                            alt="نماد اعتماد الکترونیکی جار" 
                            style={{ cursor: 'pointer' }} 
                            width={100}
                            height={100}
                            className="w-12 h-12 object-contain"
                          />
                        </a>
                      </div>

                      {/* Zarinpal */}
                      <div className="flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs w-16 h-16">
                        <svg viewBox="0 0 64 64" className="w-8 h-8">
                          <circle cx="32" cy="32" r="30" fill="#FFC72C" fillOpacity="0.1" />
                          <path
                            d="M32 10C32 10 46 15 46 26C46 38 32 48 32 48C32 48 18 38 18 26C18 15 32 10 32 10Z"
                            fill="none"
                            stroke="#FFC72C"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M25 26.5L30 31.5L39 21.5"
                            fill="none"
                            stroke="#FFC72C"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[8px] font-black text-slate-500">درگاه امن</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="scroll-mt-24">
          <FadeIn duration={0.9} distance={24}>
            <BillowFAQ />
          </FadeIn>
        </section>

      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200/80 bg-white/60 backdrop-blur-md py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <JaramoozLogo className="w-5 h-5" />
            <span className="font-extrabold text-slate-700">آکادمی تخصصی جارآموز</span>
          </div>
          <span>تمامی حقوق مادی و معنوی محفوظ است © ۲۰۲۶</span>
        </div>
      </footer>

      {/* Continuous Floating Sticky Conversion Bar for Both Desktop & Mobile */}
      <FloatingStickyCta
        courseId={course?.id || "photography-masterclass"}
        isPurchased={isPurchased}
        isLoggedIn={!!session}
        phone={session?.phone ? phoneToLocalDisplay(session.phone) : ""}
        price={course?.price || 9100000}
        formattedPrice={formatPrice(course?.price || 9100000)}
      />

    </main>
  );
}
