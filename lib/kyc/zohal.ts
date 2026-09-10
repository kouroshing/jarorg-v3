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
    return { ok: false, error: "توکن زحل پیکربندی نشده است." };
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
    return { ok: false, error: "اتصال به سرویس زحل برقرار نشد." };
  }

  let body: ZohalEnvelope | null = null;
  try {
    body = (await response.json()) as ZohalEnvelope;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.response_body?.message || `خطای زحل (HTTP ${response.status}).`;
    return {
      ok: false,
      error: message,
      errorCode: body?.response_body?.error_code,
      httpStatus: response.status,
    };
  }

  const errorCode = body?.response_body?.error_code;
  if (errorCode) {
    return {
      ok: false,
      error: body?.response_body?.message || errorCode,
      errorCode,
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
  return { ok: true, data: { matched: Boolean(res.data.matched) } };
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
  return { ok: true, data: { matched: Boolean(res.data.matched) } };
}

/** Optional bank name lookup for admin display. */
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
      bankName?: string | null;
    }
  | {
      status: "FAILED";
      reason: string;
    }
  | {
      status: "PENDING";
      reason: string;
    };

/**
 * Runs Shahkar + IBAN/national match. Auto-VERIFIED when both match.
 * API/transport failures leave PENDING for admin review.
 */
export async function verifySpecialistKycWithZohal(
  input: SpecialistKycVerifyInput
): Promise<SpecialistKycVerifyResult> {
  if (!isZohalConfigured()) {
    return {
      status: "PENDING",
      reason: "توکن زحل روی سرور تنظیم نشده؛ در صف بررسی دستی ادمین.",
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
      status: "PENDING",
      reason: `استعلام شاهکار موقتاً ناموفق بود: ${shahkar.error}`,
    };
  }
  if (!shahkar.data.matched) {
    return {
      status: "FAILED",
      reason: "شماره موبایل حساب با کد ملی مطابقت ندارد (شاهکار).",
    };
  }

  const ibanMatch = await zohalIbanNationalMatch(input.shaba, input.nationalId, birthDate);
  if (!ibanMatch.ok) {
    console.error("[zohal] iban match failed", ibanMatch.error, ibanMatch.errorCode);
    return {
      status: "PENDING",
      reason: `استعلام تطبیق شبا موقتاً ناموفق بود: ${ibanMatch.error}`,
    };
  }
  if (!ibanMatch.data.matched) {
    return {
      status: "FAILED",
      reason: "شماره شبا با کد ملی و تاریخ تولد مطابقت ندارد.",
    };
  }

  let bankName: string | null = null;
  const ibanInfo = await zohalIbanInfo(input.shaba);
  if (ibanInfo.ok) {
    bankName = ibanInfo.data.bank_name || null;
  }

  return { status: "VERIFIED", bankName };
}
