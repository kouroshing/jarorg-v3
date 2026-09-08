/**
 * Travel fee for a shoot: how far the specialist has to come, and what that
 * costs the client.
 *
 * Jar computes the fee so both sides see the same number for the same trip.
 * A specialist may still override it on a proposal — bridge tolls, a van, a
 * shoot they know is awkward to reach — but they have to say why, and the
 * client sees both figures.
 */

export type LatLng = { lat: number; lng: number };

/**
 * Straight-line distance in kilometres.
 *
 * Iran spans roughly 25°–40° N, so a spherical earth is accurate to well under
 * a percent here — far tighter than the road-vs-air gap corrected below.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Roads are longer than the crow's flight. 1.4 is the usual circuity factor for
 * a dense grid city; in Tehran, where the Alborz and the expressway network push
 * traffic through a few corridors, straight-line distance badly understates the
 * real trip.
 *
 * This is a deliberate approximation so the feature needs no routing API key.
 * Swapping in Neshan's distance-matrix later means replacing only this function.
 */
const ROAD_CIRCUITY_FACTOR = 1.4;

export function estimateRoadKm(from: LatLng, to: LatLng): number {
  return haversineKm(from, to) * ROAD_CIRCUITY_FACTOR;
}

export type TravelSettings = {
  /** Distance covered before any fee applies. */
  freeRadiusKm: number;
  /** Toman per kilometre beyond the free radius. */
  ratePerKm: number;
};

export type TravelQuote = {
  /** Estimated road distance, one way. */
  distanceKm: number;
  /** Kilometres actually charged for, after the free radius. */
  chargeableKm: number;
  /** Toman. Round trip — the specialist has to get home again. */
  fee: number;
  /** True when the location is inside the free radius. */
  isFree: boolean;
};

/**
 * Quotes the travel fee for one shoot. Returns null when either side has no
 * coordinates — an older order, or a specialist who has not set their base yet
 * — so callers can fall back to "not calculated" rather than to a wrong zero.
 */
export function quoteTravel(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  settings: TravelSettings
): TravelQuote | null {
  if (!isUsable(from) || !isUsable(to)) return null;

  const distanceKm = estimateRoadKm(from, to);
  const chargeableKm = Math.max(0, distanceKm - settings.freeRadiusKm);
  // Round trip, then to the nearest 1,000 toman so quotes read as prices.
  const raw = chargeableKm * 2 * settings.ratePerKm;
  const fee = Math.round(raw / 1000) * 1000;

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    chargeableKm: Math.round(chargeableKm * 10) / 10,
    fee,
    isFree: fee === 0,
  };
}

function isUsable(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    // 0,0 is in the Atlantic; it means "never set", not a real location.
    !(p.lat === 0 && p.lng === 0)
  );
}

/** What the client pays for one proposal: the specialist's fee plus travel. */
export function proposalTotal(input: {
  proposedPrice: number | null;
  travelFee: number | null;
  travelFeeOverride: number | null;
}): number {
  const base = input.proposedPrice ?? 0;
  const travel = input.travelFeeOverride ?? input.travelFee ?? 0;
  return base + travel;
}

/** The travel figure actually charged, once an override is taken into account. */
export function effectiveTravelFee(input: {
  travelFee: number | null;
  travelFeeOverride: number | null;
}): number {
  return input.travelFeeOverride ?? input.travelFee ?? 0;
}
