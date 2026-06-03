import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Lightweight endpoint for client components (e.g. Navbar) to read auth state. */
export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    {
      authenticated: !!session,
      role: session?.role ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
