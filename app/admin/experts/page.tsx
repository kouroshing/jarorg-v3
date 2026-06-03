import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { getExperts } from "@/app/actions/expertActions";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { ExpertsManager } from "./ExpertsManager";

export const dynamic = "force-dynamic";

export default async function AdminExpertsPage() {
  const session = await getSession();
  if (!session || !isAdminSession(session)) {
    redirect("/");
  }

  const result = await getExperts();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-black"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          بازگشت به پنل
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              <Users className="h-3.5 w-3.5" />
              مدیریت متخصصان
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
              متخصصان جار
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              افزودن، ویرایش و فعال‌سازی نمایش متخصصین در سایت
            </p>
          </div>
        </div>
      </header>

      {!result.success ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          {result.error}
        </p>
      ) : (
        <ExpertsManager initialExperts={result.experts} />
      )}
    </div>
  );
}
