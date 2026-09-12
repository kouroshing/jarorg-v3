"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
  Check,
  Info,
} from "lucide-react";
import { LocationType } from "@/components/order/steps/StepLocation";
import { getFastIranLocation } from "@/lib/geo/reverseGeocode";
import {
  DEFAULT_SERVICE_CITY,
  SERVICE_CITIES,
  matchServiceCity,
} from "@/lib/geo/serviceCities";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationMapPickerProps {
  locationType?: LocationType;
  onChangeLocationType?: (type: LocationType) => void;
  district: string;
  onChangeDistrict: (val: string) => void;
  address: string;
  onChangeAddress: (val: string) => void;
  /**
   * The picked point itself. The map always knew it — it was reverse-geocoded
   * to text and thrown away — but the travel fee needs the coordinates, so the
   * order now stores them too.
   */
  onChangeCoords?: (coords: Coordinates) => void;
  initialCoords?: Coordinates;
  /**
   * `embedded` = compact picker inside forms (specialist onboarding).
   * Skips body scroll lock and order-only location-type chrome.
   */
  variant?: "fullscreen" | "embedded";
  /** Override the floating pin status label (defaults differ by variant). */
  pinLabel?: string;
}

const DEFAULT_CENTER: Coordinates = { lat: 35.6892, lng: 51.3890 }; // Tehran Center [35.6892, 51.3890]

export default function LocationMapPicker({
  locationType = "CLIENT_LOCATION",
  onChangeLocationType,
  district,
  onChangeDistrict,
  address,
  onChangeAddress,
  onChangeCoords,
  initialCoords = DEFAULT_CENTER,
  variant = "fullscreen",
  pinLabel,
}: LocationMapPickerProps) {
  const isEmbedded = variant === "embedded";
  const resolvedPinLabel =
    pinLabel || (isEmbedded ? "محل شروع حرکت" : "محل دقیق عکاسی");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Keep latest callback & prop refs so Leaflet listeners always have fresh values without re-mounting
  const onChangeDistrictRef = useRef(onChangeDistrict);
  onChangeDistrictRef.current = onChangeDistrict;
  const onChangeAddressRef = useRef(onChangeAddress);
  onChangeAddressRef.current = onChangeAddress;
  const onChangeCoordsRef = useRef(onChangeCoords);
  onChangeCoordsRef.current = onChangeCoords;
  const districtRef = useRef(district);
  districtRef.current = district;
  const locationTypeRef = useRef(locationType);
  locationTypeRef.current = locationType;
  const onChangeLocationTypeRef = useRef(onChangeLocationType);
  onChangeLocationTypeRef.current = onChangeLocationType;

  const [coords, setCoords] = useState<Coordinates>(initialCoords);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const [locationBadge, setLocationBadge] = useState<string>(district || "تهران");

  const isLocationDefault = locationType === "SPECIALIST_ADVICE";

  // Lock body scroll only for the full-screen order map
  useEffect(() => {
    if (isEmbedded) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [isEmbedded]);

  // Reverse-geocoding: instant 0ms offline lookup + progressive server enrichment
  const reverseGeocodeTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateLocationFromCoords = useCallback((lat: number, lng: number, force = false) => {
    // 0. Hand the raw point up. Reverse geocoding below can fail or be slow;
    //    the travel fee only needs these two numbers, so publish them first.
    onChangeCoordsRef.current?.({ lat, lng });

    // 1. Instant 0ms offline resolution for Iranian cities and Tehran districts
    const fastLoc = getFastIranLocation(lat, lng);
    setLocationBadge(fastLoc.district);
    onChangeDistrictRef.current(fastLoc.district);
    if (fastLoc.address) {
      onChangeAddressRef.current(fastLoc.address);
    }

    // 2. Progressive server-side enrichment
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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

        if (data && data.district) {
          setLocationBadge(data.district);
          onChangeDistrictRef.current(data.district);
        }
        if (data && data.address) {
          onChangeAddressRef.current(data.address);
        }
      } catch {
        // Fast location is already active, ignore
      } finally {
        setIsResolvingAddress(false);
      }
    };

    if (force) {
      runFetch();
    } else {
      reverseGeocodeTimerRef.current = setTimeout(runFetch, 300);
    }
  }, []);

  // Initialize Leaflet cleanly ONCE on mount
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (isCancelled || !mapContainerRef.current) return;

      // Clean container if any leftovers exist
      mapContainerRef.current.innerHTML = "";

      // Strict Iran Geographical Boundary Box
      const IRAN_BOUNDS = L.latLngBounds(
        [24.5, 44.0], // جنوب غربی ایران
        [40.0, 63.5]  // شمال شرقی ایران
      );

      const centerLat = initialCoords?.lat || 35.6892;
      const centerLng = initialCoords?.lng || 51.3890;

      // Create map instance strictly confined to Iran
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: IRAN_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        scrollWheelZoom: true,
      });

      // Pure Persian tiles without API Key watermarks (Neshan or OSM)
      const neshanKey = process.env.NEXT_PUBLIC_NESHAN_API_KEY;
      const tileUrl = neshanKey
        ? `https://api.neshan.org/v4/tiles/standard/{z}/{x}/{y}.png?api_key=${neshanKey}`
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 18,
        minZoom: 5,
        subdomains: neshanKey ? [] : ["a", "b", "c"],
      }).addTo(map);

      // Listen to movement events for Snapp-style central pin
      map.on("movestart", () => {
        setIsDragging(true);
      });

      map.on("move", () => {
        setIsDragging(true);
      });

      map.on("moveend", () => {
        setIsDragging(false);
        try {
          const center = map.getCenter();
          setCoords({ lat: center.lat, lng: center.lng });
          if (locationTypeRef.current === "CLIENT_LOCATION") {
            updateLocationFromCoords(center.lat, center.lng);
          }
        } catch {}
      });

      // Allow clicking anywhere on map to pick that location and write address to bottom box
      map.on("click", (e: any) => {
        try {
          const { lat, lng } = e.latlng;

          // If default checkbox is checked, clicking map automatically selects custom location
          if (locationTypeRef.current !== "CLIENT_LOCATION") {
            onChangeLocationTypeRef.current?.("CLIENT_LOCATION");
          }

          setCoords({ lat, lng });

          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([lat, lng], { animate: true });
          }

          // Immediately reverse-geocode and write address to bottom box
          updateLocationFromCoords(lat, lng, true);
        } catch (err) {
          console.error("Map click error:", err);
        }
      });

      mapInstanceRef.current = map;

      // Publish initial point so parent forms (e.g. specialist base location) get coords
      if (locationTypeRef.current === "CLIENT_LOCATION") {
        updateLocationFromCoords(centerLat, centerLng, true);
      }

      // Invalidate size after animation / mount to guarantee center alignment
      requestAnimationFrame(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 250);
      if (isEmbedded) {
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {}
        }, 600);
      }

      // Handle resize events (e.g. window resize or container morphing)
      if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.invalidateSize();
            } catch {}
          }
        });
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }

      // Handle window resize and mobile orientation changes
      const handleResize = () => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      // Scheduled invalidations to sync with Framer Motion slide-in animations
      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      }, 100);

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      }, 350);

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      }, 700);
    }

    initMap();

    return () => {
      isCancelled = true;

      if (reverseGeocodeTimerRef.current) {
        clearTimeout(reverseGeocodeTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet cleanup handled gracefully:", e);
        }
        mapInstanceRef.current = null;
      }
    };
    // Deliberately empty deps array so map is NEVER destroyed & recreated on prop changes
  }, []);

  // GPS Geolocation button with Iran boundary checks & fallback
  const handleGetLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      showToast("قابلیت موقعیت‌یابی در مرورگر شما پشتیبانی نمی‌شود.");
      return;
    }

    setIsLocating(true);
    showToast("در حال دریافت موقعیت مکانی...");

    const onLocationSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const { latitude, longitude } = pos.coords;

      // Check if coordinate is within Iran bounds
      const isInIran =
        latitude >= 24.5 &&
        latitude <= 40.0 &&
        longitude >= 44.0 &&
        longitude <= 63.5;

      if (!isInIran) {
        // Detected outside Iran (VPN active)
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.flyTo([35.6892, 51.3890], 14, {
              animate: true,
              duration: 1.0,
            });
          } catch {}
        }
        showToast("موقعیت دریافتی خارج از ایران است (احتمالاً به دلیل فیلترشکن). مرکز نقشه روی تهران تنظیم شد.");
        setCoords({ lat: 35.6892, lng: 51.3890 });
        updateLocationFromCoords(35.6892, 51.3890, true);
        return;
      }

      // Valid location inside Iran
      setCoords({ lat: latitude, lng: longitude });
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, {
            animate: true,
            duration: 1.0,
          });
        } catch {}
      }
      showToast("موقعیت شما با موفقیت شناسایی شد.");
      updateLocationFromCoords(latitude, longitude, true);
    };

    const onLocationError = (err: GeolocationPositionError) => {
      // If high accuracy timed out, retry once with fast approximate network location
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            console.warn("Geolocation fallback failed:", fallbackErr.message);
            showToast("دریافت موقعیت زمان‌بر شد؛ لطفاً موقعیت را دستی روی نقشه انتخاب کنید.");
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
        return;
      }

      setIsLocating(false);
      let errorMsg = "امکان دریافت خودکار موقعیت مکانی میسر نشد.";
      if (err.code === err.PERMISSION_DENIED) {
        errorMsg = "دسترسی به موقعیت مکانی در مرورگر مسدود است؛ لطفاً اجازه دسترسی را در تنظیمات مرورگر فعال کنید.";
      }
      showToast(errorMsg);
    };

    // First attempt: balanced accuracy with realistic timeout
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 15000,
    });
  };

  // Zoom controls with safe guards
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomIn();
      } catch {}
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomOut();
      } catch {}
    }
  };

  return (
    <div
      className={`${
        isEmbedded ? "relative" : "absolute inset-0"
      } w-full h-full overflow-hidden select-none bg-[#FAF9F5]`}
      dir="rtl"
    >
      {/* Dynamic Location Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={`absolute inset-x-4 max-w-md mx-auto z-40 pointer-events-none ${
              isEmbedded ? "top-3" : "top-20 sm:top-24"
            }`}
          >
            <div className="bg-[#141413]/95 text-white text-xs font-medium py-2.5 px-4 rounded-2xl shadow-[0_12px_32px_rgba(20,20,19,0.2)] border border-[#E5E0D8]/20 text-center backdrop-blur-xl flex items-center justify-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#CC785C] animate-ping shrink-0" />
              <span className="leading-snug">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. FULL CANVAS LEAFLET MAP IN BACKGROUND */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Ambient overlay when not in direct custom location picking mode */}
      {locationType !== "CLIENT_LOCATION" && (
        <div className="absolute inset-0 bg-[#FAF9F5]/30 backdrop-blur-[0.5px] pointer-events-none z-10 transition-opacity duration-300" />
      )}

      {/* 2. MATHEMATICALLY & OPTICALLY CENTERED LUXURY MINIMALIST PIN (Comes up when tick is removed) */}
      <AnimatePresence>
        {locationType === "CLIENT_LOCATION" && (
          <motion.div
            key="luxury-map-pin"
            initial={{ opacity: 0, y: 45, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.65 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 24,
              mass: 0.8,
            }}
            className="absolute inset-0 pointer-events-none overflow-hidden z-20"
          >
            {/* Ground Target Anchor (Positioned at EXACT 50% 50% of the map) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
              {/* Outer Pulsing Radar Ring */}
              <motion.div
                animate={{
                  scale: isDragging ? 1.45 : [1, 1.15, 1],
                  opacity: isDragging ? 0.35 : 0.65,
                }}
                transition={{
                  scale: isDragging ? { duration: 0.15 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 0.2 },
                }}
                className="w-7 h-7 rounded-full border border-[#CC785C]/70 bg-[#CC785C]/20 shadow-[0_0_12px_rgba(204,120,92,0.35)]"
              />

              {/* Micro Precision Target Point */}
              <div className="absolute w-3 h-3 rounded-full bg-[#141413] border-2 border-white shadow-xs flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#CC785C]" />
              </div>

              {/* Ground Contact Shadow (Shrinks when pin lifts up) */}
              <motion.div
                animate={{
                  scale: isDragging ? 0.35 : 1,
                  opacity: isDragging ? 0.2 : 0.6,
                }}
                transition={{ duration: 0.18 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-1.5 rounded-full bg-[#141413]/40 blur-[1px]"
              />
            </div>

            {/* Floating Luxury Pin (Tip anchors with zero deviation to 50% 50%) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none z-20">
              <motion.div
                animate={{
                  scale: isDragging ? 1.08 : 1,
                  y: isDragging ? -14 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 26,
                }}
                className="relative flex flex-col items-center select-none"
              >
                {/* Minimal Floating Status Badge */}
                <div className="mb-2 whitespace-nowrap">
                  <div
                    className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black shadow-[0_4px_16px_rgba(20,20,19,0.15)] backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 border ${
                      isDragging
                        ? "bg-[#141413] text-[#CC785C] border-[#CC785C]/50 scale-105 shadow-[0_6px_20px_rgba(204,120,92,0.35)]"
                        : "bg-[#141413]/95 text-white border-[#E5E0D8]/40"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDragging ? "bg-[#CC785C] animate-ping" : "bg-emerald-400"
                      }`}
                    />
                    <span>
                      {isDragging ? "در حال تنظیم موقعیت..." : resolvedPinLabel}
                    </span>
                  </div>
                </div>

                {/* Premium Symmetrical Vector Marker SVG */}
                <div className="relative flex items-center justify-center">
                  <svg
                    width="38"
                    height="46"
                    viewBox="0 0 38 46"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="filter drop-shadow-[0_10px_16px_rgba(20,20,19,0.25)]"
                  >
                    <defs>
                      <linearGradient id="pinBodyGradient" x1="19" y1="0" x2="19" y2="46" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2D2B28" />
                        <stop offset="0.65" stopColor="#1E1D1B" />
                        <stop offset="1" stopColor="#141413" />
                      </linearGradient>
                      <linearGradient id="pinRimGradient" x1="4" y1="0" x2="34" y2="46" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F09B7D" />
                        <stop offset="0.5" stopColor="#CC785C" />
                        <stop offset="1" stopColor="#A8573D" />
                      </linearGradient>
                    </defs>

                    {/* Symmetrical Teardrop Marker: Head centered at (19, 16), r=15, tip at (19, 46) */}
                    <path
                      d="M19 46C13.5 36 4 26 4 16C4 7.71573 10.7157 1 19 1C27.2843 1 34 7.71573 34 16C34 26 24.5 36 19 46Z"
                      fill="url(#pinBodyGradient)"
                      stroke="url(#pinRimGradient)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />

                    {/* Inner Optical Disc centered at (19, 16) */}
                    <circle cx="19" cy="16" r="10.5" fill="#141413" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                    {/* Minimalist Camera Icon centered at (19, 16) */}
                    <rect x="13" y="12" width="12" height="9" rx="2" fill="none" stroke="#CC785C" strokeWidth="1.4" />
                    <path d="M16.8 12L17.5 10.5H20.5L21.2 12" stroke="#CC785C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="19" cy="16.5" r="2.8" fill="#CC785C" />
                    <circle cx="19" cy="16.5" r="1.1" fill="#141413" />
                  </svg>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SOFT POPUP AT THE TOP — order flow only (location type picker) */}
      {!isEmbedded && (
      <div className="absolute top-[68px] sm:top-[76px] inset-x-3 sm:inset-x-6 max-w-lg mx-auto z-30 pointer-events-auto">
        <motion.div
          layout
          transition={{
            layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
          }}
          className="bg-jar-surface/95 sm:bg-jar-surface/92 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-jar-border shadow-[0_4px_24px_rgba(31,30,29,0.06)] p-3.5 sm:p-4 space-y-2.5 transition-colors"
        >
          {/* Text + Checkbox Smart Default Row (No Boxes) */}
          <div
            role="checkbox"
            aria-checked={isLocationDefault}
            tabIndex={0}
            onClick={() => {
              if (isLocationDefault) {
                onChangeLocationType?.("CLIENT_LOCATION");
                if (mapInstanceRef.current) {
                  const center = mapInstanceRef.current.getCenter();
                  updateLocationFromCoords(center.lat, center.lng, true);
                } else {
                  updateLocationFromCoords(coords.lat, coords.lng, true);
                }
              } else {
                onChangeLocationType?.("SPECIALIST_ADVICE");
                const city =
                  matchServiceCity(districtRef.current) || DEFAULT_SERVICE_CITY;
                onChangeDistrictRef.current(city);
                onChangeAddressRef.current("");
                setLocationBadge(city);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (isLocationDefault) {
                  onChangeLocationType?.("CLIENT_LOCATION");
                  if (mapInstanceRef.current) {
                    const center = mapInstanceRef.current.getCenter();
                    updateLocationFromCoords(center.lat, center.lng, true);
                  } else {
                    updateLocationFromCoords(coords.lat, coords.lng, true);
                  }
                } else {
                  onChangeLocationType?.("SPECIALIST_ADVICE");
                  const city =
                    matchServiceCity(districtRef.current) || DEFAULT_SERVICE_CITY;
                  onChangeDistrictRef.current(city);
                  onChangeAddressRef.current("");
                  setLocationBadge(city);
                }
              }
            }}
            className="group flex items-start gap-3 py-0.5 cursor-pointer select-none"
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 mt-0.5 transition-all duration-200 ${
                isLocationDefault
                  ? "bg-jar-primary border-jar-primary text-white shadow-none"
                  : "border-jar-border bg-jar-surface group-hover:border-jar-primary/40"
              }`}
            >
              <AnimatePresence mode="wait">
                {isLocationDefault && (
                  <motion.div
                    key="check-icon"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 26 }}
                    className="flex items-center justify-center"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-jar-primary group-hover:text-black transition-colors">
                    پیشنهاد لوکیشن با مشورت عکاس
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors duration-200 ${
                      isLocationDefault
                        ? "bg-jar-logo/10 text-jar-logo border-jar-logo/20"
                        : "bg-jar-canvas text-jar-muted border-jar-border"
                    }`}
                  >
                    پیشنهادی
                  </span>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-jar-muted leading-relaxed">
                عکاس بر اساس سبک کار، بهترین لوکیشن‌ها را پیشنهاد می‌دهد.
              </p>
            </div>
          </div>

          {/* Progressive Disclosure: Options expand if unchecked */}
          <AnimatePresence initial={false}>
            {!isLocationDefault && (
              <motion.div
                key="location-options-accordion"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  height: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.32, ease: "easeOut" },
                }}
                className="space-y-2.5 pt-1 overflow-hidden"
              >
                {/* The two sub-options SIDE BY SIDE */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  {/* Option 1: در محل شما */}
                  <button
                    type="button"
                    onClick={() => onChangeLocationType?.("CLIENT_LOCATION")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                      locationType === "CLIENT_LOCATION"
                        ? "border-2 border-jar-primary bg-jar-surface text-jar-primary shadow-xs"
                        : "border-jar-border bg-jar-surface hover:bg-jar-soft text-jar-primary hover:border-jar-primary/40 shadow-none"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border shrink-0 transition-all ${
                        locationType === "CLIENT_LOCATION"
                          ? "border-jar-primary bg-jar-primary text-white"
                          : "border-jar-border bg-jar-surface"
                      }`}
                    >
                      {locationType === "CLIENT_LOCATION" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`block text-xs sm:text-sm font-bold truncate transition-colors ${
                          locationType === "CLIENT_LOCATION"
                            ? "text-jar-primary"
                            : "text-jar-muted"
                        }`}
                      >
                        در محل شما
                      </span>
                      <span className="block text-[10px] sm:text-[11px] text-[#A8A29A] truncate">
                        منزل، محل کار یا فضای باز
                      </span>
                    </div>
                  </button>

                  {/* Option 2: استودیوهای همکار جار */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeLocationType?.("JAR_STUDIO");
                      const city =
                        matchServiceCity(districtRef.current) || DEFAULT_SERVICE_CITY;
                      onChangeDistrict(city);
                      onChangeAddress("");
                      setLocationBadge(city);
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                      locationType === "JAR_STUDIO"
                        ? "border-2 border-jar-primary bg-jar-surface text-jar-primary shadow-xs"
                        : "border-jar-border bg-jar-surface hover:bg-jar-soft text-jar-primary hover:border-jar-primary/40 shadow-none"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border shrink-0 transition-all ${
                        locationType === "JAR_STUDIO"
                          ? "border-jar-primary bg-jar-primary text-white"
                          : "border-jar-border bg-jar-surface"
                      }`}
                    >
                      {locationType === "JAR_STUDIO" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`block text-xs sm:text-sm font-bold truncate transition-colors ${
                          locationType === "JAR_STUDIO"
                            ? "text-jar-primary"
                            : "text-jar-muted"
                        }`}
                      >
                        استودیوهای همکار
                      </span>
                      <span className="block text-[10px] sm:text-[11px] text-[#A8A29A] truncate">
                        آتلیه و عمارت‌های مجهز
                      </span>
                    </div>
                  </button>
                </div>

                {/* Studio Note */}
                {locationType === "JAR_STUDIO" && (
                  <div className="px-3 py-2 rounded-xl bg-jar-canvas border border-jar-border flex items-center gap-2 text-jar-muted text-[11px] font-medium">
                    <Info className="h-3.5 w-3.5 text-[#A8A29A] shrink-0" />
                    <span>آدرس و هماهنگی استودیو پس از انتخاب عکاس انجام می‌شود.</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* City is always required when map pin is not used */}
          {(locationType === "SPECIALIST_ADVICE" || locationType === "JAR_STUDIO") && (
            <div className="pt-2 border-t border-jar-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-black text-jar-primary">
                  شهر پروژه <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-jar-muted font-medium">
                  برای معرفی متخصصین همان شهر
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_CITIES.map((city) => {
                  const selected =
                    matchServiceCity(district) === city || district.trim() === city;
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        onChangeDistrict(city);
                        onChangeAddress("");
                        setLocationBadge(city);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                        selected
                          ? "bg-jar-primary text-white border-jar-primary"
                          : "bg-jar-canvas text-jar-muted border-jar-border hover:border-jar-primary/40 hover:text-jar-primary"
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
              {!matchServiceCity(district) && district.trim().length > 0 && (
                <p className="text-[10px] text-amber-700 font-medium">
                  شهر انتخاب‌شده: {district.trim()}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
      )}

      {/* 4. FLOATING BOTTOM BAR WITH ADDRESS & GPS (Only for Client Location) */}
      <AnimatePresence>
        {locationType === "CLIENT_LOCATION" && (
          <motion.div
            key="bottom-address-bar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`absolute inset-x-3 sm:inset-x-6 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto z-30 ${
              isEmbedded ? "bottom-3" : "bottom-20 sm:bottom-24"
            }`}
          >
            <div className="rounded-2xl border border-jar-border bg-jar-surface/95 backdrop-blur-xl p-3 sm:p-4 shadow-sm space-y-2 text-right">
              
              {/* Geocoded Address Preview & GPS Button */}
              <div className="flex items-center justify-between gap-2 border-b border-jar-border pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-jar-primary shrink-0" />
                  <span className="text-xs font-bold text-jar-primary truncate">
                    {isDragging ? (
                      <span className="text-[#A8A29A] font-normal animate-pulse">در حال جابجایی روی نقشه...</span>
                    ) : isResolvingAddress ? (
                      <span className="text-jar-logo font-medium animate-pulse">در حال دریافت و تکمیل خودکار آدرس...</span>
                    ) : (
                      locationBadge || "موقعیت روی نقشه انتخاب شد"
                    )}
                  </span>
                </div>

                {/* Relocate to User GPS Button */}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-jar-surface border border-jar-border text-jar-primary hover:bg-jar-soft text-[11px] font-medium transition-colors shrink-0 shadow-none cursor-pointer"
                >
                  <Navigation className={`h-3 w-3 ${isLocating ? "animate-spin text-jar-primary" : "text-jar-primary"}`} />
                  <span>موقعیت من</span>
                </button>
              </div>

              {/* District and Address Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5 space-y-0.5">
                  <label className="block text-[10px] font-bold text-jar-primary">
                    شهر، منطقه یا محله:
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => onChangeDistrict(e.target.value)}
                    placeholder="مثلاً: تهران، سعادت‌آباد..."
                    className="w-full h-9 px-3 rounded-xl border border-jar-border bg-jar-surface text-xs font-medium text-jar-primary placeholder:text-[#A8A29A] outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-none"
                  />
                </div>

                <div className="sm:col-span-7 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-jar-primary">
                      آدرس دقیق پستی:
                    </label>
                    {isResolvingAddress && (
                      <span className="text-[9px] text-jar-logo font-medium animate-pulse">
                        در حال درج آدرس...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => onChangeAddress(e.target.value)}
                    placeholder="خیابان، کوچه، پلاک، واحد..."
                    className="w-full h-9 px-3 rounded-xl border border-jar-border bg-jar-surface text-xs font-medium text-jar-primary placeholder:text-[#A8A29A] outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING ZOOM CONTROLS (Corner) */}
      <div
        className={`absolute left-3 sm:left-5 z-30 hidden sm:flex flex-col rounded-xl bg-jar-surface/90 backdrop-blur-md border border-jar-border shadow-sm overflow-hidden ${
          isEmbedded ? "top-3" : "top-28"
        }`}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="h-7 w-7 flex items-center justify-center text-jar-primary hover:bg-jar-soft transition-colors border-b border-jar-border cursor-pointer"
          aria-label="بزرگ‌نمایی"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="h-7 w-7 flex items-center justify-center text-jar-primary hover:bg-jar-soft transition-colors cursor-pointer"
          aria-label="کوچک‌نمایی"
        >
          <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
