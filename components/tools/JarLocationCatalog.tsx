"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Plus,
  Map as MapIcon,
  LayoutGrid,
  Camera,
  Car,
  ChevronDown,
  Heart,
  Briefcase,
} from "lucide-react";
import { listApprovedPhotoLocationsAction } from "@/app/actions/locationActions";
import type { PhotoLocationPublic } from "@/lib/locations/photoLocation";
import {
  formatDistanceKm,
  LOCATION_CATEGORIES,
  locationCategoryLabel,
  locationCategoryPinColor,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import type { JarLocationPageSettingsPublic } from "@/lib/locations/pageSettingsTypes";
import { DEFAULT_JAR_LOCATION_PAGE } from "@/lib/locations/pageSettingsDefaults";
import { getJarMapTileConfig, jarMapTileLayerOptions } from "@/lib/maps/tiles";
import { DEFAULT_SERVICE_CITY, SERVICE_CITIES } from "@/lib/geo/serviceCities";
import { lookupCityCenter } from "@/lib/geo/cityCenters";
import {
  AUDIENCE_OPTIONS,
  categoriesForAudience,
  projectTypeChipLabel,
  projectTypeAudience,
  type LocationAudience,
} from "@/lib/locations/projectTypes";

const TEHRAN = { lat: 35.6892, lng: 51.389 };

type ViewMode = "catalog" | "map";
type CategoryFilter = PhotoLocationCategory | "ALL";
type CityFilter = "ALL" | (typeof SERVICE_CITIES)[number];

function newHref(
  category?: CategoryFilter,
  city?: CityFilter,
  projectSlug?: string | null
) {
  const p = new URLSearchParams();
  if (category && category !== "ALL") p.set("category", category);
  if (city && city !== "ALL") p.set("city", city);
  if (projectSlug) p.set("for", projectSlug);
  const q = p.toString();
  return q ? `/tools/locations/new?${q}` : "/tools/locations/new";
}

export function JarLocationCatalog({
  pageSettings = DEFAULT_JAR_LOCATION_PAGE,
}: {
  pageSettings?: JarLocationPageSettingsPublic;
}) {
  const heroImage = pageSettings.heroImageUrl || DEFAULT_JAR_LOCATION_PAGE.heroImageUrl;
  const freeMood = pageSettings.freeChipImageUrl || DEFAULT_JAR_LOCATION_PAGE.freeChipImageUrl;
  const allChip = pageSettings.allChipImageUrl || DEFAULT_JAR_LOCATION_PAGE.allChipImageUrl;
  const heroTitle = pageSettings.heroTitle || DEFAULT_JAR_LOCATION_PAGE.heroTitle;
  const heroSubtitle = pageSettings.heroSubtitle || DEFAULT_JAR_LOCATION_PAGE.heroSubtitle;

  const categoryMood = (id: PhotoLocationCategory | string) =>
    pageSettings.categoryImages?.[id as PhotoLocationCategory] ||
    LOCATION_CATEGORIES.find((c) => c.id === id)?.moodImage ||
    heroImage;
  const [items, setItems] = useState<PhotoLocationPublic[]>([]);
  const [origin, setOrigin] = useState(TEHRAN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("catalog");
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [freeOnly, setFreeOnly] = useState(false);
  const [city, setCity] = useState<CityFilter>(DEFAULT_SERVICE_CITY);
  const [audience, setAudience] = useState<LocationAudience>("ALL");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<"city" | "project" | null>(null);
  const loadGen = useRef(0);
  const userPickedCity = useRef(false);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const featured = items[0] || null;

  const load = useCallback(
    (
      lat: number,
      lng: number,
      cat: CategoryFilter,
      free: boolean,
      cityFilter: CityFilter,
      audienceFilter: LocationAudience,
      project: string | null
    ) => {
      const gen = ++loadGen.current;
      setLoading(true);
      void listApprovedPhotoLocationsAction({
        lat,
        lng,
        limit: 160,
        category: cat,
        freeOnly: free,
        city: cityFilter === "ALL" ? null : cityFilter,
        audience: audienceFilter,
        projectSlug: project,
      })
        .then((res) => {
          if (gen !== loadGen.current) return;
          setLoading(false);
          if (!res.success) return;
          setItems(res.items);
          setSelectedId((prev) => {
            if (prev && res.items.some((i) => i.id === prev)) return prev;
            return res.items[0]?.id ?? null;
          });
        })
        .catch(() => {
          if (gen !== loadGen.current) return;
          setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    load(origin.lat, origin.lng, category, freeOnly, city, audience, projectSlug);
  }, [origin.lat, origin.lng, category, freeOnly, city, audience, projectSlug, load]);

  const applyCity = (next: CityFilter) => {
    userPickedCity.current = true;
    setCity(next);
    setOpenPicker(null);
    if (next === "ALL") return;
    const center = lookupCityCenter(next);
    if (center) setOrigin(center);
  };

  const applyAudience = (next: LocationAudience) => {
    setAudience(next);
    setProjectSlug(null);
  };

  const applyProjectSlug = (slug: string | null) => {
    setProjectSlug(slug);
    if (slug) {
      const type = projectTypeAudience(slug);
      if (type) setAudience(type);
    }
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint(DEFAULT_SERVICE_CITY);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!userPickedCity.current) {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
        setGeoHint("نزدیک شما");
      },
      () => setGeoHint(DEFAULT_SERVICE_CITY),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (view !== "map") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.dataset.jarLocMap = "1";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      delete html.dataset.jarLocMap;
    };
  }, [view]);

  const categoryStrip = (
    <div className="flex gap-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x -mx-1 px-1">
      <StoryChip
        image={allChip}
        label="همه"
        active={category === "ALL"}
        onClick={() => setCategory("ALL")}
      />
      {LOCATION_CATEGORIES.map((c) => (
        <StoryChip
          key={c.id}
          image={categoryMood(c.id)}
          label={c.short}
          active={category === c.id}
          onClick={() => setCategory(c.id)}
        />
      ))}
      <StoryChip
        image={freeMood}
        label="رایگان"
        active={freeOnly}
        onClick={() => setFreeOnly((v) => !v)}
      />
    </div>
  );

  if (view === "map") {
    const mapUi = (
      <div
        className="fixed inset-0 z-[35] h-[100dvh] w-screen overflow-hidden bg-[#141413]"
        dir="rtl"
        role="dialog"
        aria-label="نقشه جار لوکیشن"
      >
        <CatalogLeafletMap
          items={items}
          selectedId={selected?.id ?? null}
          center={selected ? { lat: selected.lat, lng: selected.lng } : origin}
          onSelect={setSelectedId}
        />

        {/* Controls clear the floating navbar; map bleeds edge-to-edge under header + bottom nav */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2.5 px-3 sm:px-4 pt-[calc(env(safe-area-inset-top,0px)+4.35rem)]">
          <div className="pointer-events-auto mx-auto max-w-5xl rounded-[1.6rem] border border-white/40 bg-white/80 px-3 py-2.5 shadow-lg backdrop-blur-xl space-y-2">
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => applyCity(city === "ALL" ? DEFAULT_SERVICE_CITY : "ALL")}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#141413] px-3 text-[10px] font-black text-white"
              >
                <Navigation className="h-3 w-3" />
                {city === "ALL" ? "همه شهرها" : city}
              </button>
              {SERVICE_CITIES.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyCity(c)}
                  className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[10px] font-bold ${
                    city === c
                      ? "bg-[#CC785C] text-white"
                      : "bg-white text-[#141413] border border-[#E5E0D8]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {categoryStrip}
          </div>
          <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView("catalog")}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white/92 px-4 text-xs font-black text-[#141413] shadow-lg backdrop-blur-xl active:scale-95"
            >
              <LayoutGrid className="h-4 w-4 text-[#CC785C]" strokeWidth={2.25} />
              کاتالوگ
            </button>
            <Link
              href={newHref(category, city, projectSlug)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#CC785C] px-4 text-xs font-black text-white shadow-lg active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              ثبت لوکیشن
            </Link>
          </div>
        </div>

        {selected && (
          <div className="absolute inset-x-0 bottom-0 z-[500] p-3 sm:p-4 pointer-events-none pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              href={`/locations/${selected.slug}`}
              className="pointer-events-auto mx-auto flex max-w-lg overflow-hidden rounded-[1.75rem] border border-white/50 bg-white shadow-[0_20px_60px_rgba(20,20,19,0.28)]"
            >
              <div className="relative h-[7.25rem] w-[7.25rem] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.coverImageUrl || categoryMood(selected.category)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 p-3.5 space-y-1.5">
                <p className="text-[10px] font-black tracking-wide" style={{ color: locationCategoryPinColor(selected.category) }}>
                  {locationCategoryLabel(selected.category)}
                </p>
                <h2 className="text-[15px] font-black text-[#141413] truncate">{selected.name}</h2>
                <p className="text-[11px] text-[#66605B] truncate">
                  {[selected.city, selected.district].filter(Boolean).join(" · ") || "ایران"}
                  {selected.distanceKm != null ? ` · ${formatDistanceKm(selected.distanceKm)}` : ""}
                </p>
                <span className="inline-flex text-[11px] font-black text-[#CC785C]">مشاهده جزئیات ←</span>
              </div>
            </Link>
          </div>
        )}
      </div>
    );

    return mounted ? createPortal(mapUi, document.body) : mapUi;
  }

  const heroCover = featured?.coverImageUrl || (category === "ALL" ? heroImage : categoryMood(category));

  return (
    <div className="relative bg-white" dir="rtl">
      <section className="relative isolate overflow-x-hidden -mt-px">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroCover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#141413]/35 to-[#141413]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141413] via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-5xl flex-col px-4 sm:px-6 pb-14 pt-[calc(env(safe-area-inset-top,0px)+5.75rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+6.25rem)]">
          <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md">
            <Camera className="h-3 w-3" />
            کشف لوکیشن
          </div>
          <div className="space-y-2 max-w-lg">
            <h1 className="text-[2rem] sm:text-5xl font-black text-white tracking-tight leading-none drop-shadow-sm">
              {heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-white/85 font-medium leading-relaxed">
              {heroSubtitle}
            </p>
            <HeroFilterBar
              city={city}
              audience={audience}
              projectSlug={projectSlug}
              geoHint={geoHint}
              open={openPicker}
              onOpen={setOpenPicker}
              onCity={applyCity}
              onAudience={applyAudience}
              onProject={applyProjectSlug}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ActionPill
              icon={<MapIcon className="h-5 w-5" strokeWidth={2.25} />}
              label="نقشه زنده"
              onClick={() => setView("map")}
            />
            <Link href={newHref(category, city, projectSlug)} className="inline-flex">
              <ActionPill
                icon={<Plus className="h-5 w-5" strokeWidth={2.5} />}
                label="ثبت لوکیشن تو"
                accent
              />
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-4 rounded-t-[1.85rem] bg-white px-4 sm:px-6 pt-4 pb-24 sm:pb-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="rounded-[1.6rem] border border-white/80 bg-white/70 px-3 py-3 shadow-[0_12px_40px_rgba(20,20,19,0.08)] backdrop-blur-xl">
            {categoryStrip}
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {LOCATION_CATEGORIES.slice(0, 6).map((c) => (
                <div key={c.id} className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={categoryMood(c.id)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 animate-pulse bg-[#141413]/25" />
                </div>
              ))}
            </div>
          ) : items.length === 0 &&
            (category !== "ALL" ||
              freeOnly ||
              city !== "ALL" ||
              audience !== "ALL" ||
              projectSlug) ? (
            <div className="relative overflow-hidden rounded-[1.7rem] min-h-[240px] h-[42vw] max-h-[320px] shadow-[0_12px_32px_rgba(20,20,19,0.16)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category === "ALL" ? freeMood : categoryMood(category)}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
                <p className="text-[11px] font-bold text-white/70">اولین را شما بسازید</p>
                <h2 className="text-xl font-black text-white">
                  {freeOnly && category === "ALL" && audience === "ALL" && !projectSlug
                    ? "هنوز لوکیشن رایگان نداریم"
                    : `در ${city === "ALL" ? "این فیلتر" : city} هنوز لوکیشنی نیست`}
                </h2>
                <Link
                  href={newHref(category, city, projectSlug)}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#141413] active:scale-95"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                  ثبت این لوکیشن
                </Link>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="space-y-3">
              <p className="px-1 text-[12px] font-bold text-[#66605B]">
                هنوز لوکیشنی تایید نشده — دسته‌ها را ورق بزنید
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {LOCATION_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className="group relative aspect-[4/5] overflow-hidden rounded-[1.35rem] text-right shadow-[0_8px_24px_rgba(20,20,19,0.12)] active:scale-[0.98]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={categoryMood(c.id)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                    <span className="block text-[13px] sm:text-base font-black text-white">{c.label}</span>
                  </span>
                </button>
              ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {items.map((item, idx) => (
                <LocationPhotoCard
                  key={item.id}
                  item={item}
                  featured={idx === 0 && items.length > 2}
                  moodFallback={categoryMood(item.category)}
                  onOpenMap={() => {
                    setSelectedId(item.id);
                    setView("map");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:hidden">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#E5E0D8] bg-white/90 p-1.5 shadow-[0_12px_32px_rgba(20,20,19,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setView("map")}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#F6F1EA] px-4 text-xs font-black text-[#141413] active:scale-95"
          >
            <MapIcon className="h-4 w-4 text-[#CC785C]" strokeWidth={2.25} />
            نقشه
          </button>
          <Link
            href={newHref(category, city, projectSlug)}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#CC785C] px-4 text-xs font-black text-white active:scale-95"
          >
            <Plus className="h-4 w-4" />
            ثبت
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroFilterBar({
  city,
  audience,
  projectSlug,
  geoHint,
  open,
  onOpen,
  onCity,
  onAudience,
  onProject,
}: {
  city: CityFilter;
  audience: LocationAudience;
  projectSlug: string | null;
  geoHint: string | null;
  open: "city" | "project" | null;
  onOpen: (v: "city" | "project" | null) => void;
  onCity: (city: CityFilter) => void;
  onAudience: (audience: LocationAudience) => void;
  onProject: (slug: string | null) => void;
}) {
  const projectLabel = projectSlug
    ? projectTypeChipLabel(projectSlug)
    : AUDIENCE_OPTIONS.find((o) => o.id === audience)?.label || "همه پروژه‌ها";
  const projectCats = categoriesForAudience(audience === "ALL" ? "ALL" : audience);

  return (
    <div className="relative space-y-2 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOpen(open === "city" ? null : "city")}
          className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md"
        >
          <Navigation className="h-3.5 w-3.5" />
          {city === "ALL" ? "همه شهرها" : city}
          <ChevronDown className={`h-3 w-3 transition-transform ${open === "city" ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => onOpen(open === "project" ? null : "project")}
          className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md"
        >
          {audience === "COMMERCIAL" ? (
            <Briefcase className="h-3.5 w-3.5" />
          ) : (
            <Heart className="h-3.5 w-3.5" />
          )}
          {projectLabel}
          <ChevronDown className={`h-3 w-3 transition-transform ${open === "project" ? "rotate-180" : ""}`} />
        </button>
        {geoHint === "نزدیک شما" && (
          <span className="text-[10px] font-medium text-white/60">نزدیک شما</span>
        )}
      </div>

      {open === "city" && (
        <div className="rounded-2xl border border-white/20 bg-[#141413]/80 p-2.5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onCity("ALL")}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                city === "ALL" ? "bg-white text-[#141413]" : "bg-white/10 text-white/80"
              }`}
            >
              همه شهرها
            </button>
            {SERVICE_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCity(c)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  city === c ? "bg-white text-[#141413]" : "bg-white/10 text-white/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {open === "project" && (
        <div className="rounded-2xl border border-white/20 bg-[#141413]/80 p-2.5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAudience(opt.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                  audience === opt.id && !projectSlug
                    ? "bg-white text-[#141413]"
                    : audience === opt.id
                      ? "bg-[#CC785C] text-white"
                      : "bg-white/10 text-white/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {audience !== "ALL" && (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => onProject(null)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  !projectSlug ? "bg-white text-[#141413]" : "bg-white/10 text-white/80"
                }`}
              >
                همه {audience === "PERSONAL" ? "شخصی" : "تجاری"}
              </button>
              {projectCats.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  title={cat.title}
                  onClick={() => onProject(cat.slug)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    projectSlug === cat.slug
                      ? "bg-[#CC785C] text-white"
                      : "bg-white/10 text-white/80"
                  }`}
                >
                  {projectTypeChipLabel(cat.slug)}
                </button>
              ))}
            </div>
          )}
          <p className="text-[9px] font-medium text-white/50 leading-relaxed">
            دسته‌ها همان عکاسی شخصی و تجاری سفارش جار هستند.
          </p>
        </div>
      )}
    </div>
  );
}

function StoryChip({
  image,
  label,
  active,
  onClick,
}: {
  image: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start shrink-0 w-[4.4rem] text-center transition-transform active:scale-95"
    >
      <span
        className={`relative mx-auto block h-[4.4rem] w-[4.4rem] rounded-full p-[2.5px] ${
          active
            ? "bg-gradient-to-br from-[#CC785C] via-[#F0C7B4] to-[#141413]"
            : "bg-gradient-to-br from-white to-[#E8E0D4]"
        }`}
      >
        <span className="relative flex h-full w-full overflow-hidden rounded-full border-[2.5px] border-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" />
        </span>
      </span>
      <span className={`mt-1.5 block text-[10px] font-black leading-tight ${active ? "text-[#141413]" : "text-[#66605B]"}`}>
        {label}
      </span>
    </button>
  );
}

function ActionPill({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  const className = `inline-flex h-12 items-center gap-2.5 rounded-full px-5 text-sm font-black shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-transform active:scale-95 hover:-translate-y-0.5 ${
    accent ? "bg-[#CC785C] text-white" : "bg-white text-[#141413]"
  }`;
  const inner = (
    <>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          accent ? "bg-white/20" : "bg-[#F6F1EA] text-[#CC785C]"
        }`}
      >
        {icon}
      </span>
      {label}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <span className={className}>{inner}</span>;
}

function LocationPhotoCard({
  item,
  featured,
  moodFallback,
  onOpenMap,
}: {
  item: PhotoLocationPublic;
  featured?: boolean;
  moodFallback: string;
  onOpenMap: () => void;
}) {
  const cover = item.coverImageUrl || moodFallback;
  return (
    <article
      className={`group relative overflow-hidden rounded-[1.7rem] bg-[#1a1918] shadow-[0_10px_30px_rgba(20,20,19,0.12)] ${
        featured ? "col-span-2 lg:col-span-1 aspect-[5/4] sm:aspect-[4/5]" : "aspect-[3/4]"
      }`}
    >
      <Link href={`/locations/${item.slug}`} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
      </Link>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-md border border-white/20">
            {locationCategoryLabel(item.category)}
          </span>
          {item.distanceKm != null && item.distanceKm <= 15 && (
            <span className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-black text-white">
              {formatDistanceKm(item.distanceKm)}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <h2 className="text-[13px] sm:text-base font-black text-white leading-snug line-clamp-2 drop-shadow">
              {item.name}
            </h2>
            <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-white/75 truncate">
              {[item.city, item.district].filter(Boolean).join(" · ") || "ایران"}
            </p>
            {item.suitableFor.length > 0 && (
              <p className="mt-1 text-[9px] font-bold text-white/80 truncate">
                {item.suitableFor
                  .slice(0, 2)
                  .map((slug) => projectTypeChipLabel(slug))
                  .join(" · ")}
                {item.suitableFor.length > 2
                  ? ` +${item.suitableFor.length - 2}`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {item.hasParking && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md">
                <Car className="h-3.5 w-3.5" />
              </span>
            )}
            {!item.hasEntranceFee && (
              <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black text-white backdrop-blur-md">
                رایگان
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenMap();
              }}
              className="pointer-events-auto ms-auto inline-flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[10px] font-black text-[#141413] active:scale-95"
            >
              <MapPin className="h-3 w-3 text-[#CC785C]" />
              نقشه
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CatalogLeafletMap({
  items,
  selectedId,
  center,
  onSelect,
}: {
  items: PhotoLocationPublic[];
  selectedId: string | null;
  center: { lat: number; lng: number };
  onSelect: (id: string) => void;
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
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      mapRef.current = map;
      const fit = () => map.invalidateSize();
      requestAnimationFrame(fit);
      setTimeout(fit, 80);
      setTimeout(fit, 320);
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
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      for (const item of items) {
        const active = item.id === selectedId;
        const color = locationCategoryPinColor(item.category);
        const size = active ? 22 : 14;
        const icon = L.divIcon({
          className: "jar-loc-marker",
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.28)${
            active ? ";outline:2px solid rgba(204,120,92,.7);outline-offset:2px" : ""
          }"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([item.lat, item.lng], { icon, zIndexOffset: active ? 800 : 0 }).addTo(
          map
        );
        marker.on("click", () => onSelectRef.current(item.id));
        markersRef.current.set(item.id, marker);
      }
    })();
  }, [items, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo([center.lat, center.lng], { animate: true });
  }, [center.lat, center.lng]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 jar-location-map [&_.leaflet-tile-pane]:saturate-[0.8] [&_.leaflet-tile-pane]:contrast-[0.98] [&_.leaflet-control-attribution]:bg-white/70 [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-bottom.leaflet-left]:mb-3 [&_.leaflet-bottom.leaflet-left]:ms-2"
      />
    </div>
  );
}
