"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Home, Plus, LogIn, User, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export type AuthStatus = "guest" | "user" | "admin";

const SUPPORT_TEL = "tel:02166468626";

type SessionResponse = {
  authenticated?: boolean;
  role?: string | null;
};

function parseSessionResponse(data: SessionResponse): AuthStatus {
  if (!data.authenticated) return "guest";
  if (data.role === "admin") return "admin";
  return "user";
}

function useAuthStatus(initialAuth: AuthStatus) {
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthStatus>(initialAuth);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await res.json()) as SessionResponse;
      setAuth(parseSessionResponse(data));
    } catch {
      setAuth("guest");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return auth;
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const desktopLinkBase =
  "inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200";

function desktopLinkClass(active: boolean) {
  return `${desktopLinkBase} ${
    active ? "font-semibold text-black" : "text-gray-600 hover:text-black"
  }`;
}

type NavbarProps = {
  initialAuth: AuthStatus;
};

export function Navbar({ initialAuth }: NavbarProps) {
  const isActive = useIsActive();
  const auth = useAuthStatus(initialAuth);
  const isLoggedIn = auth !== "guest";

  return (
    <>
      {/* Top bar — mobile: compact row; desktop: taller + horizontal nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 pt-[env(safe-area-inset-top,0px)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex h-11 w-full max-w-5xl flex-row items-center justify-between gap-3 px-4 md:h-14 md:gap-6 md:px-8">
          <BrandLogo variant="header" showWordmark />

          {/* Desktop navigation — hidden on mobile (bottom app bar instead) */}
          <nav
            className="hidden flex-1 items-center justify-center gap-6 md:flex"
            aria-label="ناوبری دسکتاپ"
          >
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              className={desktopLinkClass(isActive("/"))}
            >
              <Home className="h-[18px] w-[18px]" strokeWidth={2} />
              خانه
            </Link>

            <Link
              href="/create-project"
              aria-current={isActive("/create-project") ? "page" : undefined}
              className={desktopLinkClass(isActive("/create-project"))}
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
              ثبت پروژه
            </Link>

            {isLoggedIn ? (
              <Link
                href="/profile"
                aria-current={isActive("/profile") ? "page" : undefined}
                className={desktopLinkClass(isActive("/profile"))}
              >
                <User className="h-[18px] w-[18px]" strokeWidth={2} />
                پروفایل
              </Link>
            ) : (
              <Link
                href="/login"
                aria-current={isActive("/login") ? "page" : undefined}
                className={desktopLinkClass(isActive("/login"))}
              >
                <LogIn className="h-[18px] w-[18px]" strokeWidth={2} />
                ورود
              </Link>
            )}

            {auth === "admin" && (
              <Link
                href="/admin"
                aria-current={isActive("/admin") ? "page" : undefined}
                className={desktopLinkClass(isActive("/admin"))}
              >
                پنل
              </Link>
            )}
          </nav>

          <a
            href={SUPPORT_TEL}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-300 hover:text-black active:scale-95 md:h-9 md:gap-2 md:px-3.5"
            aria-label="تماس پشتیبانی — ۰۲۱۶۶۴۶۸۶۲۶"
          >
            <Phone
              className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]"
              strokeWidth={2}
            />
            <span className="text-[11px] font-semibold tracking-tight md:text-xs">
              پشتیبانی
            </span>
          </a>
        </div>
      </header>

      {/* Bottom app bar — mobile only */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90 md:hidden"
        aria-label="ناوبری موبایل"
      >
        <ul className="mx-auto flex h-16 max-w-md flex-row items-center justify-around px-4">
          <li>
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
                isActive("/")
                  ? "font-semibold text-black"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              <Home
                className="h-6 w-6"
                strokeWidth={isActive("/") ? 2.4 : 2}
              />
              <span>خانه</span>
            </Link>
          </li>

          <li className="relative -translate-y-5">
            <Link
              href="/create-project"
              aria-label="ثبت پروژه"
              aria-current={isActive("/create-project") ? "page" : undefined}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-jar-yellow text-black shadow-glow ring-4 ring-white transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </Link>
          </li>

          <li>
            {isLoggedIn ? (
              <Link
                href="/profile"
                aria-current={isActive("/profile") ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
                  isActive("/profile")
                    ? "font-semibold text-black"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                <User
                  className="h-6 w-6"
                  strokeWidth={isActive("/profile") ? 2.4 : 2}
                />
                <span>پروفایل</span>
              </Link>
            ) : (
              <Link
                href="/login"
                aria-current={isActive("/login") ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
                  isActive("/login")
                    ? "font-semibold text-black"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                <LogIn
                  className="h-6 w-6"
                  strokeWidth={isActive("/login") ? 2.4 : 2}
                />
                <span className="max-w-[4.5rem] truncate text-center leading-tight">
                  ورود
                </span>
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}
