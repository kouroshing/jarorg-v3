/**
 * Shared basemap for Jar map surfaces — light / minimal, matches site canvas.
 *
 * Carto CDN watermarks tiles without an API key; use Neshan (if configured),
 * Carto with NEXT_PUBLIC_CARTO_API_KEY, or Esri light gray fallback.
 */

export type JarMapTileConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
  minZoom?: number;
  subdomains?: string;
};

/** Pick tiles at runtime (client-safe via NEXT_PUBLIC_*). */
export function getJarMapTileConfig(): JarMapTileConfig {
  const neshanKey = process.env.NEXT_PUBLIC_NESHAN_API_KEY?.trim();

  if (neshanKey) {
    return {
      url: `https://api.neshan.org/v4/tiles/standard/{z}/{x}/{y}.png?api_key=${encodeURIComponent(neshanKey)}`,
      attribution:
        '&copy; <a href="https://platform.neshan.org">نشان</a> &copy; OpenStreetMap',
      maxZoom: 18,
      minZoom: 5,
    };
  }

  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  if (cartoKey) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: "abcd",
    };
  }

  return {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap contributors',
    maxZoom: 16,
    minZoom: 3,
  };
}

export function jarMapTileLayerOptions(cfg: JarMapTileConfig): Record<string, unknown> {
  return {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    ...(cfg.minZoom != null ? { minZoom: cfg.minZoom } : {}),
    ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
  };
}
