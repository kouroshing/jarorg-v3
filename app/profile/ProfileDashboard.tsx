"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Clock,
  ArrowLeft,
  Briefcase,
  ChevronLeft,
  Sparkles,
  Download,
  MapPin,
  Banknote,
  RotateCcw,
  ExternalLink,
  Settings,
  CheckCircle2,
} from "lucide-react";
import {
  PROFILE_SERVICE_LABELS,
  type ProfileUser,
} from "@/lib/profile/types";
import CancelOrderButton from "@/components/order/CancelOrderButton";
import { isClientCancellable } from "@/lib/orders/status";

type SubTabId = "active" | "history";

export function ProfileDashboard({
  user,
  projects = [],
  isSpecialistUser = false,
  specialistContinueHref = null,
  showPanelSwitcherHint = false,
}: {
  user: ProfileUser;
  projects: any[];
  isSpecialistUser?: boolean;
  /** Resume incomplete onboarding or open specialist app. */
  specialistContinueHref?: string | null;
  /** Soft CTA when specialist tab is locked in the header switcher. */
  showPanelSwitcherHint?: boolean;
}) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("active");

  const displayName = user.displayName || "کاربر جار";
  const specialistHref =
    specialistContinueHref || (isSpecialistUser ? "/specialist/projects" : null);

  const activeProjects = projects.filter(
    (p) =>
      p.status !== "delivered" &&
      p.status !== "COMPLETED" &&
      p.status !== "CANCELLED" &&
      !p.googleDriveFolderId
  );

  const historyProjects = projects.filter(
    (p) =>
      p.status === "delivered" ||
      p.status === "COMPLETED" ||
      p.status === "CANCELLED" ||
      !!p.googleDriveFolderId
  );

  return (
    <div className="mx-auto w-full max-w-2xl pb-4">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-50 ring-2 ring-neutral-200 border border-neutral-200">
            <User className="h-7 w-7 text-neutral-400" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-neutral-900">{displayName}</h1>
            <p className="mt-0.5 text-xs text-neutral-500 font-mono" dir="ltr">
              {user.phoneDisplay}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">عضو جار از {user.memberSince}</p>
          </div>
        </div>

        <Link
          href="/profile/edit"
          className="flex h-10 px-4 shrink-0 items-center justify-center gap-1.5 rounded-full border border-neutral-200 text-xs font-medium text-neutral-800 bg-white hover:bg-neutral-50 transition-colors shadow-sm"
          title="ویرایش مشخصات"
        >
          <Settings className="h-4 w-4 text-neutral-500" />
          ویرایش
        </Link>
      </header>

      {/* Locked specialist: nudge toward verification via the same destination as the switcher */}
      {showPanelSwitcherHint && (
        <Link
          href="/specialist/onboarding/profile"
          className="mt-6 flex items-center justify-between rounded-2xl bg-neutral-50 p-4 transition-colors duration-200 hover:border-neutral-400 border border-neutral-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-700">
              <Briefcase className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <h4 className="text-sm font-black text-neutral-900">فعال‌سازی پنل متخصص</h4>
              <p className="mt-1 text-xs font-medium text-neutral-500 leading-relaxed">
                از سوئیچ بالای صفحه یا از اینجا احراز هویت و ثبت‌نام متخصص را شروع کنید.
              </p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5 text-neutral-400 shrink-0" />
        </Link>
      )}

      {specialistHref && !showPanelSwitcherHint && !isSpecialistUser && (
        <Link
          href={specialistHref}
          className="mt-6 flex items-center justify-between rounded-2xl bg-neutral-50 p-4 transition-colors duration-200 hover:border-neutral-400 border border-neutral-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-700">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <h4 className="text-sm font-bold text-neutral-900">ادامه ثبت‌نام متخصص</h4>
              <p className="mt-1 text-xs font-medium text-neutral-500 leading-relaxed">
                ثبت‌نام را تمام نکرده‌اید — از همین‌جا ادامه دهید.
              </p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5 text-neutral-400 shrink-0" />
        </Link>
      )}

      <div className="mt-8 space-y-8">
        <div className="space-y-4">
          <nav className="flex border border-neutral-200 bg-neutral-50 p-1 rounded-full">
            <button
              type="button"
              onClick={() => setActiveSubTab("active")}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-full transition-all ${
                activeSubTab === "active"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              پروژه‌های پیش رو
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("history")}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-full transition-all ${
                activeSubTab === "history"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              تاریخچه سفارش‌ها
            </button>
          </nav>

          {activeSubTab === "active" && (
            <ProjectList projects={activeProjects} tab="active" />
          )}
          {activeSubTab === "history" && (
            <ProjectList projects={historyProjects} tab="history" />
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectList({ projects = [], tab }: { projects: any[]; tab: SubTabId }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-jar-border bg-jar-surface p-10 text-center shadow-xs">
        <Briefcase className="mx-auto h-9 w-9 text-jar-muted/60" />
        <p className="mt-4 text-sm font-medium text-jar-muted">
          {tab === "active"
            ? "هنوز پروژه‌ای ثبت نکرده‌اید."
            : "تاریخچه سفارشی یافت نشد."}
        </p>
        {tab === "active" && (
          <Link
            href="/order"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover px-8 py-3 text-sm font-medium text-white shadow-none transition-colors active:scale-95"
          >
            ثبت اولین سفارش
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {projects.map((project) => {
        const service = PROFILE_SERVICE_LABELS[project.serviceType] ?? project.serviceType;
        const formattedBudget =
          project.budget && !isNaN(Number(project.budget))
            ? `${Number(project.budget).toLocaleString("fa-IR")} تومان`
            : project.budget;
        const detailHref = project.orderUrl || null;

        return (
          <li
            key={project.id}
            className="bg-jar-surface border border-jar-border rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs hover:border-jar-primary/40 transition-colors duration-200 overflow-hidden min-w-0"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {project.expert?.imageUrl ? (
                  <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-jar-border">
                    <img
                      src={project.expert.imageUrl}
                      alt={project.expert.name}
                      className="object-cover h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-jar-logo/10 border border-jar-logo/20 flex items-center justify-center text-jar-logo font-bold text-xs">
                    J
                  </div>
                )}
                <div className="text-right min-w-0">
                  {project.expert ? (
                    project.expert.profileHref ? (
                      <Link
                        href={project.expert.profileHref}
                        className="text-sm font-bold text-jar-primary hover:text-jar-logo flex items-center gap-1"
                      >
                        {project.expert.name}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-jar-primary">
                        {project.expert.name}
                      </span>
                    )
                  ) : (
                    <span className="text-sm font-bold text-jar-primary">
                      در انتظار تخصیص متخصص
                    </span>
                  )}
                  <span className="text-xs font-medium text-jar-muted block mt-0.5">
                    {service} • {project.city}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1 rounded-xl bg-jar-canvas border border-jar-border px-2.5 py-1.5 text-xs font-bold text-jar-primary">
                <Banknote className="h-3.5 w-3.5 text-jar-muted" />
                {formattedBudget}
              </div>
            </div>

            <div className="h-px bg-jar-border w-full" />

            <div className="text-right min-w-0 w-full overflow-hidden">
              {tab === "active" ? (
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-jar-muted">
                    <MapPin className="h-4 w-4 text-jar-muted/70 shrink-0" />
                    <span className="min-w-0 break-words">
                      موقعیت مکانی سفارش: {project.city}
                    </span>
                  </div>
                  {project.preferredCallTime && (
                    <div className="flex items-center gap-2 text-xs font-medium text-jar-muted">
                      <Clock className="h-4 w-4 text-jar-muted/70 shrink-0" />
                      <span className="min-w-0 break-words">
                        {project.orderUrl
                          ? project.isFlexibleSchedule
                            ? "زمان‌بندی: "
                            : "زمان عکاسی: "
                          : "زمان ترجیحی تماس: "}
                        {project.preferredCallTime}
                      </span>
                    </div>
                  )}
                  {project.brief && (
                    <p className="text-xs leading-relaxed text-jar-muted font-normal bg-jar-canvas p-3 rounded-xl border border-dashed border-jar-border mt-2 min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word]">
                      <span className="font-bold text-jar-primary">توضیحات درخواست: </span>
                      {project.brief}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-jar-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    فایل‌های نهایی پروژه با موفقیت تحویل داده شده است.
                  </div>

                  {project.thumbnails && project.thumbnails.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 mt-1.5">
                      {project.thumbnails.map((thumbUrl: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-jar-border"
                        >
                          <img
                            src={thumbUrl.replace(/=s\d+/, "=s200")}
                            alt={`پیش‌نمایش تصویر تحویل داده شده ${idx + 1}`}
                            className="object-cover h-full w-full"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-jar-muted font-medium bg-jar-canvas p-3 rounded-xl border border-jar-border">
                      تصاویر در پوشه پروژه بارگذاری شده‌اند.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-jar-border w-full" />

            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3 w-full">
                {tab === "active" ? (
                  detailHref ? (
                    <Link
                      href={detailHref}
                      className="flex-1 flex h-10 items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-xs font-bold transition-colors shadow-xs active:scale-98"
                    >
                      <Clock className="h-3.5 w-3.5 text-jar-logo" />
                      <span>مشاهده و رهگیری سفارش</span>
                    </Link>
                  ) : (
                    <Link
                      href="/order"
                      className="flex-1 flex h-10 items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      ثبت سفارش جدید
                    </Link>
                  )
                ) : (
                  <>
                    {project.expert?.profileHref && (
                      <Link
                        href={project.expert.profileHref}
                        className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-jar-border text-xs font-medium text-jar-primary bg-jar-surface hover:bg-jar-soft transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        مشاهده پروفایل متخصص
                      </Link>
                    )}
                    {detailHref ? (
                      <Link
                        href={detailHref}
                        className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-xs font-medium transition-colors shadow-none"
                      >
                        <Download className="h-3.5 w-3.5" />
                        جزئیات سفارش
                      </Link>
                    ) : project.googleDriveFolderId ? (
                      <Link
                        href={`/orders/${project.id}/download`}
                        className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white text-xs font-medium transition-colors shadow-none"
                      >
                        <Download className="h-3.5 w-3.5" />
                        ورود به صفحه دانلود
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
              {tab === "active" &&
                detailHref &&
                isClientCancellable(project.status) && (
                  <CancelOrderButton
                    orderId={project.id}
                    orderStatus={project.status}
                    isOwnerOrAdmin
                  />
                )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
