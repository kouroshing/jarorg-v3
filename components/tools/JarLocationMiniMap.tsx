"use client";

import React, { useEffect, useRef } from "react";
import { getJarMapTileConfig, jarMapTileLayerOptions } from "@/lib/maps/tiles";

export default function JarLocationMiniMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { center: [lat, lng], zoom: 14, zoomControl: false });
      const tileCfg = getJarMapTileConfig();
      L.tileLayer(tileCfg.url, jarMapTileLayerOptions(tileCfg)).addTo(map);
      const icon = L.divIcon({
        className: "jar-loc-marker",
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#006097;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.25)" title="${name.replace(/"/g, "")}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, name]);

  return (
    <div className="h-52 w-full overflow-hidden rounded-2xl border border-jar-border [&_.leaflet-tile-pane]:saturate-[0.75] [&_.leaflet-tile-pane]:contrast-[0.96]">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
