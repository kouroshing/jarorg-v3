import "server-only";
import { prisma } from "@/lib/prisma";
import type { TravelSettings } from "@/lib/orders/travel";

/**
 * Marketplace settings, held on the PwaSettings singleton alongside
 * galleryCommission. Zero defaults are deliberate: no commission is taken and
 * no travel is charged until someone sets these in the admin panel.
 */
export type MarketplaceSettings = TravelSettings & {
  /** Percent Jar keeps from the specialist's fee when settling. */
  specialistCommission: number;
};

export const MARKETPLACE_DEFAULTS: MarketplaceSettings = {
  specialistCommission: 0,
  freeRadiusKm: 8,
  ratePerKm: 0,
};

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  try {
    const row = await prisma.pwaSettings.findUnique({
      where: { id: "system-config" },
      select: {
        specialistCommission: true,
        travelFreeRadiusKm: true,
        travelRatePerKm: true,
      },
    });

    if (!row) return MARKETPLACE_DEFAULTS;

    return {
      specialistCommission: clampPercent(row.specialistCommission),
      freeRadiusKm: Math.max(0, row.travelFreeRadiusKm),
      ratePerKm: Math.max(0, row.travelRatePerKm),
    };
  } catch {
    // A missing settings row must not stop someone from quoting a job.
    return MARKETPLACE_DEFAULTS;
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** The specialist's share of an order total, after commission. */
export function settlementAmount(input: {
  agreedBasePrice: number | null;
  agreedTravelFee: number | null;
  commissionPercent: number | null;
}): number {
  const base = input.agreedBasePrice ?? 0;
  const travel = input.agreedTravelFee ?? 0;
  const rate = clampPercent(input.commissionPercent ?? 0);
  // Commission is taken from the specialist's fee only. Travel reimburses a
  // real cost they have already paid, so Jar does not take a cut of it.
  const commission = Math.round((base * rate) / 100);
  return base - commission + travel;
}
