"use client";

import React, { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  PartyPopper,
  Video,
  Film,
  Smile,
  Users,
  Baby,
  Sparkles,
  HeartHandshake,
  User,
  Gift,
  Building2,
  Utensils,
  ShoppingBag,
  Cpu,
  Layers,
  GraduationCap,
  Gem,
  Palette,
  Briefcase,
  Store,
  Shirt,
  Flame,
  Factory,
  Check,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  Plus,
  Clock,
  Loader2,
  Trash2,
  Eye,
  Play,
  Camera,
  ArrowLeft,
  Lock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  PERSONAL_CATEGORIES,
  COMMERCIAL_CATEGORIES,
  CATEGORIES_BY_SLUG,
  CategoryType,
  ServiceCategory,
} from "@/lib/categories";
import {
  PortfolioItemData,
  updateSpecialistCategories,
  uploadPortfolioItem,
  deletePortfolioItem,
  publishSpecialistProfile,
} from "@/app/actions/specialistPortfolioActions";
import { CATEGORY_ICON_MAP } from "@/components/order/steps/StepCategory";
import {
  processSinglePortfolioFile,
  isVideoFile,
  isImageFile,
  MAX_IMAGE_RAW_SIZE_BYTES,
  MAX_VIDEO_RAW_SIZE_BYTES,
} from "@/lib/clientImageCompression";
import { NdaModal } from "./NdaModal";

const ICON_MAP: Record<string, React.ElementType> = {
  Heart,
  PartyPopper,
  Video,
  Film,
  Smile,
  Users,
  Baby,
  Sparkles,
  HeartHandshake,
  User,
  Gift,
  Building2,
  Utensils,
  ShoppingBag,
  Cpu,
  Layers,
  GraduationCap,
  Gem,
  Palette,
  Briefcase,
  Store,
  Shirt,
  Flame,
  Factory,
  Camera,
};

function getCategoryIcon(iconName?: string) {
  if (!iconName) return Camera;
  return ICON_MAP[iconName] || Camera;
}

interface Props {
  initialSelectedCategories: string[];
  initialPortfolioItems: PortfolioItemData[];
  initialAgreedToTerms?: boolean;
}

export default function SpecialistPortfolioManager({
  initialSelectedCategories,
  initialPortfolioItems,
  initialAgreedToTerms,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CategoryType>("PERSONAL");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSelectedCategories);
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(initialAgreedToTerms));
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [requirementWarning, setRequirementWarning] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<{
    redirect: string | null;
    message: string | null;
  } | null>(null);

  // The bar Jar actually holds specialists to: one specialty they can be shown
  // for. Asking for three full categories up front locked people out of the
  // panel with fifty approved shots sitting in one of them.
  const MIN_CATEGORIES = 1;
  const MIN_ITEMS_PER_CATEGORY = 10;

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemData[]>(initialPortfolioItems);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>(
    initialSelectedCategories[0] || "wedding-ceremony"
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PortfolioItemData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group portfolio items by category slug
  const itemsByCategory = useMemo(() => {
    const map: Record<string, PortfolioItemData[]> = {};
    for (const item of portfolioItems) {
      if (!map[item.categorySlug]) {
        map[item.categorySlug] = [];
      }
      map[item.categorySlug].push(item);
    }
    return map;
  }, [portfolioItems]);

  const totalContent = portfolioItems.length;

  // Validation: Every selected category must have at least 10 items
  const incompleteCategories = useMemo(() => {
    return selectedSlugs
      .map((slug) => ({
        slug,
        title: CATEGORIES_BY_SLUG[slug]?.title || slug,
        count: itemsByCategory[slug]?.length || 0,
      }))
      .filter((c) => c.count < MIN_ITEMS_PER_CATEGORY);
  }, [selectedSlugs, itemsByCategory]);

  const fulfilledCategories = useMemo(
    () => selectedSlugs.filter((slug) => (itemsByCategory[slug]?.length || 0) >= MIN_ITEMS_PER_CATEGORY),
    [selectedSlugs, itemsByCategory]
  );

  const isEveryCategoryFulfilled = fulfilledCategories.length >= MIN_CATEGORIES;

  // Progress percentage calculation
  const overallProgressPercent = useMemo(() => {
    if (selectedSlugs.length === 0) return 0;
    const best = Math.max(
      ...selectedSlugs.map((slug) => itemsByCategory[slug]?.length || 0)
    );
    return Math.min(100, Math.round((best / MIN_ITEMS_PER_CATEGORY) * 100));
  }, [selectedSlugs, itemsByCategory]);

  const isReadyToSubmit = isEveryCategoryFulfilled && agreedToTerms;

  // Toggle or uncheck category freely with auto-save
  const handleToggleCategory = (slug: string) => {
    const exists = selectedSlugs.includes(slug);

    const updated = exists
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug];

    setSelectedSlugs(updated);
    setRequirementWarning(null);

    // If added, set as active studio category
    if (!exists) {
      setActiveCategorySlug(slug);
    } else if (activeCategorySlug === slug && updated.length > 0) {
      setActiveCategorySlug(updated[0]);
    }

    // Auto-save to server
    startSaveTransition(async () => {
      await updateSpecialistCategories(updated);
    });
  };

  // Final confirmation and publish handler
  const handleFinalPublish = async () => {
    if (!isEveryCategoryFulfilled) {
      if (selectedSlugs.length === 0) {
        setRequirementWarning("ابتدا حداقل یک شاخه تخصصی را انتخاب کنید.");
      } else {
        const details = incompleteCategories
          .map((c) => `«${c.title}» (${c.count}/۱۰ فایل)`)
          .join("، ");

        setRequirementWarning(
          `برای ارسال پرونده باید حداقل یک شاخه تخصصی با ۱۰ نمونه‌کار کامل داشته باشید. وضعیت فعلی: ${details}`
        );
      }
      setTimeout(() => setRequirementWarning(null), 7000);
      return;
    }

    if (!agreedToTerms) {
      setRequirementWarning(
        "برای ارسال پرونده، پذیرش تعهدنامه حفظ محرمانگی و عدم انتشار تصاویر خصوصی کارفرمایان الزامی است."
      );
      setTimeout(() => setRequirementWarning(null), 7000);
      return;
    }

    setIsPublishing(true);
    setRequirementWarning(null);

    try {
      const res = await publishSpecialistProfile(agreedToTerms);
      if (res.success) {
        setSubmitOutcome({
          redirect: res.redirect ?? null,
          message: res.message ?? null,
        });
        setShowSuccessModal(true);
      } else {
        setRequirementWarning(res.error || "خطا در ارسال پرونده برای بررسی.");
        setTimeout(() => setRequirementWarning(null), 7000);
      }
    } catch (err: any) {
      setRequirementWarning(err?.message || "خطای ارتباطی با سرور.");
      setTimeout(() => setRequirementWarning(null), 6000);
    } finally {
      setIsPublishing(false);
    }
  };

  // Upload handler with sequential processing and strict MIME-based rules
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgressText("در حال اعتبارسنجی فایل‌ها...");
    setUploadProgressPercent(5);

    const categoryDef = CATEGORIES_BY_SLUG[activeCategorySlug];
    if (!categoryDef) {
      setIsUploading(false);
      return;
    }

    const fileList = Array.from(files);

    // 1. Pre-validation loop: enforce 40MB for videos and 25MB for images
    for (const file of fileList) {
      if (isVideoFile(file)) {
        if (file.size > MAX_VIDEO_RAW_SIZE_BYTES) {
          setUploadError(`حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد (فایل: «${file.name}»).`);
          setIsUploading(false);
          setUploadProgressText(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } else if (isImageFile(file)) {
        if (file.size > MAX_IMAGE_RAW_SIZE_BYTES) {
          setUploadError(`حجم تصویر خام نباید بیشتر از ۲۵ مگابایت باشد (فایل: «${file.name}»).`);
          setIsUploading(false);
          setUploadProgressText(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }
    }

    // Ensure category is in selectedSlugs
    if (!selectedSlugs.includes(activeCategorySlug)) {
      const updated = [...selectedSlugs, activeCategorySlug];
      setSelectedSlugs(updated);
      updateSpecialistCategories(updated);
    }

    try {
      const total = fileList.length;
      let currentIndex = 0;

      // 2. Sequential processing loop (for...of) to protect mobile RAM and Safari from crashing
      for (const file of fileList) {
        setUploadProgressText(
          isVideoFile(file)
            ? `در حال آماده‌سازی ویدیو (${currentIndex + 1} از ${total})...`
            : `در حال بهینه‌سازی فایل ${currentIndex + 1} از ${total}...`
        );
        setUploadProgressPercent(Math.round(((currentIndex + 0.3) / total) * 100));

        const processedFile = await processSinglePortfolioFile(
          file,
          currentIndex,
          total,
          (statusText) => setUploadProgressText(statusText)
        );

        setUploadProgressText(`در حال ارسال فایل ${currentIndex + 1} از ${total} به سرور...`);
        setUploadProgressPercent(Math.round(((currentIndex + 0.7) / total) * 100));

        const formData = new FormData();
        formData.append("file", processedFile);
        formData.append("categorySlug", activeCategorySlug);

        const res = await uploadPortfolioItem(formData);
        if (res.success && res.item) {
          setPortfolioItems((prev) => [res.item!, ...prev]);
        } else {
          setUploadError(res.error || `خطا در آپلود فایل «${file.name}».`);
        }

        currentIndex++;
        setUploadProgressPercent(Math.round((currentIndex / total) * 100));
      }
    } catch (err: any) {
      setUploadError(err?.message || "خطای ارتباطی در بهینه‌سازی و آپلود فایل.");
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
      setUploadProgressPercent(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    setPortfolioItems((prev) => prev.filter((item) => item.id !== itemId));
    if (previewMedia?.id === itemId) {
      setPreviewMedia(null);
    }

    try {
      await deletePortfolioItem(itemId);
    } catch {
      // Revert if error
    }
  };

  const currentCategoryList =
    activeTab === "PERSONAL" ? PERSONAL_CATEGORIES : COMMERCIAL_CATEGORIES;

  // Selected categories definitions for studio tabs
  const selectedCategoriesList = useMemo(() => {
    return selectedSlugs
      .map((slug) => CATEGORIES_BY_SLUG[slug])
      .filter((c): c is ServiceCategory => Boolean(c));
  }, [selectedSlugs]);

  const activeCategory = CATEGORIES_BY_SLUG[activeCategorySlug] || selectedCategoriesList[0];
  const activeItems = activeCategorySlug ? itemsByCategory[activeCategorySlug] || [] : [];
  const activeCount = activeItems.length;
  const isActiveFulfilled = activeCount >= MIN_ITEMS_PER_CATEGORY;
  const activeRemaining = Math.max(0, MIN_ITEMS_PER_CATEGORY - activeCount);
  const activePercent = Math.min(100, Math.round((activeCount / MIN_ITEMS_PER_CATEGORY) * 100));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-20" dir="rtl">
      
      {/* 1. Sleek Floating / Sticky Progress Bar */}
      <div className="sticky top-20 z-40">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl sm:rounded-full border border-jar-border bg-jar-surface/90 px-4 sm:px-6 py-2.5 sm:py-3 backdrop-blur-xl shadow-xs">
          
          {/* Status Metric */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${
                  isEveryCategoryFulfilled
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "bg-jar-logo animate-pulse"
                }`}
              />
              <span className="text-xs font-bold text-jar-primary truncate">
                {isEveryCategoryFulfilled ? (
                  <>
                    پرونده آماده ارسال برای بررسی است
                    <span className="hidden sm:inline text-emerald-700 font-bold mr-1.5">
                      ({fulfilledCategories.length} شاخه کامل)
                    </span>
                  </>
                ) : selectedSlugs.length === 0 ? (
                  "یک شاخه تخصصی انتخاب کنید"
                ) : (
                  <>
                    <span className="font-mono">{overallProgressPercent}</span>٪ تا تکمیل اولین شاخه
                    <span className="hidden sm:inline text-jar-logo font-bold mr-1.5">
                      (۱۰ فایل در یک شاخه کافی است)
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Mini Inline Progress Bar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-2 w-16 sm:w-28 overflow-hidden rounded-full bg-jar-canvas border border-jar-border/60">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isEveryCategoryFulfilled ? "bg-emerald-500" : "bg-jar-primary"
                  }`}
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] font-bold text-jar-muted">
                {overallProgressPercent}٪
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleFinalPublish}
            disabled={isPublishing}
            title={
              !isEveryCategoryFulfilled
                ? "برای ارسال پرونده، حداقل یک شاخه تخصصی با ۱۰ نمونه‌کار لازم است."
                : !agreedToTerms
                ? "برای ارسال پرونده، تیک پذیرش تعهدنامه حفظ محرمانگی اطلاعات را فعال کنید."
                : "ارسال پرونده برای بررسی کارشناسان جار"
            }
            className={`w-full sm:w-auto inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-xs font-medium transition-colors cursor-pointer ${
              isReadyToSubmit
                ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                : "bg-jar-canvas text-jar-muted border border-jar-border hover:bg-jar-soft hover:text-jar-primary"
            }`}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>در حال ارسال...</span>
              </>
            ) : isReadyToSubmit ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>ارسال پرونده برای بررسی</span>
              </>
            ) : !isEveryCategoryFulfilled ? (
              <>
                <Lock className="h-3 w-3" />
                <span>ارسال پرونده (الزامات ناقص)</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                <span>تایید تعهدنامه الزامی است</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* 2. NDA & Confidentiality Terms Card */}
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <input
              id="specialist-nda-checkbox"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                setRequirementWarning(null);
              }}
              className="mt-0.5 sm:mt-1 h-4 w-4 shrink-0 rounded border-jar-border text-jar-primary focus:ring-jar-primary cursor-pointer"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="specialist-nda-checkbox"
                className="text-xs sm:text-sm font-bold text-jar-primary cursor-pointer select-none leading-relaxed"
              >
                کلیه قوانین کاری و تعهدنامه حفظ محرمانگی اطلاعات و عدم انتشار تصاویر خصوصی کارفرمایان را می‌پذیرم.
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => setShowNdaModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-jar-logo hover:underline cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-jar-logo" />
                  <span>مشاهده متن کامل تعهدنامه عدم انتشار فایل‌های خصوصی و حفظ حریم شخصی (NDA)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="self-end sm:self-center shrink-0">
            {agreedToTerms ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>تعهدنامه پذیرفته شد</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-jar-canvas border border-jar-border px-3 py-1 text-[11px] font-bold text-jar-logo">
                <span>تایید تعهدنامه الزامی است</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Warning Toast */}
      {requirementWarning && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-white border border-amber-400/80 px-5 py-3 shadow-2xl backdrop-blur-md text-xs font-bold animate-in fade-in duration-200 max-w-md text-center">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{requirementWarning}</span>
          <button
            onClick={() => setRequirementWarning(null)}
            className="mr-auto text-slate-400 hover:text-white p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Category Selector Pills */}
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 backdrop-blur-xl shadow-xs space-y-4">
        
        {/* Header & Segmented Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-jar-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-jar-primary">
                تخصص‌های شما
              </h2>
              <span className="rounded-full bg-jar-canvas border border-jar-border px-2.5 py-0.5 text-[11px] font-medium text-jar-muted">
                {selectedSlugs.length} شاخه انتخاب شده
              </span>
            </div>
            <p className="text-xs text-jar-muted mt-0.5 font-medium">
              برای افزودن یا لغو هر شاخه، روی تگ آن کلیک کنید (برای ارسال پرونده، یک شاخه با ۱۰ نمونه‌کار کافی است).
            </p>
          </div>

          {/* Segmented Control Switcher */}
          <div className="flex w-full sm:w-auto rounded-full bg-jar-canvas p-1 border border-jar-border">
            <button
              type="button"
              onClick={() => setActiveTab("PERSONAL")}
              className={`flex-1 sm:flex-initial text-center rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                activeTab === "PERSONAL"
                  ? "bg-jar-surface text-jar-primary shadow-xs"
                  : "text-jar-muted hover:text-jar-primary"
              }`}
            >
              شخصی ({PERSONAL_CATEGORIES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("COMMERCIAL")}
              className={`flex-1 sm:flex-initial text-center rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                activeTab === "COMMERCIAL"
                  ? "bg-jar-surface text-jar-primary shadow-xs"
                  : "text-jar-muted hover:text-jar-primary"
              }`}
            >
              تجاری ({COMMERCIAL_CATEGORIES.length})
            </button>
          </div>
        </div>

        {/* The Pills Grid */}
        <div className="flex flex-wrap gap-2 pt-1">
          {currentCategoryList.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat.slug] || getCategoryIcon(cat.iconName);
            const isSelected = selectedSlugs.includes(cat.slug);
            const count = itemsByCategory[cat.slug]?.length || 0;
            const isCompleted = count >= MIN_ITEMS_PER_CATEGORY;

            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => handleToggleCategory(cat.slug)}
                className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer select-none ${
                  isSelected
                    ? "bg-jar-primary text-white shadow-xs hover:bg-jar-primaryHover"
                    : "border border-jar-border bg-jar-surface text-jar-primary hover:bg-jar-soft"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-jar-logo" : "text-jar-muted"}`} />
                <span>{cat.title}</span>

                {/* Status Indicator */}
                {isSelected ? (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.2 text-[10px] font-mono font-bold ${
                      isCompleted
                        ? "bg-emerald-500/25 text-emerald-300"
                        : "bg-jar-logo/30 text-jar-logo"
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>{count}</span>
                      </>
                    ) : (
                      <span>{count}/۱۰</span>
                    )}
                  </span>
                ) : (
                  <Plus className="h-3 w-3 text-jar-muted opacity-60 group-hover:opacity-100" />
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. Studio Workspace (Only for Selected Categories) */}
      <div className="space-y-4">
        
        {selectedCategoriesList.length === 0 ? (
          /* Empty State */
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/60 p-10 text-center space-y-3">
            <Camera className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">
              هنوز تخصص فعالی انتخاب نشده است
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              برای فعال‌شدن استودیوی آپلود، حداقل یک تخصص را از بخش تگ‌های بالا انتخاب کنید.
            </p>
          </div>
        ) : (
          <>
            {/* Horizontal Segmented Tabs for Active Categories ONLY */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {selectedCategoriesList.map((cat) => {
                const Icon = CATEGORY_ICON_MAP[cat.slug] || getCategoryIcon(cat.iconName);
                const isActive = activeCategorySlug === cat.slug;
                const count = itemsByCategory[cat.slug]?.length || 0;
                const isCompleted = count >= MIN_ITEMS_PER_CATEGORY;

                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setActiveCategorySlug(cat.slug)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-jar-primary text-white shadow-xs"
                        : "border border-jar-border bg-jar-surface text-jar-muted hover:text-jar-primary hover:bg-jar-soft"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.title}</span>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.2 text-[10px] font-mono font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-jar-canvas text-jar-muted border border-jar-border"
                      }`}
                    >
                      {isCompleted && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      <span>{count}/۱۰</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Active Studio Container */}
            {activeCategory && (
              <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 backdrop-blur-xl shadow-xs space-y-5">
                
                {/* Studio Mini Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-jar-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-jar-primary">
                        {activeCategory.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isActiveFulfilled
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-jar-canvas text-jar-primary border-jar-border"
                        }`}
                      >
                        {isActiveFulfilled ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>تکمیل شده ({activeCount} فایل)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-jar-logo" />
                            <span>{activeCount}/۱۰ نمونه‌کار — {activeRemaining} فایل دیگر لازم است</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-jar-muted">
                      {activeCategory.mediaType === "VIDEO"
                        ? "فرمت‌های ویدیویی (MP4, MOV, WebM) — حداکثر ۴۰ مگابایت"
                        : "عکس و تصویر (تبدیل خودکار به WebP زیر ۷۰۰KB) — حداکثر ۲۵ مگابایت"}
                    </p>
                  </div>

                  {/* Top Actions: Add & Uncheck */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(activeCategory.slug)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-jar-border bg-jar-surface hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-3 text-xs font-medium text-jar-muted transition-colors cursor-pointer"
                      title="لغو انتخاب این شاخه"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>لغو تخصص</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-jar-primary px-4 text-xs font-medium text-white shadow-none hover:bg-jar-primaryHover transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>در حال آپلود...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>افزودن فایل</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={
                    activeCategory.mediaType === "VIDEO"
                      ? "video/mp4,video/quicktime,video/webm"
                      : activeCategory.mediaType === "ALL"
                      ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                      : "image/jpeg,image/png,image/webp"
                  }
                  className="hidden"
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />

                {/* Upload Error Banner */}
                {uploadError && (
                  <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Live Upload Progress Indicator */}
                {isUploading && (
                  <div className="rounded-2xl border border-jar-border bg-jar-canvas p-3.5 shadow-xs animate-in fade-in space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-jar-primary">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-jar-primary" />
                        <span>{uploadProgressText || "در حال پردازش..."}</span>
                      </div>
                      <span className="font-mono font-black">{uploadProgressPercent}٪</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-jar-border">
                      <div
                        className="h-full bg-jar-primary transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Clean Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleUploadFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-7 px-4 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-jar-logo bg-jar-soft/80"
                      : "border-jar-border bg-jar-canvas hover:border-jar-logo hover:bg-jar-soft/40"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jar-surface border border-jar-border shadow-xs text-jar-logo transition-transform group-hover:scale-105">
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-5 w-5" />
                    )}
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-jar-primary">
                    {isUploading
                      ? (uploadProgressText || "در حال بهینه‌سازی و آپلود...")
                      : "برای بارگذاری کلیک کنید یا فایل‌ها را اینجا رها نمایید"}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-jar-muted">
                    {isUploading
                      ? `${uploadProgressPercent}٪ پردازش شد`
                      : "فشرده‌سازی هوشمند خودکار به WebP (زیر ۷۰۰KB) • سقف ویدیو ۴۰MB"}
                  </p>
                </div>

                {/* Gallery Thumbnail Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700">
                      نمونه‌کارهای این تخصص ({activeItems.length})
                    </h4>
                    {activeCount < MIN_ITEMS_PER_CATEGORY && (
                      <span className="text-[11px] font-bold text-amber-600">
                        حداقل {MIN_ITEMS_PER_CATEGORY - activeCount} فایل دیگر تا تکمیل سهمیه
                      </span>
                    )}
                  </div>

                  {activeItems.length === 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 py-8 text-center">
                      <Camera className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-500">
                        هنوز نمونه‌کاری در این شاخه ثبت نشده است.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {activeItems.map((item) => (
                        <div
                          key={item.id}
                          className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-2xs"
                        >
                          {item.mediaType === "VIDEO" ? (
                            <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
                              <video
                                src={item.fileUrl}
                                playsInline
                                className="h-full w-full object-cover opacity-75"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md">
                                  <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                </div>
                              </div>
                              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[8px] font-bold text-white">
                                <Video className="h-2 w-2 text-amber-400" />
                                <span>ویدیو</span>
                              </span>
                            </div>
                          ) : (
                            <img
                              src={item.fileUrl}
                              alt={item.title || "نمونه‌کار"}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}

                          {/* Hover Actions */}
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
                            <button
                              type="button"
                              onClick={() => setPreviewMedia(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-800 hover:bg-white transition cursor-pointer"
                              title="مشاهده بزرگنمایی"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                              title="حذف فایل"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </div>

      {/* 4. Media Lightbox Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-slate-950 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {previewMedia.mediaType === "VIDEO" ? (
              <video
                src={previewMedia.fileUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[82vh] w-auto rounded-2xl"
              />
            ) : (
              <img
                src={previewMedia.fileUrl}
                alt="نمونه‌کار"
                className="max-h-[82vh] w-auto object-contain rounded-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* 5. Celebration Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-jar-surface p-6 sm:p-8 text-center shadow-2xl border border-jar-border space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs">
              <Clock className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-jar-primary">
                پرونده شما برای بررسی ارسال شد
              </h3>
              <p className="text-xs text-jar-muted leading-relaxed max-w-sm mx-auto">
                {submitOutcome?.message ||
                  `${selectedSlugs.length} شاخه تخصصی و ${totalContent} نمونه‌کار ثبت شد. کارشناسان جار پرونده شما را بررسی می‌کنند و نتیجه را اطلاع می‌دهند.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="rounded-2xl bg-jar-canvas p-3 text-center border border-jar-border">
                <span className="block text-[10px] text-jar-muted font-medium">شاخه‌های ارسالی</span>
                <span className="text-sm font-bold text-jar-primary">{selectedSlugs.length} شاخه</span>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center border border-amber-100">
                <span className="block text-[10px] text-amber-700 font-medium">محتوای آپلود شده</span>
                <span className="text-sm font-bold text-amber-700">{totalContent} فایل</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (submitOutcome?.redirect) {
                  router.push(submitOutcome.redirect);
                  return;
                }
                setShowSuccessModal(false);
              }}
              className="w-full h-11 rounded-full bg-jar-primary text-white text-xs font-medium shadow-none hover:bg-jar-primaryHover transition-colors cursor-pointer"
            >
              {submitOutcome?.redirect ? "مشاهده وضعیت بررسی" : "متوجه شدم و بازگشت"}
            </button>
          </div>
        </div>
      )}

      {/* 6. NDA Legal Modal */}
      <NdaModal
        isOpen={showNdaModal}
        onClose={() => setShowNdaModal(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setRequirementWarning(null);
        }}
      />

    </div>
  );
}
