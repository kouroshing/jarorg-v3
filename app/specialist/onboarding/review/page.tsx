import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Images,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرونده در انتظار بررسی | پنل متخصص جار",
  description: "وضعیت بررسی پرونده تخصصی شما توسط کارشناسان جار.",
};

function formatSubmittedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default async function SpecialistReviewWaitingPage() {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/join"));
  }

  const state = await getSpecialistOnboardingStateAction();

  // Approved specialists have a panel to be in; anyone who has not submitted yet
  // belongs back in the step they left unfinished.
  if (state.status === "ACTIVE") {
    redirect("/specialist/projects");
  }
  if (state.status !== "PENDING_REVIEW" && state.status !== "SUSPENDED") {
    redirect(state.nextStep || "/specialist/onboarding/portfolio");
  }

  const isSuspended = state.status === "SUSPENDED";
  const submittedAt = formatSubmittedAt(state.submittedForReviewAt);
  const totalItems = state.totalPortfolioItems ?? 0;
  const approvedCount = state.approvedPortfolioCount ?? 0;
  const rejectedCount = state.rejectedPortfolioCount ?? 0;

  const checklist = [
    {
      icon: Images,
      label: "نمونه‌کارها",
      value: `${totalItems} فایل ارسال شد`,
      done: (state.maxPortfolioInCategory ?? 0) >= 10,
    },
    {
      icon: MapPin,
      label: "شهر و مبدأ حرکت",
      value: state.city || "ثبت نشده",
      done: Boolean(state.hasCity),
    },
    {
      icon: ShieldCheck,
      label: "تعهدنامه محرمانگی",
      value: state.hasNda ? "امضا شد" : "امضا نشده",
      done: Boolean(state.hasNda),
    },
  ];

  return (
    <div
      className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-24 overflow-x-hidden"
      dir="rtl"
    >
      <JarBillowBackground />

      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                احراز صلاحیت متخصصان
              </span>
              <span className="text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                گام آخر: بررسی توسط کارشناسان جار
              </span>
            </div>
          </div>

          <Link
            href="/specialist/portfolio"
            className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft px-4 py-1.5 text-xs font-medium text-jar-primary transition-colors"
          >
            <span>ویرایش نمونه‌کارها</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-24 space-y-5">
        <section className="rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-xs backdrop-blur-xl space-y-5 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
              isSuspended
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            {isSuspended ? (
              <AlertTriangle className="h-8 w-8" />
            ) : (
              <Clock className="h-8 w-8 animate-pulse" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-jar-primary">
              {isSuspended
                ? "دسترسی پرونده شما موقتاً متوقف است"
                : "پرونده شما در حال بررسی است"}
            </h1>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
              {isSuspended
                ? "برای رفع تعلیق و بازگشت به کارتابل، با پشتیبانی جار تماس بگیرید."
                : "کارشناسان کیفی جار نمونه‌کارها و مشخصات شما را بررسی می‌کنند. به‌محض تایید، کارتابل پروژه‌ها برای شما باز می‌شود و از طریق اعلان باخبر می‌شوید."}
            </p>
            {submittedAt && !isSuspended && (
              <p className="text-[11px] text-jar-muted font-medium">
                زمان ارسال پرونده: {submittedAt}
              </p>
            )}
          </div>

          {!isSuspended && (
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-jar-border bg-jar-canvas px-4 py-3 text-right">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[11px] leading-relaxed text-jar-muted font-medium">
                معمولاً بررسی پرونده کمتر از ۲۴ ساعت کاری طول می‌کشد. نیازی به ارسال دوباره نیست.
              </p>
            </div>
          )}
        </section>

        {state.reviewNote && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <h2 className="text-sm font-bold text-rose-900">یادداشت کارشناس بررسی</h2>
            </div>
            <p className="text-xs leading-relaxed text-rose-800">{state.reviewNote}</p>
          </section>
        )}

        <section className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4">
          <h2 className="text-sm font-bold text-jar-primary">آنچه برای بررسی فرستادید</h2>

          <ul className="space-y-2">
            {checklist.map(({ icon: Icon, label, value, done }) => (
              <li
                key={label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-jar-border bg-jar-canvas px-4 py-3"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 text-jar-logo shrink-0" />
                  <span className="text-xs font-bold text-jar-primary">{label}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-jar-muted font-medium">{value}</span>
                  {done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </span>
              </li>
            ))}
          </ul>

          {(approvedCount > 0 || rejectedCount > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <span className="block text-[10px] font-medium text-emerald-700">آثار تاییدشده</span>
                <span className="text-sm font-bold text-emerald-700">{approvedCount} فایل</span>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center">
                <span className="block text-[10px] font-medium text-rose-700">آثار رد شده</span>
                <span className="text-sm font-bold text-rose-700">{rejectedCount} فایل</span>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/specialist/portfolio"
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-jar-primary text-white text-xs font-medium hover:bg-jar-primaryHover transition-colors"
          >
            <Images className="h-3.5 w-3.5" />
            <span>افزودن یا اصلاح نمونه‌کارها</span>
          </Link>
          <Link
            href="/jaramooz"
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-jar-border bg-jar-surface text-jar-primary text-xs font-medium hover:bg-jar-soft transition-colors"
          >
            <span>تا زمان تایید، دوره‌های جارآموز را ببینید</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
