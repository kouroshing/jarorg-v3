"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  Shield,
  Camera,
  Smartphone,
  DoorOpen,
  Shirt,
  Car,
  Phone,
  Loader2,
  Navigation,
  Plus,
  ExternalLink,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";
import {
  listApprovedPhotoLocationsAction,
  submitPhotoLocationAction,
} from "@/app/actions/locationActions";
import type { PhotoLocationPublic } from "@/lib/locations/photoLocation";
import {
  formatDistanceKm,
  MAX_LOCATION_IMAGES,
  SECURITY_LABELS,
} from "@/lib/locations/photoLocation";
import { processSinglePortfolioFile } from "@/lib/clientImageCompression";
import { getJarMapTileConfig, jarMapTileLayerOptions } from "@/lib/maps/tiles";

const LocationMapPicker = dynamic(
  () => import("@/components/order/LocationMapPicker"),
  { ssr: false }
);

const TEHRAN = { lat: 35.6892, lng: 51.389 };

function FlagChip({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
        ok
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-white/80 text-slate-500 border-slate-200/80"
      }`}
    >
      {label}
    </span>
  );
}

export function JarLocationExplorer() {
  const [items, setItems] = useState<PhotoLocationPublic[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [origin, setOrigin] = useState(TEHRAN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const load = (lat: number, lng: number) => {
    setLoading(true);
    void listApprovedPhotoLocationsAction({ lat, lng, limit: 120 }).then((res) => {
      setLoading(false);
      if (!res.success) return;
      setItems(res.items);
      setLoggedIn(res.loggedIn);
      if (res.items[0]) setSelectedId(res.items[0].id);
    });
  };

  useEffect(() => {
    load(TEHRAN.lat, TEHRAN.lng);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOrigin(next);
          setGeoHint("مرتب‌شده بر اساس موقعیت شما");
          load(next.lat, next.lng);
        },
        () => setGeoHint("مرتب‌شده از مرکز تهران (موقعیت در دسترس نیست)"),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    } else {
      setGeoHint("مرتب‌شده از مرکز تهران");
    }
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#f4f4f2]"
      dir="rtl"
    >
      <JarLocationLeafletMap
        items={items}
        selectedId={selected?.id ?? null}
        center={selected ? { lat: selected.lat, lng: selected.lng } : origin}
        onSelect={(id) => {
          setSelectedId(id);
          setListOpen(true);
        }}
        fullscreen
      />

      {/* Top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-6xl items-start justify-between gap-3">
          <div className="min-w-0 rounded-2xl border border-white/70 bg-white/85 backdrop-blur-md px-3.5 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-jar-logo" />
              <h1 className="text-sm sm:text-base font-black text-jar-primary truncate">
                جار لوکیشن
              </h1>
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-jar-muted leading-relaxed max-w-[16rem] sm:max-w-xs">
              لوکیشن و عمارت عکاسی روی نقشه مینیمال
            </p>
            {geoHint && (
              <p className="mt-1 text-[10px] text-jar-muted/90 flex items-center gap-1">
                <Navigation className="h-3 w-3 shrink-0" />
                <span className="truncate">{geoHint}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href="/tools/locations/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-jar-primary px-4 text-xs font-bold text-white shadow-md hover:bg-jar-primaryHover"
            >
              <Plus className="h-4 w-4" />
              افزودن
            </Link>
            <Link
              href="/tools"
              className="rounded-full border border-white/70 bg-white/85 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold text-jar-muted hover:text-jar-primary shadow-sm"
            >
              ← ابزارها
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute inset-x-0 bottom-0 z-[500] p-3 sm:p-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-6xl grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {selected && (
            <div className="rounded-2xl border border-white/70 bg-white/90 backdrop-blur-md p-4 space-y-3 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-jar-primary truncate">{selected.name}</h2>
                  <p className="text-[11px] text-jar-muted mt-0.5">
                    {[selected.city, selected.district].filter(Boolean).join(" · ") || "—"}
                    {selected.distanceKm != null
                      ? ` · ${formatDistanceKm(selected.distanceKm)}`
                      : ""}
                  </p>
                </div>
                <Link
                  href={`/locations/${selected.slug}`}
                  className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold text-jar-logo"
                >
                  صفحه کامل
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {selected.description && (
                <p className="text-xs text-jar-primary/90 leading-relaxed line-clamp-3">
                  {selected.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <FlagChip ok={selected.needsPermit} label={selected.needsPermit ? "نیاز به مجوز" : "بدون مجوز"} />
                <FlagChip ok={selected.proCameraAllowed} label="دوربین حرفه‌ای" />
                <FlagChip ok={selected.phoneCameraAllowed} label="گوشی" />
                <FlagChip ok={selected.hasEntranceFee} label={selected.hasEntranceFee ? "ورودی دارد" : "بدون ورودی"} />
                <FlagChip ok={selected.hasChangingRoom} label="رختکن" />
                <FlagChip ok={selected.hasParking} label="جای پارک" />
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  <Shield className="h-3 w-3" />
                  {SECURITY_LABELS[selected.securityLevel]}
                </span>
              </div>
              {selected.contactPhoneDisplay && (
                <p className="text-[11px] text-jar-muted flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {selected.contactPhoneRevealed ? (
                    <a
                      href={`tel:${selected.contactPhoneDisplay}`}
                      className="font-mono font-bold text-jar-primary"
                      dir="ltr"
                    >
                      {selected.contactPhoneDisplay}
                    </a>
                  ) : (
                    <span>
                      <span className="font-mono" dir="ltr">
                        {selected.contactPhoneDisplay}
                      </span>
                      {" · "}
                      {!loggedIn ? (
                        <Link
                          href="/login?next=/tools/locations"
                          className="text-jar-logo font-bold underline"
                        >
                          ورود برای دیدن شماره
                        </Link>
                      ) : (
                        "شماره کامل پس از ورود"
                      )}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/70 bg-white/90 backdrop-blur-md shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-black text-jar-primary border-b border-jar-border/60"
            >
              <span>نزدیک‌ترین‌ها به من</span>
              <span className="text-[10px] font-bold text-jar-muted">
                {listOpen ? "بستن" : "باز کردن"} ·{" "}
                {items.length.toLocaleString("fa-IR")}
              </span>
            </button>
            {listOpen && (
              <div className="max-h-[28vh] sm:max-h-[34vh] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-jar-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-jar-muted text-center py-6 px-4">
                    هنوز لوکیشن تاییدشده‌ای نیست. اولین را شما اضافه کنید.
                  </p>
                ) : (
                  <ul className="divide-y divide-jar-border/50">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full text-right px-4 py-2.5 transition-colors ${
                            selectedId === item.id
                              ? "bg-jar-soft"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-jar-border bg-jar-soft">
                              {item.coverImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.coverImageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-jar-muted/40">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-jar-primary truncate">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-jar-muted shrink-0">
                                  {item.distanceKm != null
                                    ? formatDistanceKm(item.distanceKm)
                                    : "—"}
                                </span>
                              </div>
                              <p className="text-[10px] text-jar-muted mt-0.5 truncate">
                                {[item.city, item.district].filter(Boolean).join(" · ") || "—"}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Imperative leaflet map with circular pins — avoids react-leaflet SSR issues. */
function JarLocationLeafletMap({
  items,
  selectedId,
  center,
  onSelect,
  fullscreen = false,
}: {
  items: PhotoLocationPublic[];
  selectedId: string | null;
  center: { lat: number; lng: number };
  onSelect: (id: string) => void;
  fullscreen?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
      });
      const tileCfg = getJarMapTileConfig();
      L.tileLayer(tileCfg.url, jarMapTileLayerOptions(tileCfg)).addTo(map);
      L.control.zoom({ position: "topleft" }).addTo(map);
      mapRef.current = map;
      // Fullscreen layout: tiles need a size pass after mount.
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(onResize, 120);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [fullscreen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      for (const item of items) {
        const active = item.id === selectedId;
        const icon = L.divIcon({
          className: "jar-loc-marker",
          html: `<div style="width:${active ? 18 : 14}px;height:${active ? 18 : 14}px;border-radius:9999px;background:${active ? "#006097" : "#CC785C"};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.25)"></div>`,
          iconSize: [active ? 18 : 14, active ? 18 : 14],
          iconAnchor: [active ? 9 : 7, active ? 9 : 7],
        });
        const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);
        marker.on("click", () => onSelectRef.current(item.id));
        markersRef.current.set(item.id, marker);
      }
    })();
  }, [items, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), 12), { animate: true });
  }, [center.lat, center.lng]);

  return (
    <div
      className={`absolute inset-0 z-0 overflow-hidden ${
        fullscreen ? "" : "rounded-2xl border border-jar-border"
      }`}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 jar-location-map [&_.leaflet-tile-pane]:brightness-[1.02] [&_.leaflet-tile-pane]:contrast-[0.96] [&_.leaflet-tile-pane]:saturate-[0.75] [&_.leaflet-control-attribution]:bg-white/70 [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-attribution]:backdrop-blur-sm"
      />
    </div>
  );
}

export function JarLocationSubmitForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(TEHRAN);
  const [needsPermit, setNeedsPermit] = useState(false);
  const [proCameraAllowed, setProCameraAllowed] = useState(true);
  const [phoneCameraAllowed, setPhoneCameraAllowed] = useState(true);
  const [hasEntranceFee, setHasEntranceFee] = useState(false);
  const [hasChangingRoom, setHasChangingRoom] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [contactPhone, setContactPhone] = useState("");
  const [isVenueOwner, setIsVenueOwner] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const contactDigitsLen = contactPhone.replace(/\D/g, "").length;
  const phoneReady = !hasEntranceFee || contactDigitsLen >= 10;

  const uploadFiles = async (files: FileList | File[]) => {
    const remaining = MAX_LOCATION_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      setError(`حداکثر ${MAX_LOCATION_IMAGES.toLocaleString("fa-IR")} عکس می‌توانید بفرستید.`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        const optimized = await processSinglePortfolioFile(list[i], i, list.length);
        const fd = new FormData();
        fd.append("file", optimized);
        const res = await fetch("/api/location/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json?.url) throw new Error(json?.error || "آپلود ناموفق");
        urls.push(json.url as string);
      }
      setImageUrls((prev) => [...prev, ...urls]);
    } catch (e: any) {
      setError(e?.message || "خطا در آپلود عکس");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (imageUrls.length === 0) {
      setError("حداقل یک عکس از لوکیشن اضافه کنید.");
      return;
    }

    if (hasEntranceFee) {
      if (contactPhone.trim().length < 10) {
        setError("برای لوکیشن با ورودی، شماره هماهنگی صاحب مجموعه را وارد کنید.");
        return;
      }
    }

    startTransition(async () => {
      const res = await submitPhotoLocationAction({
        name,
        description,
        lat: coords.lat,
        lng: coords.lng,
        city: city || null,
        district: district || null,
        address: address || null,
        needsPermit,
        proCameraAllowed,
        phoneCameraAllowed,
        hasEntranceFee,
        hasChangingRoom,
        hasParking,
        securityLevel,
        contactPhone: hasEntranceFee ? contactPhone : null,
        submitterIsVenueOwner: hasEntranceFee ? isVenueOwner : false,
        imageUrls,
        coverImageUrl: imageUrls[0] || null,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOk(res.message || "ثبت شد");
      setTimeout(() => router.push("/tools/locations"), 1200);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-lg font-black text-jar-primary">ثبت لوکیشن در جار لوکیشن</h1>
        <p className="text-xs text-jar-muted mt-1 leading-relaxed">
          بعد از بررسی تیم جار روی نقشه عمومی نمایش داده می‌شود.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-jar-primary">نام لوکیشن</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-jar-border bg-white px-3 py-2.5 text-sm"
          placeholder="مثلاً عمارت باغ‌فردوس"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-jar-primary">توضیحات</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-jar-border bg-white px-3 py-2.5 text-sm"
          placeholder="فضا، نور، محدودیت‌ها، ساعات…"
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-jar-primary flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            عکس‌های لوکیشن <span className="text-rose-600">*</span>
          </p>
          <button
            type="button"
            disabled={uploading || isPending || imageUrls.length >= MAX_LOCATION_IMAGES}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-jar-border bg-white px-3 text-[10px] font-bold text-jar-primary disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            افزودن عکس
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files?.length) void uploadFiles(files);
          }}
        />
        {imageUrls.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border border-dashed border-jar-border bg-jar-soft/40 px-4 py-8 text-center text-[11px] text-jar-muted"
          >
            حداقل یک عکس واضح از فضا بفرستید (تا ۸ عکس)
          </button>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {imageUrls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-jar-border bg-jar-soft"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    کاور
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 left-1 rounded-full bg-rose-600/90 p-0.5 text-white"
                  aria-label="حذف"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-jar-primary">شهر</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-sm"
            placeholder="تهران"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-jar-primary">محله</span>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-jar-primary">آدرس</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-jar-primary flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          موقعیت روی نقشه
        </p>
        <div className="rounded-2xl overflow-hidden border border-jar-border min-h-[280px]">
          <LocationMapPicker
            variant="embedded"
            district={district}
            onChangeDistrict={setDistrict}
            address={address}
            onChangeAddress={setAddress}
            onChangeCoords={(c) => setCoords(c)}
            initialCoords={coords}
            pinLabel="محل لوکیشن"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <ToggleRow
          icon={<Shield className="h-3.5 w-3.5" />}
          label="نیاز به مجوز"
          checked={needsPermit}
          onChange={setNeedsPermit}
        />
        <ToggleRow
          icon={<Camera className="h-3.5 w-3.5" />}
          label="دوربین حرفه‌ای مجاز"
          checked={proCameraAllowed}
          onChange={setProCameraAllowed}
        />
        <ToggleRow
          icon={<Smartphone className="h-3.5 w-3.5" />}
          label="عکاسی با گوشی مجاز"
          checked={phoneCameraAllowed}
          onChange={setPhoneCameraAllowed}
        />
        <ToggleRow
          icon={<DoorOpen className="h-3.5 w-3.5" />}
          label="ورودی دارد"
          checked={hasEntranceFee}
          onChange={(checked) => {
            setHasEntranceFee(checked);
            if (!checked) {
              setContactPhone("");
              setIsVenueOwner(false);
            }
          }}
        />
        <ToggleRow
          icon={<Shirt className="h-3.5 w-3.5" />}
          label="جای تعویض لباس"
          checked={hasChangingRoom}
          onChange={setHasChangingRoom}
        />
        <ToggleRow
          icon={<Car className="h-3.5 w-3.5" />}
          label="جای پارک دارد"
          checked={hasParking}
          onChange={setHasParking}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-jar-primary">سطح امنیت</span>
        <select
          value={securityLevel}
          onChange={(e) => setSecurityLevel(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-sm"
        >
          <option value="LOW">پایین</option>
          <option value="MEDIUM">متوسط</option>
          <option value="HIGH">بالا</option>
        </select>
      </label>

      {hasEntranceFee && (
        <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
          <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
            شماره هماهنگی باید متعلق به <strong>صاحب یا مسئول مجموعه</strong> باشد — برای
            هماهنگی ورودی و پذیرش عکاسان. شماره شخصی خودتان (همان حساب جار) را وارد نکنید مگر
            خودتان صاحب مجموعه باشید.
          </p>

          <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-amber-200/60 bg-white/80 px-3 py-2.5">
            <input
              type="checkbox"
              checked={isVenueOwner}
              onChange={(e) => setIsVenueOwner(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span className="text-[11px] font-bold text-jar-primary leading-relaxed">
              خودم صاحب مجموعه (یا نماینده رسمی) هستم
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-jar-primary">
              شماره هماهنگی مجموعه <span className="text-rose-600">*</span>
            </span>
            <input
              required={hasEntranceFee}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-sm font-mono"
              placeholder="0912…"
              dir="ltr"
            />
            <span className="text-[10px] text-jar-muted">
              تا قبل از ورود کاربران، شماره ماسک می‌شود.
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-rose-700 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          {error}
        </p>
      )}
      {ok && (
        <p className="text-xs font-bold text-emerald-800 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          {ok}
        </p>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          uploading ||
          name.trim().length < 2 ||
          imageUrls.length === 0 ||
          (hasEntranceFee && !phoneReady)
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-white text-xs font-bold disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        ارسال برای تایید
      </button>
    </form>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-jar-border bg-jar-surface px-3 py-2.5 cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-jar-primary">
        {icon}
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
