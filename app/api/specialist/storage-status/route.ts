import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseEquipmentTags } from "@/lib/equipment/catalog";
import { isSpecialistRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true,
        usedStorage: true,
        storageLimit: true,
        onboardingStatus: true,
        specialistRoles: true,
        hasStudio: true,
        studioImages: true,
        city: true,
        locationTypes: true,
        equipment: true,
        pricingGenres: true,
        has100DaysMasterclass: true,
        specialistProfile: {
          select: { studioName: true, studioLat: true, studioLng: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = (session.role || "").toLowerCase() === "admin";
    if (!isAdmin && !isSpecialistRole(user.role) && !user.specialistProfile) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const hasRealStudio = Boolean(
      user.specialistProfile?.studioName &&
        typeof user.specialistProfile.studioLat === "number" &&
        typeof user.specialistProfile.studioLng === "number"
    );

    let storageLimit = user.storageLimit;
    let usedStorage = user.usedStorage;
    let tier = "PRO";
    const onboardingStatus = user.onboardingStatus;

    if (storageLimit === 0) {
      tier = "BASIC";
    } else if (storageLimit > 2147483648) {
      tier = "ULTRA";
    }

    return NextResponse.json({
      success: true,
      usedStorage,
      storageLimit,
      tier,
      onboardingStatus,
      specialistRoles: user.specialistRoles ? JSON.parse(user.specialistRoles) : [],
      hasStudio: hasRealStudio,
      studioImages: user.studioImages ? JSON.parse(user.studioImages) : [],
      city: user.city,
      locationTypes: user.locationTypes ? JSON.parse(user.locationTypes) : [],
      equipment: parseEquipmentTags(user.equipment),
      pricingGenres: user.pricingGenres ? JSON.parse(user.pricingGenres) : [],
      has100DaysMasterclass: user.has100DaysMasterclass,
    });
  } catch (error) {
    console.error("Storage Status Error:", error);
    return NextResponse.json(
      { error: "Failed to load storage status" },
      { status: 500 }
    );
  }
}
