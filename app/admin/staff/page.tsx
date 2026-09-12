import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import AdminStaffManager from "@/components/admin/AdminStaffManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مدیریت ادمین‌ها | پنل جار",
};

export default async function AdminStaffPage() {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "admins_manage")) {
    redirect("/admin");
  }

  return (
    <main className="px-3 sm:px-6 lg:px-8 py-6 pb-16">
      <AdminStaffManager />
    </main>
  );
}
