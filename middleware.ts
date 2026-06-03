import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { isAdminSession } from "@/lib/auth/admin";

const LEGACY_APP_HOST = "app.jarorg.ir";
const CANONICAL_ORIGIN = "https://jarorg.ir";

// Paths that require a signed-in user.
const PROTECTED_PREFIXES = ["/profile", "/admin"];

export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();

  if (hostname === LEGACY_APP_HOST) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      CANONICAL_ORIGIN
    );
    return NextResponse.redirect(destination, 308);
  }

  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!session && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (session && isAdminArea && !isAdminSession(session)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get("redirect") || "/profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
