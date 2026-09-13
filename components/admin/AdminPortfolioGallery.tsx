"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Crop,
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  Instagram,
  LayoutGrid,
  Loader2,
  Square,
  UserRound,
  X,
} from "lucide-react";
import type { SpecialistReviewCard } from "@/lib/specialists/review";
import type { AdminPortfolioGalleryItem } from "@/lib/admin/portfolioGalleryData";
import { setPortfolioInstagramPickedAction } from "@/app/actions/adminActionHandlers";
import {
  buildInstagramCaptionsBatch,
  cropImageForInstagram,
  type InstagramAspect,
} from "@/lib/admin/instagramCurate";
import PortfolioMediaThumb from "@/components/admin/PortfolioMediaThumb";

type ReviewStatusFilter = "APPROVED" | "ALL" | "PENDING" | "REJECTED";
type MediaFilter = "ALL" | "IMAGE" | "VIDEO";
type PickedFilter = "UNPICKED" | "ALL" | "PICKED";

type GalleryTile = AdminPortfolioGalleryItem;

const STATUS_FILTERS: { id: ReviewStatusFilter; label: string }[] = [
  { id: "APPROVED", label: "تاییدشده" },
  { id: "ALL", label: "همه وضعیت‌ها" },
  { id: "PENDING", label: "در انتظار" },
  { id: "REJECTED", label: "ردشده" },
];

const MEDIA_FILTERS: { id: MediaFilter; label: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "همه", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: "IMAGE", label: "عکس", icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: "VIDEO", label: "ویدیو", icon: <Film className="w-3.5 h-3.5" /> },
];

const PICKED_FILTERS: { id: PickedFilter; label: string }[] = [
  { id: "UNPICKED", label: "برداشته‌نشده" },
  { id: "ALL", label: "همه" },
  { id: "PICKED", label: "برداشته‌شده" },
];

const MAX_ZIP_ITEMS = 40;

function statusBadge(status: string) {
  if (status === "APPROVED") {
    return { text: "تایید", className: "bg-emerald-600" };
  }
  if (status === "REJECTED") {
    return { text: "رد", className: "bg-rose-600" };
  }
  return { text: "در انتظار", className: "bg-amber-500" };
}

function flattenCards(cards: SpecialistReviewCard[]): GalleryTile[] {
  return cards.flatMap((card) =>
    card.items.map((item) => ({
      id: item.id,
      fileUrl: item.fileUrl,
      mediaType: item.mediaType,
      title: item.title,
      categoryTitle: item.categoryTitle,
      reviewStatus: item.reviewStatus,
      rejectionReason: item.rejectionReason,
      instagramPickedAt: item.instagramPickedAt ?? null,
      specialist: {
        profileId: card.profileId,
        userId: card.userId,
        displayName: card.displayName,
        avatarUrl: card.avatarUrl,
        city: card.city,
      },
    }))
  );
}

function safeDownloadName(tile: GalleryTile, suffix = ""): string {
  const name = tile.specialist.displayName
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const cat = tile.categoryTitle.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").slice(0, 24);
  if (suffix) {
    return `${name || "specialist"}_${cat || "cat"}_${suffix}_${tile.id.slice(0, 8)}.jpg`;
  }
  const extMatch = tile.fileUrl.match(/\.[a-zA-Z0-9]{2,8}(?:\?|$)/);
  const ext = extMatch ? extMatch[0].replace("?", "") : tile.mediaType === "VIDEO" ? ".mp4" : ".jpg";
  return `${name || "specialist"}_${cat || "cat"}_${tile.id.slice(0, 8)}${ext}`;
}

async function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPortfolioGallery({
  cards,
  items: itemsProp,
  onFocusSpecialist,
}: {
  cards?: SpecialistReviewCard[];
  /** Flat list (preferred for /admin/PortfolioItem curation). */
  items?: AdminPortfolioGalleryItem[];
  onFocusSpecialist?: (profileId: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("APPROVED");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("ALL");
  const [pickedFilter, setPickedFilter] = useState<PickedFilter>("UNPICKED");
  const [curationMode, setCurationMode] = useState(false);
  const [preview, setPreview] = useState<GalleryTile | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickedOverride, setPickedOverride] = useState<Record<string, string | null>>({});
  const [zipBusy, setZipBusy] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [cropBusy, setCropBusy] = useState<string | null>(null);
  const [singleBusyId, setSingleBusyId] = useState<string | null>(null);
  const [markAfterZip, setMarkAfterZip] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allTiles = useMemo(() => {
    const base = itemsProp?.length
      ? itemsProp
      : cards?.length
        ? flattenCards(cards)
        : [];
    return base.map((tile) =>
      Object.prototype.hasOwnProperty.call(pickedOverride, tile.id)
        ? { ...tile, instagramPickedAt: pickedOverride[tile.id] }
        : tile
    );
  }, [cards, itemsProp, pickedOverride]);

  const filtered = useMemo(() => {
    return allTiles.filter((tile) => {
      if (statusFilter !== "ALL" && tile.reviewStatus !== statusFilter) return false;
      if (mediaFilter === "IMAGE" && tile.mediaType !== "IMAGE") return false;
      if (mediaFilter === "VIDEO" && tile.mediaType !== "VIDEO") return false;
      const isPicked = Boolean(tile.instagramPickedAt);
      if (pickedFilter === "UNPICKED" && isPicked) return false;
      if (pickedFilter === "PICKED" && !isPicked) return false;
      return true;
    });
  }, [allTiles, statusFilter, mediaFilter, pickedFilter]);

  const counts = useMemo(() => {
    const inStatus =
      statusFilter === "ALL"
        ? allTiles
        : allTiles.filter((t) => t.reviewStatus === statusFilter);
    const inPicked = inStatus.filter((t) => {
      const isPicked = Boolean(t.instagramPickedAt);
      if (pickedFilter === "UNPICKED") return !isPicked;
      if (pickedFilter === "PICKED") return isPicked;
      return true;
    });
    return {
      all: inPicked.length,
      image: inPicked.filter((t) => t.mediaType === "IMAGE").length,
      video: inPicked.filter((t) => t.mediaType === "VIDEO").length,
      unpicked: inStatus.filter((t) => !t.instagramPickedAt).length,
      picked: inStatus.filter((t) => Boolean(t.instagramPickedAt)).length,
    };
  }, [allTiles, statusFilter, pickedFilter]);

  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const selectedTiles = useMemo(
    () => allTiles.filter((t) => selected.has(t.id)),
    [allTiles, selected]
  );
  const selectedInView = filteredIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const announce = (type: "success" | "error", text: string) => setToast({ type, text });

  const enableCurationMode = () => {
    setCurationMode(true);
    setStatusFilter("APPROVED");
    setMediaFilter("IMAGE");
    setPickedFilter("UNPICKED");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_ZIP_ITEMS) {
          announce("error", `حداکثر ${MAX_ZIP_ITEMS} فایل قابل انتخاب است.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of filteredIds) {
        if (next.size >= MAX_ZIP_ITEMS) break;
        next.add(id);
      }
      if (filteredIds.length > MAX_ZIP_ITEMS || next.size >= MAX_ZIP_ITEMS) {
        announce("error", `حداکثر ${MAX_ZIP_ITEMS} فایل انتخاب شد.`);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const downloadSingle = async (tile: GalleryTile) => {
    setSingleBusyId(tile.id);
    try {
      const res = await fetch(tile.fileUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      await triggerBlobDownload(blob, safeDownloadName(tile));
      announce("success", "دانلود شروع شد.");
    } catch {
      window.open(tile.fileUrl, "_blank", "noopener,noreferrer");
    } finally {
      setSingleBusyId(null);
    }
  };

  const downloadInstagramCrop = async (tile: GalleryTile, aspect: InstagramAspect) => {
    if (tile.mediaType !== "IMAGE") {
      announce("error", "کراپ اینستا فقط برای عکس است.");
      return;
    }
    setCropBusy(`${tile.id}:${aspect}`);
    try {
      const blob = await cropImageForInstagram(tile.fileUrl, aspect);
      const label = aspect === "4:5" ? "4x5" : "1x1";
      await triggerBlobDownload(blob, safeDownloadName(tile, `ig_${label}`));
      announce("success", `خروجی ${aspect} آماده شد.`);
    } catch {
      announce("error", "کراپ اینستا ناموفق بود (ممکن است فایل cross-origin باشد).");
    } finally {
      setCropBusy(null);
    }
  };

  const downloadSelectedInstagramCrops = async (aspect: InstagramAspect) => {
    const images = selectedTiles.filter((t) => t.mediaType === "IMAGE");
    if (images.length === 0) {
      announce("error", "بین انتخاب‌ها عکسی نیست.");
      return;
    }
    setCropBusy(`batch:${aspect}`);
    let ok = 0;
    for (const tile of images) {
      try {
        const blob = await cropImageForInstagram(tile.fileUrl, aspect);
        const label = aspect === "4:5" ? "4x5" : "1x1";
        await triggerBlobDownload(blob, safeDownloadName(tile, `ig_${label}`));
        ok += 1;
        // Small gap so the browser doesn't collapse downloads
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        /* continue */
      }
    }
    setCropBusy(null);
    announce(
      ok > 0 ? "success" : "error",
      ok > 0
        ? `${ok.toLocaleString("fa-IR")} خروجی ${aspect} دانلود شد.`
        : "هیچ خروجی اینستایی ساخته نشد."
    );
  };

  const markPicked = async (picked: boolean, idsOverride?: string[]) => {
    const ids = idsOverride ?? Array.from(selected);
    if (ids.length === 0) return;
    setMarkBusy(true);
    try {
      const res = await setPortfolioInstagramPickedAction({ ids, picked });
      if (!res.success) {
        announce("error", res.error);
        return;
      }
      const stamp = picked ? new Date().toISOString() : null;
      setPickedOverride((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = stamp;
        return next;
      });
      announce("success", res.message || (picked ? "علامت زده شد." : "علامت برداشته شد."));
      if (picked && pickedFilter === "UNPICKED") {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }
      startTransition(() => router.refresh());
    } catch {
      announce("error", "ذخیره علامت اینستا ناموفق بود.");
    } finally {
      setMarkBusy(false);
    }
  };

  const downloadZip = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setZipBusy(true);
    try {
      const res = await fetch("/api/admin/portfolio/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        let message = "دانلود ZIP ناموفق بود.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* ignore */
        }
        announce("error", message);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      await triggerBlobDownload(blob, `jar-portfolio-${stamp}-${ids.length}.zip`);
      const missing = Number(res.headers.get("X-Jar-Missing-Count") || "0");
      announce(
        "success",
        missing > 0
          ? `ZIP آماده شد؛ ${missing.toLocaleString("fa-IR")} فایل روی دیسک نبود.`
          : `${ids.length.toLocaleString("fa-IR")} فایل در ZIP دانلود شد.`
      );
      if (markAfterZip) {
        await markPicked(true, ids);
      }
    } catch {
      announce("error", "خطا در ساخت یا دریافت ZIP.");
    } finally {
      setZipBusy(false);
    }
  };

  const copyCaptions = async (tilesOverride?: GalleryTile[]) => {
    const tiles =
      tilesOverride && tilesOverride.length > 0
        ? tilesOverride
        : selectedTiles.length > 0
          ? selectedTiles
          : preview
            ? [preview]
            : [];
    if (tiles.length === 0) {
      announce("error", "چیزی برای کپی کپشن انتخاب نشده.");
      return;
    }
    const text = buildInstagramCaptionsBatch(
      tiles.map((t) => ({
        displayName: t.specialist.displayName,
        categoryTitle: t.categoryTitle,
        userId: t.specialist.userId,
        city: t.specialist.city,
      }))
    );
    try {
      await navigator.clipboard.writeText(text);
      announce(
        "success",
        tiles.length === 1
          ? "کپشن اینستا کپی شد."
          : `${tiles.length.toLocaleString("fa-IR")} کپشن کپی شد.`
      );
    } catch {
      announce("error", "دسترسی کلیپ‌بورد نیست.");
    }
  };

  return (
    <div className={`space-y-4 ${selected.size > 0 ? "pb-28" : ""}`}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              گالری نمونه‌کارها
              {curationMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                  <Instagram className="w-3 h-3" />
                  حالت کیوریشن
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              انتخاب، ZIP، کپشن، کراپ اینستا، و علامت «برداشته‌شده».
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!curationMode ? (
              <button
                type="button"
                onClick={enableCurationMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700"
              >
                <Instagram className="w-3.5 h-3.5" />
                حالت کیوریشن اینستا
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurationMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                خروج از کیوریشن
              </button>
            )}
            <button
              type="button"
              onClick={allVisibleSelected ? clearSelection : selectAllVisible}
              disabled={filteredIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  لغو انتخاب دیده‌شده
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  انتخاب همهٔ دیده‌شده
                </>
              )}
            </button>
            <span className="text-[11px] font-bold text-slate-600 tabular-nums">
              {filtered.length.toLocaleString("fa-IR")} مورد
              {selected.size > 0
                ? ` · ${selected.size.toLocaleString("fa-IR")} انتخاب`
                : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-slate-400 ml-1">وضعیت</span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                  statusFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-slate-400 ml-1">اینستا</span>
            {PICKED_FILTERS.map((f) => {
              const count =
                f.id === "UNPICKED"
                  ? counts.unpicked
                  : f.id === "PICKED"
                    ? counts.picked
                    : counts.unpicked + counts.picked;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPickedFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                    pickedFilter === f.id
                      ? "bg-fuchsia-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                  <span
                    className={`tabular-nums ${
                      pickedFilter === f.id ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {count.toLocaleString("fa-IR")}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-slate-400 ml-1">رسانه</span>
            {MEDIA_FILTERS.map((f) => {
              const count =
                f.id === "ALL" ? counts.all : f.id === "IMAGE" ? counts.image : counts.video;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMediaFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                    mediaFilter === f.id
                      ? "bg-jar-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {f.icon}
                  {f.label}
                  <span
                    className={`tabular-nums ${
                      mediaFilter === f.id ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {count.toLocaleString("fa-IR")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`rounded-xl border px-3 py-2 text-[11px] font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">موردی با این فیلتر نیست</p>
          <p className="text-xs text-slate-500 mt-1">فیلتر وضعیت، اینستا یا رسانه را عوض کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((tile) => {
            const badge = statusBadge(tile.reviewStatus);
            const isVideo = tile.mediaType === "VIDEO";
            const isSelected = selected.has(tile.id);
            const isPicked = Boolean(tile.instagramPickedAt);
            return (
              <article
                key={tile.id}
                className={`group flex flex-col rounded-2xl overflow-hidden border bg-white shadow-xs transition-all ${
                  isSelected
                    ? "border-jar-primary ring-2 ring-jar-primary/25"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreview(tile)}
                    className="absolute inset-0 text-right cursor-zoom-in"
                  >
                    <PortfolioMediaThumb
                      fileUrl={tile.fileUrl}
                      mediaType={tile.mediaType}
                      alt={tile.title || tile.categoryTitle}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent opacity-80 pointer-events-none" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSelect(tile.id)}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? "حذف از انتخاب" : "انتخاب"}
                    className={`absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-jar-primary border-jar-primary text-white"
                        : "bg-white/90 border-white text-slate-700 hover:bg-white"
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-3.5 h-3.5" />}
                  </button>

                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white ${badge.className}`}
                    >
                      {badge.text}
                    </span>
                    {isPicked && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-fuchsia-700 text-white">
                        <Instagram className="w-3 h-3" />
                        برداشته
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                      {tile.specialist.avatarUrl ? (
                        <Image
                          src={tile.specialist.avatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                          <UserRound className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 truncate">
                        {tile.specialist.displayName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {tile.categoryTitle}
                        {tile.specialist.city ? ` · ${tile.specialist.city}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void downloadSingle(tile)}
                      disabled={singleBusyId === tile.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {singleBusyId === tile.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      دانلود
                    </button>
                    {!isVideo && (
                      <>
                        <button
                          type="button"
                          onClick={() => void downloadInstagramCrop(tile, "1:1")}
                          disabled={cropBusy === `${tile.id}:1:1`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 hover:bg-fuchsia-100 disabled:opacity-50"
                          title="کراپ مربعی اینستا"
                        >
                          {cropBusy === `${tile.id}:1:1` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Crop className="w-3 h-3" />
                          )}
                          ۱:۱
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadInstagramCrop(tile, "4:5")}
                          disabled={cropBusy === `${tile.id}:4:5`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 hover:bg-fuchsia-100 disabled:opacity-50"
                          title="کراپ عمودی اینستا"
                        >
                          {cropBusy === `${tile.id}:4:5` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Crop className="w-3 h-3" />
                          )}
                          ۴:۵
                        </button>
                      </>
                    )}
                    <Link
                      href={`/s/${tile.specialist.userId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <UserRound className="w-3 h-3" />
                      پروفایل
                    </Link>
                    <Link
                      href={`/admin/PortfolioItem/${tile.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      ویرایش
                    </Link>
                    {onFocusSpecialist && (
                      <button
                        type="button"
                        onClick={() => onFocusSpecialist(tile.specialist.profileId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        پرونده
                      </button>
                    )}
                    <a
                      href={tile.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <ExternalLink className="w-3 h-3" />
                      فایل
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-3xl w-auto">
          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[12px] font-bold text-slate-800">
              {selected.size.toLocaleString("fa-IR")} انتخاب‌شده
              {selectedInView < selected.size ? (
                <span className="text-slate-500 font-medium">
                  {" "}
                  ({selectedInView.toLocaleString("fa-IR")} در فیلتر فعلی)
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAfterZip}
                  onChange={(e) => setMarkAfterZip(e.target.checked)}
                  className="rounded border-slate-300 text-jar-primary focus:ring-jar-primary"
                />
                بعد از ZIP علامت بزن
              </label>
              <button
                type="button"
                onClick={clearSelection}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                پاک کردن
              </button>
              <button
                type="button"
                onClick={() => void copyCaptions()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                <Copy className="w-3.5 h-3.5" />
                کپشن
              </button>
              <button
                type="button"
                onClick={() => void downloadSelectedInstagramCrops("1:1")}
                disabled={Boolean(cropBusy)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 disabled:opacity-50"
              >
                <Crop className="w-3.5 h-3.5" />
                ۱:۱
              </button>
              <button
                type="button"
                onClick={() => void downloadSelectedInstagramCrops("4:5")}
                disabled={Boolean(cropBusy)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 disabled:opacity-50"
              >
                <Crop className="w-3.5 h-3.5" />
                ۴:۵
              </button>
              <button
                type="button"
                onClick={() => void markPicked(true)}
                disabled={markBusy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-700 text-white hover:bg-fuchsia-800 disabled:opacity-50"
              >
                {markBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Instagram className="w-3.5 h-3.5" />}
                برداشته شد
              </button>
              <button
                type="button"
                onClick={() => void markPicked(false)}
                disabled={markBusy}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                لغو علامت
              </button>
              <button
                type="button"
                onClick={() => void downloadZip()}
                disabled={zipBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-jar-primary hover:bg-jar-primaryHover disabled:opacity-50"
              >
                {zipBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="بزرگ‌نمایی نمونه‌کار"
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="relative max-w-5xl w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.mediaType === "VIDEO" ? (
              <video
                src={preview.fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-[72vh] rounded-xl shadow-2xl bg-black"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview.fileUrl}
                alt={preview.title || preview.categoryTitle}
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl"
              />
            )}

            <div className="w-full max-w-2xl rounded-2xl bg-white/95 backdrop-blur-sm border border-white/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-right">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                  {preview.specialist.displayName}
                  {preview.instagramPickedAt && (
                    <span className="text-[10px] font-bold text-fuchsia-700">برداشته‌شده</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {preview.categoryTitle}
                  {preview.title ? ` · ${preview.title}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSelect(preview.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                    selected.has(preview.id)
                      ? "bg-jar-primary text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {selected.has(preview.id) ? "انتخاب‌شده" : "انتخاب"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyCaptions([preview])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  کپشن
                </button>
                {preview.mediaType === "IMAGE" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void downloadInstagramCrop(preview, "1:1")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-50 text-fuchsia-800"
                    >
                      ۱:۱
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadInstagramCrop(preview, "4:5")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-fuchsia-50 text-fuchsia-800"
                    >
                      ۴:۵
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void downloadSingle(preview)}
                  disabled={singleBusyId === preview.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white disabled:opacity-50"
                >
                  {singleBusyId === preview.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  دانلود
                </button>
                <Link
                  href={`/s/${preview.specialist.userId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white"
                >
                  پروفایل
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
