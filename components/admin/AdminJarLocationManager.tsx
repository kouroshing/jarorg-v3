"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  ExternalLink,
  HardDrive,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  reviewPhotoLocationAction,
  seedFreeJarLocationsAction,
  setPhotoLocationStatusAction,
  syncJarLocationMoodsToDiskAction,
  updateJarLocationPageSettingsAction,
  updatePendingPhotoLocationAction,
} from "@/app/actions/locationActions";
import {
  LOCATION_CATEGORIES,
  locationCategoryLabel,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";
import { processSinglePortfolioFile } from "@/lib/clientImageCompression";
import AdminPhotoLocationQueue, {
  type AdminPhotoLocationQueueRow,
} from "@/components/admin/AdminPhotoLocationQueue";
import { SERVICE_CITIES } from "@/lib/geo/serviceCities";
import {
  AUDIENCE_OPTIONS,
  locationMatchesAudience,
  locationMatchesCity,
  projectTypeChipLabel,
  type LocationAudience,
} from "@/lib/locations/projectTypes";
import { LocationProjectTypePicker } from "@/components/tools/LocationProjectTypePicker";
import { FREE_JAR_LOCATION_SEED } from "@/lib/locations/freeLocationSeed";

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  category: PhotoLocationCategory;
  city: string | null;
  status: string;
  coverImageUrl: string | null;
  suitableFor: string[];
  createdAt: string;
};

export default function AdminJarLocationManager({
  initialSettings,
  pendingItems,
  catalogItems,
}: {
  initialSettings: JarLocationPageSettingsPublic;
  pendingItems: AdminPhotoLocationQueueRow[];
  catalogItems: CatalogRow[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [tab, setTab] = useState<"page" | "queue" | "catalog">("page");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [catalogCity, setCatalogCity] = useState<string>("ALL");
  const [catalogAudience, setCatalogAudience] = useState<LocationAudience>("ALL");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCity, setEditCity] = useState("");
  const [editSuitable, setEditSuitable] = useState<string[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadImage = async (key: string, file: File) => {
    setUploadingKey(key);
    setErr(null);
    try {
      const optimized = await processSinglePortfolioFile(file, 0, 1);
      const fd = new FormData();
      fd.append("file", optimized);
      const res = await fetch("/api/location/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "آپلود ناموفق");
      return json.url as string;
    } finally {
      setUploadingKey(null);
    }
  };

  const save = () => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updateJarLocationPageSettingsAction(settings);
      if (!res.success) {
        setErr(res.error);
        return;
      }
      setSettings(res.settings);
      setMsg("تنظیمات صفحه ذخیره شد.");
      router.refresh();
    });
  };

  const setStatus = (id: string, decision: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await reviewPhotoLocationAction({
        id,
        decision,
        reason: decision === "REJECTED" ? "رد توسط ادمین از پنل جار لوکیشن" : undefined,
      });
      if (!res.success) {
        setErr(res.error);
        return;
      }
      setMsg(res.message || "انجام شد.");
      router.refresh();
    });
  };

  const seedFree = () => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await seedFreeJarLocationsAction();
      if (!res.success) {
        setErr(res.error);
        return;
      }
      setMsg(res.message);
      setTab("catalog");
      router.refresh();
    });
  };

  const syncMoods = () => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await syncJarLocationMoodsToDiskAction();
      if (!res.success) {
        setErr(res.error);
        return;
      }
      setMsg(res.message);
      router.refresh();
    });
  };

  const filteredCatalog = catalogItems.filter((item) => {
    if (catalogStatus !== "ALL" && item.status !== catalogStatus) return false;
    if (!locationMatchesCity(item.city, catalogCity === "ALL" ? null : catalogCity)) return false;
    if (!locationMatchesAudience(item.suitableFor || [], catalogAudience)) return false;
    return true;
  });

  const startEdit = (item: CatalogRow) => {
    setEditId(item.id);
    setEditCity(item.city || "");
    setEditSuitable(item.suitableFor || []);
  };

  const saveCatalogEdit = (id: string) => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updatePendingPhotoLocationAction({
        id,
        patch: {
          city: editCity || null,
          suitableFor: editSuitable,
        },
      });
      if (!res.success) {
        setErr(res.error);
        return;
      }
      setMsg("شهر و نوع پروژه ذخیره شد.");
      setEditId(null);
      router.refresh();
    });
  };

  const cityCounts = SERVICE_CITIES.map((c) => ({
    city: c,
    count: catalogItems.filter((i) => locationMatchesCity(i.city, c)).length,
  })).filter((r) => r.count > 0);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#CC785C]" />
            مدیریت جار لوکیشن
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            ویرایش ظاهر صفحه عمومی، صف تایید، شهر و نوع پروژه (شخصی / تجاری)
          </p>
          {cityCounts.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {cityCounts.map((row) => (
                <span
                  key={row.city}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                >
                  {row.city} {row.count.toLocaleString("fa-IR")}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tools/locations"
            target="_blank"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            مشاهده صفحه
          </Link>
          <Link
            href="/tools/locations/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#CC785C] px-4 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            ثبت لوکیشن
          </Link>
        </div>
      </div>

      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 gap-1">
        {(
          [
            ["page", "ظاهر صفحه"],
            ["queue", `صف تایید (${pendingItems.length.toLocaleString("fa-IR")})`],
            ["catalog", "فهرست لوکیشن‌ها"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-black transition-colors ${
              tab === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(msg || err) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
            err
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {tab === "page" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#F0C7B4] bg-[#FFF8F4] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#CC785C]" />
                  شروع سریع کاتالوگ
                </p>
                <p className="mt-1 text-[11px] text-slate-600 font-medium leading-relaxed max-w-xl">
                  {FREE_JAR_LOCATION_SEED.length.toLocaleString("fa-IR")} لوکیشن رایگان عمومی
                  (پارک و خیابان معروف) را بدون scrape وارد کنید. عکس‌های هیرو/دسته را یک‌بار روی دیسک
                  uploads بگذارید تا هر دپلوی دوباره ارسال نشوند.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={seedFree}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#CC785C] px-4 text-[11px] font-black text-white disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                افزودن لوکیشن‌های رایگان
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={syncMoods}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[11px] font-black text-slate-800 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5" />
                )}
                کپی عکس‌های ظاهر روی دیسک سرور
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              عکس واقعی هر لوکیشن را بعداً از صف تایید یا ویرایش همان لوکیشن آپلود کنید؛ روی دیسک
              دائمی <code className="font-mono">uploads</code> می‌ماند و با دپلوی پاک نمی‌شود.
            </p>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500">عنوان هیرو</span>
              <input
                value={settings.heroTitle}
                onChange={(e) => setSettings((s) => ({ ...s, heroTitle: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-500">زیرعنوان</span>
              <textarea
                value={settings.heroSubtitle}
                onChange={(e) => setSettings((s) => ({ ...s, heroSubtitle: e.target.value }))}
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ImageSlot
              label="عکس هیرو"
              url={settings.heroImageUrl}
              uploading={uploadingKey === "hero"}
              inputRef={(el) => {
                fileRefs.current.hero = el;
              }}
              onPick={() => fileRefs.current.hero?.click()}
              onFile={async (file) => {
                const url = await uploadImage("hero", file);
                setSettings((s) => ({ ...s, heroImageUrl: url }));
              }}
            />
            <ImageSlot
              label="چیپ «همه»"
              url={settings.allChipImageUrl}
              uploading={uploadingKey === "all"}
              inputRef={(el) => {
                fileRefs.current.all = el;
              }}
              onPick={() => fileRefs.current.all?.click()}
              onFile={async (file) => {
                const url = await uploadImage("all", file);
                setSettings((s) => ({ ...s, allChipImageUrl: url }));
              }}
            />
            <ImageSlot
              label="چیپ «رایگان»"
              url={settings.freeChipImageUrl}
              uploading={uploadingKey === "free"}
              inputRef={(el) => {
                fileRefs.current.free = el;
              }}
              onPick={() => fileRefs.current.free?.click()}
              onFile={async (file) => {
                const url = await uploadImage("free", file);
                setSettings((s) => ({ ...s, freeChipImageUrl: url }));
              }}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-black text-slate-500 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              عکس دسته‌ها
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {LOCATION_CATEGORIES.map((c) => (
                <ImageSlot
                  key={c.id}
                  label={c.label}
                  url={settings.categoryImages[c.id]}
                  uploading={uploadingKey === c.id}
                  inputRef={(el) => {
                    fileRefs.current[c.id] = el;
                  }}
                  onPick={() => fileRefs.current[c.id]?.click()}
                  onFile={async (file) => {
                    const url = await uploadImage(c.id, file);
                    setSettings((s) => ({
                      ...s,
                      categoryImages: { ...s.categoryImages, [c.id]: url },
                    }));
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isPending || Boolean(uploadingKey)}
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-black text-white disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره ظاهر صفحه
          </button>
        </div>
        </div>
      )}

      {tab === "queue" && (
        <div className="space-y-3">
          <AdminPhotoLocationQueue items={pendingItems} />
        </div>
      )}

      {tab === "catalog" && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCatalogStatus(st)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                    catalogStatus === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {st === "ALL"
                    ? "همه وضعیت‌ها"
                    : st === "PENDING"
                      ? "در انتظار"
                      : st === "APPROVED"
                        ? "منتشر"
                        : "رد شده"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCatalogCity("ALL")}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                  catalogCity === "ALL"
                    ? "bg-[#CC785C] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                همه شهرها
              </button>
              {SERVICE_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatalogCity(c)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    catalogCity === c
                      ? "bg-[#CC785C] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCatalogAudience(opt.id)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    catalogAudience === opt.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-medium text-slate-400">
              {filteredCatalog.length.toLocaleString("fa-IR")} از{" "}
              {catalogItems.length.toLocaleString("fa-IR")} لوکیشن
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            {catalogItems.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">هنوز لوکیشنی ثبت نشده.</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">با این فیلتر موردی نیست.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredCatalog.map((item) => (
                  <li key={item.id} className="p-3 sm:p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {item.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {locationCategoryLabel(item.category)}
                          {item.city ? ` · ${item.city}` : " · بدون شهر"}
                          {" · "}
                          {item.status === "APPROVED"
                            ? "منتشر"
                            : item.status === "PENDING"
                              ? "در انتظار"
                              : "رد شده"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {(item.suitableFor || []).length > 0
                            ? item.suitableFor
                                .slice(0, 3)
                                .map((s) => projectTypeChipLabel(s))
                                .join(" · ")
                            : "نوع پروژه مشخص نشده"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            editId === item.id ? setEditId(null) : startEdit(item)
                          }
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                        >
                          {editId === item.id ? "بستن" : "ویرایش"}
                        </button>
                        {item.status === "APPROVED" && (
                          <Link
                            href={`/locations/${item.slug}`}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                          >
                            صفحه
                          </Link>
                        )}
                        {item.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setStatus(item.id, "APPROVED")}
                              className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white"
                            >
                              تایید
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setStatus(item.id, "REJECTED")}
                              className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white"
                            >
                              رد
                            </button>
                          </>
                        )}
                        {item.status === "REJECTED" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const res = await setPhotoLocationStatusAction({
                                  id: item.id,
                                  status: "APPROVED",
                                });
                                if (!res.success) {
                                  setErr(res.error);
                                  return;
                                }
                                setMsg(res.message || "منتشر شد.");
                                router.refresh();
                              });
                            }}
                            className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white"
                          >
                            انتشار مجدد
                          </button>
                        )}
                        {item.status === "APPROVED" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const res = await setPhotoLocationStatusAction({
                                  id: item.id,
                                  status: "REJECTED",
                                  reason: "برداشته‌شده از انتشار توسط ادمین",
                                });
                                if (!res.success) {
                                  setErr(res.error);
                                  return;
                                }
                                setMsg(res.message || "از انتشار خارج شد.");
                                router.refresh();
                              });
                            }}
                            className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700"
                          >
                            برداشتن
                          </button>
                        )}
                      </div>
                    </div>
                    {editId === item.id && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold text-slate-600">شهر</span>
                          <select
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                          >
                            <option value="">— انتخاب شهر —</option>
                            {SERVICE_CITIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <LocationProjectTypePicker
                          value={editSuitable}
                          onChange={setEditSuitable}
                          compact
                        />
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => saveCatalogEdit(item.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-[11px] font-black text-white disabled:opacity-60"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          ذخیره شهر و پروژه
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageSlot({
  label,
  url,
  uploading,
  inputRef,
  onPick,
  onFile,
}: {
  label: string;
  url: string;
  uploading: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onPick: () => void;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="relative aspect-[4/3] bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-2.5">
        <span className="text-[11px] font-black text-slate-700 truncate">{label}</span>
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700"
        >
          <Upload className="h-3 w-3" />
          عوض کردن
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file).catch((err: Error) => alert(err.message));
        }}
      />
    </div>
  );
}
