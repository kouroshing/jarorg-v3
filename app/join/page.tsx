import type { Metadata } from "next";
import Link from "next/link";
import { Home, UsersRound, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

export const metadata: Metadata = {
  title: "ثبت‌نام متخصصین و عکاسان | جار",
  description: "اطلاعیه ثبت‌نام عکاسان و متخصصین در پلتفرم جار",
};

export default function JoinPage() {
  return (
    <div
      className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary overflow-x-hidden flex flex-col justify-between selection:bg-jar-primary/10"
      dir="rtl"
    >
      {/* Ambient Dot-Matrix Background */}
      <JarBillowBackground />

      {/* Floating Header */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo />
          </Link>

          {/* Home Link */}
          <Link
            href="/"
            className="group inline-flex h-9 sm:h-10 items-center gap-2 rounded-full border border-jar-border bg-jar-surface px-4 text-xs sm:text-sm font-medium text-jar-primary shadow-xs hover:bg-jar-soft transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4 text-jar-muted group-hover:text-jar-primary transition-colors" />
            <span>صفحه اصلی</span>
          </Link>
        </div>
      </header>

      {/* Main Notice */}
      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="relative rounded-[32px] border border-jar-border bg-jar-surface/90 p-8 sm:p-10 backdrop-blur-2xl shadow-xs">
            
            {/* Status Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border">
              <UsersRound className="h-8 w-8" />
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-jar-primary tracking-tight leading-snug">
              ثبت‌نام عکاسان فعلاً متوقف شده است
            </h1>

            {/* Description */}
            <p className="mt-3.5 text-sm sm:text-base font-medium text-jar-muted leading-relaxed max-w-md mx-auto">
              در حال حاضر ظرفیت جذب متخصص جدید تکمیل است. به زودی ثبت‌نام دور جدید آغاز خواهد شد.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-jar-primary px-7 py-3.5 text-sm font-medium text-white hover:bg-jar-primaryHover transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>بازگشت به صفحه اصلی</span>
              </Link>
              
              <Link
                href="/jaramooz"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-jar-border bg-jar-surface px-6 py-3.5 text-sm font-medium text-jar-primary shadow-xs hover:bg-jar-soft transition-colors"
              >
                <Sparkles className="h-4 w-4 text-jar-logo" />
                <span>مشاهده دوره‌های جارآموز</span>
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-jar-muted font-medium">
        © پلتفرم عکاسی و آموزش تخصصی جار
      </footer>
    </div>
  );
}

