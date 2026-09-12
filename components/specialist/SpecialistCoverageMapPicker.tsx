"use client";

import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus, MapPinned } from "lucide-react";
import {
  COVERAGE_RADIUS_BOUNDS,
  describeCoverageRadius,
} from "@/lib/geo/iranPlaces";

export type Coordinates = { lat: number; lng: number };

type Props = {
  center: Coordinates | null;
  radiusKm: number;
  onChangeRadius: (km: number) => void;
};

const DEFAULT_CENTER: Coordinates = { lat: 35.6892, lng: 51.389 };

function clampRadius(km: number) {
  return Math.min(
    COVERAGE_RADIUS_BOUNDS.max,
    Math.max(COVERAGE_RADIUS_BOUNDS.min, Math.round(km))
  );
}

/**
 * How far around the specialist base they take on-location projects.
 * Studio registration is a separate flow — this circle is travel/coverage only.
 */
export default function SpecialistCoverageMapPicker({
  center,
  radiusKm,
  onChangeRadius,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);

  const mapCenter = center ?? DEFAULT_CENTER;
  const safeRadius = clampRadius(radiusKm);
  const description = describeCoverageRadius(safeRadius);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) {
        return;
      }

      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;

      mapContainerRef.current.innerHTML = "";

      const IRAN_BOUNDS = L.latLngBounds([24.5, 44.0], [40.0, 63.5]);
      const map = L.map(mapContainerRef.current, {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: 11,
        minZoom: 5,
        maxZoom: 16,
        maxBounds: IRAN_BOUNDS,
        maxBoundsViscosity: 1,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      });

      const neshanKey = process.env.NEXT_PUBLIC_NESHAN_API_KEY;
      const tileUrl = neshanKey
        ? `https://api.neshan.org/v4/tiles/standard/{z}/{x}/{y}.png?api_key=${neshanKey}`
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 16,
        minZoom: 5,
        subdomains: neshanKey ? [] : ["a", "b", "c"],
      }).addTo(map);

      const circle = L.circle([mapCenter.lat, mapCenter.lng], {
        radius: safeRadius * 1000,
        color: "#c45c26",
        weight: 2,
        fillColor: "#c45c26",
        fillOpacity: 0.18,
      }).addTo(map);

      mapRef.current = map;
      circleRef.current = circle;
      setReady(true);

      const invalidate = () => {
        try {
          map.invalidateSize();
        } catch {
          /* ignore */
        }
      };
      requestAnimationFrame(invalidate);
      setTimeout(invalidate, 250);

      if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(invalidate);
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }
    }

    init();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !circleRef.current) return;
    const map = mapRef.current;
    const circle = circleRef.current;
    circle.setLatLng([mapCenter.lat, mapCenter.lng]);
    circle.setRadius(safeRadius * 1000);
    try {
      map.fitBounds(circle.getBounds(), { padding: [28, 28], maxZoom: 13, animate: true });
    } catch {
      map.setView([mapCenter.lat, mapCenter.lng], map.getZoom());
    }
  }, [mapCenter.lat, mapCenter.lng, safeRadius, ready]);

  const bump = (delta: number) => onChangeRadius(clampRadius(safeRadius + delta));

  const bandClass =
    description.band === "local"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : description.band === "wide"
        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
        : "bg-jar-canvas text-jar-primary border-jar-border";

  return (
    <div className="relative h-full w-full overflow-hidden bg-jar-canvas select-none" dir="rtl">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {!center && (
        <div className="absolute top-3 inset-x-3 z-30 pointer-events-none">
          <div className="mx-auto max-w-md rounded-2xl bg-amber-50/95 border border-amber-200 text-amber-900 text-[11px] font-medium py-2.5 px-3 text-center">
            ابتدا محل شروع حرکت را مشخص کنید؛ دایره روی همان نقطه کشیده می‌شود.
          </div>
        </div>
      )}

      <div className="absolute bottom-3 inset-x-3 z-30">
        <div className="rounded-2xl border border-jar-border bg-jar-surface/95 backdrop-blur-xl p-3 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPinned className="h-4 w-4 text-jar-logo shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-bold text-jar-primary">
                  تا {safeRadius} کیلومتر اطراف مبدأ
                </span>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${bandClass}`}
                >
                  {description.title}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => bump(-5)}
                disabled={safeRadius <= COVERAGE_RADIUS_BOUNDS.min}
                className="h-8 w-8 rounded-full border border-jar-border bg-jar-surface text-jar-primary flex items-center justify-center hover:bg-jar-soft disabled:opacity-40"
                aria-label="کوچک‌تر کردن دایره"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => bump(5)}
                disabled={safeRadius >= COVERAGE_RADIUS_BOUNDS.max}
                className="h-8 w-8 rounded-full border border-jar-border bg-jar-surface text-jar-primary flex items-center justify-center hover:bg-jar-soft disabled:opacity-40"
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
            onChange={(e) => onChangeRadius(clampRadius(Number(e.target.value)))}
            className="w-full accent-[var(--jar-logo,#c45c26)] cursor-pointer"
            aria-label="تنظیم شعاع پوشش اطراف مبدأ"
          />

          <p className="text-[10px] text-jar-muted leading-relaxed">{description.hint}</p>
        </div>
      </div>
    </div>
  );
}
