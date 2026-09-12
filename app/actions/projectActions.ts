"use server";

import { z } from "zod";
import xss from "xss";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { normalizePhoneDigits } from "@/lib/auth/phone";
import { requireAdminPermission } from "@/lib/auth/adminAccess";
import { ADMIN_STATUSES } from "@/lib/projects/status";
import { sendProjectCreatedSmsNotifications } from "@/lib/sms/project-created";
import { PROJECT_BUDGET_IDS } from "@/lib/projects/budget";
import {
  OFFERING_IDS,
  SERVICE_AUDIENCES,
  buildOfferingServiceDetailsJson,
  composeBriefWithOffering,
  getOfferingById,
} from "@/lib/projects/service-offerings";
import { checkProjectSubmissionRateLimit } from "@/lib/projects/submission-rate-limit";
import { triggerEvent } from "@/lib/jarchiEngine";
const projectInputSchema = z
  .object({
    serviceAudience: z.enum(SERVICE_AUDIENCES),
    serviceOfferingId: z.enum(OFFERING_IDS),
    city: z.enum(["tehran", "karaj", "other"]),
    briefNotes: z
      .string()
      .trim()
      .min(1, "لطفاً جزئیات یا نیازمندی‌های پروژه خود را بنویسید.")
      .max(5000),
    referenceLink: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined))
      .refine(
        (v) =>
          v === undefined ||
          /^https?:\/\//i.test(v) ||
          v.startsWith("/"),
        "لینک نمونه کار معتبر نیست."
      ),
    name: z.string().trim().min(1, "نام الزامی است.").max(120),
    phone: z.string().trim().min(10, "شماره تماس معتبر نیست.").max(32),
    callTime: z.enum(["morning", "noon", "evening"]),
    budget: z.enum(PROJECT_BUDGET_IDS),
  })
  .superRefine((data, ctx) => {
    const offering = getOfferingById(data.serviceOfferingId);
    if (!offering || offering.audience !== data.serviceAudience) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "خدمت انتخاب‌شده نامعتبر است.",
        path: ["serviceOfferingId"],
      });
      return;
    }
  });

export type SubmitProjectInput = z.input<typeof projectInputSchema>;

export type SubmitProjectResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type AdminProjectRecord = {
  id: string;
  createdAt: Date;
  serviceType: string;
  serviceDetails: string | null;
  city: string;
  brief: string;
  contactName: string | null;
  contactPhone: string | null;
  preferredCallTime: string | null;
  budget: string | null;
  referenceLink: string | null;
  status: string;
  adminNotes: string | null;
};

function revalidateAdminProjectPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

/**
 * Persists a 3-step consultation request. Status defaults to PENDING.
 * When the user is signed in, their session phone is used (ignores tampered input).
 */
export async function submitProjectRequest(
  input: SubmitProjectInput
): Promise<SubmitProjectResult> {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "اطلاعات واردشده نامعتبر است.",
    };
  }
  const data = parsed.data;

  try {
    const session = await getSession();
    const contactPhone = session
      ? session.phone
      : normalizePhoneDigits(data.phone);

    const rateLimitError = await checkProjectSubmissionRateLimit(contactPhone);
    if (rateLimitError) {
      return { success: false, error: rateLimitError };
    }

    const offering = getOfferingById(data.serviceOfferingId)!;

    const brief = composeBriefWithOffering(offering, xss(data.briefNotes), null);

    const serviceDetails = buildOfferingServiceDetailsJson(offering, null);

    const project = await prisma.project.create({
      data: {
        serviceType: offering.serviceType,
        city: data.city,
        brief,
        referenceLink: data.referenceLink ?? null,
        serviceDetails,
        contactName: xss(data.name),
        contactPhone,
        preferredCallTime: data.callTime,
        budget: data.budget,
        bookingRoute: "meeting_request",
        status: "PENDING",
        userId: session?.userId ?? null,
      },
    });

    let targetUserId = session?.userId ?? null;
    if (!targetUserId && contactPhone) {
      const matchedUser = await prisma.user.findUnique({
        where: { phone: contactPhone },
        select: { id: true }
      });
      if (matchedUser) {
        targetUserId = matchedUser.id;
      }
    }

    if (targetUserId) {
      triggerEvent("new-project-created", { userId: targetUserId, projectId: project.id });
    }

    sendProjectCreatedSmsNotifications({
      contactPhone,
      contactName: data.name,
      serviceType: project.serviceType,
      projectId: project.id,
      preferredCallTime: project.preferredCallTime,
    });

    return { success: true, id: project.id };
  } catch {
    return {
      success: false,
      error: "ثبت درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }
}

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ADMIN_STATUSES).optional(),
  adminNotes: z.string().max(5000).optional(),
});

export type UpdateProjectLeadInput = z.infer<typeof updateLeadSchema>;

export type UpdateProjectLeadResult = {
  success: boolean;
  error?: string;
};

/** Admin-only: update lead status and/or admin notes. */
export async function updateProjectLead(
  input: UpdateProjectLeadInput
): Promise<UpdateProjectLeadResult> {
  const session = await getSession();
  try {
    await requireAdminPermission(session, "settings_manage");
  } catch {
    return { success: false, error: "دسترسی غیرمجاز." };
  }

  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "ورودی نامعتبر است." };
  }

  if (parsed.data.status === undefined && parsed.data.adminNotes === undefined) {
    return { success: false, error: "چیزی برای ذخیره وجود ندارد." };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.id },
      data: {
        ...(parsed.data.status !== undefined
          ? { status: parsed.data.status }
          : {}),
        ...(parsed.data.adminNotes !== undefined
          ? { adminNotes: xss(parsed.data.adminNotes) }
          : {}),
      },
    });
  } catch {
    return { success: false, error: "بروزرسانی ناموفق بود." };
  }

  revalidateAdminProjectPaths();
  return { success: true };
}

/** Admin-only: update lead status. */
export async function updateProjectStatus(input: {
  id: string;
  status: (typeof ADMIN_STATUSES)[number];
}): Promise<UpdateProjectLeadResult> {
  return updateProjectLead({ id: input.id, status: input.status });
}

/** Admin-only: update internal admin notes. */
export async function updateProjectNote(input: {
  id: string;
  adminNotes: string;
}): Promise<UpdateProjectLeadResult> {
  return updateProjectLead({ id: input.id, adminNotes: input.adminNotes });
}

export type GetAdminProjectsParams = {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
};

export type GetAdminProjectsResult =
  | {
      success: true;
      projects: AdminProjectRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  | { success: false; error: string };

const ADMIN_PAGE_SIZE = 20;

/** Admin-only: paginated projects for lead management. */
export async function getAdminProjects(
  params: GetAdminProjectsParams = {}
): Promise<GetAdminProjectsResult> {
  const session = await getSession();
  try {
    await requireAdminPermission(session, "settings_manage");
  } catch {
    return { success: false, error: "دسترسی غیرمجاز." };
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? ADMIN_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const where: {
    status?: string;
    OR?: Array<{
      id?: string;
      contactName?: { contains: string };
      contactPhone?: { contains: string };
      brief?: { contains: string };
    }>;
  } = {};

  const statusFilter = params.status?.trim();
  if (
    statusFilter &&
    statusFilter !== "all" &&
    (ADMIN_STATUSES as readonly string[]).includes(statusFilter)
  ) {
    where.status = statusFilter;
  }

  const query = params.q?.trim();
  if (query) {
    where.OR = [
      { id: query },
      { contactName: { contains: query } },
      { contactPhone: { contains: query } },
      { brief: { contains: query } },
    ];
  }

  try {
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          serviceType: true,
          serviceDetails: true,
          city: true,
          brief: true,
          contactName: true,
          contactPhone: true,
          preferredCallTime: true,
          budget: true,
          referenceLink: true,
          status: true,
          adminNotes: true,
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      success: true,
      projects,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch {
    return { success: false, error: "خطا در دریافت پروژه‌ها." };
  }
}

/** Admin-only: Manually activate a course purchase and generate a simulated license. */
export async function manuallyApprovePurchase(input: {
  purchaseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  try {
    await requireAdminPermission(session, "settings_manage");
  } catch {
    return { success: false, error: "دسترسی غیرمجاز." };
  }

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: input.purchaseId },
    });

    if (!purchase) {
      return { success: false, error: "تراکنش یافت نشد." };
    }

    if (purchase.status === "SUCCESS") {
      return { success: true };
    }

    const testLicenseKey = `SP-TEST-LIC-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

    await prisma.purchase.update({
      where: { id: input.purchaseId },
      data: {
        status: "SUCCESS",
        licenseKey: testLicenseKey,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[manually_approve_purchase_error]", error);
    return { success: false, error: "خطا در تایید تراکنش و صدور لایسنس." };
  }
}

