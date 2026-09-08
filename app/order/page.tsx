import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import OrderFormClient from "./OrderFormClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت سفارش خدمات عکاسی و فیلمبرداری | پلتفرم جار",
  description: "ثبت سفارش آنلاین و سریع پروژه‌های عکاسی و فیلمبرداری با انتخاب بودجه دلخواه و برآورد آنی قیمت.",
};

interface OrderPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const session = await getSession();

  // Strict Guard: User must be signed in via OTP before accessing the booking wizard
  if (!session?.userId) {
    const resolvedParams = searchParams ? await searchParams : {};
    const query = new URLSearchParams();
    if (resolvedParams) {
      Object.entries(resolvedParams).forEach(([k, v]) => {
        if (typeof v === "string") query.set(k, v);
      });
    }
    const queryString = query.toString();
    const target = queryString ? `/order?${queryString}` : "/order";
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  let initialContactName = "";
  let initialContactPhone = "";

  if (session?.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true, phone: true },
      });

      if (user) {
        initialContactName = user.displayName || "";
        initialContactPhone = user.phone || session.phone || "";
      }
    } catch (e) {
      console.error("Error fetching user profile for order page:", e);
    }
  }

  return (
    <div className="jar-theme relative min-h-dvh w-full overflow-x-clip selection:bg-jar-primary/10 bg-jar-canvas text-jar-primary" dir="rtl">
      <Suspense
        fallback={
          <div className="flex h-[60vh] w-full items-center justify-center relative z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-jar-primary" />
              <span className="text-xs font-bold text-jar-muted">در حال بارگذاری فرم ثبت سفارش...</span>
            </div>
          </div>
        }
      >
        <OrderFormClient
          initialContactName={initialContactName}
          initialContactPhone={initialContactPhone}
          userId={session.userId}
        />
      </Suspense>
    </div>
  );
}
