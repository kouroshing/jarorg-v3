"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, LogIn, User, Wrench } from "lucide-react";

/**
 * Shared floating mobile bottom bar — same items/style on marketplace and profile shells.
 * Do not add role-specific tabs here; profile/specialist features live in-page.
 */
export default function MobileBottomNav({
  isLoggedIn = true,
}: {
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname() || "";

  const isHome = pathname === "/";
  const isOrder = pathname.startsWith("/order");
  const isTools = pathname.startsWith("/tools");
  const isProfile =
    pathname.startsWith("/profile") || pathname.startsWith("/specialist");

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-bold transition-all duration-300 ease-out ${
      active ? "text-jar-primary scale-105" : "text-jar-muted hover:text-jar-primary"
    }`;

  return (
    <nav
      className="fixed bottom-3 inset-x-4 z-40 md:hidden flex justify-center pointer-events-none"
      aria-label="منوی دسترسی سریع موبایل"
      dir="rtl"
    >
      <ul className="pointer-events-auto grid grid-cols-4 h-16 w-full max-w-md items-center rounded-full border border-jar-border bg-jar-canvas/90 px-2 py-1 shadow-[0_8px_30px_rgba(31,30,29,0.06)] backdrop-blur-xl pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
        <li className="flex justify-center">
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={itemClass(isHome)}
          >
            <Home className="h-5 w-5" strokeWidth={isHome ? 2.5 : 2} />
            <span>خانه</span>
          </Link>
        </li>

        <li className="flex justify-center">
          <Link
            href="/order"
            aria-current={isOrder ? "page" : undefined}
            className={itemClass(isOrder)}
          >
            <Briefcase className="h-5 w-5" strokeWidth={isOrder ? 2.5 : 2} />
            <span>ثبت سفارش</span>
          </Link>
        </li>

        <li className="flex justify-center">
          <Link
            href="/tools"
            aria-current={isTools ? "page" : undefined}
            className={itemClass(isTools)}
          >
            <Wrench className="h-5 w-5" strokeWidth={isTools ? 2.5 : 2} />
            <span>ابزارها</span>
          </Link>
        </li>

        <li className="flex justify-center">
          {isLoggedIn ? (
            <Link
              href="/profile"
              aria-current={isProfile ? "page" : undefined}
              className={itemClass(isProfile)}
            >
              <User className="h-5 w-5" strokeWidth={isProfile ? 2.5 : 2} />
              <span>پروفایل</span>
            </Link>
          ) : (
            <Link
              href="/login"
              aria-current={pathname.startsWith("/login") ? "page" : undefined}
              className={itemClass(pathname.startsWith("/login"))}
            >
              <LogIn className="h-5 w-5" strokeWidth={pathname.startsWith("/login") ? 2.5 : 2} />
              <span>ورود</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
