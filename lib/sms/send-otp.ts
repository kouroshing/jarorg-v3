import { sendSmsByPattern } from "@/lib/sms/ippanel";

/** Sends login OTP via IPPanel pattern (variable name: `code`). @throws {Error} */
export async function sendOtpSms(recipient: string, code: string): Promise<void> {
  const patternCode = process.env.IPPANEL_PATTERN_OTP?.trim();
  if (!patternCode) {
    throw new Error("پترن OTP (IPPANEL_PATTERN_OTP) در سرور تنظیم نشده است.");
  }

  await sendSmsByPattern({
    recipient,
    patternCode,
    patternValues: { code },
  });
}
