"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search,
  Check,
  Sparkles,
  Camera,
  Film,
  Layers,
  // 17 Personal Categories (Preserved for backwards compatibility with CATEGORY_ICON_MAP)
  Heart,
  PartyPopper,
  ScrollText,
  Smile,
  Users,
  Baby,
  CalendarHeart,
  Sprout,
  ScanFace,
  Gift,
  Stethoscope,
  PawPrint,
  GraduationCap,
  MoonStar,
  Dumbbell,
  Palette,
  // 17 Commercial Categories
  LayoutGrid,
  Clock,
  Package,
  Clapperboard,
  Smartphone,
  Gem,
  Shirt,
  Briefcase,
  Presentation,
  Mic2,
  MonitorPlay,
  Utensils,
  Building,
  Factory,
  Landmark,
  Trophy,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import {
  ALL_CATEGORIES,
  PERSONAL_CATEGORIES,
  COMMERCIAL_CATEGORIES,
  ServiceCategory,
} from "@/lib/categories";
import { CATEGORY_VISUAL_MAP } from "./categoryVisualData";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // ۱۷ دسته‌بندی شخصی و مراسم
  "wedding-ceremony": Heart,
  "birthday-party": PartyPopper,
  "wedding-contract-video": ScrollText,
  "wedding-ceremony-video": Film,
  "kids": Smile,
  "family": Users,
  "newborn": Baby,
  "couple-anniversary": CalendarHeart,
  "pregnancy": Sprout,
  "portrait-avatar": ScanFace,
  "gender-reveal": Gift,
  "birth-hospital": Stethoscope,
  "pets": PawPrint,
  "graduation": GraduationCap,
  "personal-religious": MoonStar,
  "personal-sports": Dumbbell,
  "personal-other": Palette,

  // ۱۷ دسته‌بندی تجاری و کسب‌وکار
  "commercial-arrangement": LayoutGrid,
  "hourly-daily-video": Clock,
  "industrial-white-bg": Package,
  "commercial-teaser-video": Clapperboard,
  "instagram-reels-video": Smartphone,
  "jewelry": Gem,
  "modeling": Shirt,
  "corporate-portrait": Briefcase,
  "events-video": Presentation,
  "events-photo": Mic2,
  "course-recording": MonitorPlay,
  "food-beverage": Utensils,
  "architecture-interior": Building,
  "production-line": Factory,
  "commercial-religious": Landmark,
  "commercial-sports": Trophy,
  "commercial-other": Shapes,
};

export function CategoryIcon({
  slug,
  className = "w-5 h-5",
  strokeWidth = 1.75,
}: {
  slug: string;
  className?: string;
  strokeWidth?: number;
}) {
  const IconComponent: LucideIcon = CATEGORY_ICON_MAP[slug] || Sparkles;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}

interface StepCategoryProps {
  selectedSlug: string;
  onSelectSlug: (slug: string) => void;
}

function CategoryThumbnail({
  src,
  alt,
  aspectClass = "aspect-[16/10]",
  badge,
  mediaType,
}: {
  src: string;
  alt: string;
  aspectClass?: string;
  badge?: string;
  mediaType?: "IMAGE" | "VIDEO" | "ALL";
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs`}>
      {/* Skeleton Shimmer */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/60 via-slate-100/30 to-slate-200/60 animate-pulse z-0" />
      )}

      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <Camera className="w-8 h-8 text-slate-400" />
        </div>
      )}

      {/* Cinematic dark-to-transparent overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent opacity-75 group-hover:opacity-55 transition-opacity" />

      {/* Floating Badges */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
        {badge ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-jar-logo/10 border border-jar-logo/20 text-[10px] font-bold text-jar-logo shadow-none">
            <Sparkles className="w-3 h-3 text-jar-logo" />
            <span>{badge}</span>
          </span>
        ) : (
          <span />
        )}

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-primary/60 backdrop-blur-md text-[10px] font-bold text-white/90">
          {mediaType === "VIDEO" ? (
            <>
              <Film className="w-3 h-3 text-white/80" />
              <span>ویدیو</span>
            </>
          ) : mediaType === "ALL" ? (
            <>
              <Layers className="w-3 h-3 text-white/80" />
              <span>عکس و ویدیو</span>
            </>
          ) : (
            <>
              <Camera className="w-3 h-3 text-white/80" />
              <span>عکاسی</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function StepCategory({
  selectedSlug,
  onSelectSlug,
}: StepCategoryProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "PERSONAL" | "COMMERCIAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    let list: ServiceCategory[] = ALL_CATEGORIES;
    if (activeTab === "PERSONAL") list = PERSONAL_CATEGORIES;
    if (activeTab === "COMMERCIAL") list = COMMERCIAL_CATEGORIES;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (cat) => cat.title.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery]);

  return (
    <div className="relative space-y-6" dir="rtl">
      {/* Editorial Header with Clean Minimal Badge and Display Typography */}
      <div className="relative space-y-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jar-surface border border-jar-border text-jar-muted text-xs font-bold shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jar-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-jar-primary" />
          </span>
          <span>گام اول • انتخاب تخصص و سبک کاری</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-jar-primary tracking-tight leading-tight">
            چه نوع پروژه‌ای در پیش دارید؟
          </h1>
          <p className="text-xs sm:text-sm text-jar-muted font-medium leading-relaxed max-w-2xl">
            دسته‌بندی مدنظرتان را انتخاب کنید تا مرتبط‌ترین و مجرب‌ترین متخصصین جار برای پروژه شما فراخوان شوند.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Search Input with Clean Warm Border & Crisp White Canvas */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی شاخه تخصصی (عقد، پرتره، تیزر، مدلینگ...)"
            className="w-full h-12 sm:h-13 pr-10 sm:pr-11 pl-20 sm:pl-24 rounded-xl border border-jar-border bg-jar-surface text-xs sm:text-sm font-medium text-jar-primary placeholder:text-[#A8A29A] outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-none"
          />
          <Search className="absolute right-3.5 sm:right-4 h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#A8A29A] pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 sm:left-3.5 flex h-7 px-3 items-center justify-center rounded-full bg-jar-canvas hover:bg-jar-border/50 text-jar-primary border border-jar-border text-[11px] font-bold transition-colors cursor-pointer"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Responsive Category Segmented Tabs (Claude Light Editorial Style) */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-jar-border/40 border border-jar-border shadow-2xs w-full">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`w-full py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "ALL"
                ? "bg-jar-surface text-jar-primary shadow-2xs font-bold border border-jar-border"
                : "text-jar-muted hover:text-jar-primary hover:bg-jar-surface/50 font-bold"
            }`}
          >
            <span className="text-[11px] sm:text-xs tracking-tight truncate">
              همه <span className="hidden sm:inline">خدمات</span>
            </span>
            <span
              className={`text-[10px] sm:text-xs font-mono shrink-0 ${
                activeTab === "ALL" ? "text-jar-primary font-bold" : "text-[#A8A29A]"
              }`}
            >
              ({ALL_CATEGORIES.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PERSONAL")}
            className={`w-full py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "PERSONAL"
                ? "bg-jar-surface text-jar-primary shadow-2xs font-bold border border-jar-border"
                : "text-jar-muted hover:text-jar-primary hover:bg-jar-surface/50 font-bold"
            }`}
          >
            <span className="text-[11px] sm:text-xs tracking-tight truncate">
              شخصی <span className="hidden sm:inline">و مراسم</span>
            </span>
            <span
              className={`text-[10px] sm:text-xs font-mono shrink-0 ${
                activeTab === "PERSONAL" ? "text-jar-primary font-bold" : "text-[#A8A29A]"
              }`}
            >
              ({PERSONAL_CATEGORIES.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMMERCIAL")}
            className={`w-full py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "COMMERCIAL"
                ? "bg-jar-surface text-jar-primary shadow-2xs font-bold border border-jar-border"
                : "text-jar-muted hover:text-jar-primary hover:bg-jar-surface/50 font-bold"
            }`}
          >
            <span className="text-[11px] sm:text-xs tracking-tight truncate">
              تجاری <span className="hidden sm:inline">و کسب‌وکار</span>
            </span>
            <span
              className={`text-[10px] sm:text-xs font-mono shrink-0 ${
                activeTab === "COMMERCIAL" ? "text-jar-primary font-bold" : "text-[#A8A29A]"
              }`}
            >
              ({COMMERCIAL_CATEGORIES.length})
            </span>
          </button>
        </div>
      </div>

      {/* Responsive Category Grid: Symmetrical Layout, Photographic Thumbnails & Rich Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-16 px-4 text-center rounded-3xl border border-dashed border-jar-border bg-jar-surface space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-jar-canvas text-jar-muted">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="text-base font-black text-jar-primary">هیچ دسته‌بندی با عنوان «{searchQuery}» یافت نشد</h3>
            <p className="text-xs text-jar-muted max-w-sm mx-auto">
              می‌توانید عبارت دیگری را جستجو کنید یا از دسته‌بندی «عکاسی غیره» برای پروژه‌های اختصاصی استفاده فرمایید.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-jar-primary text-white text-xs font-medium hover:bg-jar-primaryHover transition-colors cursor-pointer shadow-none"
            >
              <span>نمایش همه خدمات</span>
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isSelected = selectedSlug === cat.slug;
            const visual = CATEGORY_VISUAL_MAP[cat.slug] || {
              imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=600&auto=format&fit=crop",
              tag: "خدمات تخصصی تصویربرداری و عکاسی",
            };

            return (
              <motion.button
                key={cat.slug}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelectSlug(cat.slug)}
                className={`group relative text-right transition-all duration-200 cursor-pointer w-full rounded-2xl overflow-hidden p-3 sm:p-3.5 flex flex-col justify-between col-span-1 bg-jar-surface ${
                  isSelected
                    ? "border-2 border-jar-primary text-jar-primary shadow-xs"
                    : "border border-jar-border text-jar-primary hover:border-jar-primary/40"
                }`}
              >
                {/* Visual Thumbnail */}
                <CategoryThumbnail
                  src={visual.imageUrl}
                  alt={cat.title}
                  aspectClass="aspect-[16/10]"
                  badge={visual.badge}
                  mediaType={cat.mediaType}
                />

                {/* Card Body & Typography */}
                <div className="pt-3 pb-1 flex items-start justify-between gap-3 w-full">
                  <div className="space-y-1 min-w-0 flex-1 text-right">
                    <h3 className="font-bold text-xs sm:text-sm text-jar-primary tracking-tight truncate block">
                      {cat.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed block line-clamp-2 text-jar-muted font-normal">
                      {visual.tag}
                    </p>
                  </div>

                  {/* Selection Indicator Checkmark */}
                  <div className="shrink-0 mt-0.5">
                    {isSelected ? (
                      <div className="flex h-5 w-5 rounded-full bg-jar-primary text-white items-center justify-center shadow-none">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-jar-border bg-jar-surface group-hover:border-jar-primary/40 transition-colors" />
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
