"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FolderKanban,
  FileDown,
  Settings,
  Download,
  User,
  Phone,
  Clock,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { updateUserDisplayName } from "@/app/actions/profileActions";
import { getCustomerStatus } from "@/lib/projects/customer-status";
import {
  projectTitle,
  PROFILE_SERVICE_LABELS,
  type ProfileProject,
  type ProfileUser,
} from "@/lib/profile/types";

type TabId = "projects" | "deliverables" | "settings";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "projects", label: "پروژه‌های من", icon: FolderKanban },
  { id: "deliverables", label: "گاوصندوق فایل‌ها", icon: FileDown },
  { id: "settings", label: "تنظیمات", icon: Settings },
];

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
});

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#FACC15]";

export function ProfileDashboard({
  user,
  projects,
}: {
  user: ProfileUser;
  projects: ProfileProject[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("projects");

  const displayName = user.displayName || "کاربر جار";
  const completedProjects = projects.filter((p) => p.status === "COMPLETED");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-2 ring-jar-yellow/40">
          <User className="h-7 w-7 text-gray-400" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-black">
            {displayName}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500" dir="ltr">
            {user.phoneDisplay}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            عضو جار از {user.memberSince}
          </p>
        </div>
      </header>

      <nav
        className="mt-8 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50 p-1.5"
        role="tablist"
        aria-label="بخش‌های داشبورد"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                active
                  ? "bg-jar-yellow text-black shadow-glow"
                  : "text-gray-500 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div key={activeTab} className="mt-6 animate-fade-step">
        {activeTab === "projects" && (
          <ProjectsTab projects={projects} />
        )}
        {activeTab === "deliverables" && (
          <DeliverablesTab completed={completedProjects} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            phoneDisplay={user.phoneDisplay}
            initialName={user.displayName ?? ""}
          />
        )}
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function ProjectsTab({ projects }: { projects: ProfileProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <FolderKanban className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm text-gray-600">
          هنوز درخواستی ثبت نکرده‌اید.
        </p>
        <Link
          href="/create-project"
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-jar-yellow px-8 py-3.5 text-sm font-bold text-black shadow-glow transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          درخواست مشاوره و ثبت پروژه
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {projects.map((project) => {
        const status = getCustomerStatus(project.status);
        const title = projectTitle(project);
        const service =
          PROFILE_SERVICE_LABELS[project.serviceType] ?? project.serviceType;

        return (
          <li key={project.id}>
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-black">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">{service}</p>
                  {project.brief && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {project.brief}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(project.createdAt)}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function DeliverablesTab({
  completed,
}: {
  completed: ProfileProject[];
}) {
  if (completed.length === 0) {
    return (
      <Card className="flex flex-col items-center py-10 text-center">
        <FileDown className="h-10 w-10 text-gray-300" />
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
          فایل‌های نهایی پروژه‌های شما پس از تکمیل، به صورت امن در اینجا قرار
          می‌گیرند.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {completed.map((project) => (
        <li key={project.id}>
          <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-700">
                    آماده دانلود
                  </p>
                  <h3 className="mt-1 text-base font-bold text-black">
                    {projectTitle(project)}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {PROFILE_SERVICE_LABELS[project.serviceType] ??
                      project.serviceType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-jar-yellow px-6 py-3 text-sm font-bold text-black shadow-glow transition-transform duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Download className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                دانلود فایل‌های نهایی
              </button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function SettingsTab({
  phoneDisplay,
  initialName,
}: {
  phoneDisplay: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserDisplayName(name);
      if (result.success) {
        setMessage("success");
      } else {
        setMessage(result.error);
      }
    });
  };

  return (
    <Card className="space-y-5">
      <div>
        <span className="mb-2 block text-sm font-medium text-black">
          شماره موبایل
        </span>
        <div
          className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-100 px-4 py-3 text-sm text-gray-600"
          dir="ltr"
        >
          <Phone className="h-4 w-4 shrink-0 text-gray-400" />
          {phoneDisplay}
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          شماره موبایل از حساب شما خوانده می‌شود و قابل تغییر نیست.
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-black">
          نام و نام خانوادگی
        </span>
        <div className="relative">
          <User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setMessage(null);
            }}
            placeholder="نام و نام خانوادگی"
            className={`${inputClasses} pr-11`}
          />
        </div>
      </label>

      {message === "success" && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          ذخیره شد
        </p>
      )}
      {message && message !== "success" && (
        <p className="text-sm text-red-600">{message}</p>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-jar-yellow px-6 py-2.5 text-sm font-bold text-black shadow-glow transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              در حال ذخیره...
              <Loader2 className="h-4 w-4 animate-spin" />
            </>
          ) : (
            "ذخیره تغییرات"
          )}
        </button>
      </div>
    </Card>
  );
}
