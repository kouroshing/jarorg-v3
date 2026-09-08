import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Development admin login has been completely disabled for security.
 * All admin access requires authenticating through standard /login with real OTP.
 */
export async function GET() {
  return NextResponse.json({ error: "Endpoint disabled" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Endpoint disabled" }, { status: 404 });
}
