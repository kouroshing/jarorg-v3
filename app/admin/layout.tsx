import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { resolveAdminAccess } from "@/lib/auth/adminAccess";
import type { AdminPermission } from "@/lib/auth/adminPermissions";
import AdminOpsBar from "@/components/admin/AdminOpsBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/admin");
  }

  // Authoritative DB check — JWT role alone is not enough (revoked staff).
  const access = await resolveAdminAccess(session);
  if (!access) {
    redirect("/");
  }

  const permissions = Array.from(access.permissions) as AdminPermission[];

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <AdminOpsBar
        permissions={permissions}
        isSuper={access.isSuper}
        label={access.label}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        html, body, .next-admin__root {
          color-scheme: light !important;
        }
        [dir=rtl] .next-admin__root {
          direction: rtl;
          text-align: right;
        }
        [dir=rtl] .next-admin__root .lg\\:fixed.lg\\:w-72 {
          right: 0 !important;
          left: auto !important;
        }
        [dir=rtl] .next-admin__root .lg\\:fixed.lg\\:w-72 .border-r {
          border-right-width: 0 !important;
          border-left-width: 1px !important;
          border-left-color: var(--next-admin-border-default, #e2e8f0) !important;
        }
        [dir=rtl] .next-admin__root main.lg\\:pl-72,
        [dir=rtl] .next-admin__root main {
          max-width: 100%;
          overflow-x: hidden;
          padding-left: 0 !important;
          padding-right: 18rem !important;
          text-align: right;
        }
        @media (max-width: 1023px) {
          [dir=rtl] .next-admin__root main.lg\\:pl-72,
          [dir=rtl] .next-admin__root main {
            padding-right: 0 !important;
            padding-left: 0 !important;
          }
        }
        [dir=rtl] .next-admin__root [role=dialog] .relative.mr-16 {
          margin-right: 0 !important;
          margin-left: 4rem !important;
        }
        [dir=rtl] .next-admin__root [role=dialog] .absolute.left-full {
          left: auto !important;
          right: 100% !important;
        }
        [dir=rtl] .next-admin__root table th,
        [dir=rtl] .next-admin__root table td {
          text-align: right !important;
          padding-top: 0.85rem !important;
          padding-bottom: 0.85rem !important;
          vertical-align: middle;
        }
        [dir=rtl] .next-admin__root table tbody tr:hover {
          background-color: #f8fafc !important;
        }
        [dir=rtl] .next-admin__root nav ul .-ml-2 {
          margin-left: 0 !important;
          margin-right: -0.5rem !important;
        }
        [dir=rtl] .next-admin__root input,
        [dir=rtl] .next-admin__root select,
        [dir=rtl] .next-admin__root textarea,
        [dir=rtl] .next-admin__root form label {
          text-align: right;
        }
      `,
        }}
      />
      {children}
    </div>
  );
}
