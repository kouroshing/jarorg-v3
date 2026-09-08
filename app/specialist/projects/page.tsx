import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAvailableOrdersForSpecialistAction } from "@/app/actions/marketplaceActions";
import SpecialistProjectFeed from "@/components/specialist/SpecialistProjectFeed";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";
import { User, Briefcase, FolderOpen, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کارتابل پروژه‌های باز عکاسی و تصویربرداری | جار",
  description: "مشاهده سفارشات جدید و اعلام آمادگی برای پروژه‌های عکاسی و فیلمبرداری",
};

export default async function SpecialistProjectsFeedPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect(encodeURI("/login?redirect=/specialist/projects"));
  }

  const result = await getAvailableOrdersForSpecialistAction();
  const orders = result.success && result.orders ? result.orders : [];
  const authError = !result.success ? result.error : undefined;
  const redirectTo = !result.success ? result.redirectTo : undefined;

  return (
    <div className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-20 overflow-x-hidden" dir="rtl">
      {/* Background Ambience */}
      <JarBillowBackground />

      {/* Modern Frosted Header */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-3 sm:px-6 backdrop-blur-xl shadow-xs">
          {/* Logo & Section title */}
          <Link href="/specialist/projects" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                پلتفرم جار
              </span>
              <span className="hidden sm:inline text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                کارتابل پروژه‌های تخصصی
              </span>
            </div>
          </Link>

          {/* Navigation Pill Switches */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/specialist/projects"
              className="inline-flex items-center gap-1.5 rounded-full bg-jar-primary text-white px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium shadow-xs shrink-0"
            >
              <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-jar-logo" />
              <span className="hidden sm:inline">پروژه‌های باز</span>
              <span className="sm:hidden">پروژه‌ها</span>
            </Link>

            <Link
              href="/specialist/portfolio"
              className="inline-flex items-center gap-1.5 rounded-full bg-jar-surface hover:bg-jar-soft text-jar-muted hover:text-jar-primary border border-jar-border px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium transition-colors shrink-0"
            >
              <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-jar-muted" />
              <span className="hidden sm:inline">نمونه‌کارها و شاخه‌ها</span>
              <span className="sm:hidden">پورتفولیو</span>
            </Link>
          </div>

          {/* Profile pill & Back link */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 py-1 text-xs font-medium text-jar-muted">
              <User className="h-3.5 w-3.5 text-jar-logo" />
              <span dir="ltr">{session.phone || "متخصص"}</span>
            </div>

            <Link
              href="/profile"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 sm:px-4 text-[11px] sm:text-xs font-medium text-jar-primary hover:bg-jar-soft transition-colors shrink-0"
              aria-label="پروفایل"
            >
              <span>پروفایل</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 -translate-x-[1px] text-jar-muted" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6">
        <SpecialistProjectFeed initialOrders={orders} authError={authError} redirectTo={redirectTo} />
      </main>
    </div>
  );
}
