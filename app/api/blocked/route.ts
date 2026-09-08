import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Sink for `beforeFiles` rewrites in next.config.mjs. Requests for database
 * files under public/ land here instead of being served as static assets.
 * Returns a bare 404 so the path is indistinguishable from one that never existed.
 */
function notFound() {
  return new NextResponse(null, { status: 404 });
}

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
