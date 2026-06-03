import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function HomeFooter() {
  return (
    <footer className="border-t border-gray-100 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-5 sm:px-8">
        <BrandLogo variant="footer" />

        <div className="flex w-full flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-right">
          <p className="text-sm text-gray-500">
            © 2026 جار. تمامی حقوق محفوظ است.
          </p>

          <nav
            className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600"
            aria-label="لینک‌های پایین صفحه"
          >
            <Link
              href="/create-project"
              className="transition-colors duration-200 hover:text-black"
            >
              ثبت پروژه
            </Link>
            <Link
              href="/login"
              className="transition-colors duration-200 hover:text-black"
            >
              ورود
            </Link>
            <a
              href="#services"
              className="transition-colors duration-200 hover:text-black"
            >
              خدمات
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
