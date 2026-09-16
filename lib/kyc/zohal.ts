/**
 * Thin Zohal (زحل) client for specialist KYC.
 * Docs shape: POST https://service.zohal.io/api/v0/services/inquiry/*
 * Auth: Authorization: Bearer <ZOHAL_TOKEN>
 */

import { phoneToLocalDisplay, toEnglishDigits } from "@/lib/auth/phone";

const DEFAULT_BASE = "https://service.zohal.io/api/v0";

type ZohalEnvelope = {
  result?: number;
  response_body?: {
    data?: Record<string, unknown>;
    error_code?: string | null;
    message?: string;
  };
};

export type ZohalCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode?: string | null; httpStatus?: number };

function getToken(): string | null {
  const token = process.env.ZOHAL_TOKEN?.trim() || process.env.ZEHAL_TOKEN?.trim();
  return token || null;
}

function getBaseUri(): string {
  return (process.env.ZOHAL_BASE_URI?.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

export function isZohalConfigured(): boolean {
  return Boolean(getToken());
}

/**
 * Strict match flag: only the boolean `true` counts.
 * String "true" / 1 / truthy junk must not auto-verify.
 */
export function parseMatched(value: unknown): boolean {
  return value === true;
}

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return sanitizeZohalName(v);
  }
  return null;
}

/** Zohal sometimes returns names like "، امیرسینا " — strip commas/spaces. */
export function sanitizeZohalName(raw: string): string {
  return raw
    .replace(/^[\s،,]+/u, "")
    .replace(/[\s،,]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPermissionDeniedMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    message.includes("اجازه") ||
    message.includes("دسترسی") ||
    m.includes("permission") ||
    m.includes("forbidden") ||
    m.includes("unauthorized")
  );
}

/** User-facing copy — never tell specialists to open the Zohal admin panel. */
function humanizeInquiryError(
  stage: "shahkar" | "identity" | "iban" | "generic",
  raw: string | null | undefined
): string {
  const msg = (raw || "").trim();
  if (isPermissionDeniedMessage(msg)) {
    if (stage === "iban") {
      return "استعلام تطبیق شبا الان از سمت سرویس بیرونی در دسترس نیست. تیم جار می‌تواند شبا را دستی بررسی کند؛ یا چند ساعت بعد دوباره تلاش کنید.";
    }
    return "یکی از سرویس‌های استعلام موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید یا با پشتیبانی جار تماس بگیرید.";
  }
  if (!msg) {
    return "استعلام موقتاً ناموفق بود. لطفاً دوباره تلاش کنید.";
  }
  // Keep provider detail but frame it for the specialist.
  const stageLabel =
    stage === "shahkar"
      ? "شاهکار (مالکیت موبایل)"
      : stage === "identity"
        ? "ثبت احوال"
        : stage === "iban"
          ? "تطبیق شبا"
          : "استعلام";
  return `${stageLabel}: ${msg}`;
}

/** Jalali birth date for Zohal: 1370/5/17 or 1370/05/17 */
export function normalizeJalaliBirthDate(raw: string): string | null {
  const en = toEnglishDigits(raw).trim().replace(/[-.]/g, "/");
  const m = en.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = m[1];
  const mo = String(Number(m[2]));
  const d = String(Number(m[3]));
  if (!Number.isFinite(Number(mo)) || Number(mo) < 1 || Number(mo) > 12) return null;
  if (!Number.isFinite(Number(d)) || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}/${mo}/${d}`;
}

/** Shahkar expects local 09… mobile. */
export function phoneForZohal(storedPhone: string): string {
  return phoneToLocalDisplay(storedPhone);
}

async function zohalPost(
  path: string,
  payload: Record<string, unknown>
): Promise<ZohalCallResult<Record<string, unknown>>> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: "سرویس استعلام موقتاً در دسترس نیست." };
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUri()}/${path.replace(/^\//, "")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[zohal] network error", path, err);
    return { ok: false, error: "اتصال به سرویس استعلام برقرار نشد." };
  }

  let body: ZohalEnvelope | null = null;
  try {
    body = (await response.json()) as ZohalEnvelope;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.response_body?.message || `خطای سرویس استعلام (HTTP ${response.status}).`;
    return {
      ok: false,
      error: isPermissionDeniedMessage(message)
        ? "سرویس مربوطه روی پنل زحل برای این توکن فعال نیست. از داشبورد زحل سرویس را فعال/خرید کنید."
        : message,
      errorCode: body?.response_body?.error_code,
      httpStatus: response.status,
    };
  }

  const errorCode = body?.response_body?.error_code;
  const message = body?.response_body?.message;
  if (errorCode) {
    return {
      ok: false,
      error: isPermissionDeniedMessage(message)
        ? "سرویس مربوطه روی پنل زحل برای این توکن فعال نیست. از داشبورد زحل سرویس را فعال/خرید کنید."
        : message || errorCode,
      errorCode,
      httpStatus: response.status,
    };
  }

  // Official Zohal envelope: result === 1 means success.
  if (typeof body?.result === "number" && body.result !== 1) {
    const failMsg = message || `استعلام ناموفق (کد ${body.result}).`;
    return {
      ok: false,
      error: isPermissionDeniedMessage(failMsg)
        ? "سرویس مربوطه روی پنل زحل برای این توکن فعال نیست. از داشبورد زحل سرویس را فعال/خرید کنید."
        : failMsg,
      errorCode: body?.response_body?.error_code,
      httpStatus: response.status,
    };
  }

  return { ok: true, data: body?.response_body?.data || {} };
}

/** Match mobile number to national code (شاهکار). */
export async function zohalShahkar(
  mobile: string,
  nationalCode: string
): Promise<ZohalCallResult<{ matched: boolean }>> {
  const res = await zohalPost("services/inquiry/shahkar", {
    mobile: phoneForZohal(mobile),
    national_code: toEnglishDigits(nationalCode),
  });
  if (!res.ok) return res;
  return { ok: true, data: { matched: parseMatched(res.data.matched) } };
}

/**
 * Civil-registry identity inquiry: national code + birth date → names + matched.
 * POST /services/inquiry/national_identity_inquiry
 */
export async function zohalNationalIdentityInquiry(
  nationalCode: string,
  birthDate: string
): Promise<
  ZohalCallResult<{
    matched: boolean;
    firstName: string | null;
    lastName: string | null;
    fatherName: string | null;
  }>
> {
  const res = await zohalPost("services/inquiry/national_identity_inquiry", {
    national_code: toEnglishDigits(nationalCode),
    birth_date: birthDate,
  });
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      matched: parseMatched(res.data.matched),
      firstName: pickString(res.data, "first_name", "firstName"),
      lastName: pickString(res.data, "last_name", "lastName"),
      fatherName: pickString(res.data, "father_name", "fatherName"),
    },
  };
}

/** Match IBAN to national code + birth date. */
export async function zohalIbanNationalMatch(
  iban: string,
  nationalCode: string,
  birthDate: string
): Promise<ZohalCallResult<{ matched: boolean }>> {
  const res = await zohalPost("services/inquiry/check_iban_with_national_code", {
    IBAN: iban,
    national_code: toEnglishDigits(nationalCode),
    birth_date: birthDate,
  });
  if (!res.ok) return res;
  return { ok: true, data: { matched: parseMatched(res.data.matched) } };
}

/** Optional bank name lookup for display. */
export async function zohalIbanInfo(
  iban: string
): Promise<ZohalCallResult<{ name?: string; bank_name?: string }>> {
  const res = await zohalPost("services/inquiry/iban", { iban });
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      name: typeof res.data.name === "string" ? res.data.name : undefined,
      bank_name: typeof res.data.bank_name === "string" ? res.data.bank_name : undefined,
    },
  };
}

export type SpecialistKycVerifyInput = {
  phone: string;
  nationalId: string;
  birthDate: string;
  shaba: string;
};

export type SpecialistKycVerifyResult =
  | {
      status: "VERIFIED";
      firstName: string;
      lastName: string;
      fatherName: string | null;
      bankName?: string | null;
    }
  | {
      status: "FAILED";
      reason: string;
    }
  | {
      /** Transport / API / provider-off — caller must not lock the user out of retry. */
      status: "ERROR";
      reason: string;
    };

/**
 * Shahkar → national identity → IBAN match.
 * VERIFIED only when all three return matched === true and at least a name.
 * Provider outages return ERROR (specialist retries). Do not enqueue admin KYC.
 */
export async function verifySpecialistKycWithZohal(
  input: SpecialistKycVerifyInput
): Promise<SpecialistKycVerifyResult> {
  if (!isZohalConfigured()) {
    return {
      status: "ERROR",
      reason:
        "سرویس استعلام آنلاین الان روی سرور فعال نیست. کمی بعد دوباره «ارسال و استعلام» بزنید — نیازی به تایید دستی ادمین نیست.",
    };
  }

  const birthDate = normalizeJalaliBirthDate(input.birthDate);
  if (!birthDate) {
    return { status: "FAILED", reason: "فرمت تاریخ تولد نامعتبر است (مثال: ۱۳۷۰/۵/۱۷)." };
  }

  const shahkar = await zohalShahkar(input.phone, input.nationalId);
  if (!shahkar.ok) {
    console.error("[zohal] shahkar failed", shahkar.error, shahkar.errorCode);
    return {
      status: "ERROR",
      reason: humanizeInquiryError("shahkar", shahkar.error),
    };
  }
  if (!shahkar.data.matched) {
    return {
      status: "FAILED",
      reason:
        "شاهکار رد شد: شماره موبایلی که با آن وارد جار شده‌اید با این کد ملی یکی نیست. سیم‌کارت باید به نام صاحب همین کد ملی باشد. اگر کد ملی را اشتباه زده‌اید اصلاح کنید؛ اگر موبایل به نام شخص دیگری است، با همان موبایلِ صاحب کد ملی وارد شوید.",
    };
  }

  const identity = await zohalNationalIdentityInquiry(input.nationalId, birthDate);
  if (!identity.ok) {
    console.error("[zohal] national identity failed", identity.error, identity.errorCode);
    return {
      status: "ERROR",
      reason: humanizeInquiryError("identity", identity.error),
    };
  }
  if (!identity.data.matched) {
    return {
      status: "FAILED",
      reason:
        "ثبت احوال رد شد: کد ملی یا تاریخ تولد با اطلاعات رسمی مطابقت ندارد. هر دو را با کارت ملی چک کنید (سال/ماه/روز شمسی دقیق).",
    };
  }
  const firstName = identity.data.firstName;
  const lastName = identity.data.lastName;
  if (!firstName || !lastName) {
    return {
      status: "FAILED",
      reason:
        "نام از سامانه ثبت احوال برنگشت. چند دقیقه بعد دوباره تلاش کنید؛ اگر تکرار شد با پشتیبانی جار تماس بگیرید.",
    };
  }

  const ibanMatch = await zohalIbanNationalMatch(input.shaba, input.nationalId, birthDate);
  if (!ibanMatch.ok) {
    console.error("[zohal] iban match failed", ibanMatch.error, ibanMatch.errorCode);
    // Even if IBAN product is off on the provider token: specialist retries later.
    // Do not soft-PENDING into the admin KYC queue — Zohal must finish the job.
    return {
      status: "ERROR",
      reason: humanizeInquiryError("iban", ibanMatch.error),
    };
  }
  if (!ibanMatch.data.matched) {
    return {
      status: "FAILED",
      reason:
        "تطبیق شبا رد شد: این شماره شبا متعلق به این کد ملی نیست (یا رقم شبا اشتباه وارد شده). شبا را از اپ بانک کپی کنید؛ پیشوند IR را دوباره تایپ نکنید — فقط ۲۴ رقم. حساب باید به نام صاحب همان کد ملی باشد.",
    };
  }

  // Only spend the optional bank-name inquiry after a successful match.
  let bankName: string | null = null;
  const ibanInfo = await zohalIbanInfo(input.shaba);
  if (ibanInfo.ok) {
    bankName = ibanInfo.data.bank_name || null;
  }

  return {
    status: "VERIFIED",
    firstName,
    lastName,
    fatherName: identity.data.fatherName,
    bankName,
  };
}
