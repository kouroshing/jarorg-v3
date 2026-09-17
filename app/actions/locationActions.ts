"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { normalizePhoneDigits, sanitizeIranMobileInput, phoneToLocalDisplay } from "@/lib/auth/phone";
import { resolveAdminAccess, hasAdminPermission } from "@/lib/auth/adminAccess";
import {
  haversineKm,
  maskContactPhone,
  parseLocationCategory,
  parseLocationImageUrls,
  parseLocationVideoUrls,
  parseSecurityLevel,
  resolveLocationCover,
  serializeLocationImageUrls,
  serializeLocationVideoUrls,
  slugifyLocationName,
  MAX_LOCATION_IMAGES,
  MAX_LOCATION_VIDEOS,
  LOCATION_CATEGORY_IDS,
  type PhotoLocationPublic,
  type PhotoLocationSecurity,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";
import { getMarketplaceSettings } from "@/lib/orders/settings";
import { quoteTravel } from "@/lib/orders/travel";
import {
  parseSuitableFor,
  serializeSuitableFor,
  locationMatchesAudience,
  locationMatchesCity,
  locationMatchesProjectSlug,
  type LocationAudience,
} from "@/lib/locations/projectTypes";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";
import { matchServiceCity } from "@/lib/geo/serviceCities";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";

const TEHRAN = { lat: 35.6892, lng: 51.389 };

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (u) => u.startsWith("/uploads/") || u.startsWith("https://") || u.startsWith("http://"),
    "آدرس تصویر نامعتبر است."
  );

function mapPublic(
  row: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category?: string | null;
    lat: number;
    lng: number;
    city: string | null;
    district: string | null;
    address: string | null;
    needsPermit: boolean;
    proCameraAllowed: boolean;
    phoneCameraAllowed: boolean;
    hasEntranceFee: boolean;
    hasChangingRoom: boolean;
    hasParking: boolean;
    securityLevel: string;
    contactPhone: string | null;
    coverImageUrl: string | null;
    imageUrls?: string | null;
    videoUrls?: string | null;
    photographerUserId?: string | null;
    photographerName?: string | null;
    suitableFor?: string | null;
  },
  revealed: boolean,
  origin?: { lat: number; lng: number } | null
): PhotoLocationPublic {
  const gallery = parseLocationImageUrls(row.imageUrls);
  const cover = resolveLocationCover(row.coverImageUrl, gallery);
  const distanceKm = origin
    ? haversineKm(origin, { lat: row.lat, lng: row.lng })
    : null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: parseLocationCategory(row.category),
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    district: row.district,
    address: row.address,
    needsPermit: row.needsPermit,
    proCameraAllowed: row.proCameraAllowed,
    phoneCameraAllowed: row.phoneCameraAllowed,
    hasEntranceFee: row.hasEntranceFee,
    hasChangingRoom: row.hasChangingRoom,
    hasParking: row.hasParking,
    securityLevel: parseSecurityLevel(row.securityLevel),
    contactPhoneDisplay: revealed
      ? row.contactPhone
        ? phoneToLocalDisplay(row.contactPhone)
        : null
      : maskContactPhone(row.contactPhone),
    contactPhoneRevealed: revealed && Boolean(row.contactPhone),
    coverImageUrl: cover,
    imageUrls: gallery,
    videoUrls: parseLocationVideoUrls(row.videoUrls),
    photographerUserId: row.photographerUserId ?? null,
    photographerName: row.photographerName?.trim() || null,
    photographer: null,
    suitableFor: parseSuitableFor(row.suitableFor),
    distanceKm,
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugifyLocationName(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const exists = await prisma.photoLocation.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists || (excludeId && exists.id === excludeId)) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

const categorySchema = z.enum(
  LOCATION_CATEGORY_IDS as [PhotoLocationCategory, ...PhotoLocationCategory[]]
);

const ALL_CATEGORY_SLUG_MAX = 80;

function sanitizeSuitableFor(slugs: string[] | undefined): string[] {
  if (!slugs) return [];
  return Array.from(
    new Set(slugs.filter((s) => Boolean(CATEGORIES_BY_SLUG[s])))
  );
}

async function persistSuitableFor(id: string, slugs: string[]) {
  const json = serializeSuitableFor(slugs);
  await prisma.$executeRawUnsafe(
    "UPDATE photo_locations SET suitable_for = ? WHERE id = ?",
    json,
    id
  );
}

async function persistLocationMedia(id: string, videos: string[]) {
  await prisma.$executeRawUnsafe(
    "UPDATE photo_locations SET video_urls = ? WHERE id = ?",
    serializeLocationVideoUrls(videos),
    id
  );
}

async function persistLocationPhotographer(
  id: string,
  photographerUserId: string | null,
  photographerName: string | null
) {
  await prisma.$executeRawUnsafe(
    "UPDATE photo_locations SET photographer_user_id = ?, photographer_name = ? WHERE id = ?",
    photographerUserId,
    photographerName,
    id
  );
}

async function resolvePhotographerInput(input: {
  photographerUserId?: string | null;
  photographerName?: string | null;
}): Promise<
  | { ok: true; photographerUserId: string | null; photographerName: string | null }
  | { ok: false; error: string }
> {
  const customName = input.photographerName?.trim() || null;
  const userId = input.photographerUserId?.trim() || null;
  if (!userId) {
    return { ok: true, photographerUserId: null, photographerName: customName };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      specialistProfile: { select: { id: true } },
    },
  });
  if (!user) {
    return { ok: false, error: "متخصص انتخاب‌شده پیدا نشد." };
  }
  if (!user.specialistProfile) {
    return { ok: false, error: "این کاربر متخصص جار نیست." };
  }
  return { ok: true, photographerUserId: user.id, photographerName: null };
}

type MediaCreditRaw = {
  id: string;
  video_urls: string | null;
  photographer_user_id: string | null;
  photographer_name: string | null;
};

async function attachMediaCredit<
  T extends {
    id: string;
    videoUrls: string[];
    photographerUserId: string | null;
    photographerName: string | null;
  }
>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  try {
    const placeholders = items.map(() => "?").join(",");
    const rows = await prisma.$queryRawUnsafe<MediaCreditRaw[]>(
      `SELECT id, video_urls, photographer_user_id, photographer_name FROM photo_locations WHERE id IN (${placeholders})`,
      ...items.map((i) => i.id)
    );
    const map = new Map(rows.map((r) => [r.id, r]));
    return items.map((item) => {
      const extra = map.get(item.id);
      if (!extra) return item;
      return {
        ...item,
        videoUrls: parseLocationVideoUrls(extra.video_urls),
        photographerUserId: extra.photographer_user_id,
        photographerName: extra.photographer_name?.trim() || null,
      };
    });
  } catch {
    return items;
  }
}

async function attachSuitableFor<T extends { id: string; suitableFor: string[] }>(
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;
  try {
    const placeholders = items.map(() => "?").join(",");
    const rows = await prisma.$queryRawUnsafe<{ id: string; suitable_for: string | null }[]>(
      `SELECT id, suitable_for FROM photo_locations WHERE id IN (${placeholders})`,
      ...items.map((i) => i.id)
    );
    const map = new Map(rows.map((r) => [r.id, parseSuitableFor(r.suitable_for)]));
    return items.map((item) => ({
      ...item,
      suitableFor: map.get(item.id) ?? item.suitableFor,
    }));
  } catch {
    return items;
  }
}

const submitSchema = z.object({
  name: z.string().trim().min(2, "نام لوکیشن حداقل ۲ کاراکتر باشد.").max(120),
  description: z.string().trim().max(4000).optional().nullable(),
  category: categorySchema.optional(),
  lat: z.number().min(24).max(40),
  lng: z.number().min(44).max(64),
  city: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  needsPermit: z.boolean().optional(),
  proCameraAllowed: z.boolean().optional(),
  phoneCameraAllowed: z.boolean().optional(),
  hasEntranceFee: z.boolean().optional(),
  hasChangingRoom: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  securityLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  /** When true, submitter declares they are the venue owner (allows their login phone). */
  submitterIsVenueOwner: z.boolean().optional(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  imageUrls: z.array(imageUrlSchema).max(MAX_LOCATION_IMAGES).optional(),
  videoUrls: z.array(imageUrlSchema).max(MAX_LOCATION_VIDEOS).optional(),
  photographerUserId: z.string().uuid().optional().nullable(),
  photographerName: z.string().trim().max(80).optional().nullable(),
  suitableFor: z
    .array(z.string().trim().min(1).max(80))
    .max(ALL_CATEGORY_SLUG_MAX)
    .optional(),
});

const adminPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  category: categorySchema.optional(),
  lat: z.number().min(24).max(40).optional(),
  lng: z.number().min(44).max(64).optional(),
  city: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  needsPermit: z.boolean().optional(),
  proCameraAllowed: z.boolean().optional(),
  phoneCameraAllowed: z.boolean().optional(),
  hasEntranceFee: z.boolean().optional(),
  hasChangingRoom: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  securityLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  imageUrls: z.array(imageUrlSchema).max(MAX_LOCATION_IMAGES).optional(),
  videoUrls: z.array(imageUrlSchema).max(MAX_LOCATION_VIDEOS).optional(),
  photographerUserId: z.string().uuid().optional().nullable(),
  photographerName: z.string().trim().max(80).optional().nullable(),
  /** When true and name changed, regenerate slug from new name. */
  reslug: z.boolean().optional(),
  suitableFor: z
    .array(z.string().trim().min(1).max(80))
    .max(ALL_CATEGORY_SLUG_MAX)
    .optional(),
});

function resolveLocationContactPhone(
  data: {
    hasEntranceFee?: boolean;
    contactPhone?: string | null;
    submitterIsVenueOwner?: boolean;
  },
  sessionPhone: string | null | undefined
): { ok: true; phone: string | null } | { ok: false; error: string } {
  const hasEntrance = Boolean(data.hasEntranceFee);
  if (!hasEntrance) {
    return { ok: true, phone: null };
  }

  const raw = data.contactPhone?.trim();
  if (!raw) {
    return {
      ok: false,
      error: "برای لوکیشن با ورودی، شماره هماهنگی صاحب یا مسئول مجموعه الزامی است.",
    };
  }

  const digits = normalizePhoneDigits(sanitizeIranMobileInput(raw));
  if (digits.length < 10) {
    return { ok: false, error: "شماره هماهنگی معتبر نیست." };
  }

  const sessionDigits = sessionPhone
    ? normalizePhoneDigits(sanitizeIranMobileInput(sessionPhone))
    : "";

  if (
    !data.submitterIsVenueOwner &&
    sessionDigits.length >= 10 &&
    digits === sessionDigits
  ) {
    return {
      ok: false,
      error:
        "این شماره با حساب شما یکی است. شماره هماهنگی باید متعلق به صاحب مجموعه باشد — یا گزینه «خودم صاحب مجموعه هستم» را بزنید.",
    };
  }

  return { ok: true, phone: digits };
}

function normalizeAdminPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = normalizePhoneDigits(sanitizeIranMobileInput(raw));
  return digits.length >= 10 ? digits : null;
}

function buildAdminDataPatch(
  patch: z.infer<typeof adminPatchSchema>,
  row: { id: string; name: string; slug: string }
): Promise<Record<string, unknown>> {
  return (async () => {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description?.trim() || null;
    if (patch.category !== undefined) data.category = patch.category;
    if (patch.lat !== undefined) data.lat = patch.lat;
    if (patch.lng !== undefined) data.lng = patch.lng;
    if (patch.city !== undefined)
      data.city = matchServiceCity(patch.city) || patch.city?.trim() || null;
    if (patch.district !== undefined) data.district = patch.district?.trim() || null;
    if (patch.address !== undefined) data.address = patch.address?.trim() || null;
    if (patch.needsPermit !== undefined) data.needsPermit = patch.needsPermit;
    if (patch.proCameraAllowed !== undefined) data.proCameraAllowed = patch.proCameraAllowed;
    if (patch.phoneCameraAllowed !== undefined) data.phoneCameraAllowed = patch.phoneCameraAllowed;
    if (patch.hasEntranceFee !== undefined) data.hasEntranceFee = patch.hasEntranceFee;
    if (patch.hasChangingRoom !== undefined) data.hasChangingRoom = patch.hasChangingRoom;
    if (patch.hasParking !== undefined) data.hasParking = patch.hasParking;
    if (patch.securityLevel !== undefined) data.securityLevel = patch.securityLevel;
    if (patch.contactPhone !== undefined) {
      data.contactPhone = normalizeAdminPhone(patch.contactPhone);
    }
    if (patch.imageUrls !== undefined) {
      const gallery = patch.imageUrls;
      data.imageUrls = serializeLocationImageUrls(gallery);
      data.coverImageUrl =
        patch.coverImageUrl?.trim() ||
        gallery[0] ||
        null;
    } else if (patch.coverImageUrl !== undefined) {
      data.coverImageUrl = patch.coverImageUrl?.trim() || null;
    }
    if (patch.reslug && patch.name && patch.name !== row.name) {
      data.slug = await uniqueSlug(patch.name, row.id);
    }
    return data;
  })();
}

export type LocationActionResult =
  | { success: true; message?: string; slug?: string; id?: string }
  | { success: false; error: string };

export async function listApprovedPhotoLocationsAction(input?: {
  lat?: number;
  lng?: number;
  limit?: number;
  category?: PhotoLocationCategory | "ALL";
  freeOnly?: boolean;
  city?: string | null;
  audience?: LocationAudience;
  projectSlug?: string | null;
}): Promise<
  | { success: true; items: PhotoLocationPublic[]; loggedIn: boolean }
  | { success: false; error: string }
> {
  const session = await getSession();
  const loggedIn = Boolean(session?.userId);
  const origin =
    typeof input?.lat === "number" && typeof input?.lng === "number"
      ? { lat: input.lat, lng: input.lng }
      : TEHRAN;
  const limit = Math.min(200, Math.max(1, input?.limit ?? 80));

  const where: {
    status: string;
    category?: string;
    hasEntranceFee?: boolean;
  } = { status: "APPROVED" };
  if (input?.category && input.category !== "ALL") {
    where.category = input.category;
  }
  if (input?.freeOnly) {
    where.hasEntranceFee = false;
  }

  try {
    const rows = await prisma.photoLocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const items = (
      await attachSuitableFor(rows.map((r) => mapPublic(r, loggedIn, origin)))
    )
      .filter((item) => locationMatchesCity(item.city, input?.city))
      .filter((item) =>
        locationMatchesAudience(item.suitableFor, input?.audience || "ALL")
      )
      .filter((item) =>
        locationMatchesProjectSlug(item.suitableFor, input?.projectSlug)
      )
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    return { success: true, items, loggedIn };
  } catch (err) {
    console.error("[listApprovedPhotoLocationsAction]", err);
    return { success: false, error: "بارگذاری لوکیشن‌ها ناموفق بود." };
  }
}

export async function getPhotoLocationBySlugAction(
  slug: string
): Promise<
  | { success: true; item: PhotoLocationPublic; loggedIn: boolean }
  | { success: false; error: string }
> {
  const session = await getSession();
  const loggedIn = Boolean(session?.userId);
  const row = await prisma.photoLocation.findFirst({
    where: { slug, status: "APPROVED" },
  });
  if (!row) return { success: false, error: "لوکیشن یافت نشد." };
  const [item] = await attachMediaCredit([mapPublic(row, loggedIn)]);
  return { success: true, item, loggedIn };
}

export async function submitPhotoLocationAction(
  raw: z.infer<typeof submitSchema>
): Promise<LocationActionResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "برای ثبت لوکیشن ابتدا وارد شوید." };
  }

  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ورودی نامعتبر" };
  }

  const data = parsed.data;
  const phoneResult = resolveLocationContactPhone(
    data,
    session.phone ?? null
  );
  if (!phoneResult.ok) {
    return { success: false, error: phoneResult.error };
  }
  const phone = phoneResult.phone;

  const credit = await resolvePhotographerInput(data);
  if (!credit.ok) return { success: false, error: credit.error };

  const slug = await uniqueSlug(data.name);
  const securityLevel: PhotoLocationSecurity = data.securityLevel || "MEDIUM";
  const gallery = data.imageUrls || [];
  const cover =
    data.coverImageUrl?.trim() ||
    gallery[0] ||
    null;

  const row = await prisma.photoLocation.create({
    data: {
      name: data.name,
      slug,
      description: data.description?.trim() || null,
      category: data.category || "OTHER",
      lat: data.lat,
      lng: data.lng,
      city: matchServiceCity(data.city) || data.city?.trim() || null,
      district: data.district?.trim() || null,
      address: data.address?.trim() || null,
      needsPermit: data.needsPermit ?? false,
      proCameraAllowed: data.proCameraAllowed ?? true,
      phoneCameraAllowed: data.phoneCameraAllowed ?? true,
      hasEntranceFee: data.hasEntranceFee ?? false,
      hasChangingRoom: data.hasChangingRoom ?? false,
      hasParking: data.hasParking ?? false,
      securityLevel,
      contactPhone: phone,
      coverImageUrl: cover,
      imageUrls: serializeLocationImageUrls(gallery),
      status: "PENDING",
      submittedById: session.userId,
    },
  });
  await persistSuitableFor(row.id, sanitizeSuitableFor(data.suitableFor));
  await persistLocationMedia(row.id, data.videoUrls || []);
  await persistLocationPhotographer(row.id, credit.photographerUserId, credit.photographerName);

  revalidatePath("/tools/locations");
  revalidatePath("/admin");
  revalidatePath("/admin/locations");

  return {
    success: true,
    message: "لوکیشن ثبت شد و پس از تایید جار در نقشه نمایش داده می‌شود.",
    slug: row.slug,
    id: row.id,
  };
}

/** Nearby approved pins for order map (compact). */
export async function listNearbyPhotoLocationsForOrderAction(input: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}): Promise<
  | { success: true; items: PhotoLocationPublic[] }
  | { success: false; error: string }
> {
  const session = await getSession();
  const loggedIn = Boolean(session?.userId);
  const radius = input.radiusKm ?? 40;
  const limit = Math.min(60, input.limit ?? 40);
  const origin = { lat: input.lat, lng: input.lng };

  const rows = await prisma.photoLocation.findMany({
    where: { status: "APPROVED" },
    take: 300,
  });

  const items = rows
    .map((r) => mapPublic(r, loggedIn, origin))
    .filter((r) => (r.distanceKm ?? 999) <= radius)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, limit);

  return { success: true, items };
}

/**
 * Approved جار لوکیشن pins near the specialist base (fallback: order pin / Tehran)
 * for suggesting a shoot location when applying.
 * Each item includes Jar's predicted travel fee from the specialist base.
 */
export type JarLocationSuggestItem = PhotoLocationPublic & {
  travel: {
    distanceKm: number;
    fee: number;
    isFree: boolean;
  } | null;
};

export async function listJarLocationsForInterestSuggestAction(input: {
  orderId: string;
  radiusKm?: number;
  limit?: number;
}): Promise<
  | {
      success: true;
      items: JarLocationSuggestItem[];
      origin: { lat: number; lng: number };
      /** True when travel was quoted from the specialist's registered base. */
      fromSpecialistBase: boolean;
    }
  | { success: false; error: string }
> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "ابتدا وارد شوید." };
  }

  const [profile, order, settings] = await Promise.all([
    prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      select: { baseLat: true, baseLng: true },
    }),
    prisma.order.findUnique({
      where: { id: input.orderId },
      select: { locationLat: true, locationLng: true },
    }),
    getMarketplaceSettings(),
  ]);

  if (!order) return { success: false, error: "سفارش یافت نشد." };

  const specialistBase =
    profile?.baseLat != null &&
    profile?.baseLng != null &&
    Number.isFinite(profile.baseLat) &&
    Number.isFinite(profile.baseLng) &&
    !(profile.baseLat === 0 && profile.baseLng === 0)
      ? { lat: profile.baseLat, lng: profile.baseLng }
      : null;

  const origin =
    specialistBase ??
    (order.locationLat != null && order.locationLng != null
      ? { lat: order.locationLat, lng: order.locationLng }
      : TEHRAN);

  const radius = input.radiusKm ?? 45;
  const limit = Math.min(40, input.limit ?? 24);

  const rows = await prisma.photoLocation.findMany({
    where: { status: "APPROVED" },
    take: 400,
  });

  const items: JarLocationSuggestItem[] = rows
    .map((r) => {
      const pub = mapPublic(r, true, origin);
      const travelQuote = quoteTravel(specialistBase, { lat: r.lat, lng: r.lng }, settings);
      return {
        ...pub,
        travel: travelQuote
          ? {
              distanceKm: travelQuote.distanceKm,
              fee: travelQuote.fee,
              isFree: travelQuote.isFree,
            }
          : null,
      };
    })
    .filter((r) => (r.distanceKm ?? 999) <= radius)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, limit);

  return {
    success: true,
    items,
    origin,
    fromSpecialistBase: Boolean(specialistBase),
  };
}

// ——— Admin ———

export type AdminPhotoLocationRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: PhotoLocationCategory;
  city: string | null;
  district: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  contactPhone: string | null;
  submittedByPhone: string | null;
  lat: number;
  lng: number;
  needsPermit: boolean;
  proCameraAllowed: boolean;
  phoneCameraAllowed: boolean;
  hasEntranceFee: boolean;
  hasChangingRoom: boolean;
  hasParking: boolean;
  securityLevel: PhotoLocationSecurity;
  coverImageUrl: string | null;
  imageUrls: string[];
  videoUrls: string[];
  photographerUserId: string | null;
  photographerName: string | null;
  suitableFor: string[];
};

function mapAdminRow(r: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category?: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  contactPhone: string | null;
  lat: number;
  lng: number;
  needsPermit: boolean;
  proCameraAllowed: boolean;
  phoneCameraAllowed: boolean;
  hasEntranceFee: boolean;
  hasChangingRoom: boolean;
  hasParking: boolean;
  securityLevel: string;
  coverImageUrl: string | null;
  imageUrls: string | null;
  suitableFor?: string | null;
  submittedBy?: { phone: string } | null;
}): AdminPhotoLocationRow {
  const gallery = parseLocationImageUrls(r.imageUrls);
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    category: parseLocationCategory(r.category),
    city: r.city,
    district: r.district,
    address: r.address,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    contactPhone: r.contactPhone,
    submittedByPhone: r.submittedBy?.phone ?? null,
    lat: r.lat,
    lng: r.lng,
    needsPermit: r.needsPermit,
    proCameraAllowed: r.proCameraAllowed,
    phoneCameraAllowed: r.phoneCameraAllowed,
    hasEntranceFee: r.hasEntranceFee,
    hasChangingRoom: r.hasChangingRoom,
    hasParking: r.hasParking,
    securityLevel: parseSecurityLevel(r.securityLevel),
    coverImageUrl: resolveLocationCover(r.coverImageUrl, gallery),
    imageUrls: gallery,
    videoUrls: [],
    photographerUserId: null,
    photographerName: null,
    suitableFor: parseSuitableFor(r.suitableFor),
  };
}

export async function listPendingPhotoLocationsAction(): Promise<
  | { success: true; items: AdminPhotoLocationRow[] }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین لازم است." };
  }

  const rows = await prisma.photoLocation.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 40,
    include: { submittedBy: { select: { phone: true } } },
  });

  return {
    success: true,
    items: await attachMediaCredit(rows.map(mapAdminRow)),
  };
}

/** Save admin edits without changing review status. */
export async function updatePendingPhotoLocationAction(input: {
  id: string;
  patch: z.infer<typeof adminPatchSchema>;
}): Promise<LocationActionResult> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین لازم است." };
  }

  const idParsed = z.string().uuid().safeParse(input.id);
  if (!idParsed.success) return { success: false, error: "شناسه نامعتبر" };

  const patchParsed = adminPatchSchema.safeParse(input.patch);
  if (!patchParsed.success) {
    return { success: false, error: patchParsed.error.issues[0]?.message || "ورودی نامعتبر" };
  }

  const row = await prisma.photoLocation.findUnique({ where: { id: idParsed.data } });
  if (!row) return { success: false, error: "لوکیشن یافت نشد." };

  const data = await buildAdminDataPatch(patchParsed.data, row);
  const updated = await prisma.photoLocation.update({
    where: { id: row.id },
    data,
  });
  if (patchParsed.data.suitableFor !== undefined) {
    await persistSuitableFor(row.id, sanitizeSuitableFor(patchParsed.data.suitableFor));
  }
  if (patchParsed.data.videoUrls !== undefined) {
    await persistLocationMedia(row.id, patchParsed.data.videoUrls);
  }
  if (
    patchParsed.data.photographerUserId !== undefined ||
    patchParsed.data.photographerName !== undefined
  ) {
    const credit = await resolvePhotographerInput(patchParsed.data);
    if (!credit.ok) return { success: false, error: credit.error };
    await persistLocationPhotographer(row.id, credit.photographerUserId, credit.photographerName);
  }

  await prisma.auditLog.create({
    data: {
      actorId: session?.userId ?? null,
      action: "PHOTO_LOCATION_EDIT",
      targetModel: "PhotoLocation",
      targetId: row.id,
      note: `ویرایش پیش از تایید: ${updated.name}`,
    },
  }).catch(() => undefined);

  revalidatePath("/admin");
  revalidatePath("/admin/locations");
  revalidatePath("/tools/locations");

  return { success: true, message: "تغییرات ذخیره شد.", slug: updated.slug, id: updated.id };
}

export async function reviewPhotoLocationAction(input: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  /** Optional edits applied atomically with the decision. */
  patch?: z.infer<typeof adminPatchSchema>;
}): Promise<LocationActionResult> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین لازم است." };
  }

  const idParsed = z.string().uuid().safeParse(input.id);
  if (!idParsed.success) return { success: false, error: "شناسه نامعتبر" };

  const row = await prisma.photoLocation.findUnique({ where: { id: idParsed.data } });
  if (!row) return { success: false, error: "لوکیشن یافت نشد." };
  if (row.status !== "PENDING") {
    return { success: false, error: "این مورد قبلاً بررسی شده است." };
  }

  if (input.decision === "REJECTED" && !(input.reason || "").trim()) {
    return { success: false, error: "برای رد، دلیل بنویسید." };
  }

  let patchData: Record<string, unknown> = {};
  if (input.patch) {
    const patchParsed = adminPatchSchema.safeParse(input.patch);
    if (!patchParsed.success) {
      return { success: false, error: patchParsed.error.issues[0]?.message || "ورودی نامعتبر" };
    }
    patchData = await buildAdminDataPatch(patchParsed.data, row);
  }

  const updated = await prisma.photoLocation.update({
    where: { id: row.id },
    data: {
      ...patchData,
      status: input.decision,
      rejectionReason:
        input.decision === "REJECTED" ? (input.reason || "").trim().slice(0, 500) : null,
      reviewedAt: new Date(),
      reviewedById: session?.userId ?? null,
    },
  });
  if (input.patch?.suitableFor !== undefined) {
    await persistSuitableFor(row.id, sanitizeSuitableFor(input.patch.suitableFor));
  }
  if (input.patch?.videoUrls !== undefined) {
    await persistLocationMedia(row.id, input.patch.videoUrls);
  }
  if (
    input.patch?.photographerUserId !== undefined ||
    input.patch?.photographerName !== undefined
  ) {
    const credit = await resolvePhotographerInput(input.patch);
    if (!credit.ok) return { success: false, error: credit.error };
    await persistLocationPhotographer(row.id, credit.photographerUserId, credit.photographerName);
  }

  await prisma.auditLog.create({
    data: {
      actorId: session?.userId ?? null,
      action: `PHOTO_LOCATION_${input.decision}`,
      targetModel: "PhotoLocation",
      targetId: row.id,
      note:
        input.decision === "REJECTED"
          ? (input.reason || "").trim().slice(0, 300)
          : `تایید و انتشار: ${updated.name}`,
    },
  }).catch(() => undefined);

  revalidatePath("/tools/locations");
  revalidatePath(`/locations/${updated.slug}`);
  if (updated.slug !== row.slug) {
    revalidatePath(`/locations/${row.slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");

  return {
    success: true,
    message: input.decision === "APPROVED" ? "لوکیشن تایید و منتشر شد." : "لوکیشن رد شد.",
    slug: updated.slug,
    id: updated.id,
  };
}

export async function adminCreatePhotoLocationAction(
  raw: z.infer<typeof submitSchema>
): Promise<LocationActionResult> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین لازم است." };
  }

  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ورودی نامعتبر" };
  }

  const data = parsed.data;
  let phone: string | null = null;
  if (data.contactPhone?.trim()) {
    phone = normalizePhoneDigits(sanitizeIranMobileInput(data.contactPhone));
  }

  const gallery = data.imageUrls || [];
  const cover = data.coverImageUrl?.trim() || gallery[0] || null;
  const credit = await resolvePhotographerInput(data);
  if (!credit.ok) return { success: false, error: credit.error };
  const slug = await uniqueSlug(data.name);
  const row = await prisma.photoLocation.create({
    data: {
      name: data.name,
      slug,
      description: data.description?.trim() || null,
      category: data.category || "OTHER",
      lat: data.lat,
      lng: data.lng,
      city: data.city?.trim() || null,
      district: data.district?.trim() || null,
      address: data.address?.trim() || null,
      needsPermit: data.needsPermit ?? false,
      proCameraAllowed: data.proCameraAllowed ?? true,
      phoneCameraAllowed: data.phoneCameraAllowed ?? true,
      hasEntranceFee: data.hasEntranceFee ?? false,
      hasChangingRoom: data.hasChangingRoom ?? false,
      hasParking: data.hasParking ?? false,
      securityLevel: data.securityLevel || "MEDIUM",
      contactPhone: phone,
      coverImageUrl: cover,
      imageUrls: serializeLocationImageUrls(gallery),
      status: "APPROVED",
      submittedById: session?.userId ?? null,
      reviewedAt: new Date(),
      reviewedById: session?.userId ?? null,
    },
  });

  await persistSuitableFor(row.id, sanitizeSuitableFor(data.suitableFor));
  await persistLocationMedia(row.id, data.videoUrls || []);
  await persistLocationPhotographer(row.id, credit.photographerUserId, credit.photographerName);

  revalidatePath("/tools/locations");
  revalidatePath(`/locations/${row.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/locations");

  return { success: true, message: "لوکیشن اضافه و منتشر شد.", slug: row.slug, id: row.id };
}

export async function setPhotoLocationStatusAction(input: {
  id: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  reason?: string;
}): Promise<LocationActionResult> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ادمین لازم است." };
  }

  const idParsed = z.string().uuid().safeParse(input.id);
  if (!idParsed.success) return { success: false, error: "شناسه نامعتبر" };

  const row = await prisma.photoLocation.findUnique({ where: { id: idParsed.data } });
  if (!row) return { success: false, error: "لوکیشن یافت نشد." };

  if (input.status === "REJECTED" && !(input.reason || "").trim()) {
    return { success: false, error: "برای رد، دلیل بنویسید." };
  }

  await prisma.photoLocation.update({
    where: { id: row.id },
    data: {
      status: input.status,
      rejectionReason: input.status === "REJECTED" ? (input.reason || "").trim() : null,
      reviewedAt: new Date(),
      reviewedById: session?.userId ?? null,
    },
  });

  revalidatePath("/tools/locations");
  revalidatePath(`/locations/${row.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/locations");

  return {
    success: true,
    message:
      input.status === "APPROVED"
        ? "لوکیشن منتشر شد."
        : input.status === "REJECTED"
          ? "لوکیشن از انتشار خارج شد."
          : "وضعیت به انتظار بررسی برگشت.",
  };
}

export async function getJarLocationPageSettingsAction(): Promise<
  | { success: true; settings: import("@/lib/locations/pageSettingsTypes").JarLocationPageSettingsPublic }
  | { success: false; error: string }
> {
  try {
    const { getJarLocationPageSettings } = await import("@/lib/locations/pageSettings");
    const settings = await getJarLocationPageSettings();
    return { success: true, settings };
  } catch (err) {
    console.error("[getJarLocationPageSettingsAction]", err);
    return { success: false, error: "بارگذاری تنظیمات ناموفق بود." };
  }
}

export async function updateJarLocationPageSettingsAction(input: {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  allChipImageUrl?: string;
  freeChipImageUrl?: string;
  categoryImages?: Partial<Record<PhotoLocationCategory, string>>;
}): Promise<
  | { success: true; settings: import("@/lib/locations/pageSettingsTypes").JarLocationPageSettingsPublic }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ندارید." };
  }

  try {
    const { upsertJarLocationPageSettings } = await import("@/lib/locations/pageSettings");
    const settings = await upsertJarLocationPageSettings(input);
    revalidatePath("/tools/locations");
    revalidatePath("/admin/locations");
    return { success: true, settings };
  } catch (err) {
    console.error("[updateJarLocationPageSettingsAction]", err);
    return { success: false, error: "ذخیره تنظیمات ناموفق بود." };
  }
}

/** One-click curated free public spots (parks/streets) — idempotent by slug. */
export async function seedFreeJarLocationsAction(): Promise<
  | { success: true; message: string; created: number; skipped: number }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ندارید." };
  }

  try {
    const { upsertFreeJarLocations } = await import("@/lib/locations/seedFreeLocations");
    const result = await upsertFreeJarLocations();
    revalidatePath("/tools/locations");
    revalidatePath("/admin/locations");
    revalidatePath("/admin");
    revalidatePath("/sitemap.xml");
    return {
      success: true,
      created: result.created,
      skipped: result.skipped,
      message:
        result.created > 0
          ? `${result.created.toLocaleString("fa-IR")} لوکیشن رایگان اضافه شد${
              result.skipped
                ? ` · ${result.skipped.toLocaleString("fa-IR")} قبلاً بود`
                : ""
            }.`
          : "همه لوکیشن‌های رایگان از قبل در کاتالوگ بودند.",
    };
  } catch (err) {
    console.error("[seedFreeJarLocationsAction]", err);
    return { success: false, error: "وارد کردن لوکیشن‌های رایگان ناموفق بود." };
  }
}

/**
 * Copy mood/hero jpgs from the app bundle onto the Liara uploads disk once.
 * After this, those files survive redeploys without being re-uploaded in the build.
 */
export async function syncJarLocationMoodsToDiskAction(): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ندارید." };
  }

  try {
    const { copyJarLocationMoodsToDisk, jarLocationMoodDiskUrl } = await import(
      "@/lib/locations/moodAssets"
    );
    const { LOCATION_CATEGORIES } = await import("@/lib/locations/photoLocation");
    const { upsertJarLocationPageSettings } = await import("@/lib/locations/pageSettings");

    const result = await copyJarLocationMoodsToDisk();
    const categoryImages = Object.fromEntries(
      LOCATION_CATEGORIES.map((c) => {
        const file = c.moodImage.split("/").pop() || "other.jpg";
        return [c.id, jarLocationMoodDiskUrl(file)];
      })
    ) as Partial<Record<PhotoLocationCategory, string>>;

    await upsertJarLocationPageSettings({
      heroImageUrl: jarLocationMoodDiskUrl("hero.jpg"),
      allChipImageUrl: jarLocationMoodDiskUrl("hero.jpg"),
      freeChipImageUrl: jarLocationMoodDiskUrl("free.jpg"),
      categoryImages,
    });

    revalidatePath("/tools/locations");
    revalidatePath("/admin/locations");

    return {
      success: true,
      message: `عکس‌های ظاهر صفحه روی دیسک uploads ذخیره شد · جدید ${result.copied.length.toLocaleString(
        "fa-IR"
      )} · از قبل ${result.existed.length.toLocaleString("fa-IR")}.`,
    };
  } catch (err) {
    console.error("[syncJarLocationMoodsToDiskAction]", err);
    return { success: false, error: "کپی عکس‌ها روی دیسک ناموفق بود." };
  }
}

export async function listAdminPhotoLocationsAction(input?: {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
  city?: string | null;
  audience?: LocationAudience;
  projectSlug?: string | null;
  limit?: number;
}): Promise<
  | {
      success: true;
      items: Array<{
        id: string;
        name: string;
        slug: string;
        category: PhotoLocationCategory;
        city: string | null;
        status: string;
        coverImageUrl: string | null;
        suitableFor: string[];
        createdAt: string;
      }>;
    }
  | { success: false; error: string }
> {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "orders_manage")) {
    return { success: false, error: "دسترسی ندارید." };
  }

  const status = input?.status || "ALL";
  const limit = Math.min(200, Math.max(1, input?.limit ?? 80));
  const where = status === "ALL" ? {} : { status };

  try {
    const rows = await prisma.photoLocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        city: true,
        status: true,
        coverImageUrl: true,
        imageUrls: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      items: rows
        .map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          category: parseLocationCategory(r.category),
          city: r.city,
          status: r.status,
          coverImageUrl: resolveLocationCover(r.coverImageUrl, parseLocationImageUrls(r.imageUrls)),
          suitableFor: parseSuitableFor(
            (r as { suitableFor?: string | null }).suitableFor
          ),
          createdAt: r.createdAt.toISOString(),
        }))
        .filter((item) => locationMatchesCity(item.city, input?.city))
        .filter((item) =>
          locationMatchesAudience(item.suitableFor, input?.audience || "ALL")
        )
        .filter((item) =>
          locationMatchesProjectSlug(item.suitableFor, input?.projectSlug)
        ),
    };
  } catch (err) {
    console.error("[listAdminPhotoLocationsAction]", err);
    return { success: false, error: "بارگذاری لوکیشن‌ها ناموفق بود." };
  }
}

export type LocationPhotographerOption = {
  id: string;
  name: string;
  city: string | null;
  avatarUrl: string | null;
};

export async function searchLocationPhotographersAction(
  query: string
): Promise<
  | { success: true; items: LocationPhotographerOption[] }
  | { success: false; error: string }
> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "ابتدا وارد شوید." };
  }

  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 2) {
    return { success: true, items: [] };
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        specialistProfile: { isNot: null },
        displayName: { contains: q },
      },
      select: {
        id: true,
        displayName: true,
        city: true,
        specialistProfile: { select: { avatarUrl: true, city: true } },
      },
      take: 12,
    });
    return {
      success: true,
      items: users.map((u) => ({
        id: u.id,
        name: formatPublicSpecialistName(u.displayName),
        city: u.specialistProfile?.city || u.city || null,
        avatarUrl: u.specialistProfile?.avatarUrl || null,
      })),
    };
  } catch (err) {
    console.error("[searchLocationPhotographersAction]", err);
    return { success: false, error: "جستجوی متخصص ناموفق بود." };
  }
}
