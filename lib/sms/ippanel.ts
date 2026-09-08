import { normalizePhoneDigits } from "@/lib/auth/phone";

const IPPANEL_PATTERN_SEND_URL =
  "http://rest.ippanel.com/v1/messages/patterns/send";

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
    return "پاسخ نامعتبر یا خالی از سرور پیامک";
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

  // If no standard error message is found, return the stringified payload
  return JSON.stringify(payload);
}

/**
 * Sends a pattern SMS via IPPanel REST API (`pattern/normal/send`).
 * @throws {Error} with the API message when the request fails
 * @see https://github.com/ippanel/php-rest-sdk — official request shape
 */
export async function sendSmsByPattern(
  params: SendSmsByPatternParams
): Promise<SendSmsByPatternSuccess> {
  const envKey = process.env.IPPANEL_API_KEY?.trim();
  const rawKey = (envKey && envKey !== "" && envKey !== "undefined" && envKey !== "null")
    ? envKey
    : "YTFlYmRjNzAtZTE2MC00YzhmLTkwNjItNmE2OGFmZjhmMDVhNzY3MjIxY2NjNGNlOTFlZDAwZDIzMWFhNzkzOWU5M2M=";

  const authHeaderValue = rawKey.startsWith("AccessKey") ? rawKey : `AccessKey ${rawKey}`;

  const envSender = process.env.IPPANEL_SENDER_NUMBER?.trim();
  const sender = (envSender && envSender !== "" && envSender !== "undefined" && envSender !== "null")
    ? envSender
    : "+983000505";

  if (!params.patternCode?.trim()) {
    throw new Error("کد پترن پیامک تنظیم نشده است.");
  }

  const recipientFormatted = formatIppanelRecipient(params.recipient);

  const endpoints = [
    {
      url: "http://rest.ippanel.com/v1/messages/patterns/send",
      body: {
        pattern_code: params.patternCode.trim(),
        originator: sender,
        recipient: recipientFormatted,
        values: params.patternValues,
      },
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeaderValue,
        "apikey": rawKey,
      },
    },
    {
      url: "https://rest.ippanel.com/v1/messages/patterns/send",
      body: {
        pattern_code: params.patternCode.trim(),
        originator: sender,
        recipient: recipientFormatted,
        values: params.patternValues,
      },
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeaderValue,
        "apikey": rawKey,
      },
    },
    {
      url: "https://edge.ippanel.com/v1/messages/patterns/send",
      body: {
        pattern_code: params.patternCode.trim(),
        originator: sender,
        recipient: recipientFormatted,
        values: params.patternValues,
      },
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeaderValue,
        "apikey": rawKey,
      },
    },
  ];

  let lastError: any = null;

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep.url, {
        method: "POST",
        headers: ep.headers,
        body: JSON.stringify(ep.body),
        signal: AbortSignal.timeout(8000),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (response.ok && payload) {
        return { messageId: getMessageId(payload) };
      }

      console.warn(`[IPPanel Retry Warning] Endpoint ${ep.url} returned status ${response.status}:`, payload);
      lastError = new Error(extractIppanelErrorMessage(payload));
    } catch (err: any) {
      console.warn(`[IPPanel Retry Warning] Endpoint ${ep.url} failed with error:`, err?.message || err);
      lastError = err;
    }
  }

  console.error("[IPPanel SMS API Final Error] All endpoints failed. Details:", lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("خطا در ارسال پیامک از طریق درگاه‌های پیامک.");
}

function getMessageId(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const data = (payload as { data?: { message_id?: unknown } }).data;
  const id = data?.message_id;
  if (typeof id === "number") return id;
  if (typeof id === "string") {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}
