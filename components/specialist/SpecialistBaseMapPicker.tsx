"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, MapPin, MapPinned, Navigation, Pencil, Plus, Minus } from "lucide-react";
import { getFastIranLocation } from "@/lib/geo/reverseGeocode";
import {
  COVERAGE_RADIUS_BOUNDS,
  describeCoverageRadius,
} from "@/lib/geo/iranPlaces";
import { zoomForCoverageRadiusKm } from "@/lib/geo/cityCenters";
import { getJarMapTileConfig, jarMapTileLayerOptions } from "@/lib/maps/tiles";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type BaseMapPhase = "place" | "cover";

export interface SpecialistBaseMapPickerProps {
  district: string;
  onChangeDistrict: (val: string) => void;
  address: string;
  onChangeAddress: (val: string) => void;
  onChangeCoords?: (coords: Coordinates) => void;
  initialCoords?: Coordinates;
  /** When city/province changes, pan the map to this center. */
  focusCoords?: Coordinates | null;
  /** Bump when the same city is re-selected so the map still recenters. */
  focusToken?: number;
  /** Center-pin badge label. */
  pinLabel?: string;
  districtFieldLabel?: string;
  addressFieldLabel?: string;
  addressPlaceholder?: string;
  /** Enable two-phase flow: place base → confirm → set coverage radius. */
  showCoverage?: boolean;
  radiusKm?: number;
  onChangeRadius?: (km: number) => void;
  /** Start in cover phase when editing an existing base (showCoverage only). */
  initialPhase?: BaseMapPhase;
  onPhaseChange?: (phase: BaseMapPhase) => void;
}

function clampRadius(km: number) {
  return Math.min(
    COVERAGE_RADIUS_BOUNDS.max,
    Math.max(COVERAGE_RADIUS_BOUNDS.min, Math.round(km))
  );
}

const DEFAULT_CENTER: Coordinates = { lat: 35.6892, lng: 51.389 };

function makeBaseIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "jar-base-marker",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
      <span style="background:#141413;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18)">مبدأ قفل‌شده</span>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))">
        <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill="#c45c26" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12" cy="10" r="2.5" fill="#fff"/>
      </svg>
    </div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
  });
}

/**
 * Map for specialist base / travel-start point.
 * With showCoverage: place pin → confirm → lock marker + set radius (controls docked below map).
 */
export default function SpecialistBaseMapPicker({
  district,
  onChangeDistrict,
  address,
  onChangeAddress,
  onChangeCoords,
  initialCoords = DEFAULT_CENTER,
  focusCoords = null,
  focusToken = 0,
  pinLabel = "محل شروع حرکت",
  districtFieldLabel = "منطقه / محله",
  addressFieldLabel = "آدرس تقریبی مبدأ",
  addressPlaceholder = "خیابان، کوچه... (به مشتری نشان داده نمی‌شود)",
  showCoverage = false,
  radiusKm = COVERAGE_RADIUS_BOUNDS.default,
  onChangeRadius,
  initialPhase,
  onPhaseChange,
}: SpecialistBaseMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const safeRadius = clampRadius(radiusKm);
  const coverageDescription = describeCoverageRadius(safeRadius);

  const onChangeDistrictRef = useRef(onChangeDistrict);
  onChangeDistrictRef.current = onChangeDistrict;
  const onChangeAddressRef = useRef(onChangeAddress);
  onChangeAddressRef.current = onChangeAddress;
  const onChangeCoordsRef = useRef(onChangeCoords);
  onChangeCoordsRef.current = onChangeCoords;
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const [phase, setPhase] = useState<BaseMapPhase>(() =>
    showCoverage && initialPhase === "cover" ? "cover" : "place"
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationBadge, setLocationBadge] = useState(district || "تهران");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [lockedBase, setLockedBase] = useState<Coordinates | null>(
    showCoverage && initialPhase === "cover" && initialCoords
      ? { lat: initialCoords.lat, lng: initialCoords.lng }
      : null
  );
  const lockedBaseRef = useRef(lockedBase);
  lockedBaseRef.current = lockedBase;

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const programmaticMoveRef = useRef(false);
  const safeRadiusRef = useRef(safeRadius);
  safeRadiusRef.current = safeRadius;

  const goPhase = useCallback((next: BaseMapPhase) => {
    setPhase(next);
    phaseRef.current = next;
    onPhaseChangeRef.current?.(next);
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const updateLocationFromCoords = useCallback((lat: number, lng: number, force = false) => {
    onChangeCoordsRef.current?.({ lat, lng });

    const fastLoc = getFastIranLocation(lat, lng);
    setLocationBadge(fastLoc.district);
    onChangeDistrictRef.current(fastLoc.district);
    if (fastLoc.address) {
      onChangeAddressRef.current(fastLoc.address);
    }

    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const runFetch = async () => {
      setIsResolvingAddress(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.district) {
          setLocationBadge(data.district);
          onChangeDistrictRef.current(data.district);
        }
        if (data?.address) {
          onChangeAddressRef.current(data.address);
        }
      } catch {
        /* offline fast location already applied */
      } finally {
        setIsResolvingAddress(false);
      }
    };

    if (force) runFetch();
    else reverseGeocodeTimerRef.current = setTimeout(runFetch, 300);
  }, []);

  const syncCoverageLayers = useCallback((lat: number, lng: number, radius: number) => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: makeBaseIcon(L),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    if (!circleRef.current) {
      circleRef.current = L.circle([lat, lng], {
        radius: radius * 1000,
        color: "#c45c26",
        weight: 2,
        fillColor: "#c45c26",
        fillOpacity: 0.16,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(radius * 1000);
    }
  }, []);

  const clearCoverageLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (markerRef.current && map) {
      try {
        map.removeLayer(markerRef.current);
      } catch {
        /* ignore */
      }
      markerRef.current = null;
    }
    if (circleRef.current && map) {
      try {
        map.removeLayer(circleRef.current);
      } catch {
        /* ignore */
      }
      circleRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current || mapInstanceRef.current) {
        return;
      }

      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;
      leafletRef.current = L as unknown as typeof import("leaflet");

      mapContainerRef.current.innerHTML = "";

      const IRAN_BOUNDS = L.latLngBounds([24.5, 44.0], [40.0, 63.5]);
      const centerLat = initialCoords?.lat || DEFAULT_CENTER.lat;
      const centerLng = initialCoords?.lng || DEFAULT_CENTER.lng;
      const startInCover = phaseRef.current === "cover" && showCoverage;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: startInCover ? zoomForCoverageRadiusKm(clampRadius(radiusKm)) : 14,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: IRAN_BOUNDS,
        maxBoundsViscosity: 1,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        scrollWheelZoom: true,
      });

      const tileCfg = getJarMapTileConfig();
      L.tileLayer(tileCfg.url, jarMapTileLayerOptions(tileCfg)).addTo(map);

      map.on("movestart", () => {
        if (phaseRef.current === "place") setIsDragging(true);
      });
      map.on("move", () => {
        if (phaseRef.current === "place") setIsDragging(true);
      });
      map.on("moveend", () => {
        setIsDragging(false);
        if (phaseRef.current !== "place") return;
        if (programmaticMoveRef.current) return;
        try {
          const center = map.getCenter();
          updateLocationFromCoords(center.lat, center.lng);
        } catch {
          /* ignore */
        }
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        if (phaseRef.current !== "place") return;
        const { lat, lng } = e.latlng;
        map.panTo([lat, lng], { animate: true });
        updateLocationFromCoords(lat, lng, true);
      });

      mapInstanceRef.current = map;

      if (startInCover) {
        setLockedBase({ lat: centerLat, lng: centerLng });
        lockedBaseRef.current = { lat: centerLat, lng: centerLng };
        syncCoverageLayers(centerLat, centerLng, clampRadius(radiusKm));
        onChangeCoordsRef.current?.({ lat: centerLat, lng: centerLng });
      } else {
        updateLocationFromCoords(centerLat, centerLng, true);
      }

      setMapReady(true);

      const invalidate = () => {
        try {
          map.invalidateSize();
        } catch {
          /* ignore */
        }
      };
      requestAnimationFrame(invalidate);
      setTimeout(invalidate, 250);
      setTimeout(invalidate, 600);

      if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(invalidate);
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }

      const onResize = () => invalidate();
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
      };
    }

    let detachWindow: (() => void) | undefined;
    initMap().then((cleanup) => {
      detachWindow = cleanup;
    });

    return () => {
      cancelled = true;
      detachWindow?.();
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          /* ignore */
        }
        mapInstanceRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map mounts once
  }, []);

  // City focus — only moves base while placing
  useEffect(() => {
    if (!mapReady || !focusCoords || !mapInstanceRef.current) return;
    if (phaseRef.current === "cover") {
      // City change while locked: unlock and re-place
      clearCoverageLayers();
      setLockedBase(null);
      lockedBaseRef.current = null;
      goPhase("place");
    }
    const map = mapInstanceRef.current;
    const { lat, lng } = focusCoords;

    try {
      map.invalidateSize();
    } catch {
      /* ignore */
    }

    programmaticMoveRef.current = true;
    if (typeof map.flyTo === "function") {
      map.flyTo([lat, lng], 14, { animate: true, duration: 0.65 });
    } else {
      map.setView([lat, lng], 14, { animate: true });
    }
    updateLocationFromCoords(lat, lng, true);
    const unlock = window.setTimeout(() => {
      programmaticMoveRef.current = false;
    }, 800);
    return () => window.clearTimeout(unlock);
  }, [
    mapReady,
    focusCoords?.lat,
    focusCoords?.lng,
    focusToken,
    updateLocationFromCoords,
    clearCoverageLayers,
    goPhase,
  ]);

  // Radius changes while locked
  useEffect(() => {
    if (!mapReady || !showCoverage || phase !== "cover" || !lockedBase) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    syncCoverageLayers(lockedBase.lat, lockedBase.lng, safeRadius);
    try {
      const nextZoom = zoomForCoverageRadiusKm(safeRadius);
      if (Math.abs(map.getZoom() - nextZoom) >= 1) {
        programmaticMoveRef.current = true;
        map.setView([lockedBase.lat, lockedBase.lng], nextZoom, { animate: true });
        window.setTimeout(() => {
          programmaticMoveRef.current = false;
        }, 500);
      }
    } catch {
      /* ignore */
    }
  }, [mapReady, showCoverage, phase, safeRadius, lockedBase, syncCoverageLayers]);

  const bumpRadius = (delta: number) => {
    onChangeRadius?.(clampRadius(safeRadius + delta));
  };

  const bandClass =
    coverageDescription.band === "local"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : coverageDescription.band === "wide"
        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
        : "bg-jar-canvas text-jar-primary border-jar-border";

  const handleConfirmBase = () => {
    const map = mapInstanceRef.current;
    if (!map || !showCoverage) return;
    try {
      const center = map.getCenter();
      const base = { lat: center.lat, lng: center.lng };
      updateLocationFromCoords(base.lat, base.lng, true);
      setLockedBase(base);
      lockedBaseRef.current = base;
      syncCoverageLayers(base.lat, base.lng, safeRadius);
      const nextZoom = zoomForCoverageRadiusKm(safeRadius);
      programmaticMoveRef.current = true;
      map.setView([base.lat, base.lng], nextZoom, { animate: true });
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 500);
      goPhase("cover");
      showToast("مبدأ قفل شد — حالا شعاع پوشش را تنظیم کنید.");
    } catch {
      showToast("نمی‌توان مبدأ را ثبت کرد. دوباره تلاش کنید.");
    }
  };

  const handleEditBase = () => {
    const map = mapInstanceRef.current;
    const base = lockedBaseRef.current;
    clearCoverageLayers();
    setLockedBase(null);
    lockedBaseRef.current = null;
    goPhase("place");
    if (map && base) {
      programmaticMoveRef.current = true;
      map.setView([base.lat, base.lng], 15, { animate: true });
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 500);
    }
    showToast("نقشه را جابه‌جا کنید و دوباره مبدأ را تأیید کنید.");
  };

  const handleGetLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      showToast("قابلیت موقعیت‌یابی در مرورگر شما پشتیبانی نمی‌شود.");
      return;
    }
    if (phase === "cover") {
      handleEditBase();
    }

    setIsLocating(true);
    showToast("در حال دریافت موقعیت مکانی...");

    const onSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const { latitude, longitude } = pos.coords;
      const inIran =
        latitude >= 24.5 &&
        latitude <= 40.0 &&
        longitude >= 44.0 &&
        longitude <= 63.5;

      if (!inIran) {
        showToast("موقعیت خارج از ایران است؛ لطفاً دستی روی نقشه انتخاب کنید.");
        return;
      }

      if (mapInstanceRef.current) {
        programmaticMoveRef.current = true;
        mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
        window.setTimeout(() => {
          programmaticMoveRef.current = false;
        }, 500);
      }
      updateLocationFromCoords(latitude, longitude, true);
      showToast("موقعیت شما ثبت شد — تأیید مبدأ را بزنید.");
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => {
            setIsLocating(false);
            showToast("دریافت موقعیت زمان‌بر شد؛ لطفاً دستی انتخاب کنید.");
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
        return;
      }
      setIsLocating(false);
      showToast(
        err.code === err.PERMISSION_DENIED
          ? "دسترسی موقعیت در مرورگر مسدود است."
          : "امکان دریافت خودکار موقعیت میسر نشد."
      );
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 15000,
    });
  };

  const isPlace = !showCoverage || phase === "place";
  const isCover = showCoverage && phase === "cover";

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-jar-border bg-jar-canvas select-none" dir="rtl">
      {/* Map viewport — no overlapping control sheet on the pin */}
      <div className="relative h-[min(52dvh,420px)] min-h-[280px] w-full sm:h-[min(48vh,400px)] sm:min-h-[300px]">
        {toastMessage && (
          <div className="absolute top-3 inset-x-3 z-40 pointer-events-none">
            <div className="mx-auto max-w-md rounded-2xl bg-jar-primary/95 text-white text-xs font-medium py-2.5 px-4 text-center border border-white/10">
              {toastMessage}
            </div>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        />

        {/* Center pin only while placing */}
        {isPlace && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div
                className={`w-7 h-7 rounded-full border border-jar-logo/70 bg-jar-logo/20 transition-transform ${
                  isDragging ? "scale-125 opacity-40" : "opacity-70"
                }`}
              />
              <div className="absolute w-3 h-3 rounded-full bg-jar-primary border-2 border-white" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center pb-1">
              <div className="mb-1.5 px-2.5 py-1 rounded-full bg-jar-primary text-white text-[10px] font-black shadow-sm whitespace-nowrap">
                {isDragging ? "در حال تنظیم..." : pinLabel}
              </div>
              <MapPin className="h-8 w-8 text-jar-primary fill-jar-primary/20 drop-shadow-md" />
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 z-30 flex flex-col rounded-xl bg-jar-surface/90 backdrop-blur-md border border-jar-border overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn?.()}
            className="h-8 w-8 flex items-center justify-center text-jar-primary hover:bg-jar-soft border-b border-jar-border"
            aria-label="بزرگ‌نمایی"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut?.()}
            className="h-8 w-8 flex items-center justify-center text-jar-primary hover:bg-jar-soft"
            aria-label="کوچک‌نمایی"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showCoverage && (
          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${
                isCover
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              {isCover ? "گام ۲ از ۲ · شعاع پوشش" : "گام ۱ از ۲ · تأیید مبدأ"}
            </span>
          </div>
        )}
      </div>

      {/* Docked controls — never covers map center */}
      <div className="border-t border-jar-border bg-jar-surface p-3 space-y-3 text-right">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-jar-primary shrink-0" />
            <span className="text-xs font-bold text-jar-primary truncate">
              {isDragging && isPlace ? (
                <span className="text-jar-muted font-normal animate-pulse">در حال جابه‌جایی...</span>
              ) : isResolvingAddress ? (
                <span className="text-jar-logo font-medium animate-pulse">تکمیل آدرس...</span>
              ) : (
                locationBadge || "موقعیت انتخاب شد"
              )}
            </span>
          </div>
          {isPlace && (
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-jar-border bg-jar-canvas text-jar-primary text-[11px] font-bold hover:bg-jar-soft shrink-0 disabled:opacity-60"
            >
              <Navigation className={`h-3 w-3 ${isLocating ? "animate-spin" : ""}`} />
              موقعیت من
            </button>
          )}
          {isCover && (
            <button
              type="button"
              onClick={handleEditBase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-jar-border bg-jar-canvas text-jar-primary text-[11px] font-bold hover:bg-jar-soft shrink-0"
            >
              <Pencil className="h-3 w-3" />
              تغییر مبدأ
            </button>
          )}
        </div>

        {isPlace && (
          <>
            <p className="text-[10px] text-jar-muted leading-relaxed">
              نقشه را جابه‌جا کنید تا سنجاق وسط روی محل شروع حرکت شما بنشیند. بعد از رضایت،
              {showCoverage ? " «تأیید مبدأ» را بزنید." : " موقعیت ثبت می‌شود."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5 space-y-0.5">
                <label className="block text-[10px] font-bold text-jar-primary">
                  {districtFieldLabel}
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => onChangeDistrict(e.target.value)}
                  placeholder="مثلاً: تهران، سعادت‌آباد..."
                  className="w-full h-9 px-3 rounded-xl border border-jar-border bg-jar-canvas text-xs font-medium outline-none focus:border-jar-logo"
                />
              </div>
              <div className="sm:col-span-7 space-y-0.5">
                <label className="block text-[10px] font-bold text-jar-primary">
                  {addressFieldLabel}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => onChangeAddress(e.target.value)}
                  placeholder={addressPlaceholder}
                  className="w-full h-9 px-3 rounded-xl border border-jar-border bg-jar-canvas text-xs font-medium outline-none focus:border-jar-logo"
                />
              </div>
            </div>
            {showCoverage && (
              <button
                type="button"
                onClick={handleConfirmBase}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-white text-xs font-bold"
              >
                <Check className="h-4 w-4" />
                تأیید مبدأ و تنظیم محدوده
              </button>
            )}
          </>
        )}

        {isCover && (
          <div className="space-y-2.5 rounded-xl border border-jar-border bg-jar-canvas/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPinned className="h-4 w-4 text-jar-logo shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-jar-primary">
                    محدوده کاری تا {safeRadius.toLocaleString("fa-IR")} کیلومتر
                  </span>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${bandClass}`}
                  >
                    {coverageDescription.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => bumpRadius(-5)}
                  disabled={safeRadius <= COVERAGE_RADIUS_BOUNDS.min}
                  className="h-9 w-9 rounded-full border border-jar-border bg-jar-surface text-jar-primary flex items-center justify-center hover:bg-jar-soft disabled:opacity-40"
                  aria-label="کوچک‌تر کردن دایره"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => bumpRadius(5)}
                  disabled={safeRadius >= COVERAGE_RADIUS_BOUNDS.max}
                  className="h-9 w-9 rounded-full border border-jar-border bg-jar-surface text-jar-primary flex items-center justify-center hover:bg-jar-soft disabled:opacity-40"
                  aria-label="بزرگ‌تر کردن دایره"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={COVERAGE_RADIUS_BOUNDS.min}
              max={COVERAGE_RADIUS_BOUNDS.max}
              step={1}
              value={safeRadius}
              onChange={(e) => onChangeRadius?.(clampRadius(Number(e.target.value)))}
              className="w-full accent-[var(--jar-logo,#c45c26)] cursor-pointer"
              aria-label="تنظیم شعاع پوشش اطراف مبدأ"
            />
            <p className="text-[10px] text-jar-muted leading-relaxed">
              {coverageDescription.hint} مبدأ روی نقشه قفل است؛ با اسکرول فقط اطراف را می‌بینید.
            </p>
            {(address || district) && (
              <p className="text-[10px] font-medium text-jar-primary/80 truncate">
                مبدأ: {[district, address].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
