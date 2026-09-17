"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  DoorOpen,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Save,
  Shirt,
  Smartphone,
  Shield,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { formatJalaliDate } from "@/lib/date/jalali";
import {
  reviewPhotoLocationAction,
  updatePendingPhotoLocationAction,
} from "@/app/actions/locationActions";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import {
  MAX_LOCATION_IMAGES,
  MAX_LOCATION_VIDEOS,
  SECURITY_LABELS,
  LOCATION_CATEGORIES,
  locationCategoryLabel,
  type PhotoLocationSecurity,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import { processSinglePortfolioFile, isVideoFile, isAllowedPortfolioVideo, MAX_VIDEO_RAW_SIZE_BYTES } from "@/lib/clientImageCompression";
import JarLocationMiniMap from "@/components/tools/JarLocationMiniMap";
import { SERVICE_CITIES } from "@/lib/geo/serviceCities";
import { LocationProjectTypePicker } from "@/components/tools/LocationProjectTypePicker";
import { LocationPhotographerPicker } from "@/components/tools/LocationPhotographerPicker";
import { projectTypeChipLabel } from "@/lib/locations/projectTypes";

export type AdminPhotoLocationQueueRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: PhotoLocationCategory;
  city: string | null;
  district: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  contactPhone: string | null;
  submittedByPhone: string | null;
  lat: number;
  lng: number;
  needsPermit: boolean;
  proCameraAllowed: boolean;
  phoneCameraAllowed: boolean;
  hasEntranceFee: boolean;
  hasChangingRoom: boolean;
  hasParking: boolean;
  securityLevel: PhotoLocationSecurity;
  coverImageUrl: string | null;
  imageUrls: string[];
  videoUrls: string[];
  photographerUserId: string | null;
  photographerName: string | null;
  suitableFor: string[];
};

type Draft = {
  name: string;
  description: string;
  category: PhotoLocationCategory;
  city: string;
  district: string;
  address: string;
  lat: string;
  lng: string;
  needsPermit: boolean;
  proCameraAllowed: boolean;
  phoneCameraAllowed: boolean;
  hasEntranceFee: boolean;
  hasChangingRoom: boolean;
  hasParking: boolean;
  securityLevel: PhotoLocationSecurity;
  contactPhone: string;
  imageUrls: string[];
  videoUrls: string[];
  photographerUserId: string | null;
  photographerName: string | null;
  suitableFor: string[];
};

function toDraft(row: AdminPhotoLocationQueueRow): Draft {
  return {
    name: row.name,
    description: row.description || "",
    category: row.category || "OTHER",
    city: row.city || "",
    district: row.district || "",
    address: row.address || "",
    lat: String(row.lat),
    lng: String(row.lng),
    needsPermit: row.needsPermit,
    proCameraAllowed: row.proCameraAllowed,
    phoneCameraAllowed: row.phoneCameraAllowed,
    hasEntranceFee: row.hasEntranceFee,
    hasChangingRoom: row.hasChangingRoom,
    hasParking: row.hasParking,
    securityLevel: row.securityLevel,
    contactPhone: row.contactPhone ? phoneToLocalDisplay(row.contactPhone) : "",
    imageUrls: [...(row.imageUrls || [])],
    videoUrls: [...(row.videoUrls || [])],
    photographerUserId: row.photographerUserId,
    photographerName: row.photographerName,
    suitableFor: [...(row.suitableFor || [])],
  };
}

function draftToPatch(draft: Draft) {
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    category: draft.category,
    city: draft.city.trim() || null,
    district: draft.district.trim() || null,
    address: draft.address.trim() || null,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    needsPermit: draft.needsPermit,
    proCameraAllowed: draft.proCameraAllowed,
    phoneCameraAllowed: draft.phoneCameraAllowed,
    hasEntranceFee: draft.hasEntranceFee,
    hasChangingRoom: draft.hasChangingRoom,
    hasParking: draft.hasParking,
    securityLevel: draft.securityLevel,
    contactPhone: draft.contactPhone.trim() || null,
    imageUrls: draft.imageUrls,
    videoUrls: draft.videoUrls,
    coverImageUrl: draft.imageUrls[0] || null,
    photographerUserId: draft.photographerUserId,
    photographerName: draft.photographerName,
    reslug: true,
    suitableFor: draft.suitableFor,
  };
}

function ToggleChip({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
        checked
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AdminPhotoLocationQueue({
  items,
}: {
  items: AdminPhotoLocationQueueRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(items[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(items.map((r) => [r.id, toDraft(r)]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);

  // Keep drafts for new items arriving via refresh
  React.useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of items) {
        if (!next[row.id]) next[row.id] = toDraft(row);
      }
      return next;
    });
    if (expanded && !items.some((i) => i.id === expanded)) {
      setExpanded(items[0]?.id ?? null);
    }
  }, [items, expanded]);

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || toDraft(items.find((i) => i.id === id)!)), ...patch },
    }));
  };

  const uploadImages = async (id: string, files: FileList | File[]) => {
    const draft = drafts[id];
    if (!draft) return;
    const list = Array.from(files);
    setUploadingId(id);
    setError(null);
    const addedImages: string[] = [];
    const addedVideos: string[] = [];
    try {
      for (const file of list) {
        if (isVideoFile(file)) {
          if (!isAllowedPortfolioVideo(file)) {
            throw new Error(`فقط ویدیوی MP4 مجاز است («${file.name}»).`);
          }
          if (file.size > MAX_VIDEO_RAW_SIZE_BYTES) {
            throw new Error("حجم ویدیو نباید بیشتر از ۴۰ مگابایت باشد.");
          }
          if (draft.videoUrls.length + addedVideos.length >= MAX_LOCATION_VIDEOS) {
            throw new Error(`حداکثر ${MAX_LOCATION_VIDEOS.toLocaleString("fa-IR")} ویدیو.`);
          }
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/location/upload", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok || !json?.url) throw new Error(json?.error || "آپلود ناموفق بود.");
          addedVideos.push(json.url as string);
          continue;
        }
        if (draft.imageUrls.length + addedImages.length >= MAX_LOCATION_IMAGES) {
          throw new Error(`حداکثر ${MAX_LOCATION_IMAGES.toLocaleString("fa-IR")} عکس.`);
        }
        const optimized = await processSinglePortfolioFile(file, addedImages.length, list.length);
        const fd = new FormData();
        fd.append("file", optimized);
        const res = await fetch("/api/location/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json?.url) {
          throw new Error(json?.error || "آپلود ناموفق بود.");
        }
        addedImages.push(json.url as string);
      }
      patchDraft(id, {
        imageUrls: [...draft.imageUrls, ...addedImages],
        videoUrls: [...draft.videoUrls, ...addedVideos],
      });
    } catch (e: any) {
      setError(e?.message || "خطا در آپلود فایل.");
    } finally {
      setUploadingId(null);
    }
  };

  const runAction = (
    id: string,
    fn: () => Promise<{ success: boolean; error?: string; message?: string }>
  ) => {
    setError(null);
    setToast(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.success) {
        setError(res.error || "خطا");
        return;
      }
      setToast(res.message || "انجام شد");
      setRejectId(null);
      setReason("");
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
        لوکیشن در انتظار تایید نیست.
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          {toast}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,.mp4"
        multiple
        className="hidden"
        onChange={(e) => {
          const id = uploadTargetId.current;
          const files = e.target.files;
          e.target.value = "";
          if (id && files?.length) void uploadImages(id, files);
        }}
      />

      {items.map((row) => {
        const draft = drafts[row.id] || toDraft(row);
        const open = expanded === row.id;
        const busy = busyId === row.id && isPending;
        const uploading = uploadingId === row.id;
        const gallery = draft.imageUrls;
        const cover = gallery[0] || row.coverImageUrl;

        return (
          <article
            key={row.id}
            className={`rounded-2xl border bg-white shadow-xs overflow-hidden transition-colors ${
              open ? "border-[#CC785C]/40 ring-1 ring-[#CC785C]/15" : "border-slate-200"
            }`}
          >
            <button
              type="button"
              onClick={() => setExpanded(open ? null : row.id)}
              className="w-full flex items-center gap-3 p-3.5 text-right hover:bg-slate-50/80"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                {gallery.length > 0 && (
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                    {gallery.length.toLocaleString("fa-IR")}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#CC785C] shrink-0" />
                  {draft.name || row.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {locationCategoryLabel(draft.category || row.category)} ·{" "}
                  {[draft.city || row.city, draft.district || row.district]
                    .filter(Boolean)
                    .join(" · ") || "—"}{" "}
                  · {formatJalaliDate(new Date(row.createdAt))}
                </p>
                {(draft.suitableFor || row.suitableFor).length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {(draft.suitableFor || row.suitableFor)
                      .slice(0, 4)
                      .map((s) => projectTypeChipLabel(s))
                      .join(" · ")}
                    {(draft.suitableFor || row.suitableFor).length > 4
                      ? ` +${(draft.suitableFor || row.suitableFor).length - 4}`
                      : ""}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5" dir="ltr">
                  ثبت‌کننده:{" "}
                  {row.submittedByPhone
                    ? phoneToLocalDisplay(row.submittedByPhone)
                    : "—"}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                {/* Gallery */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-[#CC785C]" />
                      گالری عکس و ویدیو
                    </p>
                    <button
                      type="button"
                      disabled={
                        uploading ||
                        (gallery.length >= MAX_LOCATION_IMAGES &&
                          draft.videoUrls.length >= MAX_LOCATION_VIDEOS)
                      }
                      onClick={() => {
                        uploadTargetId.current = row.id;
                        fileRef.current?.click();
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      افزودن فایل
                    </button>
                  </div>
                  {gallery.length === 0 && draft.videoUrls.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-[11px] text-slate-500">
                      هنوز فایل ثبت نشده — می‌توانید قبل از تایید عکس یا ویدیو اضافه کنید.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {gallery.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover cursor-zoom-in"
                            onClick={() => setPreviewUrl(url)}
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              کاور
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...gallery];
                                  const [item] = next.splice(idx, 1);
                                  next.unshift(item);
                                  patchDraft(row.id, { imageUrls: next });
                                }}
                                className="flex-1 rounded bg-white/90 py-0.5 text-[9px] font-bold text-slate-800"
                              >
                                کاور
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                patchDraft(row.id, {
                                  imageUrls: gallery.filter((_, i) => i !== idx),
                                })
                              }
                              className="rounded bg-rose-600/90 px-1.5 py-0.5 text-white"
                              aria-label="حذف"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {draft.videoUrls.map((url, idx) => (
                        <div
                          key={`vid-${url}-${idx}`}
                          className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                        >
                          <video src={url} className="h-full w-full object-cover" muted playsInline />
                          <span className="absolute top-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            ویدیو
                          </span>
                          <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent">
                            <button
                              type="button"
                              onClick={() =>
                                patchDraft(row.id, {
                                  videoUrls: draft.videoUrls.filter((_, i) => i !== idx),
                                })
                              }
                              className="rounded bg-rose-600/90 px-1.5 py-0.5 text-white"
                              aria-label="حذف ویدیو"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Fields */}
                  <section className="space-y-3">
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600">نام</span>
                      <input
                        value={draft.name}
                        onChange={(e) => patchDraft(row.id, { name: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600">دسته</span>
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          patchDraft(row.id, {
                            category: e.target.value as PhotoLocationCategory,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                      >
                        {LOCATION_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600">توضیحات</span>
                      <textarea
                        value={draft.description}
                        onChange={(e) => patchDraft(row.id, { description: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold text-slate-600">شهر</span>
                        <select
                          value={draft.city}
                          onChange={(e) => patchDraft(row.id, { city: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="">— انتخاب شهر —</option>
                          {SERVICE_CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {draft.city &&
                            !(SERVICE_CITIES as readonly string[]).includes(draft.city) && (
                              <option value={draft.city}>{draft.city}</option>
                            )}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold text-slate-600">محله</span>
                        <input
                          value={draft.district}
                          onChange={(e) => patchDraft(row.id, { district: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        />
                      </label>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <LocationProjectTypePicker
                        value={draft.suitableFor}
                        onChange={(slugs) => patchDraft(row.id, { suitableFor: slugs })}
                        compact
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                      <LocationPhotographerPicker
                        compact
                        value={{
                          photographerUserId: draft.photographerUserId,
                          photographerName: draft.photographerName,
                        }}
                        onChange={(next) =>
                          patchDraft(row.id, {
                            photographerUserId: next.photographerUserId,
                            photographerName: next.photographerName,
                          })
                        }
                      />
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600">آدرس</span>
                      <input
                        value={draft.address}
                        onChange={(e) => patchDraft(row.id, { address: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold text-slate-600">عرض جغرافیایی</span>
                        <input
                          value={draft.lat}
                          onChange={(e) => patchDraft(row.id, { lat: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
                          dir="ltr"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold text-slate-600">طول جغرافیایی</span>
                        <input
                          value={draft.lng}
                          onChange={(e) => patchDraft(row.id, { lng: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
                          dir="ltr"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        شماره هماهنگی
                      </span>
                      <input
                        value={draft.contactPhone}
                        onChange={(e) => patchDraft(row.id, { contactPhone: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                        dir="ltr"
                        placeholder="09…"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold text-slate-600">سطح امنیت</span>
                      <select
                        value={draft.securityLevel}
                        onChange={(e) =>
                          patchDraft(row.id, {
                            securityLevel: e.target.value as PhotoLocationSecurity,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      >
                        {(Object.keys(SECURITY_LABELS) as PhotoLocationSecurity[]).map((k) => (
                          <option key={k} value={k}>
                            {SECURITY_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <ToggleChip
                        icon={<Shield className="h-3 w-3" />}
                        label="نیاز به مجوز"
                        checked={draft.needsPermit}
                        onChange={(v) => patchDraft(row.id, { needsPermit: v })}
                      />
                      <ToggleChip
                        icon={<Camera className="h-3 w-3" />}
                        label="دوربین حرفه‌ای"
                        checked={draft.proCameraAllowed}
                        onChange={(v) => patchDraft(row.id, { proCameraAllowed: v })}
                      />
                      <ToggleChip
                        icon={<Smartphone className="h-3 w-3" />}
                        label="گوشی"
                        checked={draft.phoneCameraAllowed}
                        onChange={(v) => patchDraft(row.id, { phoneCameraAllowed: v })}
                      />
                      <ToggleChip
                        icon={<DoorOpen className="h-3 w-3" />}
                        label="ورودی"
                        checked={draft.hasEntranceFee}
                        onChange={(v) => patchDraft(row.id, { hasEntranceFee: v })}
                      />
                      <ToggleChip
                        icon={<Shirt className="h-3 w-3" />}
                        label="تعویض لباس"
                        checked={draft.hasChangingRoom}
                        onChange={(v) => patchDraft(row.id, { hasChangingRoom: v })}
                      />
                      <ToggleChip
                        icon={<Car className="h-3 w-3" />}
                        label="پارکینگ"
                        checked={draft.hasParking}
                        onChange={(v) => patchDraft(row.id, { hasParking: v })}
                      />
                    </div>
                  </section>

                  {/* Map + meta */}
                  <section className="space-y-3">
                    <JarLocationMiniMap
                      lat={Number(draft.lat) || row.lat}
                      lng={Number(draft.lng) || row.lng}
                      name={draft.name || row.name}
                    />
                    <Link
                      href={`https://www.openstreetmap.org/?mlat=${draft.lat || row.lat}&mlon=${draft.lng || row.lng}#map=16/${draft.lat || row.lat}/${draft.lng || row.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600"
                    >
                      باز کردن در نقشه
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      slug: {row.slug}
                    </p>
                  </section>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={busy || uploading || !draft.name.trim()}
                    onClick={() =>
                      runAction(row.id, () =>
                        updatePendingPhotoLocationAction({
                          id: row.id,
                          patch: draftToPatch(draft),
                        })
                      )
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    ذخیره ویرایش
                  </button>
                  <button
                    type="button"
                    disabled={busy || uploading || !draft.name.trim()}
                    onClick={() =>
                      runAction(row.id, () =>
                        reviewPhotoLocationAction({
                          id: row.id,
                          decision: "APPROVED",
                          patch: draftToPatch(draft),
                        })
                      )
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    تایید و انتشار
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setRejectId(row.id);
                      setReason("");
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رد
                  </button>
                </div>

                {rejectId === row.id && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs"
                      placeholder="دلیل رد (الزامی) — برای ثبت‌کننده نمایش داده می‌شود"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setRejectId(null)}
                        className="h-8 px-3 text-[11px] font-bold text-slate-600"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        disabled={busy || !reason.trim()}
                        onClick={() =>
                          runAction(row.id, () =>
                            reviewPhotoLocationAction({
                              id: row.id,
                              decision: "REJECTED",
                              reason: reason.trim(),
                              patch: draftToPatch(draft),
                            })
                          )
                        }
                        className="h-8 rounded-lg bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        تایید رد
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="absolute top-4 left-4 rounded-full bg-white/90 p-2 text-slate-800"
            onClick={() => setPreviewUrl(null)}
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
