import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { getAdminProjects } from "@/app/actions/projectActions";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { ProjectsLeadBoard } from "./ProjectsLeadBoard";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const session = await getSession();
  if (!session || !isAdminSession(session)) {
    redirect("/");
  }

  const result = await getAdminProjects();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8 space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-black"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          بازگشت به پنل
        </Link>

        <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
          <Inbox className="h-3.5 w-3.5" />
          مدیریت لیدها
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
          پروژه‌ها و لیدها
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          پیگیری درخواست‌ها، وضعیت و یادداشت‌های داخلی
        </p>
        </div>
      </header>

      {!result.success ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          {result.error}
        </p>
      ) : (
        <ProjectsLeadBoard initialProjects={result.projects} />
      )}
    </div>
  );
}
