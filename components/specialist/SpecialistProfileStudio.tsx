"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Smartphone,
  User,
  X,
} from "lucide-react";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistDetailsForm from "@/components/specialist/SpecialistDetailsForm";
import SpecialistPublicStatsRow from "@/components/specialist/SpecialistPublicStatsRow";
import EquipmentTagsDisplay from "@/components/specialist/EquipmentTagsDisplay";
import { PortfolioItemData } from "@/app/actions/specialistPortfolioActions";
import { saveSpecialistProfileBasicsAction } from "@/app/actions/specialistOnboardingActions";
import { sanitizePersonName, isValidPersonName } from "@/components/order/steps/StepFinalize";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";

export type StudioTab = "portfolio" | "work";

type Props = {
  userId: string;
  initialTab?: StudioTab;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  equipmentSummary: string | null;
  isMobileGrapher: boolean;
  studioName: string | null;
  phoneDisplay: string;
  profileEditStatus?: string | null;
  stats: {
    completedProjects: number;
    approvedPortfolio: number;
    avgRating: number | null;
    ratingCount: number;
  };
  selectedCategories: string[];
  portfolioItems: PortfolioItemData[];
  details: {
    city: string | null;
    workArea: string | null;
    equipmentSummary: string | null;
    baseLat: number | null;
    baseLng: number | null;
    baseAddress: string | null;
    hasStudio: boolean;
    isMobileGrapher: boolean;
    hasEligiblePortfolio: boolean;
    profileEditStatus?: string | null;
    profileEditNote?: string | null;
  };
};

export default function SpecialistProfileStudio({
  userId,
  initialTab = "portfolio",
  displayName,
  avatarUrl,
  bio,
  city,
  equipmentSummary,
  isMobileGrapher,
  studioName,
  phoneDisplay,
  profileEditStatus,
  stats,
  selectedCategories,
  portfolioItems,
  details,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(sanitizePersonName(displayName || ""));
  const [bioDraft, setBioDraft] = useState(bio || "");
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [previewSrc, setPreviewSrc] = useState(avatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setName(sanitizePersonName(displayName || ""));
    setBioDraft(bio || "");
    setAvatar(avatarUrl || "");
    setPreviewSrc(avatarUrl || "");
  }, [displayName, bio, avatarUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  const publicName = formatPublicSpecialistName(displayName);
  const publicHref = `/s/${userId}`;

  const switchTab = (next: StudioTab) => {
    setTab(next);
    const url = next === "work" ? "/specialist/portfolio?tab=work" : "/specialist/portfolio";
    router.replace(url, { scroll: false });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    setPreviewSrc(localUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "avatar");
      const res = await fetch("/api/specialist/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "خطا در آپلود عکس");
        setPreviewSrc(avatar);
      } else {
        setAvatar(data.url);
        setPreviewSrc(data.url);
      }
    } catch {
      setError("خطای شبکه در آپلود");
      setPreviewSrc(avatar);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveBasics = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!isValidPersonName(name)) {
      setError("نام را فقط با حروف وارد کنید (حداقل ۲ حرف).");
      return;
    }
    if (!avatar) {
      setError("عکس پروفایل الزامی است.");
      return;
    }

    startTransition(async () => {
      const res = await saveSpecialistProfileBasicsAction({
        displayName: name.trim(),
        avatarUrl: avatar,
        bio: bioDraft.trim() || null,
        returnTo: "/specialist/portfolio",
      });
      if (!res.success) {
        setError(res.error || "خطا در ذخیره");
        return;
      }
      setNotice(
        res.pendingApproval
          ? "تغییرات برای تایید ادمین ارسال شد و بعد از تایید روی پروفایل عمومی می‌آید."
          : "پروفایل به‌روز شد."
      );
      setEditOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {/* Instagram-like header — Jar chrome */}
      <section className="rounded-[28px] border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-5 shadow-xs">
        <div className="flex items-start gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="relative h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border-2 border-jar-border bg-jar-canvas group"
            aria-label="ویرایش عکس پروفایل"
          >
            {previewSrc || avatarUrl ? (
              <Image
                src={previewSrc || avatarUrl || ""}
                alt={publicName}
                fill
                sizes="96px"
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-jar-muted">
                <Camera className="h-7 w-7" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
              تغییر
            </span>
          </button>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-jar-primary truncate">
                {publicName}
              </h1>
              {isMobileGrapher && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-logo/10 text-jar-logo text-[10px] font-bold border border-jar-logo/25">
                  <Smartphone className="h-3 w-3" />
                  موبایل‌گرافر
                </span>
              )}
              {profileEditStatus === "PENDING" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                  ویرایش در صف تایید
                </span>
              )}
            </div>

            <p className="text-xs text-jar-muted font-medium flex items-center gap-1 flex-wrap">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{city || "شهر ثبت نشده"}</span>
              {studioName ? <span>· {studioName}</span> : null}
            </p>

            <SpecialistPublicStatsRow
              completedProjects={stats.completedProjects}
              approvedPortfolio={stats.approvedPortfolio}
              avgRating={stats.avgRating}
              ratingCount={stats.ratingCount}
            />
          </div>
        </div>

        {bio?.trim() ? (
          <p className="text-sm text-jar-primary leading-relaxed font-medium whitespace-pre-wrap">
            {bio.trim()}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-xs font-bold text-jar-muted hover:text-jar-logo text-right"
          >
            بیوگرافی کوتاه بنویسید تا کارفرما شما را بهتر بشناسد…
          </button>
        )}

        {equipmentSummary ? (
          <div className="space-y-2 pt-1 border-t border-jar-border">
            <span className="text-xs font-bold text-jar-primary">
              {isMobileGrapher ? "گوشی و تجهیزات موبایل‌گرافی" : "تجهیزات"}
            </span>
            <EquipmentTagsDisplay value={equipmentSummary} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-full bg-jar-primary px-4 text-xs font-bold text-white hover:bg-jar-primaryHover"
          >
            <Pencil className="h-3.5 w-3.5" />
            ویرایش پروفایل
          </button>
          <Link
            href={publicHref}
            target="_blank"
            className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-full border border-jar-border bg-white px-4 text-xs font-bold text-jar-primary hover:bg-jar-soft"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            پیش‌نمایش عمومی
          </Link>
        </div>

        {notice && (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex rounded-2xl border border-jar-border bg-jar-canvas p-1">
        <button
          type="button"
          onClick={() => switchTab("portfolio")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${
            tab === "portfolio"
              ? "bg-jar-surface text-jar-primary shadow-xs border border-jar-border"
              : "text-jar-muted hover:text-jar-primary"
          }`}
        >
          نمونه‌کارها
        </button>
        <button
          type="button"
          onClick={() => switchTab("work")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${
            tab === "work"
              ? "bg-jar-surface text-jar-primary shadow-xs border border-jar-border"
              : "text-jar-muted hover:text-jar-primary"
          }`}
        >
          مبدأ و تجهیزات
        </button>
      </div>

      {tab === "portfolio" ? (
        <SpecialistPortfolioManager
          initialSelectedCategories={selectedCategories}
          initialPortfolioItems={portfolioItems}
          mode="manage"
          layout="instagram"
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-jar-border bg-jar-canvas px-4 py-3 text-xs text-jar-muted font-medium leading-relaxed">
            شهر، مبدأ حرکت و تجهیزات اینجا ذخیره می‌شود. ایاب‌وذهاب پروژه‌ها از روی مبدأ حساب
            می‌شود.
          </div>
          <SpecialistDetailsForm
            mode="edit"
            returnTo="/specialist/portfolio?tab=work"
            initialCity={details.city}
            initialWorkArea={details.workArea}
            initialEquipment={details.equipmentSummary}
            initialBaseLat={details.baseLat}
            initialBaseLng={details.baseLng}
            initialBaseAddress={details.baseAddress}
            initialHasStudio={details.hasStudio}
            initialIsMobileGrapher={details.isMobileGrapher}
            hasEligiblePortfolio={details.hasEligiblePortfolio}
            profileEditStatus={details.profileEditStatus}
            profileEditNote={details.profileEditNote}
          />
        </div>
      )}

      {/* Edit sheet */}
      {editOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            aria-label="بستن"
            onClick={() => setEditOpen(false)}
          />
          <form
            onSubmit={handleSaveBasics}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-jar-primary">ویرایش پروفایل</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-jar-border text-jar-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-jar-border bg-jar-canvas"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSrc} alt="آواتار" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-jar-muted">
                    <Camera className="h-5 w-5" />
                  </span>
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </span>
                )}
              </button>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold text-jar-primary">عکس پروفایل</p>
                <p className="text-[11px] text-jar-muted leading-relaxed">
                  JPG / PNG / WEBP · این همان عکسی است که کارفرما می‌بیند.
                </p>
                <p className="text-[11px] text-jar-muted" dir="ltr">
                  {phoneDisplay}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-jar-primary">نام و نام خانوادگی</label>
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => setName(sanitizePersonName(e.target.value))}
                  className="w-full h-11 pr-9 px-3 rounded-xl border border-jar-border bg-jar-canvas text-sm outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20"
                  placeholder="مثلاً: علی محمدی"
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jar-muted" />
              </div>
              <p className="text-[10px] text-jar-muted">
                در پروفایل عمومی به‌صورت «{formatPublicSpecialistName(name || displayName)}» دیده می‌شود.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-jar-primary">بیوگرافی کوتاه</label>
                <span className="text-[10px] font-mono text-jar-muted">
                  {bioDraft.length.toLocaleString("fa-IR")} / ۲۸۰
                </span>
              </div>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="سبک کاری، تجربه، شهر فعالیت…"
                className="w-full rounded-xl border border-jar-border bg-jar-canvas p-3 text-sm outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || uploading || !avatar.trim() || !isValidPersonName(name)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-white text-sm font-bold hover:bg-jar-primaryHover disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ذخیره تغییرات
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
