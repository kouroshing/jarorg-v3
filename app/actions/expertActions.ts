"use server";

import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";

const EXPERT_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "experts"
);
const MAX_AVATAR_BYTES = 512 * 1024;

const avatarUploadSchema = z.object({
  dataUrl: z
    .string()
    .min(1)
    .max(600_000)
    .refine((v) => /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(v), {
      message: "فرمت تصویر نامعتبر است.",
    }),
});

const expertInputSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(120),
  imageUrl: z
    .string()
    .trim()
    .min(1, "لینک عکس الزامی است.")
    .max(2000)
    .refine(
      (v) => v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/"),
      "لینک عکس باید با http، https یا / شروع شود."
    ),
  description: z
    .string()
    .trim()
    .min(1, "توضیحات الزامی است.")
    .max(500),
  isActive: z.boolean().optional(),
});

const expertIdSchema = z.object({
  id: z.string().uuid("شناسه نامعتبر است."),
});

export type ExpertRecord = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
};

/** Subset exposed on the public homepage. */
export type PublicExpertRecord = Pick<
  ExpertRecord,
  "id" | "name" | "imageUrl" | "description"
>;

type ActionError = { success: false; error: string };
type ExpertsSuccess = { success: true; experts: ExpertRecord[] };
type ExpertSuccess = { success: true; expert: ExpertRecord };

async function requireAdmin(): Promise<ActionError | null> {
  const session = await getSession();
  if (!session || !isAdminSession(session)) {
    return { success: false, error: "دسترسی غیرمجاز." };
  }
  return null;
}

function revalidateExpertPaths() {
  revalidatePath("/admin/experts");
  revalidatePath("/admin");
  revalidatePath("/");
}

/** Public: active experts for the homepage (no auth). */
export async function getActiveExperts(): Promise<PublicExpertRecord[]> {
  try {
    return await prisma.expert.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
      },
    });
  } catch {
    return [];
  }
}

export type UploadExpertAvatarResult =
  | { success: true; url: string }
  | ActionError;

/** Admin: save a cropped avatar to public/uploads/experts. */
export async function uploadExpertAvatar(input: {
  dataUrl: string;
}): Promise<UploadExpertAvatarResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = avatarUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "تصویر نامعتبر است.",
    };
  }

  const match = parsed.data.dataUrl.match(
    /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i
  );
  if (!match) {
    return { success: false, error: "فرمت تصویر نامعتبر است." };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return { success: false, error: "داده تصویر نامعتبر است." };
  }

  if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
    return {
      success: false,
      error: "حجم تصویر پس از فشرده‌سازی بیش از حد مجاز است.",
    };
  }

  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;
  const filePath = path.join(EXPERT_UPLOAD_DIR, filename);

  try {
    await mkdir(EXPERT_UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, buffer);
  } catch {
    return { success: false, error: "ذخیره تصویر ناموفق بود." };
  }

  return { success: true, url: `/uploads/experts/${filename}` };
}

/** Admin: list all experts (newest first). */
export async function getExperts(): Promise<ExpertsSuccess | ActionError> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const experts = await prisma.expert.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, experts };
  } catch {
    return { success: false, error: "خطا در دریافت لیست متخصصان." };
  }
}

/** Admin: create a new expert profile. */
export async function createExpert(
  input: z.input<typeof expertInputSchema>
): Promise<ExpertSuccess | ActionError> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = expertInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.",
    };
  }

  try {
    const expert = await prisma.expert.create({
      data: {
        name: parsed.data.name,
        imageUrl: parsed.data.imageUrl,
        description: parsed.data.description,
        isActive: parsed.data.isActive ?? true,
      },
    });
    revalidateExpertPaths();
    return { success: true, expert };
  } catch {
    return { success: false, error: "افزودن متخصص ناموفق بود." };
  }
}

/** Admin: update an existing expert. */
export async function updateExpert(
  input: z.input<typeof expertInputSchema> & { id: string }
): Promise<ExpertSuccess | ActionError> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const idParsed = expertIdSchema.safeParse({ id: input.id });
  if (!idParsed.success) {
    return { success: false, error: "شناسه نامعتبر است." };
  }

  const parsed = expertInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.",
    };
  }

  try {
    const expert = await prisma.expert.update({
      where: { id: idParsed.data.id },
      data: {
        name: parsed.data.name,
        imageUrl: parsed.data.imageUrl,
        description: parsed.data.description,
        isActive: parsed.data.isActive ?? true,
      },
    });
    revalidateExpertPaths();
    return { success: true, expert };
  } catch {
    return { success: false, error: "ویرایش متخصص ناموفق بود." };
  }
}

/** Admin: remove an expert (projects keep expertId null via onDelete). */
export async function deleteExpert(
  input: z.input<typeof expertIdSchema>
): Promise<{ success: true } | ActionError> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = expertIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "شناسه نامعتبر است." };
  }

  try {
    await prisma.expert.delete({ where: { id: parsed.data.id } });
    revalidateExpertPaths();
    return { success: true };
  } catch {
    return { success: false, error: "حذف متخصص ناموفق بود." };
  }
}
