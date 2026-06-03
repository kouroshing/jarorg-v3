import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Users, FolderKanban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { normalizeStatus } from "@/lib/projects/status";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isAdminSession(session)) {
    redirect("/");
  }

  let pendingCount = 0;
  let totalCount = 0;
  let fetchError = false;

  try {
    const projects = await prisma.project.findMany({
      select: { status: true },
    });
    totalCount = projects.length;
    pendingCount = projects.filter(
      (p) => normalizeStatus(p.status) === "PENDING"
    ).length;
  } catch {
    fetchError = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
          پنل مدیریت جار
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          مدیریت لیدها، پروژه‌ها و متخصصان
        </p>
      </header>

      {fetchError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          خطا در اتصال به دیتابیس. `DATABASE_URL` و `npx prisma db push` را بررسی
          کنید.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/projects"
            className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-jar-yellow/20 text-black">
              <FolderKanban className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">
              پروژه‌ها / لیدها
            </span>
            <span className="mt-1 text-sm text-gray-500">
              {totalCount} درخواست ثبت‌شده
            </span>
            <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#FACC15]/40 bg-[#FACC15] px-3 py-1 text-xs font-bold text-black">
              <Inbox className="h-3.5 w-3.5" />
              {pendingCount} در انتظار بررسی
            </span>
          </Link>

          <Link
            href="/admin/experts"
            className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-700">
              <Users className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-base font-bold text-black">متخصصان</span>
            <span className="mt-1 text-sm text-gray-500">
              مدیریت نمایش در سایت
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
