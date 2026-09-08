import "server-only";

const MAX_SENDS_PER_WINDOW = 5;
const ROLLING_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory cache for rate limiting: key -> array of timestamps
const rateLimitMap = new Map<string, number[]>();

// Periodically clean up old timestamps every hour to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < ROLLING_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }, 60 * 60 * 1000).unref();
}

/** Returns a user-facing error when OTP send should be blocked, otherwise null. */
export async function checkOtpSendRateLimit(
  phoneDigits: string,
  ip: string = "unknown"
): Promise<string | null> {
  // Super Admin Bypass for testing
  if (phoneDigits === "989100138383" || phoneDigits === "09100138383") {
    return null;
  }

  const now = Date.now();

  const checkLimit = (key: string): string | null => {
    const timestamps = rateLimitMap.get(key) || [];
    const recent = timestamps.filter((t) => now - t < ROLLING_WINDOW_MS);
    
    // Cleanup old items immediately for this key
    if (recent.length > 0) {
      rateLimitMap.set(key, recent);
    } else {
      rateLimitMap.delete(key);
    }

    if (recent.length > 0) {
      const lastSent = recent[recent.length - 1];
      if (now - lastSent < 60_000) {
        return "لطفاً یک دقیقه صبر کنید و دوباره درخواست کد دهید.";
      }
    }

    if (recent.length >= MAX_SENDS_PER_WINDOW) {
      return "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.";
    }

    return null;
  };

  // 1. Check IP rate limit first
  if (ip !== "unknown") {
    const ipError = checkLimit(`ip:${ip}`);
    if (ipError) return ipError;
  }

  // 2. Check Phone rate limit
  const phoneError = checkLimit(`phone:${phoneDigits}`);
  if (phoneError) return phoneError;

  return null;
}

/** Records a successful OTP send for rate-limit accounting. */
export async function recordOtpSend(
  phoneDigits: string,
  ip: string = "unknown"
): Promise<void> {
  // Don't record for super admin bypass
  if (phoneDigits === "989100138383" || phoneDigits === "09100138383") {
    return;
  }

  const now = Date.now();

  const record = (key: string) => {
    const timestamps = rateLimitMap.get(key) || [];
    timestamps.push(now);
    const recent = timestamps.filter((t) => now - t < ROLLING_WINDOW_MS);
    rateLimitMap.set(key, recent);
  };

  record(`phone:${phoneDigits}`);
  
  if (ip !== "unknown") {
    record(`ip:${ip}`);
  }
}
