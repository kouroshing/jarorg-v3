import "server-only";

import { prisma } from "@/lib/prisma";
import { getAdminPhoneDigits, SUPER_ADMIN_PHONE } from "@/lib/auth/admin";
import {
  mergePendingProfileEdit,
  parsePendingProfileEdit,
  type PendingProfileEditDraft,
} from "@/lib/specialists/profileEditShared";

export type { PendingProfileEditDraft };
export {
  parsePendingProfileEdit,
  mergePendingProfileEdit,
  PROFILE_EDIT_FIELD_LABELS,
  formatPendingEditValue,
} from "@/lib/specialists/profileEditShared";

/** Queue an edit for ACTIVE specialists without mutating live marketplace fields. */
export async function queueSpecialistProfileEdit(params: {
  userId: string;
  existingPendingRaw: string | null | undefined;
  patch: PendingProfileEditDraft;
  displayNameForNotify?: string | null;
  cityForNotify?: string | null;
}): Promise<void> {
  const pending = mergePendingProfileEdit(params.existingPendingRaw, params.patch);
  await prisma.specialistProfile.update({
    where: { userId: params.userId },
    data: {
      pendingProfileEdit: pending,
      profileEditStatus: "PENDING",
      profileEditSubmittedAt: new Date(),
      profileEditNote: null,
    },
  });
  await notifyAdminsOfProfileEdit({
    specialistUserId: params.userId,
    displayName: params.displayNameForNotify || "متخصص",
    city: params.cityForNotify,
  });
}

export async function applyPendingProfileEdit(params: {
  profileId: string;
  userId: string;
  draft: PendingProfileEditDraft;
}): Promise<void> {
  const { draft } = params;
  const profileData: Record<string, unknown> = {
    pendingProfileEdit: null,
    profileEditStatus: "NONE",
    profileEditSubmittedAt: null,
    profileEditNote: null,
  };

  if ("city" in draft) profileData.city = draft.city ?? null;
  if ("workArea" in draft) profileData.workArea = draft.workArea ?? null;
  if ("equipmentSummary" in draft) {
    profileData.equipmentSummary = draft.equipmentSummary ?? null;
  }
  if ("isMobileGrapher" in draft && typeof draft.isMobileGrapher === "boolean") {
    profileData.isMobileGrapher = draft.isMobileGrapher;
  }
  if ("baseLat" in draft) profileData.baseLat = draft.baseLat ?? null;
  if ("baseLng" in draft) profileData.baseLng = draft.baseLng ?? null;
  if ("baseAddress" in draft) profileData.baseAddress = draft.baseAddress ?? null;
  if ("avatarUrl" in draft && draft.avatarUrl) {
    profileData.avatarUrl = draft.avatarUrl;
  }
  if ("bio" in draft) profileData.bio = draft.bio ?? null;
  if ("selectedCategories" in draft && Array.isArray(draft.selectedCategories)) {
    profileData.selectedCategories = JSON.stringify(draft.selectedCategories);
  }

  if (draft.clearStudio) {
    profileData.studioName = null;
    profileData.studioLat = null;
    profileData.studioLng = null;
    profileData.studioAddress = null;
  } else {
    if ("studioName" in draft) profileData.studioName = draft.studioName ?? null;
    if ("studioLat" in draft) profileData.studioLat = draft.studioLat ?? null;
    if ("studioLng" in draft) profileData.studioLng = draft.studioLng ?? null;
    if ("studioAddress" in draft) {
      profileData.studioAddress = draft.studioAddress ?? null;
    }
  }

  await prisma.specialistProfile.update({
    where: { id: params.profileId },
    data: profileData,
  });

  const userData: Record<string, unknown> = {};
  if ("city" in draft) userData.city = draft.city ?? null;
  if ("equipmentSummary" in draft) {
    userData.equipment = draft.equipmentSummary ?? null;
  }
  if ("displayName" in draft && draft.displayName && draft.displayName.trim().length >= 2) {
    userData.displayName = draft.displayName.trim();
  }
  if (draft.clearStudio) {
    userData.hasStudio = false;
  } else if (
    draft.studioName &&
    typeof draft.studioLat === "number" &&
    typeof draft.studioLng === "number"
  ) {
    userData.hasStudio = true;
  }

  if (Object.keys(userData).length > 0) {
    await prisma.user.update({
      where: { id: params.userId },
      data: userData,
    });
  }
}

export async function notifyAdminsOfProfileEdit({
  specialistUserId,
  displayName,
  city,
}: {
  specialistUserId: string;
  displayName: string;
  city?: string | null;
}): Promise<void> {
  const adminPhones = Array.from(new Set([getAdminPhoneDigits(), SUPER_ADMIN_PHONE]));
  const admins = await prisma.user.findMany({
    where: { phone: { in: adminPhones } },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          title: "ویرایش پروفایل متخصص در انتظار تایید",
          message: `«${displayName}»${city ? ` از ${city}` : ""} تغییر پروفایل فرستاد.`,
          type: "INFO",
          link: "/admin/review?status=pending",
        },
      })
    )
  ).catch((error) => {
    console.error("[notifyAdminsOfProfileEdit] failed:", error);
  });

  void specialistUserId;
}
