import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

export const dynamic = "force-dynamic";

export default async function SpecialistPortfolioPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/specialist/portfolio");
  }

  const result = await getSpecialistCategoriesAndPortfolio();

  return (
    <div className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-20 overflow-x-hidden" dir="rtl">
      
      {/* Billow Ambient Background */}
      <JarBillowBackground />

      {/* Floating Frosted Header */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-3 sm:px-6 backdrop-blur-xl shadow-xs">
          
          {/* Right Side: Brand Logo & Dashboard Title */}
          <Link href="/specialist/portfolio" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                پنل متخصصین
              </span>
              <span className="hidden sm:inline text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                مدیریت نمونه‌کارها
              </span>
            </div>
          </Link>

          {/* Navigation Pill Switches */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/specialist/projects"
              className="inline-flex items-center gap-1 rounded-full bg-jar-surface hover:bg-jar-soft text-jar-muted hover:text-jar-primary border border-jar-border px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium transition-colors"
            >
              <span className="hidden sm:inline">پروژه‌های باز</span>
              <span className="sm:hidden">پروژه‌ها</span>
            </Link>

            <Link
              href="/specialist/portfolio"
              className="inline-flex items-center gap-1 rounded-full bg-jar-primary text-white px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium shadow-xs shrink-0"
            >
              <span className="hidden sm:inline">نمونه‌کارها و شاخه‌ها</span>
              <span className="sm:hidden">پورتفولیو</span>
            </Link>
          </div>

          {/* Left Side: User status pill & Back to Home */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 py-1 text-xs font-medium text-jar-muted">
              <User className="h-3.5 w-3.5 text-jar-logo" />
              <span dir="ltr">{session.phone || "متخصص جار"}</span>
            </div>

            <Link
              href="/"
              className="group inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-jar-border bg-jar-surface px-3 sm:px-4 text-[11px] sm:text-xs font-medium text-jar-primary shadow-xs hover:bg-jar-soft transition-colors cursor-pointer shrink-0"
              aria-label="بازگشت به خانه"
            >
              <span className="hidden sm:inline">صفحه اصلی</span>
              <span className="sm:hidden">خانه</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 -translate-x-[0.5px] text-jar-muted group-hover:text-jar-primary" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28">
        <SpecialistPortfolioManager
          initialSelectedCategories={result.selectedCategories || []}
          initialPortfolioItems={result.portfolioItems || []}
          initialAgreedToTerms={result.agreedToTerms || false}
        />
      </main>

    </div>
  );
}
