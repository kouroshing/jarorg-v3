import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { isAdminSession } from "@/lib/auth/admin";

// Paths that require a signed-in user.
const PROTECTED_PREFIXES = ["/profile", "/admin", "/order"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Always bypass middleware redirects/auth for Digital Asset Links (.well-known)
  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get("host")?.toLowerCase() || "";

  // Permanent redirect for jaramooz.ir domain
  if (hostHeader === "jaramooz.ir" || hostHeader === "www.jaramooz.ir") {
    return NextResponse.redirect("https://app.jarorg.ir/jaramooz", 301);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!session && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const target = pathname + (request.nextUrl.search || "");
    loginUrl.searchParams.set("redirect", target);
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
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/profile";
    try {
      const targetUrl = new URL(redirectTo, request.nextUrl.origin);
      return NextResponse.redirect(targetUrl);
    } catch {
      const fallbackUrl = request.nextUrl.clone();
      fallbackUrl.pathname = "/profile";
      fallbackUrl.search = "";
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|json)$).*)",
  ],
};
