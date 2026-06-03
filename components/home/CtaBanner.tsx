import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-black px-6 py-12 text-center sm:px-12 sm:py-16 sm:text-right">
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#FACC15]/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                پروژه خاصی در ذهن دارید؟
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-400">
                درخواست خود را ثبت کنید؛ تیم جار در کوتاه‌ترین زمان با شما
                هماهنگ می‌شود.
              </p>
            </div>

            <Link
              href="/create-project"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#FACC15] px-8 py-4 text-sm font-bold text-black shadow-glow transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              ثبت رایگان پروژه
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
