"use client";

import { useEffect, useState } from "react";
import { X, Navigation, Award, Star, ArrowLeft, Eye, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import Link from "next/link";

// Specialist & Studio location items
interface ExpertLocation {
  id: string;
  name: string;
  area: string;
  type: "specialist" | "studio";
  price: string;
  rating: string;
  imageUrl: string;
  coords: [number, number];
  specialty: string;
  badge: string;
}

const EXPERT_LOCATIONS: ExpertLocation[] = [
  {
    id: "sara",
    name: "سارا احمدی",
    area: "تهران - ولیعصر و ونک",
    type: "specialist",
    price: "۲,۸۹۰,۰۰۰ تومان",
    rating: "۴.۹",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    coords: [35.7760, 51.4080],
    specialty: "عکاسی پرتره و فشن",
    badge: "پک پرو (Pro)"
  },
  {
    id: "aria",
    name: "استودیو آریا",
    area: "تهران - سعادت‌آباد",
    type: "studio",
    price: "۴,۹۰۰,۰۰۰ تومان",
    rating: "۴.۸",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    coords: [35.7900, 51.3700],
    specialty: "فیلم‌برداری و تیزر تبلیغاتی",
    badge: "پک اولترا (Ultra)"
  },
  {
    id: "amir",
    name: "امیرحسین رضایی",
    area: "تهران - سهروردی",
    type: "specialist",
    price: "۲,۸۹۰,۰۰۰ تومان",
    rating: "۵.۰",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    coords: [35.7300, 51.4400],
    specialty: "عکاسی معماری و دکوراسیون",
    badge: "پک پرو (Pro)"
  },
  {
    id: "royal",
    name: "عمارت رویال",
    area: "احمدآباد مستوفی",
    type: "studio",
    price: "۴,۹۰۰,۰۰۰ تومان",
    rating: "۴.۷",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=300&auto=format&fit=crop",
    coords: [35.6139, 51.0180],
    specialty: "لوکیشن و عمارت عکاسی",
    badge: "پک اولترا (Ultra)"
  }
];

type OutdoorMapProps = {
  onClose: () => void;
};

// Sub-component to handle map panning programmatically in react-leaflet
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function OutdoorMap({ onClose }: OutdoorMapProps) {
  const [selectedExpert, setSelectedExpert] = useState<ExpertLocation>(EXPERT_LOCATIONS[0]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.7760, 51.4080]);
  const [mapZoom, setMapZoom] = useState(12);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Custom DivIcon marker layout (Black base, glowing amber center, ping animation)
  const createCustomIcon = (type: "specialist" | "studio") => {
    const coreColor = type === "studio" ? "bg-amber-400" : "bg-sky-400";
    const pingColor = type === "studio" ? "bg-amber-500/30" : "bg-sky-500/30";
    
    const htmlString = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full ${pingColor} animate-ping"></div>
        <div class="relative w-5 h-5 rounded-full border border-white bg-slate-950 flex items-center justify-center shadow-lg">
          <div class="w-2.5 h-2.5 rounded-full ${coreColor}"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-pwa-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const handleMarkerClick = (expert: ExpertLocation) => {
    setSelectedExpert(expert);
    setMapCenter(expert.coords);
    setMapZoom(14);
  };

  const handleRouteClick = (expert: ExpertLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${expert.coords[0]},${expert.coords[1]}`, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col animate-fade-in text-right" dir="rtl">
      {/* Map Panel Header */}
      <div className="w-full h-16 px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 z-30 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <MapPin className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">موقعیت متخصصین و آتلیه‌ها</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">پیدا کردن و هماهنگی با بهترین‌های نزدیک شما</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full relative z-10 bg-slate-100 flex flex-col">
        {/* React Leaflet Map */}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          {/* CartoDB Positron Minimalistic Unfiltered Map Tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {EXPERT_LOCATIONS.map((expert) => (
            <Marker
              key={expert.id}
              position={expert.coords}
              icon={createCustomIcon(expert.type)}
              eventHandlers={{
                click: () => handleMarkerClick(expert)
              }}
            />
          ))}

          <MapController center={mapCenter} zoom={mapZoom} />
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none select-none">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200/50 shadow-md flex flex-col gap-1.5 pointer-events-auto text-[9px] font-bold text-slate-650">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-200"></span>
              <span>آتلیه و عمارت عکاسی</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 border border-slate-200"></span>
              <span>عکاس / فیلم‌بردار مستقل</span>
            </div>
          </div>
        </div>

        {/* Interactive Custom Card (Responsive Bottom Sheet / Floating Card) */}
        {selectedExpert && (
          <>
            {/* Desktop View: Floating Card */}
            <div className="hidden md:block absolute bottom-6 right-6 z-[1000] w-80 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.06)] p-5 animate-fade-in space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedExpert.imageUrl}
                  alt={selectedExpert.name}
                  className="h-16 w-16 rounded-2xl object-cover bg-slate-100 border border-slate-200 shadow-sm shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">{selectedExpert.name}</h4>
                    {selectedExpert.type === "studio" && (
                      <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">آتلیه</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-[#006097]">{selectedExpert.specialty}</p>
                  
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{selectedExpert.rating}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-[10px] font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>محدوده کاری:</span>
                  <span className="text-slate-800">{selectedExpert.area}</span>
                </div>
                <div className="flex justify-between">
                  <span>پکیج پایه:</span>
                  <span className="text-slate-800 font-mono">{selectedExpert.price}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleRouteClick(selectedExpert, e)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-[9px] font-black flex items-center justify-center gap-1"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  مسیریابی
                </button>
                <Link
                  href="/profile/upgrade"
                  className="flex-[1.5] h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-850 transition text-[9px] font-black flex items-center justify-center gap-1"
                >
                  <span>ثبت سفارش و رزرو</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Mobile View: Bottom Sheet */}
            <div className="md:hidden fixed bottom-0 inset-x-0 z-[2000] bg-white rounded-t-[32px] shadow-[0_-4px_30px_rgba(0,0,0,0.06)] p-5 border-t border-slate-100 animate-slide-up flex flex-col space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {/* Drag indicator */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1" />

              <div className="flex items-center gap-4">
                <img
                  src={selectedExpert.imageUrl}
                  alt={selectedExpert.name}
                  className="h-16 w-16 rounded-2xl object-cover bg-slate-100 border border-slate-200 shadow-sm shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">{selectedExpert.name}</h4>
                    {selectedExpert.type === "studio" && (
                      <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">آتلیه</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-[#006097]">{selectedExpert.specialty}</p>
                  
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{selectedExpert.rating}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 space-y-2 text-[10px] font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>محدوده کاری:</span>
                  <span className="text-slate-800">{selectedExpert.area}</span>
                </div>
                <div className="flex justify-between">
                  <span>قیمت پایه ({selectedExpert.badge}):</span>
                  <span className="text-slate-800 font-mono">{selectedExpert.price}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => handleRouteClick(selectedExpert, e)}
                  className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <Navigation className="h-4 w-4" />
                  مسیریابی
                </button>
                <Link
                  href="/profile/upgrade"
                  className="flex-[1.8] h-12 rounded-2xl bg-slate-950 text-white hover:bg-slate-850 transition text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <span>ثبت سفارش و رزرو</span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
