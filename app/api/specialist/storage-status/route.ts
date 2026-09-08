import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role: must be specialist or admin
  const isSpecialist =
    (session.role as string) === "specialist" ||
    (session.role as string) === "ADMIN" ||
    (session.role as string) === "admin";
  if (!isSpecialist) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    // No more hardcoded VIP checks based on phone number
    const isVIP = false;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let storageLimit = user.storageLimit;
    let usedStorage = user.usedStorage;
    let tier = "PRO";
    let onboardingStatus = user.onboardingStatus;

    if (isVIP) {
      // 999 Terabytes (in bytes)
      storageLimit = 999 * 1024 * 1024 * 1024 * 1024;
      tier = "ULTRA";
      onboardingStatus = "approved"; // VIP bypasses onboarding
    } else if (storageLimit === 0) {
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
      hasStudio: user.hasStudio,
      studioImages: user.studioImages ? JSON.parse(user.studioImages) : [],
      city: user.city,
      locationTypes: user.locationTypes ? JSON.parse(user.locationTypes) : [],
      equipment: user.equipment ? JSON.parse(user.equipment) : [],
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
