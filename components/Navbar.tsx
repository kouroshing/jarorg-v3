"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Home,
  Plus,
  LogIn,
  User,
  Phone,
  BookOpen,
  Wrench,
  Menu,
  X,
  Sparkles,
  Camera,
  Calendar,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import MobileBottomNav from "@/components/MobileBottomNav";

export type AuthStatus = "guest" | "user" | "admin";

function useIsActive() {
  const pathname = usePathname();
  return useCallback(
    (href: string) => {
      if (href === "/") {
        return pathname === "/";
      }
      return pathname?.startsWith(href) ?? false;
    },
    [pathname]
  );
}

function useAuthStatus(initialAuth: AuthStatus) {
  const [auth, setAuth] = useState<AuthStatus>(initialAuth);

  useEffect(() => {
    setAuth(initialAuth);
  }, [initialAuth]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; role?: string | null }) => {
        if (cancelled) return;
        if (!data?.authenticated) {
          setAuth("guest");
          return;
        }
        setAuth(data.role === "admin" ? "admin" : "user");
      })
      .catch(() => {
        // Keep server-provided initialAuth on network failure.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return auth;
}

function desktopLinkClass(active: boolean) {
  return `relative px-3 py-1.5 text-xs font-bold transition-all duration-300 ease-out ${
    active
      ? "text-jar-primary font-black after:absolute after:bottom-[-2px] after:left-2 after:right-2 after:h-[2px] after:bg-jar-primary after:rounded-full"
      : "text-jar-muted hover:text-jar-primary"
  }`;
}

type NavbarProps = {
  initialAuth: AuthStatus;
};

export function Navbar({ initialAuth }: NavbarProps) {
  const pathname = usePathname();
  const isActive = useIsActive();
  const auth = useAuthStatus(initialAuth);
  const isLoggedIn = auth !== "guest";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (
    pathname &&
    (pathname.startsWith("/jaramooz") ||
      pathname.startsWith("/join") ||
      pathname.startsWith("/specialist") ||
      pathname.startsWith("/order") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/profile"))
  ) {
    return null;
  }

  const isLocationsHero = pathname === "/tools/locations";

  return (
    <>
      {/* 1. Floating Frosted Luxury Header (Claude Light Editorial Style) */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6" dir="rtl">
        <div
          className={`mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full px-4 sm:px-6 backdrop-blur-xl shadow-[0_2px_12px_rgba(31,30,29,0.04)] ${
            isLocationsHero
              ? "border border-white/30 bg-white/40 shadow-[0_8px_32px_rgba(20,20,19,0.12)]"
              : "border border-jar-border bg-jar-canvas/90 backdrop-blur-md"
          }`}
        >
          
          {/* Right: Brand Logo (Persian RTL Anchor) */}
          <div className="flex items-center gap-3">
            <BrandLogo variant="header" showWordmark />
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav
            className="hidden items-center justify-center gap-1 lg:flex"
            aria-label="ناوبری دسکتاپ"
          >
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              className={desktopLinkClass(isActive("/"))}
            >
              صفحه اصلی
            </Link>

            <Link
              href="/order"
              aria-current={isActive("/order") ? "page" : undefined}
              className={desktopLinkClass(isActive("/order"))}
            >
              ثبت سفارش
            </Link>

            <Link
              href="/jaramooz"
              aria-current={isActive("/jaramooz") ? "page" : undefined}
              className={desktopLinkClass(isActive("/jaramooz"))}
            >
              آکادمی آموزش
            </Link>

            <Link
              href="/contact"
              aria-current={isActive("/contact") ? "page" : undefined}
              className={desktopLinkClass(isActive("/contact"))}
            >
              تماس با ما
            </Link>

            <Link
              href="/tools"
              aria-current={isActive("/tools") ? "page" : undefined}
              className={desktopLinkClass(isActive("/tools"))}
            >
              ابزارها
            </Link>

            {auth === "admin" && (
              <Link
                href="/admin"
                aria-current={isActive("/admin") ? "page" : undefined}
                className={desktopLinkClass(isActive("/admin"))}
              >
                پنل مدیریت
              </Link>
            )}
          </nav>

          {/* Left: Actions, Profile, Terracotta CTA & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />

            {/* User Account / Profile */}
            {isLoggedIn ? (
              <Link
                href="/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 sm:px-4 text-xs font-bold text-jar-primary hover:bg-jar-soft transition-all shadow-2xs"
              >
                <User className="h-3.5 w-3.5 text-jar-primary" />
                <span>پروفایل</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3 sm:px-4 text-xs font-bold text-jar-primary hover:bg-jar-soft transition-all shadow-2xs"
              >
                <LogIn className="h-3.5 w-3.5 text-jar-muted" />
                <span>ورود</span>
              </Link>
            )}

            {/* Primary Jet-Black CTA: Book Project */}
            <Link
              href="/order"
              className="hidden md:inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white px-5 sm:px-6 text-xs sm:text-sm font-medium shadow-none transition-colors duration-200 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>ثبت سفارش</span>
            </Link>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 lg:hidden items-center justify-center rounded-full border border-jar-border bg-jar-surface text-jar-primary hover:bg-jar-canvas transition-all duration-300 ease-out active:scale-[0.98] cursor-pointer shrink-0"
              aria-label="منوی موبایل"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* 2. Mobile Drawer Navigation Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="fixed top-20 right-4 left-4 rounded-3xl border border-[#E5E0D8] bg-[#FAF9F5] p-6 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300 ease-out space-y-5"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-jar-border pb-3">
              <BrandLogo variant="header" showWordmark />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-jar-soft text-jar-muted hover:bg-stone-200 transition-colors"
                aria-label="بستن منو"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-colors ${
                  isActive("/") ? "bg-jar-primary/5 text-jar-primary font-black" : "text-jar-primary hover:bg-jar-soft"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Home className="h-4 w-4 text-jar-primary" />
                  <span>صفحه اصلی</span>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                href="/order"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-colors ${
                  isActive("/order") ? "bg-jar-primary/5 text-jar-primary font-black" : "text-jar-primary hover:bg-jar-soft"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-jar-primary" />
                  <span>ثبت سفارش عکاسی و فیلمبرداری</span>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                href="/jaramooz"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-colors ${
                  isActive("/jaramooz") ? "bg-jar-primary/5 text-jar-primary font-black" : "text-jar-primary hover:bg-jar-soft"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-jar-primary" />
                  <span>آکادمی آموزش (جارآموز)</span>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-jar-primary hover:bg-jar-soft transition-all duration-300 ease-out"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-jar-primary" />
                  <span>تماس و مشاوره رایگان</span>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                href="/tools"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-colors ${
                  isActive("/tools") ? "bg-jar-primary/5 text-jar-primary font-black" : "text-jar-primary hover:bg-jar-soft"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="h-4 w-4 text-jar-primary" />
                  <span>ابزارهای عکاسی</span>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              {isLoggedIn ? (
                <Link
                  href="/profile"
                  className="flex items-center justify-between px-4 py-3 rounded-full text-xs font-bold bg-jar-surface border border-jar-border text-jar-primary"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-jar-primary" />
                    <span>پروفایل</span>
                  </div>
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-between px-4 py-3 rounded-full text-xs font-bold bg-jar-surface border border-jar-border text-jar-primary"
                >
                  <div className="flex items-center gap-2.5">
                    <LogIn className="h-4 w-4 text-jar-muted" />
                    <span>ورود به حساب</span>
                  </div>
                  <ArrowLeft className="h-3.5 w-3.5 text-stone-400" />
                </Link>
              )}
            </nav>

            <div className="pt-2">
              <Link
                href="/order"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-xs font-medium shadow-none transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>ثبت سفارش عکاسی و فیلمبرداری</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav isLoggedIn={isLoggedIn} />
    </>
  );
}

const STANDALONE_PREFIXES = [
  "/order",
  "/jaramooz",
  "/admin",
  "/specialist",
  "/join",
  "/legal",
  "/profile",
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isStandalone = pathname
    ? STANDALONE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    : false;

  if (isStandalone) {
    return <div className="w-full min-h-dvh flex flex-col">{children}</div>;
  }

  /** جار لوکیشن: هیرو edge-to-edge زیر نوار؛ نقشه خودش fixed است */
  if (pathname === "/tools/locations") {
    return (
      <main className="relative w-full min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
        {children}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 sm:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+5rem)] md:pb-12 md:pt-[calc(env(safe-area-inset-top,0px)+6rem)]">
      {children}
    </main>
  );
}
