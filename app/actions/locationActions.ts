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
  parseLocationImageUrls,
  parseSecurityLevel,
  resolveLocationCover,
  serializeLocationImageUrls,
  slugifyLocationName,
  MAX_LOCATION_IMAGES,
  type PhotoLocationPublic,
  type PhotoLocationSecurity,
} from "@/lib/locations/photoLocation";
import { getMarketplaceSettings } from "@/lib/orders/settings";
import { quoteTravel } from "@/lib/orders/travel";

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

const submitSchema = z.object({
  name: z.string().trim().min(2, "نام لوکیشن حداقل ۲ کاراکتر باشد.").max(120),
  description: z.string().trim().max(4000).optional().nullable(),
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
});

const adminPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
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
  /** When true and name changed, regenerate slug from new name. */
  reslug: z.boolean().optional(),
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
    if (patch.lat !== undefined) data.lat = patch.lat;
    if (patch.lng !== undefined) data.lng = patch.lng;
    if (patch.city !== undefined) data.city = patch.city?.trim() || null;
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

  const rows = await prisma.photoLocation.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const items = rows
    .map((r) => mapPublic(r, loggedIn, origin))
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

  return { success: true, items, loggedIn };
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
  return { success: true, item: mapPublic(row, loggedIn), loggedIn };
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
      securityLevel,
      contactPhone: phone,
      coverImageUrl: cover,
      imageUrls: serializeLocationImageUrls(gallery),
      status: "PENDING",
      submittedById: session.userId,
    },
  });

  revalidatePath("/tools/locations");
  revalidatePath("/admin");

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
};

function mapAdminRow(r: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
  submittedBy?: { phone: string } | null;
}): AdminPhotoLocationRow {
  const gallery = parseLocationImageUrls(r.imageUrls);
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
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
    items: rows.map(mapAdminRow),
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
  if (row.status !== "PENDING") {
    return { success: false, error: "فقط لوکیشن‌های در صف قابل ویرایش هستند." };
  }

  const data = await buildAdminDataPatch(patchParsed.data, row);
  const updated = await prisma.photoLocation.update({
    where: { id: row.id },
    data,
  });

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
  const slug = await uniqueSlug(data.name);
  const row = await prisma.photoLocation.create({
    data: {
      name: data.name,
      slug,
      description: data.description?.trim() || null,
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

  revalidatePath("/tools/locations");
  revalidatePath(`/locations/${row.slug}`);
  revalidatePath("/admin");

  return { success: true, message: "لوکیشن اضافه و منتشر شد.", slug: row.slug, id: row.id };
}
