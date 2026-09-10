import React from "react";
import Link from "next/link";
import { Briefcase, FolderOpen, MapPin, Wallet, User, ClipboardList, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

const NAV = [
  { id: "projects", href: "/specialist/projects", label: "پروژه‌های باز", short: "باز", icon: Briefcase },
  { id: "mine", href: "/specialist/mine", label: "پروژه‌های من", short: "من", icon: ClipboardList },
  { id: "portfolio", href: "/specialist/portfolio", label: "نمونه‌کارها", short: "کار", icon: FolderOpen },
  { id: "profile", href: "/specialist/profile", label: "پروفایل کاری", short: "پروفایل", icon: MapPin },
  { id: "identity", href: "/specialist/onboarding/identity", label: "احراز هویت", short: "KYC", icon: ShieldCheck },
] as const;

export default function SpecialistAppShell({
  active,
  phone,
  mineCount,
  children,
}: {
  active: "projects" | "mine" | "portfolio" | "profile" | "identity";
  phone?: string | null;
  mineCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-24 overflow-x-hidden" dir="rtl">
      <JarBillowBackground />

      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-3 sm:px-6 backdrop-blur-xl shadow-xs">
          <Link href="/specialist/projects" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* The logo links to "/" by default, which would nest an <a> inside
                this one and break hydration on every specialist page. */}
            <BrandLogo linked={false} />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                پنل متخصص
              </span>
              <span className="hidden sm:inline text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                پروژه‌ها، نمونه‌کار و قیمت پیشنهادی
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium transition-colors shrink-0 ${
                    isActive
                      ? "bg-jar-primary text-white shadow-xs"
                      : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft hover:text-jar-primary"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-jar-logo" : "text-jar-muted"}`} />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.short}</span>
                  {item.id === "mine" && (mineCount ?? 0) > 0 && (
                    <span
                      className={`min-w-4 rounded-full px-1 text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-jar-canvas text-jar-primary"
                      }`}
                    >
                      {(mineCount ?? 0).toLocaleString("fa-IR")}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 py-1 text-xs font-medium text-jar-muted">
              <User className="h-3.5 w-3.5 text-jar-logo" />
              <span dir="ltr">{phone || "متخصص"}</span>
            </div>
            <Link
              href="/dashboard/wallet"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 text-[11px] sm:text-xs font-medium text-jar-primary hover:bg-jar-soft transition-colors"
            >
              <Wallet className="h-3.5 w-3.5 text-jar-logo" />
              <span className="hidden sm:inline">کیف پول</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6">{children}</main>
    </div>
  );
}
