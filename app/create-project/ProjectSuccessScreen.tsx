"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Phone } from "lucide-react";
import { isVipBudget, type ProjectBudgetId } from "@/lib/projects/budget";

const VIP_TEL = "tel:02166468626";
const VIP_DISPLAY = "۰۲۱۶۶۴۶۸۶۲۶";

export function ProjectSuccessScreen({ budget }: { budget: ProjectBudgetId }) {
  const router = useRouter();
  const vip = isVipBudget(budget);

  useEffect(() => {
    const t = setTimeout(() => router.push("/profile"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="animate-fade-up w-full">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-glow ${
            vip ? "bg-[#FACC15] text-black" : "bg-jar-yellow text-black"
          }`}
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </span>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-black">
          درخواست شما ثبت شد
        </h1>

        {vip ? (
          <div className="mt-5 rounded-2xl border border-[#FACC15]/50 bg-yellow-50/40 px-5 py-4 text-right">
            <p className="text-sm font-semibold leading-relaxed text-black">
              درخواست شما ثبت شد. برای پروژه‌های اختصاصی و هماهنگی سریع‌تر،
              لطفاً بین ساعات ۱۲ ظهر تا ۸ شب با خط ویژه VIP تماس بگیرید:
            </p>
            <a
              href={VIP_TEL}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-bold text-black transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              <span dir="ltr">{VIP_DISPLAY}</span>
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            درخواست شما با موفقیت ثبت شد. کارشناسان ما به زودی برای بررسی
            جزئیات با شما تماس خواهند گرفت.
          </p>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          در حال انتقال به پروفایل…
        </p>
      </div>
    </div>
  );
}
