"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  User,
  Clock,
  ArrowLeft,
  Briefcase,
  ChevronLeft,
  Sparkles,
  Download,
  AlertCircle,
  MapPin,
  Banknote,
  RotateCcw,
  ExternalLink,
  Settings,
  CheckCircle2
} from "lucide-react";
import { getCustomerStatus } from "@/lib/projects/customer-status";
import {
  projectTitle,
  PROFILE_SERVICE_LABELS,
  type ProfileUser,
} from "@/lib/profile/types";

type SubTabId = "active" | "history";

type GalleryPurchaseType = {
  id: string;
  createdAt: string;
  projectName: string;
  photoCount: number;
  amount: number;
  authority: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
});

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function ProfileDashboard({
  user,
  projects = [],
  purchases = [],
  isSpecialistUser = false,
}: {
  user: ProfileUser;
  projects: any[];
  purchases?: GalleryPurchaseType[];
  isSpecialistUser?: boolean;
}) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("active");

  const displayName = user.displayName || "کاربر جار";

  // Filter projects by Snapp Trips logic (Active/Pending vs Completed/Delivered/Archived)
  const activeProjects = projects.filter(
    (p) => p.status !== "delivered" && p.status !== "COMPLETED" && !p.googleDriveFolderId
  );

  const historyProjects = projects.filter(
    (p) => p.status === "delivered" || p.status === "COMPLETED" || !!p.googleDriveFolderId
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20">
      {isSpecialistUser && (
        <div className="mb-6 flex justify-end">
          <Link
            href="/profile"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#141413] hover:bg-[#282725] px-4 text-xs font-medium text-white transition-colors shadow-none"
          >
            سوییچ به پنل متخصص
          </Link>
        </div>
      )}
      
      {/* Header Profile Info */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-[#CC785C]/30 border border-[#E5E0D8]">
            <User className="h-7 w-7 text-[#66605B]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-[#141413]">
              {displayName}
            </h1>
            <p className="mt-0.5 text-xs text-[#66605B] font-mono" dir="ltr">
              {user.phoneDisplay}
            </p>
            <p className="mt-0.5 text-[10px] text-[#A8A29A]">
              عضو جار از {user.memberSince}
            </p>
          </div>
        </div>

        {/* Edit profile link in header */}
        <Link
          href="/profile/edit"
          className="flex h-10 px-4 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#E5E0D8] text-xs font-medium text-[#141413] bg-white hover:bg-[#F3F1EC] transition-colors shadow-xs"
          title="ویرایش مشخصات"
        >
          <Settings className="h-4 w-4 text-[#66605B]" />
          ویرایش مشخصات
        </Link>
      </header>
      
      {/* Specialist Panel Link */}
      {isSpecialistUser ? (
        <Link
          href="/profile"
          className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4 transition-colors duration-200 hover:border-[#141413]/40 border border-[#E5E0D8] shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C]">
              <Sparkles className="h-5 w-5 fill-[#CC785C]/10" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-[#141413]">ورود به داشبورد متخصص</h4>
              <p className="mt-1 text-[9px] font-medium text-[#66605B] leading-relaxed">
                دسترسی سریع به گالری شاتی، کیف پول، فایل منیجر و تنظیمات متخصص...
              </p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5 text-[#66605B] shrink-0" />
        </Link>
      ) : (
        <div
          className="mt-6 flex items-center justify-between rounded-2xl bg-gray-50/50 p-4 border border-gray-150 opacity-50 pointer-events-none cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-150 text-gray-400">
              <Briefcase className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <h4 className="text-xs font-black text-black">💼 ثبت‌نام متخصصین (موقتاً غیرفعال)</h4>
              <p className="mt-1 text-[9px] font-bold text-gray-405 leading-relaxed">
                دسترسی به ابزارهای کاری، مدیریت پروژه‌ها و درآمد.
              </p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5 text-gray-300 shrink-0" />
        </div>
      )}

      {/* Main Body: My Orders only */}
      <div className="mt-8 space-y-8">
        
        {/* Snapp Trips UI nested sub-tabs */}
        <div className="space-y-4">
          <nav className="flex border border-[#E5E0D8] bg-[#FAF9F5] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setActiveSubTab("active")}
              className={`flex-1 text-center py-2 text-[10px] font-bold rounded-full transition-all ${
                activeSubTab === "active"
                  ? "bg-[#141413] text-white shadow-xs"
                  : "text-[#66605B] hover:text-[#141413]"
              }`}
            >
              پروژه‌های پیش رو
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("history")}
              className={`flex-1 text-center py-2 text-[10px] font-bold rounded-full transition-all ${
                activeSubTab === "history"
                  ? "bg-[#141413] text-white shadow-xs"
                  : "text-[#66605B] hover:text-[#141413]"
              }`}
            >
              تاریخچه سفارش‌ها
            </button>
          </nav>

          {/* Render project list based on sub-tab */}
          {activeSubTab === "active" && (
            <ProjectList projects={activeProjects} tab="active" />
          )}
          {activeSubTab === "history" && (
            <ProjectList projects={historyProjects} tab="history" />
          )}
        </div>

        {/* Gallery Purchases section below */}
        <div className="space-y-4 pt-4 border-t border-[#E5E0D8]">
          <h3 className="text-xs font-black text-[#141413] flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#CC785C] fill-[#CC785C]" />
            آلبوم‌های خریداری‌شده (گالری شاتی)
          </h3>

          {purchases.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-8 text-center flex flex-col items-center justify-center gap-4">
              <span className="text-xs font-medium text-[#66605B]">هنوز آلبومی خریداری نکرده‌اید.</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className="rounded-2xl border border-[#E5E0D8] bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition hover:border-[#141413]/40 shadow-xs"
                >
                  <div className="text-right space-y-1">
                    <h4 className="text-sm font-bold text-[#141413]">
                      {purchase.projectName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-[#66605B]">
                      <span>تعداد: {purchase.photoCount} عکس</span>
                      <span>مبلغ: {purchase.amount.toLocaleString("fa-IR")} تومان</span>
                      <span>تاریخ: {formatDate(purchase.createdAt)}</span>
                    </div>
                  </div>

                  {purchase.authority ? (
                    <Link
                      href={`/gallery/success?authority=${purchase.authority}`}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[#141413] hover:bg-[#282725] text-white px-5 text-xs font-medium transition-colors active:scale-95 text-center shadow-none"
                    >
                      <Download className="h-3.5 w-3.5" />
                      مشاهده و دانلود عکس‌ها
                    </Link>
                  ) : (
                    <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="h-4.5 w-4.5" />
                      عدم یافت توکن پرداخت
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

function ProjectList({ projects = [], tab }: { projects: any[]; tab: SubTabId }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E5E0D8] bg-white p-10 text-center shadow-xs">
        <Briefcase className="mx-auto h-9 w-9 text-[#A8A29A] animate-pulse" />
        <p className="mt-4 text-xs font-medium text-[#66605B]">
          {tab === "active" ? "پروژه در حال اجرا یا پیش رویی ثبت نشده است." : "تاریخچه سفارشی یافت نشد."}
        </p>
        {tab === "active" && (
          <Link
            href="/order"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#141413] hover:bg-[#282725] px-8 py-3 text-xs font-medium text-white shadow-none transition-colors active:scale-95"
          >
            ثبت سفارش پروژه جدید
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {projects.map((project) => {
        const title = projectTitle(project);
        const service = PROFILE_SERVICE_LABELS[project.serviceType] ?? project.serviceType;
        const formattedBudget =
          project.budget && !isNaN(Number(project.budget))
            ? `${Number(project.budget).toLocaleString("fa-IR")} تومان`
            : project.budget;

        return (
          <li
            key={project.id}
            className="bg-white border border-[#E5E0D8] rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs hover:border-[#141413]/40 transition-colors duration-200"
          >
            {/* Header: Specialist info & budget */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {project.expert?.imageUrl ? (
                  <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-[#E5E0D8]">
                    <img
                      src={project.expert.imageUrl}
                      alt={project.expert.name}
                      className="object-cover h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 flex items-center justify-center text-[#CC785C] font-bold text-xs">
                    J
                  </div>
                )}
                <div className="text-right min-w-0">
                  {project.expert ? (
                    <Link
                      href={`/experts/${project.expert.id}`}
                      className="text-xs sm:text-sm font-bold text-[#141413] hover:text-[#CC785C] flex items-center gap-1"
                    >
                      {project.expert.name}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-[#141413]">
                      در انتظار تخصیص متخصص
                    </span>
                  )}
                  <span className="text-[9px] font-medium text-[#66605B] block mt-0.5">
                    {service} • {project.city}
                  </span>
                </div>
              </div>

              {/* Budget Badge */}
              <div className="shrink-0 flex items-center gap-1 rounded-xl bg-[#FAF9F5] border border-[#E5E0D8] px-2.5 py-1.5 text-[9px] font-bold text-[#141413]">
                <Banknote className="h-3.5 w-3.5 text-[#66605B]" />
                {formattedBudget}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E0D8] w-full" />

            {/* Middle: Locations / Time vs Thumbnails Grid */}
            <div className="text-right">
              {tab === "active" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-[#66605B]">
                    <MapPin className="h-4 w-4 text-[#A8A29A]" />
                    <span>موقعیت مکانی سفارش: {project.city}</span>
                  </div>
                  {project.preferredCallTime && (
                    <div className="flex items-center gap-2 text-[10px] font-medium text-[#66605B]">
                      <Clock className="h-4 w-4 text-[#A8A29A]" />
                      <span>زمان ترجیحی تماس: {project.preferredCallTime}</span>
                    </div>
                  )}
                  {project.brief && (
                    <p className="text-[10px] leading-relaxed text-[#66605B] font-normal bg-[#FAF9F5] p-3 rounded-xl border border-dashed border-[#E5E0D8] mt-2">
                      توضیحات درخواست: {project.brief}
                    </p>
                  )}

                  {project.orderUrl && (
                    <div className="mt-2 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#CC785C]/10 border border-[#CC785C]/25 text-xs text-[#CC785C] font-bold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 animate-pulse shrink-0 text-[#CC785C]" />
                        <span className="text-[11px]">در صف بررسی کارشناسان (مهلت هماهنگی ۷۲ ساعت)</span>
                      </div>
                      <span className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-[#CC785C]/30 text-[#141413] font-bold">
                        در حال پیگیری
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-[#141413] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    فایل‌های نهایی پروژه با موفقیت تحویل داده شده است.
                  </div>
                  
                  {/* Thumbnails grid */}
                  {project.thumbnails && project.thumbnails.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 mt-1.5">
                      {project.thumbnails.map((thumbUrl: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-[#E5E0D8]"
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
                    <div className="text-[9px] text-[#66605B] font-medium bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E0D8]">
                      تصاویر در پوشه پروژه بارگذاری شده‌اند. جهت دسترسی روی دکمه ورود به صفحه دانلود کلیک کنید.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E0D8] w-full" />

            {/* Footer Action Buttons */}
            <div className="flex items-center gap-3 w-full">
              {tab === "active" ? (
                <>
                  {project.orderUrl ? (
                    <Link
                      href={project.orderUrl}
                      className="flex-1 flex h-10 items-center justify-center gap-2 rounded-full bg-[#141413] hover:bg-[#282725] text-white text-[11px] font-bold transition-colors shadow-xs active:scale-98"
                    >
                      <Clock className="h-3.5 w-3.5 text-[#CC785C]" />
                      <span>مشاهده صفحه انتظار و رهگیری (مهلت ۷۲ ساعت)</span>
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled
                        className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E5E0D8] text-[#A8A29A] bg-[#FAF9F5] cursor-not-allowed opacity-60 pointer-events-none text-[10px] font-medium"
                      >
                        💬 چت (به‌زودی)
                      </button>
                      <button
                        type="button"
                        onClick={() => alert("نمایش مسیر و جزئیات آفیش...")}
                        className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#141413] hover:bg-[#282725] text-white text-[10px] font-medium transition-colors shadow-none"
                      >
                        مسیریابی و جزئیات آفیش
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {project.expert && (
                    <Link
                      href={`/experts/${project.expert.id}`}
                      className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E5E0D8] text-[10px] font-medium text-[#141413] bg-white hover:bg-[#F3F1EC] transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      سفارش مجدد با این متخصص
                    </Link>
                  )}
                  <Link
                    href={project.isMock ? "#" : `/orders/${project.id}/download`}
                    onClick={(e) => {
                      if (project.isMock) {
                        e.preventDefault();
                        alert("این یک سفارش تستی/نمایشی است و صفحه دانلود واقعی ندارد.");
                      }
                    }}
                    className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#141413] hover:bg-[#282725] text-white text-[10px] font-medium transition-colors shadow-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    ورود به صفحه دانلود
                  </Link>
                </>
              )}
            </div>

          </li>
        );
      })}
    </ul>
  );
}
