"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { sanitizeOtpInput, OTP_LENGTH } from "@/lib/auth/otp";

const boxClasses =
  "h-12 w-10 rounded-xl border border-[#E5E0D8] bg-white text-center text-lg font-bold text-[#141413] outline-none transition-all duration-200 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] sm:h-14 sm:w-11";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  const commit = (next: string) => {
    onChange(sanitizeOtpInput(next));
  };

  const focusIndex = (index: number) => {
    const el = inputsRef.current[index];
    el?.focus();
    el?.select();
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = sanitizeOtpInput(raw);
    if (!cleaned) {
      const arr = value.split("");
      arr[index] = "";
      commit(arr.join(""));
      return;
    }

    if (cleaned.length > 1) {
      commit(cleaned);
      focusIndex(Math.min(cleaned.length, OTP_LENGTH) - 1);
      return;
    }

    const arr = value.padEnd(OTP_LENGTH, " ").split("");
    arr[index] = cleaned;
    commit(arr.join("").trimEnd());
    if (index < OTP_LENGTH - 1) focusIndex(index + 1);
  };

  const handleKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      focusIndex(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) focusIndex(index - 1);
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusIndex(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = sanitizeOtpInput(e.clipboardData.getData("text"));
    if (!pasted) return;
    commit(pasted);
    focusIndex(Math.min(pasted.length, OTP_LENGTH) - 1);
  };

  return (
    <div
      className="flex justify-center gap-2"
      dir="ltr"
      role="group"
      aria-label="کد تأیید ۴ رقمی"
    >
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={digits[index]?.trim() ? digits[index] : ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={boxClasses}
          aria-label={`رقم ${index + 1}`}
        />
      ))}
    </div>
  );
}
