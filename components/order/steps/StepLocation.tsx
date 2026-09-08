"use client";

import React from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

export type LocationType = "CLIENT_LOCATION" | "SPECIALIST_ADVICE" | "JAR_STUDIO";

export interface StepLocationProps {
  locationType: LocationType;
  onChangeLocationType: (type: LocationType) => void;
  address: string;
  onChangeAddress: (val: string) => void;
  district: string;
  onChangeDistrict: (val: string) => void;
  onChangeCoords?: (coords: { lat: number; lng: number }) => void;
}

const LocationMapPicker = dynamic(
  () => import("@/components/order/LocationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 w-screen h-dvh bg-jar-canvas/95 flex flex-col items-center justify-center gap-3 text-jar-muted z-0 select-none" dir="rtl">
        <MapPin className="h-8 w-8 text-jar-logo animate-bounce" />
        <span className="text-xs font-bold text-jar-primary">در حال بارگذاری نقشه هوشمند جار...</span>
      </div>
    ),
  }
);

export default function StepLocation({
  locationType,
  onChangeLocationType,
  address,
  onChangeAddress,
  district,
  onChangeDistrict,
  onChangeCoords,
}: StepLocationProps) {
  return (
    <div className="w-full h-full" dir="rtl">
      <LocationMapPicker
        locationType={locationType}
        onChangeLocationType={onChangeLocationType}
        district={district}
        onChangeDistrict={onChangeDistrict}
        address={address}
        onChangeAddress={onChangeAddress}
        onChangeCoords={onChangeCoords}
      />
    </div>
  );
}
