import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Mock payment bypass route is strictly disabled in production.
 * In development, it requires explicit developer authorization flag.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_TEST_LOGIN !== "true") {
    return NextResponse.json(
      { error: "شبیه‌ساز پرداخت در این محیط غیرفعال است." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: "پرداخت تستی غیرفعال است. لطفاً از فرآیند استاندارد استفاده کنید." },
    { status: 400 }
  );
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
