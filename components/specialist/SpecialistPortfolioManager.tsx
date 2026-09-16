"use client";

import React, { useState, useTransition, useRef, useMemo, useEffect } from "react";
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
  Lock,
  ChevronDown,
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
  isAllowedPortfolioVideo,
  MAX_IMAGE_RAW_SIZE_BYTES,
  MAX_VIDEO_RAW_SIZE_BYTES,
} from "@/lib/clientImageCompression";
import { MIN_SELECTED_CATEGORIES, MIN_PORTFOLIO_ITEMS_PER_CATEGORY } from "@/lib/specialists/eligibility";
import SaveFeedbackToast from "@/components/ui/SaveFeedbackToast";

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
  /** Onboarding: continue to details. Manage: hide submit-for-review CTA. */
  mode?: "onboarding" | "manage";
  /** Instagram-like denser grid + quieter chrome when embedded in profile studio. */
  layout?: "default" | "instagram";
  continueHref?: string;
}

export default function SpecialistPortfolioManager({
  initialSelectedCategories,
  initialPortfolioItems,
  mode = "onboarding",
  layout = "default",
  continueHref = "/specialist/onboarding/subscription",
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CategoryType>("PERSONAL");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSelectedCategories);
  const [isSaving, startSaveTransition] = useTransition();
  const [saveToastOpen, setSaveToastOpen] = useState(false);
  const [saveToastPending, setSaveToastPending] = useState(false);
  const [requirementWarning, setRequirementWarning] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<{
    redirect: string | null;
    message: string | null;
  } | null>(null);
  const [editCategoriesOpen, setEditCategoriesOpen] = useState(
    initialSelectedCategories.length === 0
  );

  // Must pick at least MIN_SELECTED_CATEGORIES specialties, and every selected
  // specialty needs a full MIN_ITEMS_PER_CATEGORY portfolio to continue.
  const MIN_ITEMS_PER_CATEGORY = MIN_PORTFOLIO_ITEMS_PER_CATEGORY;

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
  const studioRef = useRef<HTMLDivElement | null>(null);
  const dropzoneRef = useRef<HTMLDivElement | null>(null);

  // Force specialty editor open when nothing is selected.
  useEffect(() => {
    if (selectedSlugs.length === 0) setEditCategoriesOpen(true);
  }, [selectedSlugs.length]);

  const scrollToStudio = () => {
    const el = dropzoneRef.current || studioRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const focusCategoryStudio = (slug: string) => {
    setActiveCategorySlug(slug);
    requestAnimationFrame(() => {
      scrollToStudio();
    });
  };

  // Group portfolio items by category slug (rejected files do not count toward the 10).
  const itemsByCategory = useMemo(() => {
    const map: Record<string, PortfolioItemData[]> = {};
    for (const item of portfolioItems) {
      if (item.reviewStatus === "REJECTED") continue;
      if (!map[item.categorySlug]) {
        map[item.categorySlug] = [];
      }
      map[item.categorySlug].push(item);
    }
    return map;
  }, [portfolioItems]);

  const rejectedByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of portfolioItems) {
      if (item.reviewStatus !== "REJECTED") continue;
      map[item.categorySlug] = (map[item.categorySlug] || 0) + 1;
    }
    return map;
  }, [portfolioItems]);

  const totalContent = portfolioItems.filter((i) => i.reviewStatus !== "REJECTED").length;

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

  const isEveryCategoryFulfilled =
    selectedSlugs.length >= MIN_SELECTED_CATEGORIES &&
    fulfilledCategories.length === selectedSlugs.length;

  const overallProgressPercent = useMemo(() => {
    if (selectedSlugs.length === 0) return 0;
    const cappedSum = selectedSlugs.reduce((sum, slug) => {
      const count = itemsByCategory[slug]?.length || 0;
      return sum + Math.min(count, MIN_ITEMS_PER_CATEGORY);
    }, 0);
    const needed = selectedSlugs.length * MIN_ITEMS_PER_CATEGORY;
    return Math.min(100, Math.round((cappedSum / needed) * 100));
  }, [selectedSlugs, itemsByCategory]);

  const hasMinSelectedCategories = selectedSlugs.length >= MIN_SELECTED_CATEGORIES;
  const isReadyToSubmit = hasMinSelectedCategories && isEveryCategoryFulfilled;

  const handleToggleCategory = (slug: string) => {
    const exists = selectedSlugs.includes(slug);

    if (exists && selectedSlugs.length <= MIN_SELECTED_CATEGORIES) {
      setRequirementWarning(
        `حداقل ${MIN_SELECTED_CATEGORIES} شاخه تخصصی باید انتخاب بماند.`
      );
      setTimeout(() => setRequirementWarning(null), 5000);
      return;
    }

    const updated = exists
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug];

    setSelectedSlugs(updated);
    setRequirementWarning(null);

    if (!exists) {
      setActiveCategorySlug(slug);
      setEditCategoriesOpen(false);
      requestAnimationFrame(() => scrollToStudio());
    } else if (activeCategorySlug === slug && updated.length > 0) {
      setActiveCategorySlug(updated[0]);
    }

    startSaveTransition(async () => {
      const res = await updateSpecialistCategories(updated);
      if (!res.success) {
        setSelectedSlugs(selectedSlugs);
        setRequirementWarning(res.error || "خطا در ذخیره دسته‌بندی‌ها");
        setTimeout(() => setRequirementWarning(null), 5000);
      } else {
        setSaveToastPending(Boolean(res.pendingApproval));
        setSaveToastOpen(true);
      }
    });
  };

  const handleFinalPublish = async () => {
    if (!hasMinSelectedCategories) {
      setRequirementWarning(
        `ابتدا حداقل ${MIN_SELECTED_CATEGORIES} شاخه تخصصی را انتخاب کنید.`
      );
      setTimeout(() => setRequirementWarning(null), 7000);
      setEditCategoriesOpen(true);
      return;
    }

    if (!isEveryCategoryFulfilled) {
      const details = incompleteCategories
        .map((c) => `«${c.title}» (${c.count}/۱۰ فایل)`)
        .join("، ");

      setRequirementWarning(
        `برای ادامه باید در هر دسته‌بندی انتخاب‌شده ${MIN_ITEMS_PER_CATEGORY} نمونه‌کار (غیرردشده) داشته باشید. ناقص: ${details}`
      );
      setTimeout(() => setRequirementWarning(null), 7000);
      if (incompleteCategories[0]) focusCategoryStudio(incompleteCategories[0].slug);
      return;
    }

    if (mode === "onboarding") {
      router.push(continueHref);
      router.refresh();
      return;
    }

    setIsPublishing(true);
    setRequirementWarning(null);

    try {
      const res = await publishSpecialistProfile();
      if (res.success) {
        setSubmitOutcome({
          redirect: res.redirect ?? null,
          message: res.message ?? null,
        });
        setShowSuccessModal(true);
      } else if (res.redirect) {
        router.push(res.redirect);
        router.refresh();
      } else {
        setRequirementWarning(res.error || "خطا در ارسال پرونده.");
        setTimeout(() => setRequirementWarning(null), 7000);
      }
    } catch (err: any) {
      setRequirementWarning(err?.message || "خطای ارتباطی با سرور.");
      setTimeout(() => setRequirementWarning(null), 6000);
    } finally {
      setIsPublishing(false);
    }
  };

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

    for (const file of fileList) {
      if (isVideoFile(file)) {
        if (!isAllowedPortfolioVideo(file)) {
          setUploadError(
            `فقط ویدیوی MP4 مجاز است. «${file.name}» را به MP4 تبدیل کنید و دوباره بارگذاری کنید.`
          );
          setIsUploading(false);
          setUploadProgressText(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
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

    if (!selectedSlugs.includes(activeCategorySlug)) {
      const updated = [...selectedSlugs, activeCategorySlug];
      setSelectedSlugs(updated);
      updateSpecialistCategories(updated);
    }

    try {
      const total = fileList.length;
      let currentIndex = 0;

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

  const handleDeleteItem = async (itemId: string) => {
    setPortfolioItems((prev) => prev.filter((item) => item.id !== itemId));
    if (previewMedia?.id === itemId) {
      setPreviewMedia(null);
    }

    try {
      await deletePortfolioItem(itemId);
    } catch {
      // ignore
    }
  };

  const currentCategoryList =
    activeTab === "PERSONAL" ? PERSONAL_CATEGORIES : COMMERCIAL_CATEGORIES;

  const selectedCategoriesList = useMemo(() => {
    return selectedSlugs
      .map((slug) => CATEGORIES_BY_SLUG[slug])
      .filter((c): c is ServiceCategory => Boolean(c));
  }, [selectedSlugs]);

  const activeCategory = CATEGORIES_BY_SLUG[activeCategorySlug] || selectedCategoriesList[0];
  const countingItems = activeCategorySlug ? itemsByCategory[activeCategorySlug] || [] : [];
  const activeItems = activeCategorySlug
    ? portfolioItems.filter((i) => i.categorySlug === activeCategorySlug)
    : [];
  const activeCount = countingItems.length;
  const isActiveFulfilled = activeCount >= MIN_ITEMS_PER_CATEGORY;
  const activeRemaining = Math.max(0, MIN_ITEMS_PER_CATEGORY - activeCount);
  const rejectedInActive = rejectedByCategory[activeCategorySlug] || 0;
  const canUpload = selectedCategoriesList.length > 0 && Boolean(activeCategory);
  const mustPickCategories = selectedSlugs.length === 0;

  const categoriesEditor = (
    <div className="rounded-3xl border border-jar-border bg-jar-surface backdrop-blur-xl shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (mustPickCategories) return;
          setEditCategoriesOpen((o) => !o);
        }}
        className={`flex w-full items-center justify-between gap-3 px-5 sm:px-7 py-4 text-right transition-colors ${
          mustPickCategories ? "cursor-default" : "cursor-pointer hover:bg-jar-soft/40"
        }`}
        aria-expanded={editCategoriesOpen}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-jar-primary">
              {mustPickCategories ? "انتخاب شاخه‌های تخصصی" : "ویرایش شاخه‌ها"}
            </h2>
            <span className="rounded-full bg-jar-canvas border border-jar-border px-2.5 py-0.5 text-[11px] font-medium text-jar-muted">
              {selectedSlugs.length.toLocaleString("fa-IR")} انتخاب‌شده
            </span>
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-jar-muted" />}
          </div>
          <p className="text-xs text-jar-muted mt-0.5 font-medium">
            {mustPickCategories
              ? `حداقل ${MIN_SELECTED_CATEGORIES} شاخه انتخاب کنید تا استودیوی آپلود فعال شود.`
              : "شاخه‌ها از قبل انتخاب شده‌اند؛ در صورت نیاز اینجا تغییر دهید."}
          </p>
        </div>
        {!mustPickCategories && (
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-jar-muted transition-transform ${
              editCategoriesOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {editCategoriesOpen && (
        <div className="space-y-4 px-5 sm:px-7 pb-5 sm:pb-7 border-t border-jar-border pt-4">
          <div className="flex w-full sm:w-auto rounded-full bg-jar-canvas p-1 border border-jar-border sm:ml-auto sm:mr-0 max-w-xs">
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

          <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-28 sm:pb-20" dir="rtl">
      {/* 1. Sticky progress + upload CTA */}
      {!(layout === "instagram" && mode === "manage" && isEveryCategoryFulfilled) && (
      <div className="sticky top-20 z-40 space-y-2">
        <div className="mx-auto flex flex-col gap-2.5 rounded-2xl border border-jar-border bg-jar-surface/90 px-4 sm:px-6 py-2.5 sm:py-3 backdrop-blur-xl shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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
                      {mode === "onboarding"
                        ? "آماده رفتن به مرحله بعد"
                        : "پرونده آماده ارسال برای بررسی است"}
                      <span className="hidden sm:inline text-emerald-700 font-bold mr-1.5">
                        ({fulfilledCategories.length.toLocaleString("fa-IR")} از{" "}
                        {selectedSlugs.length.toLocaleString("fa-IR")} دسته کامل)
                      </span>
                    </>
                  ) : selectedSlugs.length === 0 ? (
                    "یک شاخه تخصصی انتخاب کنید"
                  ) : (
                    <>
                      <span className="font-mono">{overallProgressPercent}</span>٪ تا تکمیل همه دسته‌ها
                      <span className="hidden sm:inline text-jar-logo font-bold mr-1.5">
                        ({fulfilledCategories.length.toLocaleString("fa-IR")}/
                        {selectedSlugs.length.toLocaleString("fa-IR")} دسته · ۱۰ فایل در هر دسته)
                      </span>
                    </>
                  )}
                </span>
              </div>

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

            <div className="flex w-full sm:w-auto items-center gap-2">
              {canUpload && (
                <button
                  type="button"
                  onClick={() => {
                    scrollToStudio();
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="hidden sm:inline-flex h-9 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-full bg-jar-primary px-4 text-xs font-medium text-white hover:bg-jar-primaryHover transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>افزودن نمونه‌کار</span>
                </button>
              )}

              {mode === "onboarding" && (
                <button
                  type="button"
                  onClick={handleFinalPublish}
                  disabled={isPublishing || isUploading}
                  title={
                    isUploading
                      ? uploadProgressText || "در حال آپلود نمونه‌کار..."
                      : !isReadyToSubmit
                        ? `برای ادامه، حداقل ${MIN_SELECTED_CATEGORIES} شاخه و ${MIN_ITEMS_PER_CATEGORY} نمونه‌کار در هر شاخه لازم است.`
                        : "مرحله بعد"
                  }
                  className={`relative w-full sm:w-auto overflow-hidden inline-flex h-9 min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-5 text-xs font-medium transition-colors ${
                    isUploading
                      ? "bg-jar-primary text-white cursor-wait"
                      : isReadyToSubmit
                        ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                        : "bg-jar-canvas text-jar-muted border border-jar-border hover:bg-jar-soft cursor-pointer"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <span
                        className="absolute inset-y-0 right-0 bg-white/25 transition-[width] duration-300"
                        style={{ width: `${Math.max(4, uploadProgressPercent)}%` }}
                        aria-hidden
                      />
                      <span className="relative z-10 inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="font-mono tabular-nums">
                          {uploadProgressPercent.toLocaleString("fa-IR")}٪
                        </span>
                        <span className="hidden sm:inline">آپلود نمونه‌کار</span>
                      </span>
                    </>
                  ) : isPublishing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>در حال ادامه...</span>
                    </>
                  ) : isReadyToSubmit ? (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>مرحله بعد</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      <span>مرحله بعد</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {incompleteCategories.length > 0 && selectedSlugs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5">
              <span className="shrink-0 text-[10px] font-bold text-jar-muted">
                {isReadyToSubmit ? "بعداً:" : "ناقص:"}
              </span>
              {incompleteCategories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => focusCategoryStudio(c.slug)}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                    activeCategorySlug === c.slug
                      ? "border-jar-logo bg-jar-soft text-jar-primary"
                      : "border-jar-border bg-jar-canvas text-jar-muted hover:text-jar-primary hover:bg-jar-soft"
                  }`}
                >
                  <span>{c.title}</span>
                  <span className="font-mono text-jar-logo">
                    {c.count}/۱۰
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

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

      {/* Edge case: no specialties yet → editor first */}
      {mustPickCategories && categoriesEditor}

      {/* 2. Upload studio first */}
      <div ref={studioRef} className="space-y-4">
        {selectedCategoriesList.length === 0 ? (
          !mustPickCategories ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/60 p-10 text-center space-y-3">
              <Camera className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">
                هنوز تخصص فعالی انتخاب نشده است
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                برای فعال‌شدن استودیوی آپلود، حداقل یک تخصص را از بخش ویرایش شاخه‌ها انتخاب کنید.
              </p>
              <button
                type="button"
                onClick={() => setEditCategoriesOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-jar-primary px-4 text-xs font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                انتخاب شاخه
              </button>
            </div>
          ) : null
        ) : (
          <>
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

            {activeCategory && (
              <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 backdrop-blur-xl shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-jar-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                            <span>
                              {activeCount}/۱۰ نمونه‌کار — {activeRemaining} فایل دیگر لازم است
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-jar-muted">
                      {activeCategory.mediaType === "VIDEO"
                        ? "فقط ویدیوی MP4 — حداکثر ۴۰ مگابایت (MOV و سایر فرمت‌ها مجاز نیست)"
                        : "عکس و تصویر (تبدیل خودکار به WebP زیر ۷۰۰KB) — حداکثر ۲۵ مگابایت"}
                    </p>
                  </div>

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

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={
                    activeCategory.mediaType === "VIDEO"
                      ? "video/mp4,.mp4"
                      : activeCategory.mediaType === "ALL"
                      ? "image/jpeg,image/png,image/webp,video/mp4,.mp4"
                      : "image/jpeg,image/png,image/webp"
                  }
                  className="hidden"
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />

                {uploadError && (
                  <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{uploadError}</span>
                  </div>
                )}

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

                <div
                  ref={dropzoneRef}
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
                      ? uploadProgressText || "در حال بهینه‌سازی و آپلود..."
                      : "برای بارگذاری کلیک کنید یا فایل‌ها را اینجا رها نمایید"}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-jar-muted">
                    {isUploading
                      ? `${uploadProgressPercent}٪ پردازش شد`
                      : "فشرده‌سازی هوشمند خودکار به WebP (زیر ۷۰۰KB) • ویدیو فقط MP4 تا ۴۰MB"}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700">
                      نمونه‌کارهای این تخصص ({activeCount}
                      {rejectedInActive > 0
                        ? ` معتبر · ${rejectedInActive.toLocaleString("fa-IR")} ردشده`
                        : ""}
                      )
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
                    <div
                      className={
                        layout === "instagram"
                          ? "grid grid-cols-3 gap-0.5 sm:gap-1"
                          : "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                      }
                    >
                      {activeItems.map((item) => (
                        <div
                          key={item.id}
                          className={`group relative aspect-square overflow-hidden bg-slate-900 ${
                            layout === "instagram"
                              ? "rounded-none sm:rounded-md border-0"
                              : "rounded-2xl border border-slate-200/80 shadow-2xs"
                          }`}
                        >
                          {item.reviewStatus === "REJECTED" && (
                            <span className="absolute top-1.5 right-1.5 z-10 rounded-md bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold text-white">
                              رد شده
                            </span>
                          )}
                          {item.reviewStatus === "APPROVED" && (
                            <span className="absolute top-1.5 right-1.5 z-10 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[8px] font-bold text-white">
                              تایید
                            </span>
                          )}
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

      {/* 3. Collapsed specialty catalog after studio */}
      {!mustPickCategories && categoriesEditor}

      {/* Mobile sticky upload CTA */}
      {canUpload && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-jar-border bg-jar-surface/95 backdrop-blur-xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              scrollToStudio();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-sm font-bold text-white disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isUploading ? "در حال آپلود..." : "افزودن نمونه‌کار"}
          </button>
        </div>
      )}

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

      <SaveFeedbackToast
        open={saveToastOpen}
        message={
          saveToastPending
            ? "ارسال شد — تغییر دسته‌ها در انتظار تایید جار"
            : "ذخیره شد — شاخه‌های تخصصی به‌روز شد"
        }
        onClose={() => setSaveToastOpen(false)}
      />
    </div>
  );
}
