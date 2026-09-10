import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DISABLED = NextResponse.json(
  { error: "فروش گالری در حال حاضر غیرفعال است." },
  { status: 410 }
);

export async function GET() {
  return DISABLED;
}

export async function POST() {
  return DISABLED;
}
