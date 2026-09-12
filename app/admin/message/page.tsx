import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  hasAdminPermission,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import AdminMessageForm from "@/components/admin/AdminMessageForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ارسال پیام جارچی | پنل مدیریت جار",
};

export default async function AdminMessagePage() {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access || !hasAdminPermission(access, "messages_send")) {
    redirect("/admin");
  }

  return (
    <main className="px-3 sm:px-6 lg:px-8 py-6 pb-16">
      <AdminMessageForm />
    </main>
  );
}
