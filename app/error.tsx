"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50dvh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-black">خطایی رخ داد</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        مشکلی در بارگذاری صفحه پیش آمد. لطفاً دوباره تلاش کنید.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#FACC15] px-6 py-2.5 text-sm font-bold text-black shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
        >
          تلاش مجدد
        </button>
        <Link
          href="/"
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
