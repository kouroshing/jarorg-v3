import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50dvh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
        <FileQuestion className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-black">صفحه پیدا نشد</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        آدرسی که وارد کرده‌اید وجود ندارد یا منتقل شده است.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[#FACC15] px-6 py-2.5 text-sm font-bold text-black shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
      >
        بازگشت به خانه
      </Link>
    </div>
  );
}
