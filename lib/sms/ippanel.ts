import { normalizePhoneDigits } from "@/lib/auth/phone";

const IPPANEL_PATTERN_SEND_URL =
  "https://api2.ippanel.com/api/v1/sms/pattern/normal/send";

const REQUEST_TIMEOUT_MS = 15_000;

export type SendSmsByPatternParams = {
  /** Mobile number (local 09… or international 98…) */
  recipient: string;
  patternCode: string;
  patternValues: Record<string, string | number>;
};

export type SendSmsByPatternSuccess = {
  messageId?: number;
};

/** E.164-style recipient for IPPanel api2 (`+989…`). */
export function formatIppanelRecipient(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return phone.trim();
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/** Extracts human-readable error text from IPPanel JSON (data.message, message, meta.message). */
export function extractIppanelErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "خطای نامشخص از سرور پیامک";
  }

  const root = payload as Record<string, unknown>;

  const data = root.data;
  if (data && typeof data === "object") {
    const dataMessage = (data as { message?: unknown }).message;
    if (typeof dataMessage === "string" && dataMessage.trim()) {
      return dataMessage.trim();
    }
  }

  if (typeof root.message === "string" && root.message.trim()) {
    return root.message.trim();
  }

  const meta = root.meta;
  if (meta && typeof meta === "object") {
    const metaMessage = (meta as { message?: unknown }).message;
    if (typeof metaMessage === "string" && metaMessage.trim()) {
      return metaMessage.trim();
    }
  }

  return "خطای نامشخص از سرور پیامک";
}

/**
 * Sends a pattern SMS via IPPanel REST API (`pattern/normal/send`).
 * @throws {Error} with the API message when the request fails
 * @see https://github.com/ippanel/php-rest-sdk — official request shape
 */
export async function sendSmsByPattern(
  params: SendSmsByPatternParams
): Promise<SendSmsByPatternSuccess> {
  const apiKey = process.env.IPPANEL_API_KEY?.trim();
  const sender = process.env.IPPANEL_SENDER_NUMBER?.trim();

  if (!apiKey || !sender) {
    throw new Error("تنظیمات IPPanel (API Key یا شماره فرستنده) کامل نیست.");
  }

  if (!params.patternCode?.trim()) {
    throw new Error("کد پترن پیامک تنظیم نشده است.");
  }

  const body = {
    code: params.patternCode.trim(),
    sender,
    recipient: formatIppanelRecipient(params.recipient),
    variable: params.patternValues,
  };

  try {
    const response = await fetch(IPPANEL_PATTERN_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(extractIppanelErrorMessage(payload));
    }

    return { messageId: getMessageId(payload) };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("خطای نامشخص از سرور پیامک");
  }
}

function getMessageId(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const data = (payload as { data?: { message_id?: unknown } }).data;
  const id = data?.message_id;
  return typeof id === "number" ? id : undefined;
}
