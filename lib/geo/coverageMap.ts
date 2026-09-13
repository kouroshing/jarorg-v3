/**
 * Homepage coverage map — projection + Iran outline + circle helpers.
 * Outline and specialist circles share the same equirectangular projection
 * so dots land correctly on the silhouette.
 */

export const IRAN_MAP_VIEWBOX = { width: 1000, height: 820 } as const;

/** Geographic frame tightly around Iran (with modest padding). */
export const IRAN_GEO = {
  minLng: 43.6,
  maxLng: 63.8,
  minLat: 24.6,
  maxLat: 40.4,
} as const;

export type CoverageCircle = {
  /** SVG x */
  x: number;
  /** SVG y */
  y: number;
  /** Coverage radius in SVG units (from specialist km) */
  r: number;
  /** Radius in km (for UI) */
  radiusKm: number;
  /** Optional city / area label */
  label: string | null;
  /** How many active specialists were merged into this circle */
  count: number;
};

/** Equirectangular project into viewBox. */
export function projectLngLat(
  lat: number,
  lng: number
): { x: number; y: number } {
  const { width, height } = IRAN_MAP_VIEWBOX;
  const x =
    ((lng - IRAN_GEO.minLng) / (IRAN_GEO.maxLng - IRAN_GEO.minLng)) * width;
  const y =
    ((IRAN_GEO.maxLat - lat) / (IRAN_GEO.maxLat - IRAN_GEO.minLat)) * height;
  return { x, y };
}

/** Convert coverage km → SVG radius using mid-latitude scale. */
export function kmToSvgRadius(km: number): number {
  const { height } = IRAN_MAP_VIEWBOX;
  const latSpanKm = (IRAN_GEO.maxLat - IRAN_GEO.minLat) * 111;
  const r = (Math.max(1, km) / latSpanKm) * height;
  // Keep tiny radii visible, huge ones from not swallowing the whole map.
  return Math.min(120, Math.max(10, r));
}

/**
 * Simplified Iran border ring [lng, lat] from Natural Earth / geo-countries
 * (downsampled). Recognizable silhouette — Caspian, Hormuz, western curve.
 */
export const IRAN_BORDER_LNG_LAT: ReadonlyArray<readonly [number, number]> = [
  [44.61, 39.779],
  [44.341, 39.388],
  [44.051, 39.403],
  [44.212, 39.136],
  [44.195, 38.935],
  [44.258, 38.719],
  [44.363, 38.375],
  [44.355, 38.132],
  [44.271, 37.872],
  [44.574, 37.639],
  [44.722, 37.36],
  [44.764, 37.129],
  [44.904, 37.005],
  [44.938, 36.787],
  [45.151, 36.408],
  [45.378, 36.072],
  [45.799, 35.828],
  [46.171, 35.8],
  [46.241, 35.716],
  [46.0, 35.538],
  [46.159, 35.088],
  [45.92, 35.094],
  [45.743, 34.83],
  [45.678, 34.553],
  [45.584, 34.304],
  [45.65, 33.764],
  [45.931, 33.492],
  [46.217, 33.202],
  [46.508, 32.904],
  [47.461, 32.397],
  [47.563, 32.193],
  [47.624, 32.102],
  [47.686, 32.024],
  [47.702, 32.011],
  [47.732, 31.942],
  [47.684, 31.0],
  [48.272, 30.337],
  [48.564, 29.95],
  [48.91, 30.296],
  [49.552, 29.986],
  [50.453, 29.6],
  [50.809, 29.108],
  [51.111, 28.417],
  [51.656, 27.811],
  [52.984, 27.115],
  [54.256, 26.699],
  [54.954, 26.579],
  [55.578, 26.867],
  [56.194, 27.118],
  [57.145, 26.02],
  [58.083, 25.547],
  [59.785, 25.376],
  [61.403, 25.006],
  [62.029, 26.333],
  [62.312, 26.519],
  [63.195, 27.258],
  [62.516, 28.321],
  [61.847, 31.021],
  [60.8, 31.977],
  [60.932, 33.504],
  [60.581, 34.247],
  [60.743, 34.512],
  [61.067, 34.858],
  [61.097, 35.227],
  [61.258, 35.501],
  [61.269, 35.59],
  [59.821, 37.112],
  [58.074, 37.797],
  [55.453, 38.078],
  [53.981, 37.099],
  [49.916, 37.492],
  [48.447, 38.583],
  [48.021, 38.897],
  [48.321, 39.347],
  [47.065, 39.243],
  [46.579, 38.891],
  [46.317, 38.908],
  [45.915, 38.873],
  [45.438, 39.007],
  [45.144, 39.28],
  [44.978, 39.449],
  [44.897, 39.604],
  [44.61, 39.779],
];

/** Precomputed SVG path for the Iran outline (same projection as circles). */
export function buildIranOutlinePath(): string {
  return IRAN_BORDER_LNG_LAT.map(([lng, lat], i) => {
    const { x, y } = projectLngLat(lat, lng);
    const px = Math.round(x * 10) / 10;
    const py = Math.round(y * 10) / 10;
    return `${i === 0 ? "M" : "L"}${px} ${py}`;
  }).join(" ") + " Z";
}

export const IRAN_OUTLINE_PATH = buildIranOutlinePath();

export function toCoverageCircle(input: {
  lat: number;
  lng: number;
  radiusKm: number;
  label?: string | null;
  count?: number;
}): CoverageCircle {
  const { x, y } = projectLngLat(input.lat, input.lng);
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    r: kmToSvgRadius(input.radiusKm),
    radiusKm: input.radiusKm,
    label: input.label?.trim() || null,
    count: input.count ?? 1,
  };
}
