import { NextRequest, NextResponse } from "next/server";
import { getFastIranLocation } from "@/lib/geo/reverseGeocode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // Default fast offline fallback
    const fastLoc = getFastIranLocation(lat, lng);

    // 1. Try Neshan API if API Key is configured
    const neshanKey =
      process.env.NEXT_PUBLIC_NESHAN_API_KEY ||
      process.env.NESHAN_API_KEY;

    if (neshanKey) {
      try {
        const neshanRes = await fetch(
          `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
          {
            headers: {
              "Api-Key": neshanKey,
            },
            signal: AbortSignal.timeout(2500),
          }
        );

        if (neshanRes.ok) {
          const data = await neshanRes.json();
          const city = data.city || data.state || "تهران";
          const neighbourhood = data.neighbourhood || data.district || "";
          const resolvedDistrict = neighbourhood
            ? `${city}، ${neighbourhood}`
            : city;
          const formattedAddress = data.formatted_address || data.route_name || fastLoc.address;

          return NextResponse.json({
            district: resolvedDistrict || fastLoc.district,
            address: formattedAddress,
            city,
          });
        }
      } catch {
        // Fall through to next provider
      }
    }

    // 2. Try OpenStreetMap Nominatim (Accurate Persian streets & house numbers)
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=fa`,
        {
          headers: {
            "User-Agent": "Jar-App/1.0 (contact@jarorg.ir)",
            "Accept-Language": "fa",
          },
          signal: AbortSignal.timeout(2200),
        }
      );

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const addr = nomData.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || "تهران";
        const neighbourhood =
          addr.neighbourhood ||
          addr.suburb ||
          addr.quarter ||
          addr.residential ||
          "";

        const resolvedDistrict =
          neighbourhood && neighbourhood !== city
            ? `${city}، ${neighbourhood}`
            : city;

        const road = addr.road || addr.pedestrian || addr.highway || "";
        const houseNumber = addr.house_number ? `پلاک ${addr.house_number}` : "";
        const streetParts = [road, houseNumber].filter(Boolean);
        const resolvedStreet = streetParts.length > 0 ? streetParts.join("، ") : "";

        if (resolvedDistrict || resolvedStreet) {
          return NextResponse.json({
            district: resolvedDistrict || fastLoc.district,
            address: resolvedStreet || fastLoc.address,
            city,
          });
        }
      }
    } catch {
      // Fall through to Photon
    }

    // 3. Try Photon (OSM-powered, fast, supports Persian)
    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "fa",
            "User-Agent": "Jar-App/1.0",
          },
          signal: AbortSignal.timeout(2000),
        }
      );

      if (photonRes.ok) {
        const data = await photonRes.json();
        const feature = data.features?.[0]?.properties;

        if (feature) {
          const city = feature.city || feature.state || feature.county || "تهران";
          const neighbourhood =
            feature.locality ||
            feature.district ||
            feature.suburb ||
            feature.name ||
            "";

          const resolvedDistrict =
            neighbourhood && neighbourhood !== city
              ? `${city}، ${neighbourhood}`
              : city;

          const street = feature.street
            ? (feature.street.startsWith("خیابان") || feature.street.startsWith("بلوار") || feature.street.startsWith("کوچه")
                ? feature.street
                : `خیابان ${feature.street}`)
            : (feature.name && feature.name !== city && feature.name !== neighbourhood ? feature.name : "");

          return NextResponse.json({
            district: resolvedDistrict || fastLoc.district,
            address: street || fastLoc.address,
            city,
          });
        }
      }
    } catch {
      // Fall through to offline resolver
    }

    // 4. Fallback to instant offline geographic grid
    return NextResponse.json({
      district: fastLoc.district,
      address: fastLoc.address,
      city: "تهران",
    });
  } catch (err: any) {
    const fallback = getFastIranLocation(35.6892, 51.3890);
    return NextResponse.json(
      { district: fallback.district, address: fallback.address, city: "تهران", error: err?.message || "Internal error" },
      { status: 200 }
    );
  }
}
