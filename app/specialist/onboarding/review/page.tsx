import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Images,
  MapPin,
  ShieldCheck,
  Camera,
  Layers,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import ResubmitSpecialistButton from "@/components/specialist/ResubmitSpecialistButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرونده در انتظار بررسی | پنل متخصص جار",
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
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();

  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }

  const needsRevision =
    state.status === "INCOMPLETE" && Boolean(state.reviewNote && state.reviewNote.trim());
  const isSuspended = state.status === "SUSPENDED";
  const isPending = state.status === "PENDING_REVIEW";

  if (!isPending && !isSuspended && !needsRevision) {
    redirect(state.nextStep || "/specialist/onboarding/profile");
  }

  const submittedAt = formatSubmittedAt(state.submittedForReviewAt);

  const checklist = [
    { icon: Camera, label: "عکس پروفایل", done: Boolean(state.hasAvatar) },
    { icon: Layers, label: "دسته‌بندی‌ها", done: Boolean(state.hasCategories) },
    {
      icon: Images,
      label: "نمونه‌کارها",
      done: (state.maxPortfolioInCategory ?? 0) >= 10,
    },
    {
      icon: MapPin,
      label: "شهر و مبدأ",
      done: Boolean(state.hasCity && state.baseLat != null && state.baseLng != null),
    },
    { icon: ShieldCheck, label: "تعهدنامه", done: Boolean(state.hasNda) },
  ];

  const title = needsRevision
    ? "پرونده برای اصلاح بازگردانده شد"
    : isSuspended
      ? "دسترسی شما موقتاً محدود است"
      : "پرونده شما برای تیم جار ارسال شد";

  const subtitle = needsRevision
    ? "پیام ادمین را بخوانید، موارد لازم را اصلاح کنید و دوباره ارسال کنید."
    : isSuspended
      ? "تا رفع تعلیق، دسترسی به فید پروژه‌ها محدود است. در صورت نیاز نمونه‌کارها را اصلاح کنید."
      : "کارشناسان پرونده را در پنل ادمین می‌بینند. معمولاً کمتر از ۲۴ ساعت کاری طول می‌کشد.";

  return (
    <SpecialistOnboardingShell
      activeStep="review"
      subtitle={needsRevision ? "نیاز به اصلاح" : "منتظر تایید تیم جار"}
    >
      <section className="rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 space-y-6 shadow-xs text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-jar-logo/10 text-jar-logo border border-jar-logo/20">
          {needsRevision || isSuspended ? (
            <AlertTriangle className="h-8 w-8" />
          ) : (
            <Clock className="h-8 w-8 animate-pulse" />
          )}
        </div>

        <div className="space-y-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
              needsRevision || isSuspended
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-jar-logo/25 bg-jar-logo/10 text-jar-logo"
            }`}
          >
            {needsRevision
              ? "نیاز به اصلاح"
              : isSuspended
                ? "پرونده تعلیق شده"
                : "در صف بررسی ادمین"}
          </div>
          <h1 className="text-xl font-black">{title}</h1>
          <p className="text-xs text-jar-muted leading-relaxed max-w-md mx-auto">{subtitle}</p>
          {submittedAt && !needsRevision && (
            <p className="text-[11px] text-jar-muted">زمان ارسال: {submittedAt}</p>
          )}
        </div>

        {state.reviewNote && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right text-xs text-amber-950 leading-relaxed">
            <span className="font-black">پیام ادمین: </span>
            {state.reviewNote}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl border border-jar-border bg-jar-canvas px-3 py-2.5"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 text-jar-muted shrink-0" />
                )}
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            );
          })}
        </div>

        {(needsRevision || isSuspended) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isSuspended ? "/specialist/portfolio" : "/specialist/onboarding/portfolio"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-jar-border bg-jar-canvas px-6 text-xs font-bold text-jar-primary"
            >
              اصلاح نمونه‌کارها
            </Link>
            {needsRevision && <ResubmitSpecialistButton />}
          </div>
        )}
      </section>
    </SpecialistOnboardingShell>
  );
}
