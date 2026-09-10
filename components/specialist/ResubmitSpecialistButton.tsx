"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { acceptSpecialistTermsAction } from "@/app/actions/specialistOnboardingActions";

/** Re-queues a rejected specialist file after they have fixed issues. */
export default function ResubmitSpecialistButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await acceptSpecialistTermsAction();
            if (!res.success) {
              setError(res.error || "خطا در ارسال مجدد");
              if (res.redirect) {
                setTimeout(() => router.push(res.redirect!), 1200);
              }
              return;
            }
            router.push(res.redirect || "/specialist/onboarding/review");
            router.refresh();
          });
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-jar-primary px-6 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        ارسال مجدد برای بررسی
      </button>
      {error && <p className="text-[11px] font-bold text-rose-600 max-w-xs text-center">{error}</p>}
    </div>
  );
}
