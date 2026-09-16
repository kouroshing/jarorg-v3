"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import {
  Briefcase,
  Wallet,
  User,
  ClipboardList,
  Camera,
  Building2,
  Lock,
  Settings,
  ShoppingBag,
  Home,
  LogOut,
  Loader2,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import MobileBottomNav from "@/components/MobileBottomNav";
import { logout } from "@/app/actions/authActions";

export type ProfilePanel = "customer" | "specialist";

export type SpecialistGate =
  | { state: "open"; href: string }
  | { state: "locked"; href: string };

const SPECIALIST_SECTIONS = [
  { id: "projects", href: "/specialist/projects", label: "پروژه‌های باز", icon: Briefcase },
  { id: "mine", href: "/specialist/mine", label: "پروژه‌های من", icon: ClipboardList },
  { id: "portfolio", href: "/specialist/portfolio", label: "پروفایل من", icon: Camera },
  { id: "studio", href: "/specialist/studio", label: "استودیو", icon: Building2 },
] as const;

function LogoutAccountButton({
  variant = "header",
}: {
  variant?: "header" | "footer" | "icon";
}) {
  const [isPending, startTransition] = useTransition();

  const onLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onLogout}
        disabled={isPending}
        aria-label="خروج از حساب کاربری"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shrink-0 transition hover:bg-rose-50 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  if (variant === "footer") {
    return (
      <button
        type="button"
        onClick={onLogout}
        disabled={isPending}
        className="flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-rose-200 px-6 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:scale-95 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        خروج از حساب کاربری
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      خروج
    </button>
  );
}

function PanelSwitcher({
  panel,
  specialistGate,
}: {
  panel: ProfilePanel;
  specialistGate: SpecialistGate;
}) {
  const specialistOpen = specialistGate.state === "open";
  const specialistHref = specialistGate.href;
  const customerHref = "/profile?role=customer";

  return (
    <div
      className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5"
      role="tablist"
      aria-label="حالت پروفایل"
      dir="rtl"
    >
      <Link
        href={customerHref}
        role="tab"
        aria-selected={panel === "customer"}
        className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition-colors ${
          panel === "customer"
            ? "bg-neutral-900 text-white shadow-sm"
            : "text-neutral-500 hover:text-neutral-800"
        }`}
      >
        <User className="h-3.5 w-3.5" />
        مشتری
      </Link>

      {specialistOpen ? (
        <Link
          href={specialistHref}
          role="tab"
          aria-selected={panel === "specialist"}
          className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition-colors ${
            panel === "specialist"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          متخصص
        </Link>
      ) : (
        <Link
          href={specialistHref}
          role="tab"
          aria-selected={false}
          title="برای فعال‌سازی پنل متخصص، احراز هویت را شروع کنید"
          className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold text-neutral-400 hover:text-neutral-600"
        >
          <Lock className="h-3.5 w-3.5" />
          متخصص
        </Link>
      )}
    </div>
  );
}

function SpecialistSectionNav({
  active,
  mineCount,
  className,
}: {
  active?: "projects" | "mine" | "portfolio" | "profile" | "studio" | "identity";
  mineCount?: number;
  className?: string;
}) {
  return (
    <nav
      className={className}
      aria-label="بخش‌های متخصص"
    >
      {SPECIALIST_SECTIONS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.id === active ||
          (item.id === "portfolio" && (active === "profile" || active === "identity"));
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
              isActive
                ? "bg-neutral-900 text-white shadow-sm"
                : "border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
            {item.id === "mine" && (mineCount ?? 0) > 0 && (
              <span
                className={`min-w-4 rounded-full px-1 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {(mineCount ?? 0).toLocaleString("fa-IR")}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ProfileAppShell({
  panel,
  active = "projects",
  phone,
  displayName,
  specialistGate,
  mineCount,
  children,
}: {
  panel: ProfilePanel;
  active?: "projects" | "mine" | "portfolio" | "profile" | "studio" | "identity";
  phone?: string | null;
  displayName?: string | null;
  specialistGate: SpecialistGate;
  mineCount?: number;
  children: React.ReactNode;
}) {
  const title =
    panel === "specialist"
      ? "پروفایل · متخصص"
      : "پروفایل · مشتری";

  return (
    <div
      className="relative isolate min-h-screen bg-white text-neutral-900 selection:bg-neutral-900/10 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 overflow-x-hidden"
      dir="rtl"
    >
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          <Link href="/" className="flex items-center gap-1.5 shrink-0" aria-label="خانه">
            <BrandLogo linked={false} />
          </Link>
          <PanelSwitcher panel={panel} specialistGate={specialistGate} />
          <div className="flex items-center gap-1.5 shrink-0">
            <LogoutAccountButton variant="icon" />
            <Link
              href="/dashboard/wallet"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shrink-0"
              aria-label="کیف پول"
            >
              <Wallet className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {panel === "specialist" && (
          <div className="border-t border-neutral-100 px-3 py-2 overflow-x-auto">
            <SpecialistSectionNav
              active={active}
              mineCount={mineCount}
              className="flex items-center gap-1.5 w-max"
            />
          </div>
        )}
      </header>

      {/* Desktop header */}
      <header className="fixed inset-x-0 top-3 z-50 hidden px-4 md:block md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/95 px-3 sm:px-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo linked={false} />
            </Link>
            <div className="hidden sm:flex flex-col border-r border-neutral-200 pr-3 mr-1 min-w-0">
              <span className="text-sm font-bold tracking-tight text-neutral-900 leading-none truncate">
                {title}
              </span>
              <span className="text-[10px] font-medium text-neutral-500 leading-tight mt-0.5 truncate">
                {displayName || phone || "حساب جار"}
              </span>
            </div>
            <PanelSwitcher panel={panel} specialistGate={specialistGate} />
          </div>

          {panel === "specialist" ? (
            <SpecialistSectionNav
              active={active}
              mineCount={mineCount}
              className="flex items-center gap-1.5 shrink-0 overflow-x-auto"
            />
          ) : (
            <nav className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/profile?role=customer"
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                سفارش‌ها
              </Link>
              <Link
                href="/order"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Camera className="h-3.5 w-3.5" />
                ثبت سفارش
              </Link>
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Settings className="h-3.5 w-3.5" />
                حساب
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="hidden lg:inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <Home className="h-3.5 w-3.5" />
              خانه
            </Link>
            <Link
              href="/dashboard/wallet"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <Wallet className="h-3.5 w-3.5" />
              کیف پول
            </Link>
            <LogoutAccountButton variant="header" />
          </div>
        </div>
      </header>

      <main
        className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-6 ${
          panel === "specialist" ? "pt-[6.75rem] md:pt-24" : "pt-16 md:pt-24"
        }`}
      >
        {children}

        <div className="flex justify-center border-t border-neutral-100 pt-6 pb-2">
          <LogoutAccountButton variant="footer" />
        </div>
      </main>

      <MobileBottomNav isLoggedIn />
    </div>
  );
}
