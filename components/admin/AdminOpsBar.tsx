"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  ClipboardList,
  Wallet,
  Settings2,
  BarChart3,
  MessageSquare,
  Shield,
} from "lucide-react";
import type { AdminPermission } from "@/lib/auth/adminPermissions";

const LINKS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: AdminPermission;
  match: (p: string) => boolean;
}> = [
  {
    href: "/admin",
    label: "کار امروز",
    icon: LayoutDashboard,
    permission: "dashboard",
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/review",
    label: "صف بررسی",
    icon: UserCheck,
    permission: "specialists_review",
    match: (p) => p.startsWith("/admin/review"),
  },
  {
    href: "/admin/message",
    label: "پیام جارچی",
    icon: MessageSquare,
    permission: "messages_send",
    match: (p) => p.startsWith("/admin/message"),
  },
  {
    href: "/admin/stats",
    label: "آمار",
    icon: BarChart3,
    permission: "stats_view",
    match: (p) => p.startsWith("/admin/stats"),
  },
  {
    href: "/admin/Order",
    label: "سفارش‌ها",
    icon: ClipboardList,
    permission: "orders_manage",
    match: (p) => p.startsWith("/admin/Order"),
  },
  {
    href: "/admin/WithdrawalRequest",
    label: "تسویه",
    icon: Wallet,
    permission: "finance_manage",
    match: (p) => p.startsWith("/admin/WithdrawalRequest"),
  },
  {
    href: "/admin/PwaSettings",
    label: "تنظیمات",
    icon: Settings2,
    permission: "settings_manage",
    match: (p) => p.startsWith("/admin/PwaSettings"),
  },
  {
    href: "/admin/staff",
    label: "ادمین‌ها",
    icon: Shield,
    permission: "admins_manage",
    match: (p) => p.startsWith("/admin/staff"),
  },
];

export default function AdminOpsBar({
  permissions,
  isSuper,
  label,
}: {
  permissions: AdminPermission[];
  isSuper: boolean;
  label?: string | null;
}) {
  const pathname = usePathname() || "";
  const allowed = new Set(permissions);

  const visible = LINKS.filter(
    (item) => isSuper || allowed.has(item.permission)
  );

  return (
    <div
      className="sticky top-0 z-[60] border-b border-slate-200 bg-white/95 backdrop-blur-md"
      dir="rtl"
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-3 py-2 sm:px-4">
        <span className="ml-2 shrink-0 text-[10px] font-black text-slate-400">
          {label || "عملیات"}
          {isSuper ? " · سوپر" : ""}
        </span>
        {visible.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
