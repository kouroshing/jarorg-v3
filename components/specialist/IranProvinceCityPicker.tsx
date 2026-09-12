"use client";

import React, { useMemo } from "react";
import { IRAN_PROVINCES, getCitiesForProvince } from "@/lib/geo/iranPlaces";

type Props = {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
};

export default function IranProvinceCityPicker({
  province,
  city,
  onProvinceChange,
  onCityChange,
  required = true,
}: Props) {
  const cities = useMemo(() => getCitiesForProvince(province), [province]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-jar-primary">
          استان {required ? <span className="text-rose-500">*</span> : null}
        </label>
        <select
          value={province}
          onChange={(e) => {
            onProvinceChange(e.target.value);
            onCityChange("");
          }}
          className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all appearance-none"
        >
          <option value="">انتخاب استان...</option>
          {IRAN_PROVINCES.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-jar-primary">
          شهر {required ? <span className="text-rose-500">*</span> : null}
        </label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={!province}
          className="w-full h-12 rounded-2xl border border-jar-border bg-jar-canvas px-4 text-xs font-medium text-jar-primary focus:bg-jar-surface focus:border-jar-logo focus:ring-4 focus:ring-jar-logo/10 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{province ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}</option>
          {cities.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
